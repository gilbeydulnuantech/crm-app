-- Company-wide clock display (Settings > Timezone): '12h' (3:30 PM) or '24h' (15:30).
ALTER TABLE company_profile ADD COLUMN IF NOT EXISTS time_format TEXT NOT NULL DEFAULT '12h';
ALTER TABLE company_profile DROP CONSTRAINT IF EXISTS company_profile_time_format_check;
ALTER TABLE company_profile ADD CONSTRAINT company_profile_time_format_check CHECK (time_format IN ('12h', '24h'));
