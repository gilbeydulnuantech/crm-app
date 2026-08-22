-- Generic "Automation" builder: Trigger -> optional If/Else -> Actions.
-- Backs the Automation page/modal (src/pages/Automations.tsx,
-- src/components/automations/CreateAutomationModal.tsx) and the two n8n
-- workflows Automations.json (CRUD) and Automation Engine.json (polling
-- executor). Unlike pipeline_stage_reminders/deal_document_flows (which are
-- hardcoded per-feature and were never given a tracked schema file), this
-- table set is deliberately generic across trigger_type so one engine
-- workflow can serve Contact/Company/Task/Calendar/Pipeline triggers.
--
-- condition_tree/trigger_config store {"field","operator","value"} JSON —
-- If/Else here is a single boolean expression per branch, not an arbitrary
-- graph, so a JSONB column is simpler to evaluate (in the Engine's code
-- node) and simpler to edit (in the React modal) than a normalized
-- conditions table.
--
-- Run once against the app's Postgres database, then import
-- n8n-workflows/Automations.json and n8n-workflows/Automation Engine.json.

CREATE TABLE IF NOT EXISTS automations (
  id              SERIAL PRIMARY KEY,
  name            VARCHAR(200) NOT NULL,
  trigger_type    VARCHAR(20) NOT NULL,   -- 'contact' | 'company' | 'task' | 'calendar' | 'pipeline'
  trigger_config  JSONB NOT NULL,          -- {"field","operator","value"}
  condition_tree  JSONB,                   -- nullable if/else condition, same shape as trigger_config
  is_active       BOOLEAN NOT NULL DEFAULT true,
  created_by      INTEGER REFERENCES users(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- One row per action, scoped to a branch of the condition tree.
-- branch: 'true' | 'false' when condition_tree is set, else 'default'.
CREATE TABLE IF NOT EXISTS automation_actions (
  id              SERIAL PRIMARY KEY,
  automation_id   INTEGER NOT NULL REFERENCES automations(id) ON DELETE CASCADE,
  branch          VARCHAR(10) NOT NULL DEFAULT 'default',
  action_type     VARCHAR(30) NOT NULL,   -- 'add_tag' | 'send_email' | 'send_team_notification' | 'send_sms'
  action_config   JSONB NOT NULL,          -- e.g. {"tag_name":"VIP"} or {"subject":"...","body":"..."}
  sort_order      INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_automation_actions_automation ON automation_actions (automation_id);

-- Dedupe + audit log: one row per (automation_id, action_id, entity_type,
-- entity_id) firing, so the polling engine never re-fires on the same
-- entity/action pair. Also backs the "last run" / run-history display and
-- the Test button's dry-run isn't written here (see test-automation).
--
-- 'send_team_notification' and 'send_sms' actions log with
-- status = 'unsupported' and are never actually executed — no backend
-- (Twilio, system notifications) exists for either yet.
CREATE TABLE IF NOT EXISTS automation_runs (
  id              SERIAL PRIMARY KEY,
  automation_id   INTEGER NOT NULL REFERENCES automations(id) ON DELETE CASCADE,
  action_id       INTEGER REFERENCES automation_actions(id) ON DELETE CASCADE,
  entity_type     VARCHAR(20) NOT NULL,
  entity_id       INTEGER NOT NULL,
  branch          VARCHAR(10),
  status          VARCHAR(20) NOT NULL,   -- 'success' | 'error' | 'unsupported' | 'test'
  detail          TEXT,
  ran_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_automation_runs_dedupe
  ON automation_runs (automation_id, action_id, entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_automation_runs_automation ON automation_runs (automation_id, ran_at DESC);
