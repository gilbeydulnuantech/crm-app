import { apiFetch } from './client';
import { InvoiceLineItemInput } from './payments';

// Appearance settings for the invoice document — only the active template's
// settings are ever actually applied (same single-active-config convention
// as receipt_templates); every other template's settings sit unused until
// someone activates it. Non-color/text fields fall back to DEFAULT_INVOICE_TEMPLATE_SETTINGS
// wherever a value is missing, so older templates saved before a field
// existed still render fine.
export interface InvoiceTemplateSettings {
  page_size: 'A4' | 'Letter';
  orientation: 'portrait' | 'landscape';
  primary_color: string;
  font_family: string;
  font_size: number;
  page_margin: number;
  section_spacing: number;
  table_header_bg: string;
  table_header_text: string;
  table_row_bg: string;
  table_alt_row_bg: string;
  show_footer: boolean;
  show_page_number: boolean;
  show_company_info: boolean;
  show_bill_to: boolean;
  show_ship_to: boolean;
  show_payment_instructions: boolean;
  show_notes: boolean;
  show_terms: boolean;
}

export const DEFAULT_INVOICE_TEMPLATE_SETTINGS: InvoiceTemplateSettings = {
  page_size: 'A4',
  orientation: 'portrait',
  primary_color: '#2563EB',
  font_family: 'Inter',
  font_size: 12,
  page_margin: 20,
  section_spacing: 16,
  table_header_bg: '#EFF6FF',
  table_header_text: '#1E40AF',
  table_row_bg: '#FFFFFF',
  table_alt_row_bg: '#F8FAFC',
  show_footer: true,
  show_page_number: true,
  show_company_info: true,
  show_bill_to: true,
  show_ship_to: true,
  show_payment_instructions: true,
  show_notes: true,
  show_terms: true,
};

export interface InvoiceTemplate {
  id: number;
  name: string;
  line_items: InvoiceLineItemInput[];
  settings: Partial<InvoiceTemplateSettings>;
  is_active: boolean;
  created_by: number | null;
  created_by_name: string | null;
  created_at: string;
  updated_at: string;
}

export function fetchInvoiceTemplates() {
  return apiFetch<InvoiceTemplate[]>('/webhook/get-invoice-templates');
}

export interface SaveInvoiceTemplatePayload {
  id?: number;
  name: string;
  line_items: InvoiceLineItemInput[];
  settings: Partial<InvoiceTemplateSettings>;
}

export function saveInvoiceTemplate(payload: SaveInvoiceTemplatePayload) {
  return apiFetch<{ success: boolean; id?: number; error?: string }>('/webhook/save-invoice-template', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function setInvoiceTemplateActive(id: number, is_active: boolean) {
  return apiFetch<{ success: boolean; error?: string }>('/webhook/update-invoice-template-active', {
    method: 'POST',
    body: JSON.stringify({ id, is_active }),
  });
}

export function deleteInvoiceTemplate(id: number) {
  return apiFetch<{ success: boolean; error?: string }>('/webhook/delete-invoice-template', {
    method: 'POST',
    body: JSON.stringify({ id }),
  });
}
