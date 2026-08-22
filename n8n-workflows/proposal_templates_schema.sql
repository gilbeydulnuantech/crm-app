CREATE TABLE IF NOT EXISTS proposal_templates (
  id SERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  content_html TEXT NOT NULL DEFAULT '',
  email_subject TEXT NOT NULL DEFAULT '',
  email_body TEXT NOT NULL DEFAULT '',
  created_by INT REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
