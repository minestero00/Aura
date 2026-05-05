# Observability & Backup Runbook

AURA의 프로덕션 운영용 관측 + 백업 검증 절차. 한 페이지 안에서 끝낼 수 있게 정리.

---

## 1. 5xx 알림 (이미 활성)

`back/src/lib/http/error-handler.ts`가 모든 unhandled 5xx에서 `dispatchOpsAlert(level: critical)`을 호출합니다. 다음 두 webhook 중 하나만 설정해도 동작.

### 1-A. Slack
- `OPS_SLACK_WEBHOOK_URL=https://hooks.slack.com/services/XXX/YYY/ZZZ`
- Incoming Webhook 권한 필요. 채널 별도.

### 1-B. Discord
- `OPS_DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/XXX/YYY`
- 서버 설정 → Integrations → Webhooks.

### 1-C. 검증
```bash
# 운영 환경에서 임의로 5xx를 트리거 (e.g. 잠시 DATABASE_URL을 잘못 설정)
curl https://api.aura.example.com/api/v1/usage/me -H "Authorization: Bearer ..."
# Slack/Discord에 critical 메시지 도착 확인
```

> 토큰 예산 80% / 100% 알림도 같은 webhook으로 발송됩니다. 너무 노이지하면 별도 채널로 분리.

---

## 2. (선택) Sentry 통합

기본 webhook으로 충분하지만, 스택트레이스가 필요하면 Sentry를 추가합니다.

```bash
npm install --workspace back @sentry/node
```

`back/src/server.ts` 진입부:
```ts
import * as Sentry from "@sentry/node";
if (process.env.SENTRY_DSN) {
  Sentry.init({ dsn: process.env.SENTRY_DSN, tracesSampleRate: 0.1 });
}
```

Express error middleware 앞에 `app.use(Sentry.Handlers.errorHandler())`. 환경변수 `SENTRY_DSN`만 추가하면 됩니다.

프론트는 `@sentry/react-native` — 출시 직전에만 추가. iOS/Android 빌드 설정 변경이 필요하므로 첫 베타 배포 후로 미루는 것이 안전.

---

## 3. (선택) Better Stack (Logtail)

구조화 JSON 로그를 그대로 수집:

1. Better Stack에서 source 만들기 (Type: HTTP).
2. Source token 받기.
3. Railway/Vercel 환경변수: `BETTERSTACK_SOURCE_TOKEN=...`
4. 로그를 stdout으로만 내보내고 Railway → Better Stack의 [Live Tail integration](https://betterstack.com/docs/logs/integrations/) 활성화. 별도 코드 변경 없음.

---

## 4. Postgres 백업 검증 (Supabase)

Supabase Free plan은 7일치 PITR(Point-In-Time Recovery)을 자동 유지. 운영 시 매월 첫 화요일에 다음 절차로 실제 복원 가능 여부 검증:

### 4-A. 검증 절차

1. Supabase Studio → Database → **Backups** 탭에서 가장 최근 백업의 `Generated at` 확인.
2. 신규 빈 프로젝트 (`aura-prod-dr-test`)를 한국 리전에 생성.
3. **PITR Restore** 버튼으로 어제 자정 시점 백업을 새 프로젝트로 복원 (5~10분 소요).
4. 복원된 프로젝트에 다음 SQL로 healthcheck:
   ```sql
   SELECT count(*) FROM aura.users;
   SELECT max(created_at) FROM aura.transit_trips;
   SELECT max(created_at) FROM aura.ai_usage_events;
   ```
5. 결과 행 수가 운영 DB와 거의 동일해야 함 (24시간 이내 차이는 정상).
6. DR 프로젝트 즉시 삭제 (요금 발생 방지).

### 4-B. 자동화 cron (선택)

Railway scheduled job 또는 GitHub Actions로 자동화:

```yaml
# .github/workflows/backup-verify.yml
name: backup-verify
on:
  schedule:
    - cron: "0 4 1 * *"  # 매월 1일 04:00 UTC
jobs:
  verify:
    runs-on: ubuntu-latest
    steps:
      - run: |
          curl -X POST $SLACK_WEBHOOK_URL -H "Content-Type: application/json" \
            -d '{"text":"[manual action] Backup verify due — see OBSERVABILITY_AND_BACKUPS.md §4"}'
        env:
          SLACK_WEBHOOK_URL: ${{ secrets.OPS_SLACK_WEBHOOK_URL }}
```

> 자동 PITR 복원은 Supabase API 미지원. 수동 단계라 Slack 알림으로 알림만.

### 4-C. Supabase 외부 백업 (Pro plan 이상 권장)

Supabase Pro에서는 일일 dump를 외부 S3로 export하는 기능 있음. Free에서는 다음 임시 방안:

```bash
# 매주 한 번 PG_DUMP를 로컬에 저장
pg_dump "$DATABASE_URL_DIRECT" \
  --no-owner --no-acl --schema=aura --schema=auth \
  | gzip > "aura-$(date +%Y%m%d).sql.gz"
# 결과 파일을 Drive/Dropbox로 업로드 (수동) 또는 r2/s3 cli로 자동화
```

> `DATABASE_URL_DIRECT`는 Supabase Studio → Settings → Database → Connection string의 **Direct** 항목. Pooler URL은 pg_dump가 거부합니다.

---

## 5. 알림 노이즈 방지

- 토큰 예산 80% 임계는 **유저-일별로 한 번만** 발송 (이미 service.ts에서 구현됨).
- 5xx critical 알림은 webhook 레이어에서 deduplication 없음 — 동일 에러 100회 발송될 수 있음.
  → 임시 방편: webhook URL에 [Slack workflow filter](https://slack.com/help/articles/360038641311) 또는 Discord rate limiter integration을 사용.
  → 장기: backend 측에 5분 윈도우 dedupe 캐시 추가 (TODO).
