# `modules/meeting-brief/` workflow

5분 cron 기반 push 평가 흐름.

## 1. cron trigger

```ts
// back/src/worker.ts:224-253
const MEETING_BRIEF_INTERVAL_MS = 5 * 60 * 1000;
startMeetingBriefLoop()  // setInterval, inFlight 가드
  ↓
evaluateAllUsersMeetingBriefs()
```

`inFlight` 가드로 동시 실행 차단. 한 cycle이 오래 걸리면 다음 cycle skip.

## 2. 전체 사용자 평가

```ts
export async function evaluateAllUsersMeetingBriefs(): Promise<void> {
  await authStore.refreshActiveUsersFromDb()  // DB → in-memory cache 갱신
  const users = authStore.listUsers();
  for (const user of users) {
    try { await evaluateUserMeetingBrief(user.id); }
    catch (error) { log warn, continue; }
  }
  await cleanupOldAlerts()  // 오래된 alert row 삭제
}
```

순차 처리. 100 사용자 × 평균 2-3s = 200-300s. 5분 cycle 안에 끝남.

**Phase 2**: 사용자 수 500+ 가면 병렬화 또는 BullMQ job queue 필요.

## 3. 사용자 1명 평가

```ts
async function evaluateUserMeetingBrief(userId: string): Promise<{
  evaluated: number; fired: number; skipped: number;
}>
```

### Step 1: 사용자 + preferences 로드
```ts
const user = authStore.findUserById(userId);
const preferences = authStore.getPreferences(userId);
if (!user || !preferences) return skipped;
```

### Step 2: 가드 5종
```ts
if (!preferences.pushEnabled) return skipped;
if (!preferences.meetingBriefEnabled) return skipped;
const hasAccess = await isBusinessAccessActive(userId).catch(() => false);
if (!hasAccess) return skipped;
```

### Step 3: Calendar 이벤트 조회
```ts
const windowStart = now + 25*60_000;
const windowEnd   = now + 35*60_000;
try {
  events = await fetchEventsForMeetingBrief(userId, windowStart, windowEnd);
} catch {
  return skipped;  // Calendar 미연결 / 토큰 만료 → silent skip
}
const nonAllDay = events.filter(e => !e.isAllDay);
if (nonAllDay.length === 0) return { evaluated: 0, fired: 0, skipped: 0 };
```

### Step 4: 각 이벤트 처리
```ts
for (const event of nonAllDay) {
  const existing = await getAlertByEvent(userId, event.id);
  if (existing?.alertedAt) { skipped++; continue; }  // 이미 발송

  if (!existing) {
    await upsertAlert({ id, userId, eventId, eventTitle, eventStartsAt });
  }

  // 메일 카운트 (best-effort)
  let relatedMailCount = 0;
  const connection = authStore.getGmailConnection(userId);
  if (connection && event.attendees.length > 0) {
    try {
      const fromParts = event.attendees.slice(0, 5).map(a => `from:${a.email}`).join(" OR ");
      const msgs = await fetchRecentGmailMessages(userId, { limit: 5, query: `in:inbox newer_than:3d (${fromParts})` });
      relatedMailCount = msgs.length;
    } catch {} // Gmail 오류는 무시
  }

  const copy = buildPushCopy(language, event.title, event.attendees.length, relatedMailCount);

  await pushService.sendToUser(userId, {
    title: copy.title,
    body: copy.body,
    category: "meeting_briefing",
    data: { type: "meeting-briefing", eventId, eventStartsAt }
  });

  await markAlerted(userId, event.id);
  fired++;
}
```

## 4. push copy

### 한국어
```
title: "{eventTitle} 30분 후"
body:  "참석자 N명 · 관련 메일 M건"
       또는 "회의가 곧 시작됩니다"  (둘 다 0이면)
```

### 영어
```
title: "{eventTitle} in 30 min"
body:  "N attendees · M related emails"
       또는 "Meeting starting soon"
```

언어 결정: `timezone.startsWith("Asia/")` → "ko", 외엔 "en". (단순. Phase 2: `user.locale` 필드 도입)

## 5. Edge case 자세히

### 5.1 이벤트 시간 변경
- 다음 cycle에서 새 시간 기준 평가
- 같은 event_id이지만 `alertedAt`이 null이면 다시 발송
- 같은 event_id에 `alertedAt`이 이미 있으면 skip — **재발송 안 됨**.
- **Phase 2**: event_id + start_time 조합 키로 변경 시 재발송 허용

### 5.2 Calendar 토큰 만료
- `fetchEventsForMeetingBrief` throw → catch swallowed → skipped
- 사용자 알림 없음. **Phase 2**: 7일+ 만료 지속 시 in-app banner "Calendar 재연결 필요"

### 5.3 Gmail 토큰 만료
- `fetchRecentGmailMessages` throw → catch swallowed → `relatedMailCount=0`
- push는 정상 발송, 메일 카운트만 빠짐

### 5.4 push token invalid (앱 삭제, 토큰 회전)
- `pushService.sendToUser` 내부에서 FCM/APNs error 응답 처리 → 토큰 row delete
- `markAlerted`는 그래도 실행됨 — 다시 시도 X (의도: push가 doomed이라 무한 retry 무의미)

### 5.5 이미 시작한 이벤트
- 윈도우는 future only. 시작 시간 < now이면 `events` 결과에 안 들어옴.

### 5.6 5분 cron 지연 (worker 재시작 등)
- 25~35 윈도우라 1회 cycle 누락 OK
- 2회 연속 누락 (10분 지연) → 35분이 35-10=25분 가능 — 여전히 window 안. 안전 마진.
- 3회 누락 → 윈도우 놓침. 사용자 push 못 받음. **Phase 2**: worker 헬스 모니터링 + 알림.

### 5.7 사용자가 brief 직전에 toggle off
- next cycle에서 `meetingBriefEnabled = false` 가드로 skip
- 이미 발송된 push는 회수 안 됨 (Slack/FCM 한계)

### 5.8 동일 사용자가 cron cycle 중 push toggle on
- next cycle에서 발송 — 같은 cycle 안에서는 처음 가드 결과 사용

### 5.9 Calendar에 100개 이벤트 동시 시작
- 모두 발송 시도. 사용자 폰에 100개 알림 → 시끄러움.
- **Phase 2**: 1 cycle당 사용자별 max push 수 제한 (예: 3개) + 추가는 grouped notification

### 5.10 worker replicas 2개
- 같은 cycle 시점에 둘 다 도는 가능성 → UNIQUE(user_id, event_id) + `alertedAt` 검사로 중복 차단
- 단, race window 작아도 0 아님. PostgreSQL row lock으로 강화 가능 (Phase 2).

## 6. 변경 시 영향 범위

- window 25~35 변경 → cron 간격도 같이 (5분 이상이면 안 됨)
- push copy 변경 → i18n에 반영
- 가드 5종 추가/제거 → preferences UI 동기화
