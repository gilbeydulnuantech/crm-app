-- Backs the new Automation feature's Contact trigger ("Birthdate" / "Age"
-- fields — see automations_schema.sql). Age is NOT stored: it's computed on
-- the fly (in the Automation Engine's condition evaluator, and wherever the
-- frontend needs to display it) from birthdate, same as Task "overdue" is
-- computed rather than stored elsewhere in this codebase. get-contacts
-- already does `SELECT c.*`, so no workflow change is needed there once this
-- column exists; only add-contact and update-contact need wiring if a
-- birthdate form field is ever added to the Contact UI.
-- Run once against the app's Postgres database.
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS birthdate DATE;
