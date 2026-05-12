# `modules/wallet/` — Aura Wallet (쿠폰/기프티콘 통합)

## 책임
- 쿠폰 CRUD + 코드 AES-256-GCM 암호화 저장
- 평문 코드 reveal endpoint (분당 10회/사용자 rate limit)
- daily cron — D-3 status 전이 (active → expiring_soon), 만료 처리, used+90일 hard delete
- 추후 메일 자동 추출 (J.2) / OCR (J.3) / geofence (J.4) 의 진입점

## 핵심 파일
- `routes.ts` — `/wallet/coupons` CRUD + `/coupons/:id/code`
- `service.ts` — `createCoupon` / `revealCode` / `runDailySweep`
- `repository.ts:101-120` — `insertCoupon` `ON CONFLICT DO NOTHING` (UNIQUE 위배 시 null 반환 → 409)
- `repository.ts` — `sweepStatus` / `purgeOldUsed` cron 진입

## 외부 의존
- DB: `aura.coupons` (마이그레이션 `0012_create_coupons.sql`)
- `lib/security/encryption.ts` — code AES-256-GCM

## 절대 금지
- 평문 code를 로그 / 캐시 / 응답 body 어디에서도 노출 (reveal endpoint 외). `console.log` 자체 금지.
- code reveal endpoint를 unauthenticated route로 노출.
- `getCiphertext` 결과를 그대로 client로 전송 (decrypt 후 반환만 허용).

## 항상 지킬 것
- 새 source 추가 시 `CouponSource` enum + `createCouponSchema` 동시 갱신.
- code reveal 호출 후 client 측 메모리에서도 30초 이내 폐기 — `Cache-Control: private, max-age=30`.
- 만료/사용 처리 cron은 단일 worker에서만. 중복 실행 시 status 충돌 X (멱등).

## 최적화 포인트
- reveal endpoint rate limit은 in-memory map. multi-instance 가게 되면 Redis 전환.
- brand normalize (영문/한글 통일) — service.ts createCoupon 진입 시 추가 검토.
