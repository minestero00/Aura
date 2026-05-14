import { createHash } from "crypto";
import { AppError } from "../../lib/errors/app-error.js";
import { decryptSecret, encryptSecret } from "../../lib/security/encryption.js";
import { requireUser } from "../auth/guards.js";
import { fetchGmailMessageBody } from "../integrations/gmail/gmail-api.js";
import { usageService } from "../usage/service.js";
import { extractCouponFromImageText, extractCouponFromMessage } from "./extractor.js";
import type { CouponExtractCandidate } from "./extractor.js";
import { walletRepository } from "./repository.js";
import type {
  CodeFormat,
  Coupon,
  CouponListFilter,
  CouponPatch,
  CouponSource,
  CouponStatus
} from "./types.js";

const D3_MS = 3 * 24 * 60 * 60 * 1000;
const USED_RETENTION_MS = 90 * 24 * 60 * 60 * 1000;

function deriveInitialStatus(expiresAt: string | null): CouponStatus {
  if (!expiresAt) return "active";
  const ts = Date.parse(expiresAt);
  if (Number.isNaN(ts)) return "active";
  const now = Date.now();
  if (ts <= now) return "expired";
  if (ts - now <= D3_MS) return "expiring_soon";
  return "active";
}

export const walletService = {
  async createCoupon(input: {
    userId: string;
    brand: string;
    title: string;
    code: string;
    codeFormat: CodeFormat;
    codeImagePath: string | null;
    codeImageBase64: string | null;
    expiresAt: string | null;
    source: CouponSource;
    sourceRef: string | null;
    geofence: Coupon["geofence"];
    notes: string | null;
  }): Promise<Coupon> {
    if (!walletRepository.isEnabled()) {
      throw new AppError(503, "WALLET_NOT_CONFIGURED", "Wallet storage is not configured.");
    }

    const codeCiphertext = encryptSecret(input.code);
    if (!codeCiphertext) {
      throw new AppError(500, "WALLET_ENCRYPT_FAILED", "Failed to encrypt coupon code.");
    }
    // SHA-256(plaintext code) — deterministic dedup key. AES-GCM ciphertext는 매번
    // random IV로 달라져 ciphertext 기반 unique constraint가 실질 무력했다.
    const codeHash = createHash("sha256").update(input.code, "utf8").digest();

    const inserted = await walletRepository.insertCoupon({
      userId: input.userId,
      brand: input.brand,
      title: input.title,
      codeCiphertext,
      codeHash,
      codeFormat: input.codeFormat,
      codeImagePath: input.codeImagePath,
      codeImageBase64: input.codeImageBase64,
      expiresAt: input.expiresAt,
      source: input.source,
      sourceRef: input.sourceRef,
      geofence: input.geofence,
      notes: input.notes
    });

    if (!inserted) {
      // 같은 사용자의 같은 code → 기존 row를 idempotent하게 반환. share extension에서
      // 같은 쿠폰을 두 번 등록해도 사용자에게는 "저장됨"으로 보임 (실제 새 row 생성 안 됨).
      const existing = await walletRepository.findByCodeHash(input.userId, codeHash);
      if (existing) return existing;
      // existing이 없는데 insert도 실패한 케이스 (legacy NULL hash 등) — 안전망 409.
      throw new AppError(
        409,
        "WALLET_DUPLICATE_CODE",
        "A coupon with the same code is already saved."
      );
    }

    const initialStatus = deriveInitialStatus(input.expiresAt);
    if (initialStatus !== "active") {
      const patched = await walletRepository.updateCoupon(inserted.id, input.userId, {
        status: initialStatus
      });
      return patched ?? inserted;
    }
    return inserted;
  },

  async listCoupons(userId: string, filter: CouponListFilter): Promise<Coupon[]> {
    return walletRepository.listByUser(userId, filter);
  },

  async getCoupon(id: string, userId: string): Promise<Coupon> {
    const coupon = await walletRepository.getById(id, userId);
    if (!coupon) {
      throw new AppError(404, "WALLET_COUPON_NOT_FOUND", "Coupon not found.");
    }
    return coupon;
  },

  /**
   * 평문 코드 + 원본 이미지 같이 노출 — 풀스크린 표시 직전에만 호출. 로그/캐시 X.
   * Rate limit은 라우트 레벨에서 적용 (분당 10회/사용자).
   * 이미지가 있으면 그것을 풀스크린에 보여줘 점원이 직접 스캔 가능.
   */
  async revealCode(id: string, userId: string): Promise<{ code: string; imageBase64: string | null }> {
    const payload = await walletRepository.getRevealPayload(id, userId);
    if (!payload) {
      throw new AppError(404, "WALLET_COUPON_NOT_FOUND", "Coupon not found.");
    }
    const plain = decryptSecret(payload.ciphertext);
    if (!plain) {
      throw new AppError(500, "WALLET_DECRYPT_FAILED", "Failed to decrypt coupon code.");
    }
    return { code: plain, imageBase64: payload.imageBase64 };
  },

  async updateCoupon(id: string, userId: string, patch: CouponPatch): Promise<Coupon> {
    const updated = await walletRepository.updateCoupon(id, userId, patch);
    if (!updated) {
      throw new AppError(404, "WALLET_COUPON_NOT_FOUND", "Coupon not found.");
    }
    return updated;
  },

  async deleteCoupon(id: string, userId: string): Promise<void> {
    const ok = await walletRepository.deleteCoupon(id, userId);
    if (!ok) {
      throw new AppError(404, "WALLET_COUPON_NOT_FOUND", "Coupon not found.");
    }
  },

  /**
   * 메일 한 통에서 쿠폰 후보 추출. usage guard + gmail body fetch + LLM.
   * 1차 regex 필터에서 떨어지면 confidence 0 즉시 반환 (LLM 비용 0).
   */
  async extractFromMessage(input: {
    userId: string;
    messageId: string;
    language: "en" | "ko";
  }): Promise<CouponExtractCandidate> {
    requireUser(input.userId);
    await usageService.consumeOrThrow({ userId: input.userId, feature: "wallet_extract" });
    const message = await fetchGmailMessageBody(input.userId, input.messageId);
    return extractCouponFromMessage({
      subject: message.subject,
      from: message.from,
      body: message.body,
      receivedAt: message.receivedAt,
      language: input.language,
      userId: input.userId
    });
  },

  /** Device OCR로 추출한 raw text를 정형화 (이미지 자체는 외부 송신 X). */
  async extractFromImageText(input: {
    userId: string;
    rawText: string;
    language: "en" | "ko";
  }): Promise<CouponExtractCandidate> {
    requireUser(input.userId);
    await usageService.consumeOrThrow({ userId: input.userId, feature: "wallet_extract" });
    return extractCouponFromImageText({
      rawText: input.rawText,
      language: input.language,
      userId: input.userId
    });
  },

  /** Daily cron 진입점 — status 전이 + 90일 used purge. */
  async runDailySweep(): Promise<{ promoted: number; expired: number; purged: number }> {
    const now = new Date();
    const promotedWindow = new Date(now.getTime() + D3_MS);
    const usedCutoff = new Date(now.getTime() - USED_RETENTION_MS);
    const { promoted, expired } = await walletRepository.sweepStatus(
      now.toISOString(),
      promotedWindow.toISOString()
    );
    const purged = await walletRepository.purgeOldUsed(usedCutoff.toISOString());
    return { promoted, expired, purged };
  }
};
