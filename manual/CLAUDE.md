# `manual/` — Documentation

## 책임
프로젝트의 PRD, 기술 아키텍처, 배포 절차, API 스펙 같은 **변하지 않는 진실**을 담는 문서 폴더. 코드와 문서의 정합성이 깨지면 코드가 옳고 문서를 업데이트한다.

## 폴더 구조 (2026-05-14 정리)

- **루트** — 항상 참조하는 active 문서 (CLAUDE.md, README.md, IMPLEMENTATION_STATUS.md, CLEANCODE.ts.md, PORTABILITY_AND_PRODUCTION_NOTES.md, TRANSIT_IMPROVEMENT_PLAN.md)
- `deploy/` — 현재 사용하는 배포 가이드 (Railway / Supabase / Mobile / Fastlane / Pre-deploy / Observability)
- `setup/` — 일회성 초기 셋업 (Google Sign-in, iOS Widget, Firebase)
- `specs/` — 제품/아키텍처 spec, transit schema 등
- `archive/` — 옛 기록 (K8s runbook, 완료된 phase plan 등). 새 작업에 사용 X

전체 인덱스는 [README.md](README.md) 참조.

## 절대 금지
- 코드 변경 없이 문서만 바꿔서 "구현됨"으로 표시 — IMPLEMENTATION_STATUS는 항상 코드를 따라간다.
- 시크릿/엔드포인트 URL을 문서에 평문 기재. 환경변수 이름만 적고 값은 운영자가 채운다.
- 한국어/영어 혼용 — 한 문서 한 언어 (현재 README/DEPLOY_QUICKSTART는 한국어, 나머지는 영어).

## 항상 지킬 것
- 새 기능을 만들면 PRD.md의 "비목표" 섹션과 충돌하는지 확인 후, 충돌하면 PRD부터 업데이트.
- 새 환경변수 추가 시 `back/.env.example` + DEPLOY_RUNBOOK.md + 해당 모듈의 CLAUDE.md(있으면) 모두 업데이트.
- 새 API 엔드포인트 추가 시 BACKEND_SCHEMA_API_SPEC.md에 한 줄 추가.
- DB 마이그레이션 추가 시 PORTABILITY_AND_PRODUCTION_NOTES.md의 portable 미러 정책 따르기.
