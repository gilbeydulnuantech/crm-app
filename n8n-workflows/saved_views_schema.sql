-- Personal saved filter combinations for list pages (Contacts today;
-- entity_type is free-text so Companies/Pipeline etc. can reuse this same
-- table later without a migration). Always self-owned — no admin override,
-- since a saved view is just a personal shortcut, not a managed record.
-- Run this once against the app's Postgres database, then import/refresh
-- n8n-workflows/Saved Views.json.
CREATE TABLE IF NOT EXISTS saved_views (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  entity_type VARCHAR(20) NOT NULL,
  name VARCHAR(100) NOT NULL,
  filters JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_saved_views_user ON saved_views (user_id, entity_type);
