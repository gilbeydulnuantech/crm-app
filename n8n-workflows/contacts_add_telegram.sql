-- Telegram as a messaging channel next to SMS.
--
-- A Telegram bot can only message someone who has started a chat with it, and
-- it can't be pointed at a phone number — so a contact has to link themselves
-- through a personal deep link (https://t.me/<bot>?start=<telegram_link_token>).
-- The inbound Telegram workflow stores their chat id here when they press Start.
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS telegram_chat_id BIGINT;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS telegram_linked_at TIMESTAMPTZ;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS telegram_link_token TEXT DEFAULT replace(gen_random_uuid()::text, '-', '');
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS dnc_telegram BOOLEAN NOT NULL DEFAULT false;

CREATE UNIQUE INDEX IF NOT EXISTS idx_contacts_telegram_link_token ON contacts (telegram_link_token) WHERE telegram_link_token IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_contacts_telegram_chat_id ON contacts (telegram_chat_id) WHERE telegram_chat_id IS NOT NULL;
