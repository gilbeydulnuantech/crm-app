import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as api from '../api/receiptTemplates';

export function useReceiptTemplates() {
  return useQuery({
    queryKey: ['receipt-templates'],
    queryFn: api.fetchReceiptTemplates,
  });
}

export function useSaveReceiptTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: api.saveReceiptTemplate,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['receipt-templates'] }),
  });
}

export function useSetReceiptTemplateActive() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, isActive }: { id: number; isActive: boolean }) => api.setReceiptTemplateActive(id, isActive),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['receipt-templates'] }),
  });
}

export function useDeleteReceiptTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api.deleteReceiptTemplate(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['receipt-templates'] }),
  });
}
