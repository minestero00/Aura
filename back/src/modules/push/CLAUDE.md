# `modules/push/` — 푸시 알림

## 책임
- FCM (Firebase Cloud Messaging) 통합
- 디바이스 토큰 등록/회전/폐기 (`push_devices`)
- 카테고리별 발송 (briefing, transit, system)

## 핵심 파일
- `routes.ts` — `POST /push/devices`, `DELETE /push/devices/:token`
- `service.ts` — `sendToUser(userId, payload)` (멀티 디바이스 fan-out)

## 외부 의존
- FCM (`FIREBASE_*` env)
- DB: `push_devices`

## 절대 금지
- 토큰을 invalid 회수 없이 무한 retry (FCM이 InvalidRegistration 반환 시 즉시 row 삭제).
- 발송 페이로드에 사용자 PII 포함 (제목 ~30자, body ~80자 제한).
- iOS Critical Alert flag를 모든 알림에 (사용자 동의 + 앱 entitlement 필요 — 버스 알림에만).

## 항상 지킬 것
- 발송 결과를 `background_jobs`에 기록 (실패 분석용).
- 신규 알림 카테고리는 프론트 Settings에 토글 동시 추가.

## 최적화 포인트
- 사용자 디바이스 수 늘면 FCM 멀티캐스트 (`sendMulticast`)로 묶기.
