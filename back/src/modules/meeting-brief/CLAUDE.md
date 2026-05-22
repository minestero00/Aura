# `modules/meeting-brief/` — 회의 30분 전 알림

worker에서 5분 cron으로 도는 백그라운드 모듈. **회의록 기능과 직접 관련은 아니지만** 회의 사용자 여정의 일부 (회의 시작 직전 push).

## 책임
- 모든 활성 사용자에 대해 25~35분 후 시작하는 비-종일 캘린더 이벤트 탐지
- Google Calendar API 조회 (`fetchEventsForMeetingBrief`)
- 관련 Gmail 메일 카운트 (참석자 from 검색, 최근 3일)
- FCM/APNs push 발송 — `meeting_briefing` category
- idempotency: `meeting_brief_alerts` 테이블에 (user_id, event_id) 키로 발송 기록

## 절대 금지
- 5분 cron 안에서 동기로 모든 사용자 처리 — 사용자 폭증 시 cron 지연. 현재는 sequential `for` loop, **Phase 2**: 병렬 처리 또는 queue.
- 회의 시작 후 알림 발송 X — window는 미래 시간 (25~35분 후) 강제.
- preferences/subscription 검사 우회 X — 매 cycle마다 다시 검증.
- Calendar/Gmail API 실패 시 throw 전파 X — silent skip으로 cron이 계속 돌아야.
- 같은 event_id에 push 두 번 X (idempotency 가드 `existing?.alertedAt`).
- transcript/회의록 본문을 push payload에 포함 X (회의가 아직 시작 안 됨).

## 항상 지킬 것
- 다음 5개 가드 전부 통과해야 push 발송:
  1. `users.push_enabled = true`
  2. `user_preferences.meeting_brief_enabled = true` (default true)
  3. `isBusinessAccessActive(userId) = true` (trial 또는 active)
  4. Google Calendar 토큰 유효
  5. `meeting_brief_alerts.alerted_at` null
- `cleanupOldAlerts` 매 cycle 마지막에 호출 (오래된 row 정리)
- 한국 시간대 사용자는 한국어 copy, 그 외는 영어 (`resolveLanguage(timezone)`)

## DB 스키마

```sql
-- (예상, repository.ts 참고)
aura.meeting_brief_alerts (
  id              text PRIMARY KEY,
  user_id         uuid NOT NULL,
  event_id        text NOT NULL,
  event_title     text,
  event_starts_at timestamptz,
  alerted_at      timestamptz,
  created_at      timestamptz DEFAULT now(),
  UNIQUE(user_id, event_id)
)
```

## 비용

- Calendar API: free (사용자별 quota 1M req/day)
- Gmail API: free (사용자별 quota 1B req/day)
- FCM/APNs: free
- **0 LLM call** — 결정론적 메시지 생성 (`buildPushCopy`)

## 외부 의존성
- `authStore` (active users)
- `fetchEventsForMeetingBrief` from calendar module
- `fetchRecentGmailMessages` from gmail integration
- `pushService.sendToUser`
- `isBusinessAccessActive` from subscription module
- `meeting_brief_alerts` 테이블

## tuning

| 상수 | 값 | 이유 |
|---|---|---|
| `BRIEF_WINDOW_BEFORE_MIN` | 25 | "회의 30분 전"이 UX 약속이라 25~35 윈도우로 5분 cron 보장 |
| `BRIEF_WINDOW_AFTER_MIN` | 35 | 위와 동일 |
| `MEETING_BRIEF_INTERVAL_MS` | 5*60*1000 | 5분 cron — 25분 윈도우 안에 반드시 ≥1회 평가 |
| 메일 검색 윈도우 | `newer_than:3d` | 회의 관련 메일은 보통 3일 내 (의도) |
| 메일 검색 결과 | top 5 | 카운트만 사용, 본문 X |

## edge case 처리 (자세한 건 [workflow.md](./workflow.md))
- 이벤트 시간 변경 (RFC 5545 재조정) → next cycle에서 새 시간 기준으로 재평가
- Calendar 토큰 만료 → catch swallowed, 이번 cycle 스킵
- push token invalid → pushService 내부에서 token cleanup
- 이미 시작한 이벤트 → 윈도우 밖이라 평가 X
- 사용자가 회의 30분 전 시점에 막 구독 시작 → 다음 cycle에서 평가됨
- 동시 두 cron 인스턴스 (worker replicas) → UNIQUE(user_id, event_id) + alerted_at 검사로 중복 발송 차단
