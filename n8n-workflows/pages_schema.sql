CREATE TABLE IF NOT EXISTS pages (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  content_html TEXT NOT NULL DEFAULT '',
  created_by INT REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
