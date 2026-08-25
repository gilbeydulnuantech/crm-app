import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as api from '../api/payments';

export function usePayments() {
  return useQuery({
    queryKey: ['payments'],
    queryFn: api.fetchPayments,
    refetchInterval: 30000,
  });
}

export function usePayment(id: number | null) {
  return useQuery({
    queryKey: ['payment', id],
    queryFn: () => api.fetchPayment(id as number),
    enabled: id != null,
  });
}

export function useInvoices() {
  return useQuery({
    queryKey: ['invoices'],
    queryFn: api.fetchInvoices,
  });
}

export function useInvoice(id: number | null) {
  return useQuery({
    queryKey: ['invoice', id],
    queryFn: () => api.fetchInvoice(id as number),
    enabled: id != null,
  });
}

export function useCreateInvoice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: api.createInvoice,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['invoices'] }),
  });
}

export function useUpdateInvoice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: api.updateInvoice,
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ['invoices'] });
      qc.invalidateQueries({ queryKey: ['invoice', variables.id] });
    },
  });
}

export function useVoidInvoice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: api.voidInvoice,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['invoices'] }),
  });
}

export function useSendInvoice() {
  return useMutation({ mutationFn: api.sendInvoice });
}

export function useCreatePayment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: api.createPayment,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['payments'] });
      qc.invalidateQueries({ queryKey: ['invoices'] });
    },
  });
}

export function useUpdatePayment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: api.updatePayment,
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ['payments'] });
      qc.invalidateQueries({ queryKey: ['payment', variables.id] });
    },
  });
}

export function useAddPaymentNote() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ paymentId, note }: { paymentId: number; note: string }) => api.addPaymentNote(paymentId, note),
    onSuccess: (_data, variables) => qc.invalidateQueries({ queryKey: ['payment', variables.paymentId] }),
  });
}

export function useSendReceipt() {
  return useMutation({ mutationFn: api.sendReceipt });
}

export function useArchivePayment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: api.archivePayment,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['payments'] }),
  });
}
