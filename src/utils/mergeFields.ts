import { toTitleCase } from './text';

// Dynamic-field tokens a rep can drag into a proposal/contract document
// (see DealFieldsPanel) instead of the literal value — keeps the document
// reusable as a template (e.g. via "Save as template") since the token
// resolves per-recipient at view/preview time instead of being baked in.
export interface MergeFieldValues {
  client_name?: string | null;
  // Separate from client_name — the contract editor's dynamic-fields picker
  // offers {{first_name}}/{{last_name}} individually (e.g. for "Dear
  // {{first_name}},"), so these need to resolve on their own too, not just
  // as part of the combined client_name token.
  first_name?: string | null;
  last_name?: string | null;
  client_company_name?: string | null;
  client_address?: string | null;
  client_email?: string | null;
  client_phone?: string | null;
  owner_name?: string | null;
  owner_email?: string | null;
  owner_phone?: string | null;
  company_name?: string | null;
}

export const MERGE_FIELD_TOKENS: { token: string; label: string; key: keyof MergeFieldValues }[] = [
  { token: '{{client_name}}', label: 'Client Name', key: 'client_name' },
  { token: '{{first_name}}', label: 'Client First Name', key: 'first_name' },
  { token: '{{last_name}}', label: 'Client Last Name', key: 'last_name' },
  { token: '{{client_company_name}}', label: 'Client Company', key: 'client_company_name' },
  { token: '{{client_address}}', label: 'Client Address', key: 'client_address' },
  { token: '{{client_email}}', label: 'Client Email', key: 'client_email' },
  { token: '{{client_phone}}', label: 'Client Phone', key: 'client_phone' },
  { token: '{{owner_name}}', label: 'Owner Name', key: 'owner_name' },
  { token: '{{owner_email}}', label: 'Owner Email', key: 'owner_email' },
  { token: '{{owner_phone}}', label: 'Owner Phone', key: 'owner_phone' },
  { token: '{{company_name}}', label: 'Company Name', key: 'company_name' },
];

// Contact/user names only — not emails/phones/addresses/company names,
// which shouldn't be reformatted (same convention as the rest of the CRM,
// see utils/text.ts).
const TITLE_CASE_KEYS: ReadonlySet<keyof MergeFieldValues> = new Set(['client_name', 'owner_name', 'first_name', 'last_name']);

export function fillMergeFields(html: string, values: MergeFieldValues): string {
  let result = html || '';
  for (const { token, key } of MERGE_FIELD_TOKENS) {
    const escaped = token.replace(/[{}]/g, '\\$&');
    let value = values[key] || '';
    if (value && TITLE_CASE_KEYS.has(key)) value = toTitleCase(value);
    result = result.replace(new RegExp(escaped, 'gi'), value);
  }
  return result;
}

// Separate token set for standalone Pages (see PageEditorPage) — these
// resolve from whoever actually signed, not from a proposal's saved client
// snapshot, so they need their own values object (signature_name/signed_at
// only exist post-sign; the rest come from the contract's linked contact).
export interface PageFieldValues {
  contact_full_name?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  owner_name?: string | null;
  signature_name?: string | null;
  signed_at?: string | null;
}

export function fillPageFields(html: string, values: PageFieldValues): string {
  let result = html || '';
  const map: Record<string, string> = {
    contact_full_name: values.contact_full_name ? toTitleCase(values.contact_full_name) : '',
    first_name: values.first_name ? toTitleCase(values.first_name) : '',
    last_name: values.last_name ? toTitleCase(values.last_name) : '',
    owner_name: values.owner_name ? toTitleCase(values.owner_name) : '',
    signature_name: values.signature_name ? toTitleCase(values.signature_name) : '',
    signed_at: values.signed_at ? new Date(values.signed_at).toLocaleDateString() : '',
  };
  for (const [key, value] of Object.entries(map)) {
    result = result.replace(new RegExp(`\\{\\{\\s*${key}\\s*\\}\\}`, 'gi'), value);
  }
  return result;
}
