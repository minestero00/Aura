CREATE TABLE coupons (
  id VARCHAR(36) PRIMARY KEY,
  user_id VARCHAR(36) NOT NULL,
  brand VARCHAR(255) NOT NULL,
  title VARCHAR(500) NOT NULL,
  code_ciphertext VARCHAR(2000) NOT NULL,
  code_format VARCHAR(32) NOT NULL,
  code_image_path VARCHAR(1000),
  expires_at TIMESTAMP,
  source VARCHAR(32) NOT NULL,
  source_ref VARCHAR(255),
  status VARCHAR(32) NOT NULL,
  used_at TIMESTAMP,
  geofence_lat DOUBLE PRECISION,
  geofence_lng DOUBLE PRECISION,
  geofence_radius_m INTEGER,
  geofence_place_name VARCHAR(500),
  notes VARCHAR(2000),
  created_at TIMESTAMP NOT NULL,
  updated_at TIMESTAMP NOT NULL,
  CONSTRAINT coupons_unique_per_user UNIQUE (user_id, code_ciphertext)
);

CREATE INDEX idx_coupons_user_status
  ON coupons (user_id, status);

CREATE INDEX idx_coupons_user_expires
  ON coupons (user_id, expires_at);

CREATE INDEX idx_coupons_user_geofence
  ON coupons (user_id, geofence_lat);
