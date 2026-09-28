import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as api from '../api/automations';

export function useAutomations() {
  return useQuery({
    queryKey: ['automations'],
    queryFn: api.fetchAutomations,
  });
}

export function useSaveAutomationRule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: api.SaveAutomationPayload) => api.saveAutomation(payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['automations'] }),
  });
}

export function useUpdateAutomationRuleActive() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, isActive }: { id: number; isActive: boolean }) => api.updateAutomationActive(id, isActive),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['automations'] }),
  });
}

export function useDeleteAutomationRule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api.deleteAutomation(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['automations'] }),
  });
}

// Named distinctly from useN8nWorkflows' useTestAutomation (which
// test-runs an already-deployed n8n workflow file) — this one dry-runs an
// in-progress automation rule draft that may not even be saved yet.
export function useTestAutomationRule() {
  return useMutation({
    mutationFn: (payload: api.TestAutomationPayload) => api.testAutomation(payload),
  });
}
