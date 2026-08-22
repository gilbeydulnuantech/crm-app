import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as api from '../api/documentFlow';

export function useDocumentFlows(enabled: boolean) {
  return useQuery({
    queryKey: ['document-flows'],
    queryFn: api.fetchDocumentFlows,
    enabled,
  });
}

export function useSaveDocumentFlow() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: api.saveDocumentFlow,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['document-flows'] }),
  });
}

export function useUpdateDocumentFlowActive() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, isActive }: { id: number; isActive: boolean }) => api.updateDocumentFlowActive(id, isActive),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['document-flows'] }),
  });
}

export function useDeleteDocumentFlow() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api.deleteDocumentFlow(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['document-flows'] }),
  });
}
