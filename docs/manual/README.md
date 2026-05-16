# `manual/` — Documentation

프로젝트 문서. 새 문서 추가 시 카테고리에 맞춰 하위 폴더에 둘 것.

## 루트 (항상 참조하는 active 문서)

| 파일 | 용도 |
|---|---|
| [CLAUDE.md](CLAUDE.md) | manual 폴더 자체의 작성 규칙 |
| [README.md](README.md) | 이 인덱스 |
| [IMPLEMENTATION_STATUS.md](IMPLEMENTATION_STATUS.md) | 무엇이 완료/미완료인지 (자주 stale — PR 직후 업데이트) |
| [CLEANCODE.ts.md](CLEANCODE.ts.md) | TypeScript 코드 스타일 가이드 |
| [PORTABILITY_AND_PRODUCTION_NOTES.md](PORTABILITY_AND_PRODUCTION_NOTES.md) | DB 이식성 가이드 (Postgres → Oracle/MySQL) |
| [TRANSIT_IMPROVEMENT_PLAN.md](TRANSIT_IMPROVEMENT_PLAN.md) | 정류장 도착 알림 background + UI 개선 plan |

## `deploy/` — 현재 사용하는 배포 가이드

- [DEPLOY_RAILWAY.md](deploy/DEPLOY_RAILWAY.md) — Railway backend 배포
- [DEPLOY_SUPABASE.md](deploy/DEPLOY_SUPABASE.md) — Supabase DB 설정
- [DEPLOY_MOBILE.md](deploy/DEPLOY_MOBILE.md) — iOS/Android 모바일 배포
- [IOS_FASTLANE_SETUP.md](deploy/IOS_FASTLANE_SETUP.md) — TestFlight fastlane 셋업
- [PRE_DEPLOY_CHECKLIST.md](deploy/PRE_DEPLOY_CHECKLIST.md) — 배포 전 점검
- [OBSERVABILITY_AND_BACKUPS.md](deploy/OBSERVABILITY_AND_BACKUPS.md) — 로깅/모니터링/백업

## `setup/` — 일회성 초기 셋업 가이드

- [GOOGLE_SIGNIN_SETUP.md](setup/GOOGLE_SIGNIN_SETUP.md) — Google Cloud Console
- [IOS_WIDGET_SETUP.md](setup/IOS_WIDGET_SETUP.md) — iOS 위젯 셋업
- [PHASE_2_1_FIREBASE_SETUP.md](setup/PHASE_2_1_FIREBASE_SETUP.md) — Firebase Cloud Messaging

## `specs/` — 제품/아키텍처 spec (장기 reference)

- [PRD.md](specs/PRD.md) — 제품 요구사항
- [TECHNICAL_ARCHITECTURE.md](specs/TECHNICAL_ARCHITECTURE.md) — 시스템 아키텍처 + 비용 제어
- [BACKEND_SCHEMA_API_SPEC.md](specs/BACKEND_SCHEMA_API_SPEC.md) — DB 테이블 + API 엔드포인트
- [sequence.md](specs/sequence.md) — 빌드 순서
- [transportation.implementation.md](specs/transportation.implementation.md) — transit 구현 spec
- [transportation.schema.md](specs/transportation.schema.md) — transit schema

## `archive/` — 옛 기록 (참고용, 새 작업에 사용 X)

이미 완료된 phase 작업 plan, 옛 deploy runbook, K8s 절차 등.
필요 시 참고만 하고 갱신 X. 완전 폐기는 추후 확인 후.

- [DEPLOY_DECISION.md](archive/DEPLOY_DECISION.md)
- [DEPLOY_QUICKSTART.md](archive/DEPLOY_QUICKSTART.md)
- [DEPLOY_RUNBOOK.md](archive/DEPLOY_RUNBOOK.md) — K8s 절차 (현재 Railway 사용)
- [HowToDeploy_Server.md](archive/HowToDeploy_Server.md)
- [USER_TABLE_MIGRATION_PLAN.md](archive/USER_TABLE_MIGRATION_PLAN.md)
- [USER_TASKS_PHASE_2.md](archive/USER_TASKS_PHASE_2.md)
