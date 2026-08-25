import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as api from '../api/invoiceTemplates';

export function useInvoiceTemplates() {
  return useQuery({
    queryKey: ['invoice-templates'],
    queryFn: api.fetchInvoiceTemplates,
  });
}

export function useSaveInvoiceTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: api.saveInvoiceTemplate,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['invoice-templates'] }),
  });
}

export function useSetInvoiceTemplateActive() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, isActive }: { id: number; isActive: boolean }) => api.setInvoiceTemplateActive(id, isActive),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['invoice-templates'] }),
  });
}

export function useDeleteInvoiceTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api.deleteInvoiceTemplate(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['invoice-templates'] }),
  });
}
