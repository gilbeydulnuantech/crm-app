ALTER TABLE opportunities
  ADD COLUMN IF NOT EXISTS maintenance_interval_months INT,
  ADD COLUMN IF NOT EXISTS last_maintenance_followup_at TIMESTAMPTZ;
