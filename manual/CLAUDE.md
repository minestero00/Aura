# `manual/` — Documentation

## 책임
프로젝트의 PRD, 기술 아키텍처, 배포 절차, API 스펙 같은 **변하지 않는 진실**을 담는 문서 폴더. 코드와 문서의 정합성이 깨지면 코드가 옳고 문서를 업데이트한다.

## 문서 인덱스
| 파일 | 용도 |
|---|---|
| `PRD.md` | 제품 요구사항 — 기능 리스트와 비목표 |
| `TECHNICAL_ARCHITECTURE.md` | 시스템 아키텍처 + 비용 제어 6계층 |
| `IMPLEMENTATION_STATUS.md` | 무엇이 완료/미완료인지 (자주 stale 됨 — 새 PR 직후 업데이트) |
| `BACKEND_SCHEMA_API_SPEC.md` | DB 12개 테이블 + API 13개 엔드포인트 |
| `DEPLOY_RUNBOOK.md` | 단계별 K8s 배포 절차 |
| `DEPLOY_QUICKSTART.md` | 한국어 빠른 요약 |
| `DEPLOY_RAILWAY.md` | **Railway 배포** (P3에서 추가) |
| `HowToDeploy_Server.md` | K8s 시크릿/매니페스트 핸들링 |
| `GOOGLE_SIGNIN_SETUP.md` | Google Cloud Console 단계 |
| `PORTABILITY_AND_PRODUCTION_NOTES.md` | DB 이식성 가이드 (Postgres → Oracle/MySQL) |
| `sequence.md` | 12단계 빌드 순서 |
| `README.md` | 진입점 |

## 절대 금지
- 코드 변경 없이 문서만 바꿔서 "구현됨"으로 표시 — IMPLEMENTATION_STATUS는 항상 코드를 따라간다.
- 시크릿/엔드포인트 URL을 문서에 평문 기재. 환경변수 이름만 적고 값은 운영자가 채운다.
- 한국어/영어 혼용 — 한 문서 한 언어 (현재 README/DEPLOY_QUICKSTART는 한국어, 나머지는 영어).

## 항상 지킬 것
- 새 기능을 만들면 PRD.md의 "비목표" 섹션과 충돌하는지 확인 후, 충돌하면 PRD부터 업데이트.
- 새 환경변수 추가 시 `back/.env.example` + DEPLOY_RUNBOOK.md + 해당 모듈의 CLAUDE.md(있으면) 모두 업데이트.
- 새 API 엔드포인트 추가 시 BACKEND_SCHEMA_API_SPEC.md에 한 줄 추가.
- DB 마이그레이션 추가 시 PORTABILITY_AND_PRODUCTION_NOTES.md의 portable 미러 정책 따르기.
