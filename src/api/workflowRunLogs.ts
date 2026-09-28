import { apiFetch } from './client';

export interface WorkflowRun {
  id: number;
  workflow_name: string;
  workflow_id: string;
  workflow_url: string;
  entity_type: string | null;
  run_at: string;
}

export interface FetchWorkflowRunLogsParams {
  entity_type?: string;
  workflow_id?: string;
  limit?: number;
  offset?: number;
}

export function fetchWorkflowRunLogs(params: FetchWorkflowRunLogsParams = {}) {
  const qs = new URLSearchParams();
  if (params.entity_type) qs.set('entity_type', params.entity_type);
  if (params.workflow_id) qs.set('workflow_id', params.workflow_id);
  if (params.limit != null) qs.set('limit', String(params.limit));
  if (params.offset != null) qs.set('offset', String(params.offset));
  const query = qs.toString();
  return apiFetch<{ success: boolean; runs: WorkflowRun[]; total_count: number }>(
    `/webhook/get-workflow-run-logs${query ? `?${query}` : ''}`
  );
}
