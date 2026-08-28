import { useMutation, useQuery } from '@tanstack/react-query';
import * as api from '../api/n8nWorkflows';

export function useN8nWorkflows() {
  return useQuery({
    queryKey: ['n8n-workflows'],
    queryFn: api.fetchN8nWorkflows,
  });
}

export function useTestAutomation() {
  return useMutation({
    mutationFn: (workflowId: string) => api.testAutomation(workflowId),
  });
}
