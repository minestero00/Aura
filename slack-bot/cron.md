# Cron 스케줄링

> Railway `back/worker.ts`에 30분 루프 추가. Vercel Cron 불필요.

---

## Railway worker.ts 추가 내용

```typescript
// back/src/worker.ts 에 추가 (기존 패턴 동일)

const SLACK_DIGEST_INTERVAL_MS = 30 * 60 * 1000; // 30분
let slackDigestTimer: NodeJS.Timeout | null = null;
let slackDigestInFlight = false;

async function runSlackDigestCheck() {
  if (slackDigestInFlight) return;
  slackDigestInFlight = true;
  try {
    const now = new Date();
    const targets = await getInstallationsDueNow(now);
    for (const inst of targets) {
      await safeDigest(inst);
    }
  } catch (error) {
    console.log(JSON.stringify({
      level: "warn",
      service: "aura-worker",
      module: "slack-digest",
      message: "digest check failed",
      error: error instanceof Error ? error.message : String(error)
    }));
  } finally {
    slackDigestInFlight = false;
  }
}

function startSlackDigestLoop() {
  if (slackDigestTimer) return;
  // 다음 :00 또는 :30 까지 대기 후 시작 (drift 방지)
  const now = new Date();
  const msUntilNextHalf = getDelayToNextHalfHour(now);
  setTimeout(() => {
    void runSlackDigestCheck();
    slackDigestTimer = setInterval(() => {
      void runSlackDigestCheck();
    }, SLACK_DIGEST_INTERVAL_MS);
  }, msUntilNextHalf);
}

function stopSlackDigestLoop() {
  if (slackDigestTimer) {
    clearInterval(slackDigestTimer);
    slackDigestTimer = null;
  }
}

// 다음 :00 또는 :30 까지 남은 ms
function getDelayToNextHalfHour(now: Date): number {
  const min = now.getMinutes();
  const sec = now.getSeconds();
  const ms = now.getMilliseconds();
  const elapsedInSlot = (min % 30) * 60000 + sec * 1000 + ms;
  return SLACK_DIGEST_INTERVAL_MS - elapsedInSlot;
}
```

`bootstrapWorker()`에서 `startSlackDigestLoop()` 호출 추가.

---

## 30분 단위 체크 로직

```typescript
async function getInstallationsDueNow(now: Date) {
  const { data } = await supabase
    .from("bot.installations")
    .select("*")
    .eq("is_active", true);

  return (data ?? []).filter(inst => isDueNow(inst, now));
}

function isDueNow(inst: Installation, now: Date): boolean {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: inst.timezone,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    weekday: "short"
  }).formatToParts(now);

  const hour = parts.find(p => p.type === "hour")?.value ?? "00";
  const min  = parts.find(p => p.type === "minute")?.value ?? "00";
  const day  = parts.find(p => p.type === "weekday")?.value?.toLowerCase().slice(0, 3) ?? "mon";

  // digest_time은 "HH:00" 또는 "HH:30" 형식만 허용
  // worker가 :00 또는 :30에 실행되므로 정확히 일치
  return (
    `${hour}:${min}` === inst.digest_time &&
    inst.digest_days.includes(day)
  );
}
```

**동작 예시:**
```
worker 시작 시각: 오전 8:47
  → 다음 :00까지 13분 대기 후 첫 실행
  → 이후 정각 30분마다 체크

09:00 KST 체크:
  → 팀 A (digest_time: "09:00", timezone: "Asia/Seoul") → 실행
  → 팀 B (digest_time: "09:30", timezone: "Asia/Seoul") → 스킵

09:30 KST 체크:
  → 팀 B → 실행
```

---

## 중복 실행 방지

```typescript
// digest 실행 전 오늘 이미 실행됐는지 확인
const today = toLocalDate(nowUTC, installation.timezone);  // "2026-05-15"

const { data: existingLog } = await supabase
  .from("bot.digest_logs")
  .select("id")
  .eq("installation_id", installation.id)
  .eq("digest_date", today)
  .eq("status", "success")
  .single();

if (existingLog) {
  return { status: "skipped", reason: "already_ran" };
}
```

`digest_logs`의 UNIQUE(installation_id, digest_date) 제약으로 DB 레벨에서도 보호.

---

## 날짜 계산

```typescript
// "어제" 범위 계산 — 팀의 timezone 기준
function getYesterdayRange(timezone: string): { since: Date; until: Date } {
  const now = new Date();
  const localMidnight = new Date(
    new Date().toLocaleDateString("en-US", { timeZone: timezone })
  );
  // timezone 기준 오늘 자정 00:00
  const todayStart = toUTC(localMidnight, timezone);
  const yesterdayStart = new Date(todayStart.getTime() - 86400000);

  return { since: yesterdayStart, until: todayStart };
}
```

---

## 수동 트리거 (`/aura brief`)

Slash command에서 호출. Cron과 동일한 `safeDigest` 함수 재사용.

```typescript
// /aura brief 처리
async function handleBrief(teamId: string, responseUrl: string) {
  const installation = await getInstallationByTeamId(teamId);
  if (!installation) {
    await sendToResponseUrl(responseUrl, "설정을 먼저 완료해주세요.");
    return;
  }

  const result = await safeDigest(installation);
  if (result.status === "skipped") {
    await sendToResponseUrl(responseUrl, "어제 활동이 없어서 요약할 내용이 없어요.");
  }
}
```

차이점: `/aura brief`는 이미 오늘 실행됐어도 다시 실행함 (강제 수동 실행).

---

## 추가 비용 없음

Railway `back/` 서버에 루프만 추가 — 별도 서비스, 별도 과금 없음.  
Vercel Cron Pro($20/월) 불필요.
