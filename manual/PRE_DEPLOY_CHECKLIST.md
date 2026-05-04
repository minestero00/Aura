# 배포 직전 체크리스트 (AURA)

이 문서는 사용자가 손으로 따라가는 마지막 게이트. 빠뜨리면 데이터/돈 잃는 항목만 모았다.

---

## 0. 코드 검증 (ROBOTS — 자동)

```bash
# back 빌드 + 타입체크 (둘 다 통과해야 함)
cd back && npm run typecheck && npm run build

# front 타입체크 (참고: tsconfig "ignoreDeprecations" 설정 이슈는 별개)
cd ../front && npx tsc --noEmit || true

# 로컬 스택 풀가동
cd .. && npm run local:up && npm run local:test:e2e && npm run local:down
```

---

## 1. 시크릿 생성 (사람 — 5분)

```bash
# 32바이트 hex (production용 APP_ENCRYPTION_KEY)
openssl rand -hex 32
```

생성된 키를 **anywhere에 평문 저장 금지**. 1Password/Bitwarden 같은 비밀 관리자에만.

다음 키들은 각 콘솔에서 새로 발급(개발용 .env에 있던 값 재사용 금지):
- [ ] `ANTHROPIC_API_KEY` — https://console.anthropic.com/settings/keys
- [ ] `GOOGLE_CLIENT_SECRET` — Google Cloud Console에서 production OAuth client
- [ ] `GOOGLE_MAPS_API_KEY` — production 키 + HTTP referrer 제한
- [ ] `OPENWEATHERMAP_API_KEY` — production 별도 키
- [ ] `APP_ENCRYPTION_KEY` — 위에서 생성한 hex 64자

---

## 2. Google Cloud Console (사람 — 30분)

`manual/GOOGLE_SIGNIN_SETUP.md` 참고하되 다음만 추가 확인:

- [ ] **iOS OAuth Client** — Bundle ID = production identifier (지금 `AuraApp`이면 변경 필요)
- [ ] **Android OAuth Client** — Production keystore의 SHA-1 등록
  - debug.keystore의 SHA-1은 staging/dev용으로만
- [ ] **Web OAuth Client** — Authorized redirect URIs에 Railway production URL 추가
- [ ] **Gmail/Calendar API enabled** — production project에서도 활성화 확인
- [ ] **OAuth consent screen** — Production 모드로 전환 + Privacy Policy URL 등록 (publishing 필요)

---

## 3. 백엔드 배포 (사람 — 1시간)

> **권장 셋업**: Supabase(Postgres) + Railway(API+Worker) + Redis 없음.
> 가이드: `manual/DEPLOY_SUPABASE.md` (권장) 또는 `manual/DEPLOY_RAILWAY.md` (Railway만 사용 시)

끝나면:

- [ ] `https://api.aura.example.com/api/v1/health` 200 OK
- [ ] `https://api.aura.example.com/api/v1/health/ready` 200 OK (DB+Redis 둘 다)
- [ ] Worker logs: `"Aura worker started"` + `"daily brief scheduler started"`
- [ ] Worker replicas = **1** (재확인)
- [ ] CORS_ALLOWED_ORIGINS에 모바일 앱 origin 포함 (없으면 모든 요청 거부됨)

---

## 4. 모바일 앱 설정 (사람 — 30분)

### 4.1 환경변수
- [ ] `front/.env`에 production `API_BASE_URL` (Railway 도메인 https://...)
- [ ] iOS/Android에서 production OAuth Client ID로 빌드

### 4.2 권한 텍스트 검토 (App Store/Play Store 심사 통과용)
- [ ] `front/ios/AuraApp/Info.plist`의 `NS*UsageDescription` 한국어/영어 자연스러운 문장
- [ ] `front/android/app/src/main/AndroidManifest.xml`의 권한 — 위치 권한은 "사용 중에만" + 사용자가 명시 동의 후 요청

### 4.3 빌드
```bash
# iOS Archive (Xcode에서)
# Product → Archive → Distribute App → App Store Connect

# Android AAB
cd front/android
./gradlew bundleRelease
# → app/build/outputs/bundle/release/app-release.aab 를 Play Console에 업로드
```

### 4.4 첫 사용자 테스트
- [ ] Google 로그인 동작
- [ ] 브리핑 카드 1회 생성 (백엔드 → Anthropic 호출)
- [ ] 메일 다이제스트 동작 (Gmail 연결 후)
- [ ] 채팅 답변 1회
- [ ] 사용량 페이지에서 토큰 사용량 표시 확인 (P0에서 추가)

---

## 5. 비용 가드 활성화 (사람 — 10분, 필수)

이걸 안 하면 LLM 비용 폭주 가능.

- [ ] **Anthropic Console** → Workspace Settings → Spend Limits 설정 (예: $50/일)
- [ ] **Railway** → Settings → Usage Alert ($X 도달 시 메일)
- [ ] `USAGE_DAILY_TOKEN_BUDGET` 환경변수 적정값 확인 (사용자당 일일 — 기본 200000)
- [ ] Google Cloud → Billing → Budget alerts ($10 같은 작은 단위로)

---

## 6. 모니터링 연결 (사람 — 30분, 권장)

- [ ] Sentry DSN을 백엔드 + 프론트 모두 셋업
- [ ] 일일 토큰 사용량 추이를 볼 대시보드 (Grafana / Metabase) — `ai_usage_events` 테이블 직접 쿼리
  ```sql
  SELECT date_trunc('hour', created_at) as bucket,
         feature,
         sum(input_tokens) as in_tok,
         sum(output_tokens) as out_tok,
         sum(request_cost_usd) as cost_usd
  FROM ai_usage_events
  WHERE status = 'success' AND created_at > now() - interval '7 days'
  GROUP BY 1, 2 ORDER BY 1 DESC;
  ```

---

## 7. 롤백 리허설 (사람 — 15분, 권장)

운영 가기 전에 한 번 연습:

- [ ] Railway에서 직전 deploy로 redeploy 가능한지 확인
- [ ] Postgres backup이 자동인지 확인 (Railway는 기본 daily backup, 7일 보존)
- [ ] DB 마이그레이션이 깨졌을 때 `back/db/migrations/portable/` 미러를 손으로 적용해서 복구할 수 있는지 (PORTABILITY_AND_PRODUCTION_NOTES.md 참고)

---

## 8. 첫 24시간 모니터링 (사람)

- [ ] 1시간마다 헬스체크 (cron으로 자동화 권장)
- [ ] Anthropic 비용 console에서 시간당 비용 확인
- [ ] Worker logs에서 `briefing scheduler` 정상 작동 확인
- [ ] 사용자 1명 이상 실제 가입/사용 후 Sentry 에러 0건 확인

---

## ☢️ 절대 하지 말 것

- 기존 K8s 클러스터의 .env를 그대로 Railway에 복붙 (시크릿 회전 없이)
- Worker replicas 2 이상 (분산 락 미구현)
- production에서 `NODE_ENV=development`로 시작 (preflight skip되어 시크릿 검증 안 됨)
- main 브랜치 강제 push (Railway가 자동 배포해버림)
- `.env`를 git에 commit (이미 .gitignore에 있지만 재확인)
