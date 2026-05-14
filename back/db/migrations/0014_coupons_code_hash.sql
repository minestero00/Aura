BEGIN;

-- Phase J dedup fix — AES-256-GCM은 매 호출마다 random IV로 다른 ciphertext를
-- 생성해서 기존 UNIQUE(user_id, code_ciphertext)가 실질적으로 작동하지 않았다.
-- 같은 평문 code도 매번 새 row로 들어가는 버그 → SHA-256(plaintext code) hash를
-- 별도 컬럼으로 추가하고 그것으로 dedup.
--
-- code_hash는 deterministic(같은 plaintext → 같은 hash). brute force는
-- secret hash(HMAC + pepper) 등으로 강화 가능하지만, 우선 평문 dedup 목적만.
-- code_ciphertext 컬럼은 기존 reveal flow 그대로 유지.

ALTER TABLE aura.coupons ADD COLUMN IF NOT EXISTS code_hash bytea;

-- 기존 unique constraint 제거 (실질 효과 없었던 ciphertext 기반).
ALTER TABLE aura.coupons DROP CONSTRAINT IF EXISTS coupons_unique_per_user;

-- 새 unique index — code_hash가 채워진 row만 적용 (legacy NULL row는 통과).
-- 새로 등록되는 모든 쿠폰은 code_hash 채워지므로 정상 dedup.
CREATE UNIQUE INDEX IF NOT EXISTS coupons_unique_per_user_hash
  ON aura.coupons (user_id, code_hash)
  WHERE code_hash IS NOT NULL;

COMMIT;
