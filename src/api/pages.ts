import { apiFetch } from './client';

export interface Page {
  id: number;
  name: string;
  content_html: string;
  created_by: number | null;
  created_by_name: string | null;
  created_at: string;
  updated_at: string;
}

// See fetchProposalTemplates (api/proposalTemplates.ts) for why this falls
// back to [] instead of letting apiFetch's undefined pass straight into
// React Query.
export async function fetchPages() {
  return (await apiFetch<Page[]>('/webhook/get-pages')) ?? [];
}

export interface SavePagePayload {
  id?: number;
  name: string;
  content_html: string;
}

export function savePage(payload: SavePagePayload) {
  return apiFetch<{ success: boolean; id?: number; error?: string }>('/webhook/save-page', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function deletePage(id: number) {
  return apiFetch<{ success: boolean; error?: string }>('/webhook/delete-page', {
    method: 'POST',
    body: JSON.stringify({ id }),
  });
}
