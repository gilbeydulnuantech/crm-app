import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as api from '../api/emailEventGroups';

export function useEmailEventGroups() {
  return useQuery({
    queryKey: ['emailEventGroups'],
    queryFn: api.fetchEmailEventGroups,
  });
}

export function useSaveEmailEventGroup() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: api.saveEmailEventGroup,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['emailEventGroups'] }),
  });
}

export function useDeleteEmailEventGroup() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api.deleteEmailEventGroup(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['emailEventGroups'] }),
  });
}
