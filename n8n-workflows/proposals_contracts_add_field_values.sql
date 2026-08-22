ALTER TABLE proposals ADD COLUMN IF NOT EXISTS field_values jsonb NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS field_values jsonb NOT NULL DEFAULT '{}'::jsonb;
