BEGIN;

-- Phase J.3.e — 쿠폰 원본 이미지 자체 저장.
-- 카톡 기프티콘 등 사용자가 받은 바코드 이미지를 그대로 보관해 매장에서
-- 점원이 직접 스캔하게 함. OCR 텍스트(`code_ciphertext`)만으로는 부족 —
-- 바코드 SVG 렌더 라이브러리 의존 회피.
--
-- 1차 단순 구현: DB에 base64 string으로 저장. 평균 카톡 기프티콘 ~500KB,
-- base64 ~700KB. 추후 J.3.f에서 Supabase Storage로 마이그레이션 시
-- 동일 인터페이스 유지 가능 — 그 때는 path만 저장.

ALTER TABLE aura.coupons
  ADD COLUMN IF NOT EXISTS code_image_base64 text;

COMMIT;
