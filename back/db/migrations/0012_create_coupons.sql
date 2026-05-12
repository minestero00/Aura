BEGIN;

-- Phase J — Aura Wallet. 사용자의 쿠폰/기프티콘/바코드 통합 관리.
-- 코드는 현금 등가물이므로 AES-256-GCM 암호화 후 TEXT(`enc:v1:...`)로 저장 —
-- encryption.ts pattern과 통일. UNIQUE(user_id, code_ciphertext) 로 중복 등록 차단.
-- 코드 참조: back/src/modules/wallet/service.ts.

CREATE TABLE IF NOT EXISTS coupons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  brand text NOT NULL,
  title text NOT NULL,
  code_ciphertext text NOT NULL,
  code_format text NOT NULL,
  code_image_path text,
  expires_at timestamptz,
  source text NOT NULL,
  source_ref text,
  status text NOT NULL DEFAULT 'active',
  used_at timestamptz,
  geofence_lat double precision,
  geofence_lng double precision,
  geofence_radius_m integer DEFAULT 200,
  geofence_place_name text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT coupons_unique_per_user UNIQUE (user_id, code_ciphertext)
);

CREATE INDEX IF NOT EXISTS coupons_user_status_idx
  ON coupons (user_id, status);

CREATE INDEX IF NOT EXISTS coupons_user_expires_active_idx
  ON coupons (user_id, expires_at)
  WHERE status = 'active';

CREATE INDEX IF NOT EXISTS coupons_user_geofence_idx
  ON coupons (user_id)
  WHERE geofence_lat IS NOT NULL;

COMMIT;
