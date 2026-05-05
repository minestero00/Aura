BEGIN;

CREATE TABLE news_clicks (
  id varchar(36) PRIMARY KEY,
  user_id varchar(36) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  category text NOT NULL,
  article_url text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX news_clicks_user_created_idx
  ON news_clicks (user_id, created_at DESC);

CREATE INDEX news_clicks_user_category_idx
  ON news_clicks (user_id, category);

COMMIT;
