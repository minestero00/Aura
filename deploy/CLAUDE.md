# `deploy/` — Infrastructure manifests

## 책임
Kubernetes 배포 매니페스트 (현재 `k8s/` 하나만). Railway/Vercel로 마이그레이션해도 K8s는 backup으로 유지한다.

## 사용처
- 자체 호스팅 (DigitalOcean Kubernetes, GKE, EKS) — DEPLOY_RUNBOOK.md 참고
- 로컬 검증은 `docker-compose.local.yml` 사용 (이 폴더 아님, 루트)

## Railway/Vercel을 메인으로 쓰는 이유
- Worker 잡(브리핑 사전 계산, 푸시 발송)을 Vercel Cron만으로는 보내기 어려움 → Railway 단일 인스턴스가 더 단순.
- K8s는 trafic이 늘어 다중 리전이 필요할 때 다시 쓴다.

## 절대 금지
- secrets를 매니페스트 안에 평문으로 박는 것. 항상 `kubectl create secret` 또는 SealedSecrets.
- Worker replicas > 1 — 현재 quota counter는 단일 인스턴스 가정 (분산 락 미구현, manual/IMPLEMENTATION_STATUS.md 참고).

## 항상 지킬 것
- 매니페스트 변경 시 DEPLOY_RUNBOOK.md의 환경변수 목록과 일치 확인.
- production은 항상 `imagePullPolicy: Always` + 명시적 image tag (latest 금지).
