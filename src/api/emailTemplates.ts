import { apiFetch } from './client';

export interface EmailTemplate {
  id: number;
  name: string;
  trigger_event: string | null;
  subject: string;
  body: string;
  is_active: boolean;
  created_by: number | null;
  created_by_name: string | null;
  created_at: string;
  updated_at: string;
}

export function fetchEmailTemplates() {
  return apiFetch<EmailTemplate[]>('/webhook/get-email-templates');
}

export interface SaveEmailTemplatePayload {
  id?: number;
  name: string;
  trigger_event?: string | null;
  subject: string;
  body: string;
}

export function saveEmailTemplate(payload: SaveEmailTemplatePayload) {
  return apiFetch<{ success: boolean; id?: number; error?: string }>('/webhook/save-email-template', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function setEmailTemplateActive(id: number, is_active: boolean) {
  return apiFetch<{ success: boolean; error?: string }>('/webhook/update-email-template-active', {
    method: 'POST',
    body: JSON.stringify({ id, is_active }),
  });
}

export function deleteEmailTemplate(id: number) {
  return apiFetch<{ success: boolean; error?: string }>('/webhook/delete-email-template', {
    method: 'POST',
    body: JSON.stringify({ id }),
  });
}

export interface SendEmailTemplatePayload {
  to: string;
  subject: string;
  message: string;
  contact_id: number;
}

// Hits the contacts-mail-send n8n workflow directly (see
// n8n-workflows/contacts-mail-send.json) — it expects `to`/`subject`/
// `message`/`contact_id` on the webhook body and logs the send onto that
// contact's email_logs, so a real contact_id is required.
export function sendEmailTemplate(payload: SendEmailTemplatePayload) {
  return apiFetch<{ status: string; email_logs?: unknown }>('/webhook/send-email', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}
