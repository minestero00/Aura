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

/** 평문 코드는 별도 endpoint(`GET /wallet/coupons/:id/code`)에서만 노출. */
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

export interface CouponInsert {
  userId: string;
  brand: string;
  title: string;
  code: string;
  codeFormat: CodeFormat;
  codeImagePath: string | null;
  expiresAt: string | null;
  source: CouponSource;
  sourceRef: string | null;
  geofence: CouponGeofence | null;
  notes: string | null;
}

export interface CouponPatch {
  brand?: string;
  title?: string;
  expiresAt?: string | null;
  geofence?: CouponGeofence | null;
  notes?: string | null;
  used?: boolean;
}

export interface CouponListFilter {
  status?: CouponStatus | "all";
}
