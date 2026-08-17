import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as api from '../api/integrations';

export function useIntegrations(enabled: boolean) {
  return useQuery({
    queryKey: ['integrations'],
    queryFn: api.fetchIntegrations,
    enabled,
  });
}

export function useSaveIntegration() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: api.saveIntegration,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['integrations'] }),
  });
}

export function useDeleteIntegration() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api.deleteIntegration(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['integrations'] }),
  });
}
