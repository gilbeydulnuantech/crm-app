-- Branding fields for the company profile settings form: address, website,
-- and a brand color used as the default accent wherever the company's own
-- branding appears (invoice templates, proposals, etc).
ALTER TABLE company_profile ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE company_profile ADD COLUMN IF NOT EXISTS website TEXT;
ALTER TABLE company_profile ADD COLUMN IF NOT EXISTS brand_color TEXT NOT NULL DEFAULT '#2563EB';
