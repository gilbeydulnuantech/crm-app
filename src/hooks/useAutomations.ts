import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as api from '../api/automations';

export function useAutomations() {
  return useQuery({
    queryKey: ['automations'],
    queryFn: api.fetchAutomations,
  });
}

export function useSaveAutomation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: api.saveAutomation,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['automations'] }),
  });
}

export function useSetAutomationActive() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, isActive }: { id: number; isActive: boolean }) => api.updateAutomationActive(id, isActive),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['automations'] }),
  });
}

export function useDeleteAutomation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api.deleteAutomation(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['automations'] }),
  });
}

// Dry run — does not touch the automations list, so no invalidation.
export function useTestAutomation() {
  return useMutation({
    mutationFn: api.testAutomation,
  });
}
