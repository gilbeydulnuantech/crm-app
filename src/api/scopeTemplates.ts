import { apiFetch } from './client';

export interface ScopeTemplate {
  id: number;
  name: string;
  content_html: string;
  created_by: number | null;
  created_by_name: string | null;
  created_at: string;
  updated_at: string;
}

export function fetchScopeTemplates() {
  return apiFetch<ScopeTemplate[]>('/webhook/get-scope-templates');
}

export interface SaveScopeTemplatePayload {
  id?: number;
  name: string;
  content_html: string;
}

export function saveScopeTemplate(payload: SaveScopeTemplatePayload) {
  return apiFetch<{ success: boolean; id?: number; error?: string }>('/webhook/save-scope-template', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function deleteScopeTemplate(id: number) {
  return apiFetch<{ success: boolean; error?: string }>('/webhook/delete-scope-template', {
    method: 'POST',
    body: JSON.stringify({ id }),
  });
}
