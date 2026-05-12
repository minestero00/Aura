/**
 * 메일 카드 푸터에 "쿠폰 저장" chip을 보일지 결정하는 frontend 1차 필터.
 * Backend 추출(LLM)을 호출하기 전 단계 — 키워드 매칭 시에만 chip 노출.
 * 백엔드 `extractor.ts`의 `looksLikeCoupon`과 동일 키워드 셋 유지.
 */

const COUPON_KEYWORDS = [
  "쿠폰",
  "기프티콘",
  "바코드",
  "할인코드",
  "사용기한",
  "유효기간",
  "coupon",
  "promo code",
  "voucher",
  "redeem",
  "gift card",
  "barcode"
];

export function isCouponCandidateMail(input: { subject?: string | null; snippet?: string | null }): boolean {
  const haystack = `${input.subject ?? ""} ${input.snippet ?? ""}`.toLowerCase();
  return COUPON_KEYWORDS.some(k => haystack.includes(k.toLowerCase()));
}
