import { useQuery } from '@tanstack/react-query';
import * as api from '../api/workflowRunLogs';

export function useWorkflowRunLogs(params: api.FetchWorkflowRunLogsParams) {
  return useQuery({
    queryKey: ['workflow-run-logs', params],
    queryFn: () => api.fetchWorkflowRunLogs(params),
  });
}
