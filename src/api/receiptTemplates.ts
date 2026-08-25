import { apiFetch } from './client';

export interface ReceiptTemplate {
  id: number;
  name: string;
  subject: string;
  body: string;
  is_active: boolean;
  created_by: number | null;
  created_by_name: string | null;
  created_at: string;
  updated_at: string;
}

export function fetchReceiptTemplates() {
  return apiFetch<ReceiptTemplate[]>('/webhook/get-receipt-templates');
}

export interface SaveReceiptTemplatePayload {
  id?: number;
  name: string;
  subject: string;
  body: string;
}

export function saveReceiptTemplate(payload: SaveReceiptTemplatePayload) {
  return apiFetch<{ success: boolean; id?: number; error?: string }>('/webhook/save-receipt-template', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function setReceiptTemplateActive(id: number, is_active: boolean) {
  return apiFetch<{ success: boolean; error?: string }>('/webhook/update-receipt-template-active', {
    method: 'POST',
    body: JSON.stringify({ id, is_active }),
  });
}

export function deleteReceiptTemplate(id: number) {
  return apiFetch<{ success: boolean; error?: string }>('/webhook/delete-receipt-template', {
    method: 'POST',
    body: JSON.stringify({ id }),
  });
}
