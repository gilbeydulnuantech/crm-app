-- Adds per-channel Do Not Contact flags (Email / Call / SMS) used by the DND
-- dropdown in ContactDetailModal. Run this against the Postgres DB the
-- Contacts n8n workflows talk to, then re-import/refresh
-- n8n-workflows/contact_ add.json and n8n-workflows/contacts-update.json
-- (Validate/Parse Token & Payload and Build Insert/Update Query nodes were
-- updated to read/write these). contacts-show-to-UI.json needs no change
-- since it already does SELECT c.*.
ALTER TABLE contacts
  ADD COLUMN IF NOT EXISTS dnc_email boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS dnc_call boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS dnc_sms boolean NOT NULL DEFAULT false;
