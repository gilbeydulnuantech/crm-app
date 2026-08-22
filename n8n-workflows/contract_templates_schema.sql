CREATE TABLE IF NOT EXISTS contract_templates (
  id SERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  content_html TEXT NOT NULL DEFAULT '',
  total_amount NUMERIC NOT NULL DEFAULT 0,
  email_subject TEXT NOT NULL DEFAULT '',
  email_body TEXT NOT NULL DEFAULT '',
  created_by INT REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
