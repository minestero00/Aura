# `modules/users/` — 사용자 프로필 + 환경설정

## 책임
- 사용자 기본 정보 (이름, 이메일, 타임존, 언어)
- 환경설정 (`user_preferences`) — 뉴스 카테고리, 알림 시간, 다크모드
- 데이터/프라이버시 화면용 요약 (Settings > Data & Privacy)

## 핵심 파일
- `routes.ts` — `GET /me`, `PATCH /me`, `GET /me/preferences`, `PATCH /me/preferences`
- `service.ts` — preferences merge + 검증
- `schemas.ts` — zod (newsCategories enum, briefingTime regex)

## 외부 의존
- DB: `users`, `user_preferences`

## 절대 금지
- preferences 전체 객체를 PUT으로 받기 (PATCH로 부분 업데이트만 — race condition 방지).
- 다른 사용자의 id를 path param으로 받기 (`/users/:id` 라우트 만들지 마라, 항상 `/me`).

## 항상 지킬 것
- 환경설정 변경 시 캐시(briefing 스냅샷, 추천 점수) 무효화 트리거.
- 새 preference 필드 추가 시 마이그레이션 + 기본값 정의 + 문서 갱신.

## 최적화 포인트
- 본 모듈은 핫패스 아님. 추가 최적화 불필요.
