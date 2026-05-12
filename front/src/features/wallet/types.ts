export type CodeFormat =
  | "barcode_ean13"
  | "barcode_code128"
  | "barcode_qr"
  | "barcode_other"
  | "text_only";

export type CouponStatus = "active" | "expiring_soon" | "expired" | "used";

export type CouponSource = "mail_auto" | "share" | "manual" | "scan";

export interface CouponGeofence {
  lat: number;
  lng: number;
  radiusM: number;
  placeName: string | null;
}

export interface Coupon {
  id: string;
  userId: string;
  brand: string;
  title: string;
  codeFormat: CodeFormat;
  codeImagePath: string | null;
  expiresAt: string | null;
  source: CouponSource;
  sourceRef: string | null;
  status: CouponStatus;
  usedAt: string | null;
  geofence: CouponGeofence | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateCouponInput {
  brand: string;
  title: string;
  code: string;
  codeFormat: CodeFormat;
  codeImagePath?: string | null;
  /** 원본 이미지 base64 — 카톡 기프티콘 등 바코드 이미지 그대로 보존 (풀스크린에 그대로 표시). */
  codeImageBase64?: string | null;
  expiresAt?: string | null;
  source: CouponSource;
  sourceRef?: string | null;
  geofence?: CouponGeofence | null;
  notes?: string | null;
}

export interface UpdateCouponInput {
  brand?: string;
  title?: string;
  expiresAt?: string | null;
  geofence?: CouponGeofence | null;
  notes?: string | null;
  used?: boolean;
}
