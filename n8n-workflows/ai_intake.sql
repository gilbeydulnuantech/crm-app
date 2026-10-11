-- AI Email Intake (n8n workflow "AI Email Intake"): dedupe log, service-area ZIPs, ticket escalation columns.
CREATE TABLE IF NOT EXISTS ai_intake_log (
  id SERIAL PRIMARY KEY,
  message_id TEXT NOT NULL UNIQUE,
  from_email TEXT,
  subject TEXT,
  source TEXT,
  status TEXT NOT NULL DEFAULT 'processing',
  contact_id INTEGER,
  ticket_id INTEGER,
  result JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
-- Service-area check: an empty table means "not configured" (every ZIP is treated as unknown, never rejected).
CREATE TABLE IF NOT EXISTS service_zip_codes (
  zip TEXT PRIMARY KEY,
  label TEXT
);
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS source TEXT;
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS escalated_at TIMESTAMPTZ;
CREATE INDEX IF NOT EXISTS idx_tickets_escalation ON tickets (priority, status) WHERE source = 'ai_intake';
