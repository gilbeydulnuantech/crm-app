import { apiFetch } from './client';

export interface ImportMapsLeadsPayload {
  search_query: string;
  location: string;
  max_results?: number;
}

export interface ImportMapsLeadsResult {
  success: boolean;
  scraped: number;
  imported: number;
  skipped_duplicates: number;
  error?: string;
}

export function importMapsLeads(payload: ImportMapsLeadsPayload) {
  return apiFetch<ImportMapsLeadsResult>('/webhook/import-maps-leads', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}
