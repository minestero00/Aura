# 회의 기능 — 사용자 액션 체크리스트

코드 작업은 끝났습니다 (Phase 1 문서 + Phase 2 5개 작업). 이 문서는 **사용자가 직접** 해야 하는 후속 단계.

---

## 1. 🔴 즉시 — 노출된 secrets 회전

이번 세션에서 채팅으로 노출된 production secrets. 각 vendor 콘솔에서 회전 필수.

| 키 | 회전 위치 |
|---|---|
| `ANTHROPIC_API_KEY` | console.anthropic.com → API Keys → 기존 revoke + new |
| `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_JWT_SECRET` | Supabase Dashboard → Project Settings → API → Roll JWT secret |
| `DATABASE_URL` 비밀번호 (`Dumbteam2025!`) | Supabase → DB → Reset password |
| `GITHUB_APP_PRIVATE_KEY` | GitHub App settings → Generate new private key |
| `GOOGLE_CLIENT_SECRET` | GCP Console → APIs & Services → OAuth client |
| `FIREBASE_SERVICE_ACCOUNT_JSON` | GCP IAM → Service accounts → 키 회전 |
| `SLACK_BOT_TRIGGER_SECRET` | 32-byte hex 재생성 후 Railway aura-api + Vercel web 양쪽 갱신 |
| `OPENWEATHERMAP_API_KEY`, `GOOGLE_MAPS_API_KEY` | 각 콘솔에서 키 회전 |

`APP_ENCRYPTION_KEY` / `BOT_ENCRYPTION_KEY`는 **회전 까다로움** — DB 내 암호화된 토큰이 무용지물 됨. 회전 시 사용자에게 재설치 안내 필요. 현재 노출도가 낮으니 deferred OK.

---

## 2. 🟡 다음 배포 전 — `FIREBASE_SERVICE_ACCOUNT_JSON` 정리

Railway aura-worker Variables에서 값 끝에 `}FI`가 붙어있다면 (이번 세션에서 확인됨) `}` 까지만 자르세요. JSON parsing throw로 mobile push 발송이 실패할 수 있습니다.

---

## 3. 🟢 권장 — 새 환경변수 default 설정

| env | 권장값 | 의미 |
|---|---|---|
| `USAGE_DAILY_VOICE_TRANSCRIBE` | 360 | Whisper 10s 청크 360개 = 1시간 회의 |
| `USAGE_DAILY_MEETING_SUMMARIZE` | 5 | Sonnet 비용 큼 — 사용자 일 5건 |

Railway aura-api + aura-worker 양쪽에 동일하게 등록.

---

## 4. 🟢 End-to-End 동작 검증

회의 기능 5개 흐름 — 브라우저에서 실제로 동작 확인 권장.

### 4.1 새 회의 생성
1. `/meetings/new` 진입 → 제목 입력 → 템플릿 선택 → 시작
2. 마이크 권한 허용 → 우측 패널 배지 "Whisper · 활성" 표시
3. 30초 정도 말한 후 우측에 transcript 등장 확인 (10s 청크라 첫 chunk는 ~10-15s 후)
4. "종료 + AI 요약" → detail 페이지로 redirect → 자동으로 AI 요약 추가됨

### 4.2 권한 거부 케이스
- 새 회의 시작 시 마이크 권한 차단 → 배지 "마이크 권한 거부" + toast 에러 → 노트 입력은 가능

### 4.3 Draft 복구
- 회의 진행 중 새로고침 → 진입 시 "이전 작업이 남아 있습니다" 카드 → "이어 작성" 클릭 → 복구

### 4.4 동시 편집
- 회의록 detail을 두 브라우저에서 열기 → 한쪽에서 저장 → 다른쪽에서 수정 후 저장 → toast "다른 곳에서 먼저 수정됨 [내 버전으로 덮어쓰기]"

### 4.5 공유
- detail에서 "공유" 클릭 → 모달 노출 → 링크 복사 → 시크릿 모드에서 `/share/{token}` 열어 확인 → 모달에서 "공유 중지" → 다시 시크릿 모드 새로고침 → 404 확인

### 4.6 내보내기
- "내보내기 ▾" → ".md" → 다운로드 확인
- "내보내기 ▾" → ".docx" → Word에서 열기 → 제목/헤딩/테이블 정상 렌더 확인

---

## 5. 🔵 Phase 3 — observability 도입 (선택)

현재 production 에러는 console.log JSON으로만 남음. 다음 도입 권장:

### Sentry 연결 옵션 A: 빠른 시작
1. sentry.io 무료 계정 + 새 project (Node + Next.js 둘)
2. DSN 발급 후 Railway/Vercel env에 `SENTRY_DSN` 추가
3. `npm install @sentry/node @sentry/nextjs --workspace back --workspace web`
4. `back/src/server.ts`와 `web/src/instrumentation.ts`에 init 코드 (Sentry 가이드 그대로)
5. error boundary에 capture 호출

비용: Free tier 5K events/month — 초기엔 충분.

### Better Stack 옵션 B: Slack 알림 위주
- Slack 채널에 직접 알림 보내는 게 목표면 `notifyOps` 헬퍼 (`web/src/lib/slack-bot/ops.ts`) 패턴 확장 — back 쪽에도 동일 헬퍼 만들고 critical error에서 호출.

---

## 6. 🟣 Phase J — Aura Wallet 추가 작업 (별도 세션)

J.0 + 일부 J.1까지 이미 진행됨 (`back/src/modules/wallet/`).

남은 작업은 대부분 **React Native front** (camera, OCR, geofence, 위젯, share extension) — `front/` 디렉토리에서 별도 세션으로 진행 권장. TODO.md의 J.1~J.6 참고.
