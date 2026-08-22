import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as api from '../api/scopeTemplates';

export function useScopeTemplates(enabled = true) {
  return useQuery({
    queryKey: ['scope-templates'],
    queryFn: api.fetchScopeTemplates,
    enabled,
  });
}

export function useSaveScopeTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: api.saveScopeTemplate,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['scope-templates'] }),
  });
}

export function useDeleteScopeTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api.deleteScopeTemplate(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['scope-templates'] }),
  });
}
