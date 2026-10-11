import { apiFetch } from './client';

export type IntegrationProvider = 'vapi' | 'retell' | 'apify' | 'telegram';

export interface Integration {
  id: number;
  provider: IntegrationProvider;
  label: string | null;
  config: Record<string, string>;
  is_active: boolean;
  has_key: boolean;
  created_at: string;
  updated_at: string;
}

export function fetchIntegrations() {
  return apiFetch<Integration[]>('/webhook/get-integrations');
}

export interface SaveIntegrationPayload {
  provider: IntegrationProvider;
  label?: string;
  // Omit (or leave blank) to keep the currently stored key unchanged —
  // only send it when the admin is actually setting/rotating it.
  api_key?: string;
  config?: Record<string, string>;
}

export function saveIntegration(payload: SaveIntegrationPayload) {
  return apiFetch<{ success: boolean; integration?: Integration; error?: string }>(
    '/webhook/save-integration',
    { method: 'POST', body: JSON.stringify(payload) }
  );
}

export function deleteIntegration(id: number) {
  return apiFetch<{ success: boolean; error?: string }>('/webhook/delete-integration', {
    method: 'POST',
    body: JSON.stringify({ id }),
  });
}
