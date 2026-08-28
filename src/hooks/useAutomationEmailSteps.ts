import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as api from '../api/automationEmailSteps';

export function useAutomationEmailSteps(workflowId: string) {
  return useQuery({
    queryKey: ['automation-email-steps', workflowId],
    queryFn: () => api.fetchAutomationEmailSteps(workflowId),
    enabled: !!workflowId,
  });
}

export function useUpdateAutomationEmailStep(workflowId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: api.updateAutomationEmailStep,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['automation-email-steps', workflowId] }),
  });
}
