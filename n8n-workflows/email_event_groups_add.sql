-- Backs the "Event" grouping feature in the Email Templates panel — lets a
-- user name a group (e.g. "Event: Contact Booked — Confirmed") and list
-- which trigger_event values belong to it, in send order. Purely
-- organizational metadata: it doesn't change what n8n actually does, only
-- how the Email Templates panel displays/groups existing templates.
CREATE TABLE IF NOT EXISTS email_event_groups (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  trigger_events JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
