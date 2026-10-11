import { apiFetch } from './client';

export interface MessagingSettings {
  success: boolean;
  enabled: boolean;
  channel_order: 'whatsapp_sms' | 'whatsapp' | 'sms';
  hours_before: number[];
  default_country_code: string;
  wa_phone_number_id: string | null;
  has_wa_token: boolean;
  wa_template_name: string | null;
  wa_template_lang: string | null;
  sms_provider: string | null;
  has_sms_key: boolean;
  sms_sender: string | null;
  sms_template: string;
}

export interface ReminderLogRow {
  id: number;
  activity_id: number;
  hours_before: number;
  channel: string | null;
  status: string;
  detail: string | null;
  created_at: string;
  subject: string | null;
  due_at: string | null;
  client: string | null;
}

// Token and key fields are write-only: leave them out to keep the stored value.
export interface MessagingSavePayload {
  enabled?: boolean;
  channel_order?: string;
  hours_before?: number[];
  default_country_code?: string;
  wa_phone_number_id?: string;
  wa_token?: string;
  clear_wa_token?: boolean;
  wa_template_name?: string;
  wa_template_lang?: string;
  sms_api_key?: string;
  clear_sms_key?: boolean;
  sms_sender?: string;
  sms_template?: string;
}

export function fetchMessagingSettings() {
  return apiFetch<MessagingSettings>('/webhook/get-messaging-settings');
}

export function saveMessagingSettings(payload: MessagingSavePayload) {
  return apiFetch<{ success: boolean; error?: string }>('/webhook/save-messaging-settings', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function sendTestMessage(payload: { channel: 'whatsapp' | 'sms'; to: string }) {
  return apiFetch<{ success?: boolean; status?: string; detail?: string; error?: string }>('/webhook/send-test-message', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function fetchReminderLog() {
  return apiFetch<ReminderLogRow[]>('/webhook/get-reminder-log');
}
