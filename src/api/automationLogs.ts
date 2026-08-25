import { apiFetch } from './client';

export interface AutomationRun {
  id: number;
  automation_id: number;
  automation_name: string;
  action_id: number | null;
  action_type: string | null;
  entity_type: string;
  entity_id: number;
  entity_label: string | null;
  branch: string;
  status: 'success' | 'error' | 'unsupported';
  detail: string | null;
  ran_at: string;
}

export interface FetchAutomationRunsParams {
  automation_id?: number;
  status?: 'success' | 'error' | 'unsupported';
  limit?: number;
  offset?: number;
}

export function fetchAutomationRuns(params: FetchAutomationRunsParams = {}) {
  const qs = new URLSearchParams();
  if (params.automation_id != null) qs.set('automation_id', String(params.automation_id));
  if (params.status) qs.set('status', params.status);
  if (params.limit != null) qs.set('limit', String(params.limit));
  if (params.offset != null) qs.set('offset', String(params.offset));
  const query = qs.toString();
  return apiFetch<{ success: boolean; runs: AutomationRun[]; total_count: number }>(
    `/webhook/get-automation-runs${query ? `?${query}` : ''}`
  );
}

export interface AutomationRunStat {
  automation_id: number;
  automation_name: string;
  success_count: number;
  error_count: number;
  unsupported_count: number;
  last_ran_at: string;
}

export function fetchAutomationRunStats(automationId?: number) {
  const query = automationId != null ? `?automation_id=${automationId}` : '';
  return apiFetch<{ success: boolean; stats: AutomationRunStat[] }>(`/webhook/get-automation-run-stats${query}`);
}
