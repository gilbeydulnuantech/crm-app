import { useQuery } from '@tanstack/react-query';
import * as api from '../api/automationLogs';

export function useAutomationRuns(params: api.FetchAutomationRunsParams) {
  return useQuery({
    queryKey: ['automation-runs', params],
    queryFn: () => api.fetchAutomationRuns(params),
  });
}

export function useAutomationRunStats(automationId?: number) {
  return useQuery({
    queryKey: ['automation-run-stats', automationId ?? 'all'],
    queryFn: () => api.fetchAutomationRunStats(automationId),
  });
}
