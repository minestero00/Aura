import { AppError } from "../../lib/errors/app-error.js";
import { decryptSecret, encryptSecret } from "../../lib/security/encryption.js";
import { walletRepository } from "./repository.js";
import type {
  Coupon,
  CouponListFilter,
  CouponPatch,
  CouponStatus,
  CouponSource,
  CodeFormat
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

    const inserted = await walletRepository.insertCoupon({
      userId: input.userId,
      brand: input.brand,
      title: input.title,
      codeCiphertext,
      codeFormat: input.codeFormat,
      codeImagePath: input.codeImagePath,
      expiresAt: input.expiresAt,
      source: input.source,
      sourceRef: input.sourceRef,
      geofence: input.geofence,
      notes: input.notes
    });

    if (!inserted) {
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
   * 평문 코드 노출 — 풀스크린 표시 직전에만 호출. 로그/캐시 X.
   * Rate limit은 라우트 레벨에서 적용 (분당 10회/사용자).
   */
  async revealCode(id: string, userId: string): Promise<string> {
    const ciphertext = await walletRepository.getCiphertext(id, userId);
    if (!ciphertext) {
      throw new AppError(404, "WALLET_COUPON_NOT_FOUND", "Coupon not found.");
    }
    const plain = decryptSecret(ciphertext);
    if (!plain) {
      throw new AppError(500, "WALLET_DECRYPT_FAILED", "Failed to decrypt coupon code.");
    }
    return plain;
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
