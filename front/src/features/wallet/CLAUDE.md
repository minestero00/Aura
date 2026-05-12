# `features/wallet/` — Aura Wallet (쿠폰/기프티콘)

## 책임
- 쿠폰 목록 / 등록 / 풀스크린 표시 / 사용 마킹
- 평문 code는 풀스크린 진입 직전 reveal endpoint 호출 → 메모리 30초 이내 폐기
- 진입점: 설정 → 지갑 sub-page

## 핵심 파일
- `api.ts` — `fetchCoupons` / `createCoupon` / `updateCoupon` / `deleteCoupon` / `revealCouponCode`
- 화면은 `features/app/screens/wallet/*` (WalletListScreen / CouponDetailScreen / AddCouponSheet)

## 외부 의존
- 백엔드 `/wallet/coupons` (route mount at `/api/v1/wallet`)
- `react-native-qrcode-svg` (QR 렌더) — 바코드 SVG 렌더는 J.1.c 추가 후

## 절대 금지
- 평문 code를 AsyncStorage / 로그 / 분석 이벤트에 저장.
- code reveal 결과를 컴포넌트 unmount 후에도 메모리에 보유.
- 만료된 쿠폰을 active 그리드에 함께 표시.

## 항상 지킬 것
- 새 화면 추가 시 i18n.ts에 ko/en 동시 추가.
- code reveal 직후 풀스크린 진입, 사용자가 화면 나가면 즉시 code 변수 clear.
- 잠금화면/위젯에 평문 code 노출 금지 (마스킹 `****1234`).

## 최적화 포인트
- 목록 5분 메모리 캐시 (탭 전환 시 재요청 방지).
- 카메라 스캔 (J.1.c) — `react-native-vision-camera` RN 0.84 호환 사전 확인.
