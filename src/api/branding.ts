import { apiFetch } from './client';

// Public (no login) — the proposal/contract pages and the PDF renderer have no session. The server only returns
// company details when "Show company header and footer on proposals and contracts" is switched on.
export interface DocumentBranding {
  document_branding_enabled: boolean;
  company_name: string | null;
  logo_url: string | null;
  address: string | null;
  phone: string | null;
  website: string | null;
  email: string | null;
  brand_color: string | null;
  footer_note: string | null;
}

export function fetchDocumentBranding() {
  return apiFetch<DocumentBranding>('/webhook/get-document-branding');
}
