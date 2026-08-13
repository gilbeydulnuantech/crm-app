-- Adds the Description / Source / Priority fields used by the redesigned
-- deal form (DealFormModal). Run this against the Postgres DB the Pipeline
-- n8n workflow talks to, then re-import/refresh n8n-workflows/Pipeline.json
-- (Insert/Update/Select Opportunity nodes were updated to read/write these).
ALTER TABLE opportunities
  ADD COLUMN IF NOT EXISTS description text,
  ADD COLUMN IF NOT EXISTS source text,
  ADD COLUMN IF NOT EXISTS priority text;
