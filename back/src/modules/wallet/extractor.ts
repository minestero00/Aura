import { createAnthropicJsonSummary } from "../../lib/ai/anthropic.js";
import { usageService } from "../usage/service.js";
import type { CodeFormat } from "./types.js";

export interface CouponExtractCandidate {
  brand: string | null;
  title: string | null;
  code: string | null;
  codeFormat: CodeFormat | null;
  expiresAt: string | null;
  confidence: number;
}

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

const VALID_FORMATS: ReadonlySet<CodeFormat> = new Set([
  "barcode_ean13",
  "barcode_code128",
  "barcode_qr",
  "barcode_other",
  "text_only"
]);

/** 1차 deterministic 필터 — 키워드 매칭 시에만 LLM 호출. */
export function looksLikeCoupon(input: { subject: string; snippet?: string | null; body?: string | null }): boolean {
  const haystack = `${input.subject} ${input.snippet ?? ""} ${(input.body ?? "").slice(0, 800)}`.toLowerCase();
  return COUPON_KEYWORDS.some(keyword => haystack.includes(keyword.toLowerCase()));
}

const EMPTY: CouponExtractCandidate = {
  brand: null,
  title: null,
  code: null,
  codeFormat: null,
  expiresAt: null,
  confidence: 0
};

export async function extractCouponFromMessage(input: {
  subject: string;
  from: string;
  body: string;
  receivedAt: string | null;
  language: "en" | "ko";
  userId?: string;
}): Promise<CouponExtractCandidate> {
  if (!looksLikeCoupon({ subject: input.subject, body: input.body })) {
    return EMPTY;
  }

  const result = await createAnthropicJsonSummary<{
    brand: string | null;
    title: string | null;
    code: string | null;
    codeFormat: string | null;
    expiresAt: string | null;
    confidence: number;
  }>({
    maxTokens: 280,
    system:
      input.language === "ko"
        ? '당신은 메일에서 쿠폰/기프티콘 정보를 추출한다. strict JSON: brand(짧은 브랜드명, 영문/한글 어느 쪽이든 자연스러운 형태), title(상품/쿠폰명 한 줄), code(바코드/QR/텍스트 코드 문자열, 본문에 명시된 경우만, 없으면 null), codeFormat("barcode_ean13"|"barcode_code128"|"barcode_qr"|"text_only"|null), expiresAt(ISO 8601 TZ 포함, 한국 만료는 23:59:59+09:00), confidence(0~1 self rating). 쿠폰이 아니면 모두 null + confidence=0. 모든 텍스트는 한국어.'
        : 'Extract a single coupon or gift voucher from the email. Strict JSON: brand (short), title (item/coupon name), code (string or null when not present in body), codeFormat ("barcode_ean13"|"barcode_code128"|"barcode_qr"|"text_only"|null), expiresAt (ISO 8601 with TZ), confidence (0~1). If not a coupon, all null + confidence=0.',
    payload: {
      responseLanguage: input.language,
      receivedAt: input.receivedAt,
      from: input.from,
      subject: input.subject,
      body: input.body.slice(0, 4000)
    },
    fallback: { ...EMPTY }
  });

  if (input.userId && result.usage) {
    await usageService.recordModelUsage({
      userId: input.userId,
      feature: "wallet_extract",
      ...result.usage
    });
  }

  const parsed = result.data ?? EMPTY;
  return {
    brand: typeof parsed.brand === "string" && parsed.brand ? parsed.brand.slice(0, 100) : null,
    title: typeof parsed.title === "string" && parsed.title ? parsed.title.slice(0, 200) : null,
    code: typeof parsed.code === "string" && parsed.code ? parsed.code.slice(0, 500) : null,
    codeFormat:
      typeof parsed.codeFormat === "string" && VALID_FORMATS.has(parsed.codeFormat as CodeFormat)
        ? (parsed.codeFormat as CodeFormat)
        : null,
    expiresAt: typeof parsed.expiresAt === "string" && parsed.expiresAt ? parsed.expiresAt : null,
    confidence:
      typeof parsed.confidence === "number" ? Math.max(0, Math.min(1, parsed.confidence)) : 0
  };
}
