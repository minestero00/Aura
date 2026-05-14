import { Pool } from "pg";
import { config } from "../../config/env.js";
import { createPgPool } from "../../lib/db/pool.js";
import type { Coupon, CouponListFilter, CouponPatch, CouponStatus } from "./types.js";

let pool: Pool | null = null;

function getPool(): Pool | null {
  if (!config.databaseUrl) return null;
  if (!pool) pool = createPgPool();
  return pool;
}

interface CouponRow {
  id: string;
  user_id: string;
  brand: string;
  title: string;
  code_ciphertext: string;
  code_format: string;
  code_image_path: string | null;
  expires_at: Date | string | null;
  source: string;
  source_ref: string | null;
  status: string;
  used_at: Date | string | null;
  geofence_lat: number | null;
  geofence_lng: number | null;
  geofence_radius_m: number | null;
  geofence_place_name: string | null;
  notes: string | null;
  created_at: Date | string;
  updated_at: Date | string;
}

function toIso(value: Date | string | null | undefined): string | null {
  if (!value) return null;
  if (value instanceof Date) return value.toISOString();
  return new Date(value).toISOString();
}

function rowToCoupon(row: CouponRow): Coupon {
  return {
    id: row.id,
    userId: row.user_id,
    brand: row.brand,
    title: row.title,
    codeFormat: row.code_format as Coupon["codeFormat"],
    codeImagePath: row.code_image_path,
    expiresAt: toIso(row.expires_at),
    source: row.source as Coupon["source"],
    sourceRef: row.source_ref,
    status: row.status as Coupon["status"],
    usedAt: toIso(row.used_at),
    geofence:
      row.geofence_lat !== null && row.geofence_lng !== null
        ? {
            lat: row.geofence_lat,
            lng: row.geofence_lng,
            radiusM: row.geofence_radius_m ?? 200,
            placeName: row.geofence_place_name
          }
        : null,
    notes: row.notes,
    createdAt: toIso(row.created_at) ?? new Date().toISOString(),
    updatedAt: toIso(row.updated_at) ?? new Date().toISOString()
  };
}

export const walletRepository = {
  isEnabled() {
    return Boolean(config.databaseUrl);
  },

  async insertCoupon(input: {
    userId: string;
    brand: string;
    title: string;
    codeCiphertext: string;
    codeHash: Buffer;
    codeFormat: string;
    codeImagePath: string | null;
    codeImageBase64: string | null;
    expiresAt: string | null;
    source: string;
    sourceRef: string | null;
    geofence: { lat: number; lng: number; radiusM: number; placeName: string | null } | null;
    notes: string | null;
  }): Promise<Coupon | null> {
    const p = getPool();
    if (!p) return null;
    // Migration 0014 — UNIQUE(user_id, code_hash) WHERE code_hash IS NOT NULL.
    // AES-256-GCM ciphertext는 random IV로 매번 달라져서 ciphertext 기반 dedup이
    // 실질 효과 없었다. SHA-256 hash로 deterministic dedup.
    const result = await p.query<CouponRow>(
      `INSERT INTO aura.coupons (
         user_id, brand, title, code_ciphertext, code_hash, code_format, code_image_path,
         code_image_base64, expires_at, source, source_ref, geofence_lat, geofence_lng,
         geofence_radius_m, geofence_place_name, notes
       ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)
       ON CONFLICT (user_id, code_hash) WHERE code_hash IS NOT NULL DO NOTHING
       RETURNING *`,
      [
        input.userId,
        input.brand,
        input.title,
        input.codeCiphertext,
        input.codeHash,
        input.codeFormat,
        input.codeImagePath,
        input.codeImageBase64,
        input.expiresAt,
        input.source,
        input.sourceRef,
        input.geofence?.lat ?? null,
        input.geofence?.lng ?? null,
        input.geofence?.radiusM ?? 200,
        input.geofence?.placeName ?? null,
        input.notes
      ]
    );
    return result.rows[0] ? rowToCoupon(result.rows[0]) : null;
  },

  /** 같은 user의 동일 code 쿠폰 조회 — dedup idempotency용. */
  async findByCodeHash(userId: string, codeHash: Buffer): Promise<Coupon | null> {
    const p = getPool();
    if (!p) return null;
    const result = await p.query<CouponRow>(
      `SELECT * FROM aura.coupons WHERE user_id = $1 AND code_hash = $2 LIMIT 1`,
      [userId, codeHash]
    );
    return result.rows[0] ? rowToCoupon(result.rows[0]) : null;
  },

  /** reveal endpoint에서 코드+이미지 같이 가져오기. base64는 큰 데이터라 평소 list에는 미노출. */
  async getRevealPayload(id: string, userId: string): Promise<{ ciphertext: string; imageBase64: string | null } | null> {
    const p = getPool();
    if (!p) return null;
    const result = await p.query<{ code_ciphertext: string; code_image_base64: string | null }>(
      `SELECT code_ciphertext, code_image_base64 FROM aura.coupons WHERE id = $1 AND user_id = $2`,
      [id, userId]
    );
    const row = result.rows[0];
    if (!row) return null;
    return { ciphertext: row.code_ciphertext, imageBase64: row.code_image_base64 };
  },

  async listByUser(userId: string, filter: CouponListFilter): Promise<Coupon[]> {
    const p = getPool();
    if (!p) return [];
    const status = filter.status ?? "active";
    const params: unknown[] = [userId];
    let whereStatus = "";
    if (status !== "all") {
      params.push(status);
      whereStatus = `AND status = $${params.length}`;
    }
    const result = await p.query<CouponRow>(
      `SELECT * FROM aura.coupons
        WHERE user_id = $1 ${whereStatus}
        ORDER BY
          CASE WHEN expires_at IS NULL THEN 1 ELSE 0 END,
          expires_at ASC,
          created_at DESC`,
      params
    );
    return result.rows.map(rowToCoupon);
  },

  async getById(id: string, userId: string): Promise<Coupon | null> {
    const p = getPool();
    if (!p) return null;
    const result = await p.query<CouponRow>(
      `SELECT * FROM aura.coupons WHERE id = $1 AND user_id = $2`,
      [id, userId]
    );
    return result.rows[0] ? rowToCoupon(result.rows[0]) : null;
  },

  async getCiphertext(id: string, userId: string): Promise<string | null> {
    const p = getPool();
    if (!p) return null;
    const result = await p.query<{ code_ciphertext: string }>(
      `SELECT code_ciphertext FROM aura.coupons WHERE id = $1 AND user_id = $2`,
      [id, userId]
    );
    return result.rows[0]?.code_ciphertext ?? null;
  },

  async updateCoupon(
    id: string,
    userId: string,
    patch: CouponPatch & { status?: CouponStatus }
  ): Promise<Coupon | null> {
    const p = getPool();
    if (!p) return null;
    const sets: string[] = [];
    const params: unknown[] = [];
    let paramIdx = 1;
    const push = (column: string, value: unknown) => {
      params.push(value);
      sets.push(`${column} = $${paramIdx}`);
      paramIdx += 1;
    };

    if (patch.brand !== undefined) push("brand", patch.brand);
    if (patch.title !== undefined) push("title", patch.title);
    if (patch.expiresAt !== undefined) push("expires_at", patch.expiresAt);
    if (patch.notes !== undefined) push("notes", patch.notes);
    if (patch.geofence !== undefined) {
      push("geofence_lat", patch.geofence?.lat ?? null);
      push("geofence_lng", patch.geofence?.lng ?? null);
      push("geofence_radius_m", patch.geofence?.radiusM ?? null);
      push("geofence_place_name", patch.geofence?.placeName ?? null);
    }
    if (patch.used === true) {
      push("status", "used");
      push("used_at", new Date().toISOString());
    }
    if (patch.status !== undefined && patch.used !== true) {
      push("status", patch.status);
    }

    if (sets.length === 0) {
      return this.getById(id, userId);
    }

    sets.push(`updated_at = now()`);
    params.push(id);
    params.push(userId);

    const result = await p.query<CouponRow>(
      `UPDATE aura.coupons SET ${sets.join(", ")}
        WHERE id = $${paramIdx} AND user_id = $${paramIdx + 1}
        RETURNING *`,
      params
    );
    return result.rows[0] ? rowToCoupon(result.rows[0]) : null;
  },

  async deleteCoupon(id: string, userId: string): Promise<boolean> {
    const p = getPool();
    if (!p) return false;
    const result = await p.query(
      `DELETE FROM aura.coupons WHERE id = $1 AND user_id = $2`,
      [id, userId]
    );
    return (result.rowCount ?? 0) > 0;
  },

  /** Daily cron — D-3 도래 active → expiring_soon, 만료 도과 → expired. */
  async sweepStatus(nowIso: string, expiringWindowIso: string): Promise<{ promoted: number; expired: number }> {
    const p = getPool();
    if (!p) return { promoted: 0, expired: 0 };
    const expired = await p.query(
      `UPDATE aura.coupons
          SET status = 'expired', updated_at = now()
        WHERE status IN ('active','expiring_soon')
          AND expires_at IS NOT NULL
          AND expires_at <= $1`,
      [nowIso]
    );
    const promoted = await p.query(
      `UPDATE aura.coupons
          SET status = 'expiring_soon', updated_at = now()
        WHERE status = 'active'
          AND expires_at IS NOT NULL
          AND expires_at <= $1`,
      [expiringWindowIso]
    );
    return { promoted: promoted.rowCount ?? 0, expired: expired.rowCount ?? 0 };
  },

  /** Used 후 90일 경과 row hard delete. */
  async purgeOldUsed(cutoffIso: string): Promise<number> {
    const p = getPool();
    if (!p) return 0;
    const result = await p.query(
      `DELETE FROM aura.coupons
        WHERE status = 'used'
          AND used_at IS NOT NULL
          AND used_at <= $1`,
      [cutoffIso]
    );
    return result.rowCount ?? 0;
  }
};
