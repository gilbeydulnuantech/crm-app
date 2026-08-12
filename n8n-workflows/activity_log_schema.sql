-- Activity feed schema for the Dashboard's "Recent Activity" card. Run this
-- once against the app's Postgres database — n8n doesn't run DDL itself
-- (same convention as team_chat_schema.sql and the lost_reason column).

CREATE TABLE IF NOT EXISTS activity_log (
  id SERIAL PRIMARY KEY,
  actor_id INTEGER REFERENCES users(id),
  verb VARCHAR(30) NOT NULL,         -- 'moved' | 'created' | 'completed' | 'archived' | 'noted'
  entity_type VARCHAR(20) NOT NULL,  -- 'opportunity' | 'contact' | 'task'
  entity_id INTEGER NOT NULL,
  entity_name TEXT,                  -- cached display name so the feed never needs a heavy join
  detail TEXT,                       -- e.g. "Proposal Sent → Contract Signed"
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_activity_log_created ON activity_log (created_at DESC);
