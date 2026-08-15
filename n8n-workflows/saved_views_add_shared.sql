-- Adds team-shared saved views on top of saved_views_schema.sql. A shared
-- view is visible to every user for that entity_type, not just its creator
-- — but stays deletable only by whoever created it (the existing
-- "DELETE ... WHERE user_id = $requester" clause in delete-saved-view
-- already enforces that with zero changes, since is_shared doesn't affect
-- ownership). Run once against the app's Postgres database, then
-- import/refresh n8n-workflows/Saved Views.json.
ALTER TABLE saved_views ADD COLUMN IF NOT EXISTS is_shared BOOLEAN NOT NULL DEFAULT false;
