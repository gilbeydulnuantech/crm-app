CREATE TABLE IF NOT EXISTS email_templates (
  id serial PRIMARY KEY,
  name text NOT NULL,
  trigger_event text,
  subject text NOT NULL,
  body text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_by integer REFERENCES users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS email_templates_trigger_event_idx ON email_templates (trigger_event) WHERE trigger_event IS NOT NULL;
