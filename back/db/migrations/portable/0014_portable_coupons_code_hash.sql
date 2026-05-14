-- Portable mirror of 0014_coupons_code_hash.sql.
-- PG/Oracle 호환: ALTER TABLE ADD COLUMN + DROP CONSTRAINT + CREATE UNIQUE INDEX
-- 셋 다 두 시스템에서 호환. bytea/RAW 타입만 환경별 매핑 필요.

ALTER TABLE aura.coupons ADD code_hash bytea;

ALTER TABLE aura.coupons DROP CONSTRAINT coupons_unique_per_user;

CREATE UNIQUE INDEX coupons_unique_per_user_hash
  ON aura.coupons (user_id, code_hash);
