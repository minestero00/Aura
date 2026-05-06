# `deploy/workflow.md` — 배포 분기 흐름 (K8s / Railway / Vercel)

## 0. 어디에 배포하나
| 컴포넌트 | 메인 | 백업 | 비고 |
|---|---|---|---|
| Backend API + Worker | **Railway** | K8s | Worker long-lived 필요 (`manual/DEPLOY_DECISION.md`) |
| Frontend (마케팅 사이트) | Vercel | — | 모바일 앱은 별도 (Testflight/Play) |
| Database | **Supabase** (PG) | 자체 PG | Session Pooler URL 사용 |
| Edge Function (SMS) | **Supabase** | — | |

## 1. Railway (메인 백엔드)
- 절차: `manual/DEPLOY_RAILWAY.md`
- 단일 프로젝트에 두 서비스: `api`, `worker`
- 환경변수는 Railway UI에서 설정 (`back/.env.example` 키 모두)
- 배포 트리거: GitHub 연동 (main push) 또는 수동
- Worker replicas는 항상 1 (분산 락 미구현 — `IMPLEMENTATION_STATUS.md`)

## 2. K8s (백업 옵션)
- 매니페스트: `deploy/k8s/`
  - `api-deployment.yaml` (replicas=2)
  - `worker-deployment.yaml` (replicas=1 강제)
  - `migrate-job.yaml`
  - `api-service.yaml`
- 시크릿: `kubectl create secret generic aura-secrets --from-env-file=back/.env.production`
- 배포: `.github/workflows/backend-release.yml` (`KUBECONFIG_B64` 시크릿 필요)

### P0 작업: 리소스 limits 추가
```yaml
resources:
  requests: { cpu: 100m, memory: 256Mi }
  limits:   { cpu: 500m, memory: 512Mi }
```

## 3. Vercel (마케팅 사이트만)
- Backend API 호스팅 안 함 (long-lived worker 불가)
- 마케팅 사이트 또는 admin dashboard 추가 시 사용

## 4. CI/CD 워크플로우 (`.github/workflows/`)
| 파일 | 트리거 | 역할 |
|---|---|---|
| `backend-ci.yml` | PR/push (back/**) | build + migrate + smoke + Docker build |
| `backend-deploy.yml` | manual | image_tag → GHCR push |
| `backend-staging-auto.yml` | main push | staging 자동 배포 |
| `backend-release.yml` | workflow_call | kubectl apply + migration job + rollout wait |
| `backend-prod-promote.yml` | manual | image_tag 명시 → production |

### P1 작업: Docker layer cache
```yaml
- uses: docker/build-push-action@v6
  with:
    cache-from: type=gha
    cache-to: type=gha,mode=max
```
빌드 시간 30~40% 단축.

## 5. 환경변수 일치 검증
- `back/.env.example` ↔ `deploy/k8s/api-deployment.yaml` ↔ Railway UI
- 새 키 추가 시 3곳 모두 갱신 (`manual/DEPLOY_RUNBOOK.md` §환경변수 표)

## 6. 모바일 배포
- 절차: `manual/DEPLOY_MOBILE.md`
- iOS: TestFlight → App Store Connect
- Android: Internal Testing → Play Console
- **출시 전 필수: 한국어 권한 문자열** (`OPTIMIZATION.md #1`)

## 7. 데이터베이스 마이그레이션
- 자동: Railway/K8s 모두 컨테이너 startup에서 `npm run migrate` 실행
- 수동: `npm run migrate:prod` (DATABASE_URL 환경변수로)
- 롤백: 매뉴얼 (Down 마이그레이션 미작성 — `IMPLEMENTATION_STATUS.md`에 명시)

## 8. 백업 + DR
- Supabase PITR: 7일 (Free), 일일 S3 (Pro+)
- 검증 cron: `.github/workflows/backup-verify.yml` (샘플만, 미활성)
- 절차: `manual/OBSERVABILITY_AND_BACKUPS.md` §4

## 9. 관측성
- 5xx → Slack/Discord webhook (활성)
- Sentry: 미통합 (`OPTIMIZATION.md #5`)
- Better Stack: SDK 옵션, Railway Live Tail 통합 가능
- 메트릭: Railway Dashboard 기본 (CPU/Mem/req/s)

## 10. 트러블슈팅
| 증상 | 확인 위치 |
|---|---|
| 배포 실패 | GitHub Actions 로그 → Railway Dashboard logs |
| Migration 멈춤 | `kubectl logs job/migrate` 또는 Railway logs |
| 5xx 폭주 | OPS_SLACK_WEBHOOK 알림 → Sentry (미통합 시 Railway logs) |
| DB connection 한계 | Supabase Pooler 연결 수 확인 |
