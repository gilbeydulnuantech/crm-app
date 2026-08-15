-- The frontend has carried a `timezone` field on Contact since the
-- secondary_email/secondary_phone/linkedin_url wave, but no backend column
-- ever backed it — it always rendered "--" (see ContactDetailModal's
-- DetailField). get-contacts already does `SELECT c.*`, so no workflow
-- change is needed there once this column exists; only add-contact and
-- update-contact need wiring (done in contact_ add.json / contacts-update.json).
-- Run once against the app's Postgres database.
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS timezone VARCHAR(64);
