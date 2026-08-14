-- Per-record activity timeline for ContactDetailModal / CompanyDetailModal
-- (Calls, Meetings, System Audit tabs). Distinct from activity_log_schema.sql,
-- which only feeds the Dashboard's global "Recent Activity" feed and has a
-- different shape (verb/entity_name, no category/subtype/detail) — that
-- table is left untouched. Run this once against the app's Postgres database
-- (n8n doesn't run DDL itself), then import/refresh:
--   - n8n-workflows/Entity Activity Log.json (get-entity-activity, add-entity-activity)
--   - n8n-workflows/contacts-update.json (field-change audit rows)
--   - n8n-workflows/Users_ Assignment.json (ownership-change audit rows)
--
-- category: 'call' | 'meeting' | 'system_audit'  (email is NOT stored here —
--   it already lives in contacts.email_logs and the frontend merges it in).
-- subtype examples:
--   call            -> 'manual' (logged by a rep from the Call button;
--                       telephony/Zoom integrations would add more subtypes)
--   meeting         -> 'calendar_sync' | 'video_call' | 'physical' | 'transcript'
--                       (no integration writes these yet — schema is ready,
--                       wiring Google Calendar/Outlook/Zoom/Teams is a
--                       separate follow-up project)
--   system_audit    -> 'field_change' | 'automation' | 'ownership_change' |
--                       'integration_sync' | 'permission'
--                       (field_change and ownership_change are wired for
--                       real; automation/integration_sync/permission have no
--                       producer yet — e.g. no HubSpot/Mailchimp sync exists
--                       in this codebase — but the shape is ready for one)
CREATE TABLE IF NOT EXISTS entity_activity_log (
  id SERIAL PRIMARY KEY,
  entity_type VARCHAR(20) NOT NULL,   -- 'contact' | 'company'
  entity_id INTEGER NOT NULL,
  category VARCHAR(20) NOT NULL,
  subtype VARCHAR(30),
  summary TEXT NOT NULL,
  detail JSONB,
  actor_id INTEGER REFERENCES users(id),
  actor_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_entity_activity_log_entity
  ON entity_activity_log (entity_type, entity_id, created_at DESC);
