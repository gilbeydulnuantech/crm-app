import { apiFetch } from './client';

export interface BulkEnrichContactsResult {
  contactIds: number[];
  queued: number;
  error?: string;
}

// Responds immediately once queued — the actual enrichment runs in the
// background on the n8n side (each contact takes 20-40s to crawl), so this
// doesn't report per-contact results. Refresh the Contacts list after a
// minute or two to see which ones picked up an email/phone.
export function bulkEnrichContacts(contactIds: number[]) {
  return apiFetch<BulkEnrichContactsResult>('/webhook/bulk-enrich-contacts', {
    method: 'POST',
    body: JSON.stringify({ contact_ids: contactIds }),
  });
}
