-- No manual migration needed for this one — Tasks.json is self-migrating:
-- the "Postgres: Ensure Task Columns (get/add/update)" nodes run this exact
-- ALTER TABLE / CREATE TABLE IF NOT EXISTS block on every get-tasks,
-- add-task, and update-task call, so the columns/tables below provision
-- themselves the first time you re-import and hit any of those endpoints.
-- Kept here only as a reference for what actually landed on `activities`.

ALTER TABLE activities ADD COLUMN IF NOT EXISTS priority VARCHAR(20) DEFAULT 'Medium';
ALTER TABLE activities ADD COLUMN IF NOT EXISTS task_type VARCHAR(50);
ALTER TABLE activities ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'to_do';
ALTER TABLE activities ADD COLUMN IF NOT EXISTS account_id INTEGER;
ALTER TABLE activities ADD COLUMN IF NOT EXISTS sla_tier VARCHAR(50);
ALTER TABLE activities ADD COLUMN IF NOT EXISTS is_private BOOLEAN DEFAULT false;
ALTER TABLE activities ADD COLUMN IF NOT EXISTS reminder_minutes_before INTEGER;
ALTER TABLE activities ADD COLUMN IF NOT EXISTS is_archived BOOLEAN DEFAULT false;
ALTER TABLE activities ADD COLUMN IF NOT EXISTS archived_at TIMESTAMP;
ALTER TABLE activities ADD COLUMN IF NOT EXISTS edit_reason TEXT;

CREATE TABLE IF NOT EXISTS task_subtasks (
  id SERIAL PRIMARY KEY,
  task_id INTEGER NOT NULL REFERENCES activities(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  is_completed BOOLEAN NOT NULL DEFAULT false,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS task_attachments (
  id SERIAL PRIMARY KEY,
  task_id INTEGER NOT NULL REFERENCES activities(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  url TEXT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS task_watchers (
  task_id INTEGER NOT NULL REFERENCES activities(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  PRIMARY KEY (task_id, user_id)
);

-- New webhooks added to Tasks.json: get-archived-tasks, archive-tasks,
-- restore-tasks, set-task-subtasks, set-task-attachments, set-task-watchers.
-- Comments/activity reuse the existing generic notes system
-- (entity_type='task', entity_id=<task id>) — no backend change needed there.
