import { apiFetch } from './client';

export interface EnrichContactResult {
  success: boolean;
  found_email: boolean;
  found_phone: boolean;
  renamed: boolean;
  contact: { id: number; first_name: string; last_name: string | null; email: string | null; phone: string | null };
  error?: string;
}

export function enrichContact(contactId: number) {
  return apiFetch<EnrichContactResult>('/webhook/enrich-contact', {
    method: 'POST',
    body: JSON.stringify({ contact_id: contactId }),
  });
}
