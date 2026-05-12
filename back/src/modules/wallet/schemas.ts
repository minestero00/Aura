import { z } from "zod";

const codeFormatEnum = z.enum([
  "barcode_ean13",
  "barcode_code128",
  "barcode_qr",
  "barcode_other",
  "text_only"
]);

const sourceEnum = z.enum(["mail_auto", "share", "manual", "scan"]);

const geofenceSchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  radiusM: z.number().int().min(20).max(2000),
  placeName: z.string().max(500).nullable()
});

export const createCouponSchema = z.object({
  brand: z.string().min(1).max(255),
  title: z.string().min(1).max(500),
  code: z.string().min(1).max(2000),
  codeFormat: codeFormatEnum,
  codeImagePath: z.string().max(1000).nullable().optional(),
  /** 원본 이미지 자체 (카톡 기프티콘 등). base64 string. ~1MB 이내. */
  codeImageBase64: z.string().max(3_000_000).nullable().optional(),
  expiresAt: z.string().datetime().nullable().optional(),
  source: sourceEnum,
  sourceRef: z.string().max(255).nullable().optional(),
  geofence: geofenceSchema.nullable().optional(),
  notes: z.string().max(2000).nullable().optional()
});

export const updateCouponSchema = z
  .object({
    brand: z.string().min(1).max(255).optional(),
    title: z.string().min(1).max(500).optional(),
    expiresAt: z.string().datetime().nullable().optional(),
    geofence: geofenceSchema.nullable().optional(),
    notes: z.string().max(2000).nullable().optional(),
    used: z.boolean().optional()
  })
  .refine(value => Object.keys(value).length > 0, { message: "At least one field is required." });

export const listCouponsQuerySchema = z.object({
  status: z.enum(["active", "expiring_soon", "expired", "used", "all"]).optional()
});

export const couponIdParamSchema = z.object({
  id: z.string().uuid()
});

export const extractFromMessageSchema = z.object({
  messageId: z.string().min(1).max(200),
  language: z.enum(["ko", "en"]).optional().default("ko")
});

export const extractFromImageTextSchema = z.object({
  rawText: z.string().min(1).max(6000),
  language: z.enum(["ko", "en"]).optional().default("ko")
});
