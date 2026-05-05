CREATE TABLE news_clicks (
  id VARCHAR(36) PRIMARY KEY,
  user_id VARCHAR(36) NOT NULL,
  category VARCHAR(64) NOT NULL,
  article_url VARCHAR(2000),
  created_at TIMESTAMP NOT NULL,
  CONSTRAINT fk_news_clicks_user
    FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE INDEX idx_news_clicks_user_created
  ON news_clicks (user_id, created_at);
CREATE INDEX idx_news_clicks_user_category
  ON news_clicks (user_id, category);
