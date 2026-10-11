-- WhatsApp / SMS appointment reminders.
CREATE TABLE IF NOT EXISTS messaging_settings (
  id INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  enabled BOOLEAN NOT NULL DEFAULT false,
  channel_order TEXT NOT NULL DEFAULT 'whatsapp_sms' CHECK (channel_order IN ('whatsapp_sms', 'whatsapp', 'sms')),
  hours_before INTEGER[] NOT NULL DEFAULT '{24,2}',
  default_country_code TEXT NOT NULL DEFAULT '7',
  -- WhatsApp Business Cloud API (Meta). Reminders go out as an approved template with 5 variables:
  -- {{1}} client name, {{2}} service, {{3}} date, {{4}} time, {{5}} staff member (or a dash).
  wa_phone_number_id TEXT,
  wa_token TEXT,
  wa_template_name TEXT,
  wa_template_lang TEXT NOT NULL DEFAULT 'ru',
  -- SMS
  sms_provider TEXT NOT NULL DEFAULT 'mobizon' CHECK (sms_provider IN ('mobizon')),
  sms_api_key TEXT,
  sms_sender TEXT,
  sms_template TEXT NOT NULL DEFAULT 'Hello {{client_name}}, a reminder of your {{service}} on {{date}} at {{time}}{{staff_part}}. {{company}}',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
INSERT INTO messaging_settings (id) VALUES (1) ON CONFLICT DO NOTHING;

CREATE TABLE IF NOT EXISTS appointment_reminders (
  id SERIAL PRIMARY KEY,
  activity_id INTEGER NOT NULL REFERENCES activities(id) ON DELETE CASCADE,
  hours_before INTEGER NOT NULL,
  channel TEXT,                      -- whatsapp | sms
  status TEXT NOT NULL DEFAULT 'sending',   -- sending | sent | failed
  detail TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  sent_at TIMESTAMPTZ,
  UNIQUE (activity_id, hours_before)
);
