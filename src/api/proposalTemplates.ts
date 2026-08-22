import { apiFetch } from './client';

export interface ProposalTemplate {
  id: number;
  title: string;
  content_html: string;
  email_subject: string;
  email_body: string;
  linked_contract_template_id: number | null;
  linked_contract_template_title: string | null;
  created_by: number | null;
  created_by_name: string | null;
  created_at: string;
  updated_at: string;
}

// Falls back to [] — apiFetch resolves to undefined for a 200 with an empty
// body (e.g. a webhook execution that errored before its Respond node ran),
// and React Query's useQuery treats undefined data as a hard invariant
// violation, throwing its own opaque "data is undefined" error that hides
// whatever the real backend problem was.
export async function fetchProposalTemplates() {
  return (await apiFetch<ProposalTemplate[]>('/webhook/get-proposal-templates')) ?? [];
}

export interface SaveProposalTemplatePayload {
  id?: number;
  title: string;
  content_html: string;
  email_subject?: string;
  email_body?: string;
  linked_contract_template_id?: number | null;
}

export function saveProposalTemplate(payload: SaveProposalTemplatePayload) {
  return apiFetch<{ success: boolean; id?: number; error?: string }>('/webhook/save-proposal-template', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function deleteProposalTemplate(id: number) {
  return apiFetch<{ success: boolean; error?: string }>('/webhook/delete-proposal-template', {
    method: 'POST',
    body: JSON.stringify({ id }),
  });
}
