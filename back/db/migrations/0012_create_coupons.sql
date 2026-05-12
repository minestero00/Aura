BEGIN;

-- Phase J — Aura Wallet. 사용자의 쿠폰/기프티콘/바코드 통합 관리.
-- 코드는 현금 등가물이므로 AES-256-GCM 암호화 후 TEXT(`enc:v1:...`)로 저장 —
-- encryption.ts pattern과 통일. UNIQUE(user_id, code_ciphertext) 로 중복 등록 차단.
-- 코드 참조: back/src/modules/wallet/service.ts.
--
-- 테이블은 명시적으로 aura.coupons에 생성 (우리 schema 소유).
-- FK는 users 테이블이 실제로 어느 schema에 있는지 모르므로(production에서
-- 발견: aura에 없고 다른 schema/search_path로 해결됨) DO 블록으로 동적
-- 검색해 추가. 둘 다 없으면 FK 없이 진행 — application-level enforcement.
-- 0001_init.sql의 users.id는 varchar(36) — coupons.user_id 동일 type.

CREATE TABLE IF NOT EXISTS aura.coupons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id varchar(36) NOT NULL,
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

DO $$
DECLARE
  target_schema text := NULL;
BEGIN
  -- 우선순위: aura → public → search_path의 첫 일치.
  SELECT table_schema INTO target_schema
    FROM information_schema.tables
   WHERE table_name = 'users'
     AND table_schema IN ('aura', 'public')
   ORDER BY CASE table_schema WHEN 'aura' THEN 1 ELSE 2 END
   LIMIT 1;

  IF target_schema IS NULL THEN
    -- 어느 schema에도 users가 없으면 FK 없이 진행. 데이터 무결성은
    -- application(auth flow)이 보장. 다음 마이그레이션에서 사후 추가 가능.
    RETURN;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'coupons_user_id_fkey'
  ) THEN
    EXECUTE format(
      'ALTER TABLE aura.coupons ADD CONSTRAINT coupons_user_id_fkey FOREIGN KEY (user_id) REFERENCES %I.users(id) ON DELETE CASCADE',
      target_schema
    );
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS coupons_user_status_idx
  ON aura.coupons (user_id, status);

CREATE INDEX IF NOT EXISTS coupons_user_expires_active_idx
  ON aura.coupons (user_id, expires_at)
  WHERE status = 'active';

CREATE INDEX IF NOT EXISTS coupons_user_geofence_idx
  ON aura.coupons (user_id)
  WHERE geofence_lat IS NOT NULL;

COMMIT;
