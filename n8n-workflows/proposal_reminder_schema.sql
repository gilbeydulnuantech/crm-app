ALTER TABLE deal_document_flows
  ADD COLUMN IF NOT EXISTS proposal_reminder_delay_hours INT,
  ADD COLUMN IF NOT EXISTS proposal_reminder_email_subject TEXT,
  ADD COLUMN IF NOT EXISTS proposal_reminder_email_body TEXT;

ALTER TABLE proposals
  ADD COLUMN IF NOT EXISTS reminder_sent_at TIMESTAMPTZ;
