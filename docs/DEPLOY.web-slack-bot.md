진짜 작동 막던 유일한 블로커 ✅ 수정 완료

user_mappings 테이블 누락 — digest.ts:132 와 mappings/route.ts:25,47,58에서 쿼리하는데 마이그레이션에 없었음.

→ back/db/migrations/0021_slack_bot_user_mappings.sql 생성:

- installation_id → bot_installations(id) CASCADE FK
- (installation_id, github_login) UNIQUE — upsert onConflict와 정확히 일치
- migrate.mjs가 ^\d+.\*\.sql$ 패턴 + sort로 auto-discover → Railway 재배포 시 자동 적용

감사 결과 중 false positive (실제론 멀쩡)

- Slack 슬래시 커맨드 핸들러: web/src/app/api/slack/commands/route.ts 완전 구현됨 (서명 검증 + brief/setting/repos/help). /aura
  brief → DB에 manual_trigger=true → 워커 30분 루프에서 처리 — wiring 정상.
- back worker 처리: worker.ts:71에서 manual_trigger 폴링 확인.
- GitHub webhook 수신기: 일일 digest는 폴링 방식이라 불필요. 실시간 release 알림 원할 때만 필요 — 지금 스코프 밖.

Vercel 배포 체크리스트

Web (Vercel)
NEXT_PUBLIC_APP_URL=https://<your-domain>/aura # basePath 포함
NEXT_PUBLIC_SUPABASE_URL=https://<ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
NEXT_PUBLIC_GITHUB_APP_SLUG=aura-bot # GitHub App slug
NEXT_PUBLIC_SLACK_CLIENT_ID=...

SUPABASE_SERVICE_ROLE_KEY=... # 서버 전용
GITHUB_APP_ID=...
GITHUB_APP_PRIVATE_KEY=... # 줄바꿈 \n 이스케이프
GITHUB_APP_CLIENT_ID=Iv1.xxx
GITHUB_APP_CLIENT_SECRET=...
SLACK_CLIENT_ID=...
SLACK_CLIENT_SECRET=...
SLACK_SIGNING_SECRET=...
BOT_ENCRYPTION_KEY=<64자 hex> # back/APP_ENCRYPTION_KEY와 동일

Back (Railway 그대로)

- APP_ENCRYPTION_KEY = web의 BOT_ENCRYPTION_KEY와 정확히 같은 값
- ENABLE_BRIEFING_SCHEDULER=true
- 0021 마이그레이션 자동 적용 (npm run migrate 또는 부팅 시)

외부 App 등록 URL

- GitHub App callback: https://<your-domain>/aura/api/github/callback
- Slack OAuth redirect: https://<your-domain>/aura/api/slack/oauth
- Slack slash command request URL: https://<your-domain>/aura/api/slack/commands

End-to-end 흐름 (이제 동작)

1. /aura/slack 클릭 → GitHub App 설치 →
2. /aura/api/github/callback이 bot_installations row 만들고 bot_session 쿠키 세팅 →
3. /aura/slack/setup?step=2 에서 레포·시각 선택 → PATCH /aura/api/slack-bot/setup →
4. Slack OAuth → /aura/api/slack/oauth → 토큰 암호화 저장 + welcome 메시지 →
5. /aura/slack/settings 에서 GitHub↔Slack 유저 매핑 → user_mappings 테이블 (방금 추가) →
6. Railway worker가 30분마다 due 체크 → digest 전송 (@멘션 정상 적용)

이제 Vercel(web) + Railway(back) 조합으로 실제 설치/사용 가능합니다.
