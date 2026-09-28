-- Extends automation_actions to support a condition nested ANYWHERE in an
-- automation's step sequence, not just once right after the trigger.
--
-- Previously: automations.condition_tree was a single top-level condition,
-- and every automation_actions row's `branch` ('true'|'false'|'default')
-- referred to that ONE condition. A rep couldn't put "action, action, then
-- a condition, then more actions" in one automation — the condition always
-- had to be the very first fork.
--
-- Now: a `condition` is just another automation_actions row (action_type =
-- 'condition', action_config = {field, operator, value} — same shape
-- trigger_config/condition_tree always used). Every other row can be
-- nested under one via parent_step_key, so a condition can appear at any
-- depth, any number of times.
--
-- step_key/parent_step_key are plain client-assigned integers, NOT a
-- database foreign key to automation_actions.id — the frontend assigns a
-- unique step_key to every step (root actions AND conditions) when saving,
-- and points a nested step's parent_step_key at its enclosing condition's
-- step_key. This sidesteps needing multi-pass inserts to capture
-- DB-generated ids before children can reference them (n8n's Postgres
-- node runs one INSERT per item via Automations.json's Expand Actions ->
-- Insert Action pattern, with no easy way to thread a just-inserted id
-- into a later item in the same batch).
--
-- `branch` keeps its existing meaning, just generalized: for a row with
-- parent_step_key set, it's which side of THAT condition the row lives on
-- ('true'/'false'). Root-level rows (parent_step_key IS NULL) keep
-- 'default', unchanged from before.
--
-- Run once against the app's Postgres database, then redeploy
-- n8n-workflows/Automations.json and n8n-workflows/Automation Engine.json.

ALTER TABLE automation_actions
  ADD COLUMN IF NOT EXISTS step_key INTEGER,
  ADD COLUMN IF NOT EXISTS parent_step_key INTEGER;

-- Backfill: every pre-existing row was root-level and flat, so its own
-- (globally unique) id is a perfectly valid step_key, and parent_step_key
-- correctly stays NULL.
UPDATE automation_actions SET step_key = id WHERE step_key IS NULL;

ALTER TABLE automation_actions ALTER COLUMN step_key SET NOT NULL;
