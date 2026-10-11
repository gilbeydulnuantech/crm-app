-- Industry presets + online booking with a chosen provider.
ALTER TABLE company_profile ADD COLUMN IF NOT EXISTS industry TEXT;                    -- roofing | spa_salon | dental | generic | NULL (not chosen yet)
ALTER TABLE company_profile ADD COLUMN IF NOT EXISTS staff_enabled BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE company_profile ADD COLUMN IF NOT EXISTS online_provider_choice BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE company_profile ADD COLUMN IF NOT EXISTS staff_label TEXT NOT NULL DEFAULT 'Therapist';
-- Opening hours of the online booking page: hours are whole hours (start 9, end 17 = 9am to 5pm), days 0=Sunday..6=Saturday.
ALTER TABLE company_profile ADD COLUMN IF NOT EXISTS booking_hours JSONB NOT NULL DEFAULT '{"start":9,"end":17,"days":[1,2,3,4,5],"slot_minutes":60,"lead_hours":2,"window_days":14}'::jsonb;
ALTER TABLE staff_members ADD COLUMN IF NOT EXISTS bookable_online BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE products ADD COLUMN IF NOT EXISTS bookable_online BOOLEAN NOT NULL DEFAULT false;
-- This install already uses staff, so keep the Staff features on until the admin picks an industry.
UPDATE company_profile SET staff_enabled = true WHERE id = 1 AND industry IS NULL;

-- Services are offered on the public booking page by default (untick one in Products to hide it).
ALTER TABLE products ALTER COLUMN bookable_online SET DEFAULT true;
UPDATE products SET bookable_online = true WHERE bookable_online = false;
