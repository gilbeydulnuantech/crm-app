-- Tracks every run of any n8n workflow that touches contacts, companies,
-- opportunities/deals, pipeline stages, activities (tasks + calendar), or
-- deal documents/contracts — written by the shared "Log Workflow Run"
-- sub-workflow (n8n-workflows/Log Workflow Run.json), called via Execute
-- Workflow right after each qualifying workflow's trigger fires. Read back
-- through Automation Logs.json's get-workflow-run-logs endpoint.
CREATE TABLE IF NOT EXISTS workflow_run_log (
  id SERIAL PRIMARY KEY,
  workflow_name TEXT NOT NULL,
  workflow_id TEXT NOT NULL,
  entity_type TEXT,
  run_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS workflow_run_log_run_at_idx ON workflow_run_log (run_at);
CREATE INDEX IF NOT EXISTS workflow_run_log_workflow_id_idx ON workflow_run_log (workflow_id);
