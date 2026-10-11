-- Calendar event confirmation is now an automation rule ("Calendar - Event confirmation email").
-- notify_contact is the per-event "Send confirmation to contact" checkbox from the New Event form.
ALTER TABLE activities ADD COLUMN IF NOT EXISTS notify_contact BOOLEAN NOT NULL DEFAULT false;
