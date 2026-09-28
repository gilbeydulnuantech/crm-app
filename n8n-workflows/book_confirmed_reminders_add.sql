-- Tracks which appointment-reminder step (24h / 2h before the meeting)
-- has already been sent for a given activity, so the "Book confirmed:
-- email reminders" n8n workflow doesn't resend the same step on a later
-- poll. The workflow itself also runs this as CREATE TABLE IF NOT EXISTS
-- on every execution, so applying this file by hand is optional.
CREATE TABLE IF NOT EXISTS booking_confirmed_reminders (
  id SERIAL PRIMARY KEY,
  activity_id INTEGER NOT NULL REFERENCES activities(id) ON DELETE CASCADE,
  contact_id INTEGER NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  reminder_step TEXT NOT NULL,
  sent_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (activity_id, reminder_step)
);
