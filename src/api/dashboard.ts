import { apiFetch } from './client';
import { DashboardData } from '../types/dashboard';

export function fetchDashboard(pipelineId?: number | null) {
  const query = pipelineId ? `?pipeline_id=${pipelineId}` : '';
  return apiFetch<DashboardData>(`/webhook/get-dashboard${query}`);
}
