import { apiFetch } from './client';

export interface ContractTemplate {
  id: number;
  title: string;
  content_html: string;
  total_amount: number;
  email_subject: string;
  email_body: string;
  thank_you_page_id: number | null;
  thank_you_page_name: string | null;
  created_by: number | null;
  created_by_name: string | null;
  created_at: string;
  updated_at: string;
}

// See fetchProposalTemplates for why this falls back to [] instead of
// letting apiFetch's undefined pass straight into React Query.
export async function fetchContractTemplates() {
  return (await apiFetch<ContractTemplate[]>('/webhook/get-contract-templates')) ?? [];
}

export interface SaveContractTemplatePayload {
  id?: number;
  title: string;
  content_html: string;
  total_amount?: number;
  email_subject?: string;
  email_body?: string;
  thank_you_page_id?: number | null;
}

export function saveContractTemplate(payload: SaveContractTemplatePayload) {
  return apiFetch<{ success: boolean; id?: number; error?: string }>('/webhook/save-contract-template', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function deleteContractTemplate(id: number) {
  return apiFetch<{ success: boolean; error?: string }>('/webhook/delete-contract-template', {
    method: 'POST',
    body: JSON.stringify({ id }),
  });
}
