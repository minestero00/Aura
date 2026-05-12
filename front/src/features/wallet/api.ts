import { apiRequest } from "@lib/api/client";
import type { CodeFormat, Coupon, CouponStatus, CreateCouponInput, UpdateCouponInput } from "./types";

export interface CouponExtractCandidate {
  brand: string | null;
  title: string | null;
  code: string | null;
  codeFormat: CodeFormat | null;
  expiresAt: string | null;
  confidence: number;
}

export async function fetchCoupons(
  accessToken: string,
  status: CouponStatus | "all" = "active"
): Promise<Coupon[]> {
  const params = new URLSearchParams({ status });
  const result = await apiRequest<{ coupons: Coupon[] }>(
    `/api/v1/wallet/coupons?${params.toString()}`,
    { method: "GET", accessToken }
  );
  return result.coupons;
}

export async function createCoupon(
  accessToken: string,
  input: CreateCouponInput
): Promise<Coupon> {
  const result = await apiRequest<{ coupon: Coupon }>(`/api/v1/wallet/coupons`, {
    method: "POST",
    accessToken,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input)
  });
  return result.coupon;
}

export async function updateCoupon(
  accessToken: string,
  id: string,
  patch: UpdateCouponInput
): Promise<Coupon> {
  const result = await apiRequest<{ coupon: Coupon }>(`/api/v1/wallet/coupons/${id}`, {
    method: "PATCH",
    accessToken,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(patch)
  });
  return result.coupon;
}

export async function deleteCoupon(accessToken: string, id: string): Promise<void> {
  await apiRequest<void>(`/api/v1/wallet/coupons/${id}`, {
    method: "DELETE",
    accessToken
  });
}

/**
 * 평문 code 노출 — 풀스크린 표시 직전에만 호출. 호출 후 메모리에서 30초 이내 폐기.
 * 백엔드는 Cache-Control private 30s + 분당 10회 rate limit.
 */
export async function revealCouponCode(accessToken: string, id: string): Promise<string> {
  const result = await apiRequest<{ code: string }>(`/api/v1/wallet/coupons/${id}/code`, {
    method: "GET",
    accessToken
  });
  return result.code;
}

/**
 * 메일 1통 → 쿠폰 후보 추출. 백엔드 1차 regex 필터 + LLM.
 * confidence < 0.5는 모달에 prefill만 하고 사용자 확정 필요.
 */
export async function extractCouponFromMessage(
  accessToken: string,
  messageId: string,
  language: "ko" | "en"
): Promise<CouponExtractCandidate> {
  const result = await apiRequest<{ candidate: CouponExtractCandidate }>(
    `/api/v1/wallet/coupons/extract-from-message`,
    {
      method: "POST",
      accessToken,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messageId, language })
    }
  );
  return result.candidate;
}

