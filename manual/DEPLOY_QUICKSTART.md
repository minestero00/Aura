# Deploy Quickstart (Simple)

이 문서는 `aura` 백엔드를 실제 배포할 때의 최소 절차만 빠르게 정리한 요약본입니다.  
상세 내용은 `manual/DEPLOY_RUNBOOK.md`를 참고하세요.

## 1) 배포 전 체크

- Docker 이미지 빌드/실행이 로컬에서 통과해야 함
  - `npm run local:test:e2e`
- 필수 환경변수 준비
  - `DATABASE_URL`
  - `REDIS_URL`
  - `APP_ENCRYPTION_KEY` (64 hex 권장)
  - `GOOGLE_WEB_CLIENT_ID`
  - `GOOGLE_CLIENT_SECRET`
  - `ANTHROPIC_API_KEY`
  - `GOOGLE_MAPS_API_KEY` (이동시간 계산 기능 사용 시)

## 2) 이미지 빌드/푸시

1. 수동 워크플로우 실행
   - GitHub Actions: `.github/workflows/backend-deploy.yml`
2. 결과
   - GHCR 이미지 생성: `ghcr.io/<org>/<repo>/aura-back:<tag>`

## 3) 인프라 반영 (Kubernetes 기준)

1. 시크릿/환경변수 반영
   - DB/Redis/Google/Anthropic 관련 값 주입
   - GitHub Actions Environment Secret:
     - `KUBECONFIG_B64` (base64 encoded kubeconfig)
   - 권장 환경:
     - `staging` environment에 `KUBECONFIG_B64` 등록
     - `production` environment에 `KUBECONFIG_B64` 등록 + required reviewers 설정
2. 매니페스트 적용
   - `deploy/k8s/api-deployment.yaml`
   - `deploy/k8s/api-service.yaml`
   - `deploy/k8s/worker-deployment.yaml`
   - `deploy/k8s/migrate-job.yaml`
3. 이미지 릴리스
   - main 자동 스테이징: `.github/workflows/backend-staging-auto.yml`
   - 수동 이미지 푸시: `.github/workflows/backend-deploy.yml`
   - 수동 배포/마이그레이션/롤아웃: `.github/workflows/backend-release.yml`
   - 수동 프로덕션 승격: `.github/workflows/backend-prod-promote.yml`

## 4) 배포 후 검증

- API 헬스체크
  - `GET /api/v1/health`
  - `GET /api/v1/health/ready`
- 워커 로그 확인
  - `jobs worker started` 로그 확인
- 주요 기능 스모크
  - Google 로그인
  - Daily brief 조회
  - Gmail/Calendar 연동 동작

## 5) 롤백

- 이전 정상 이미지 태그로 `api`/`worker`를 동시에 되돌림
- `health/ready` 정상 확인 후 트래픽 유지
