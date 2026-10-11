import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as api from '../api/billing';

export function useDiscountCards() {
  return useQuery({ queryKey: ['discount-cards'], queryFn: api.fetchDiscountCards, staleTime: 60 * 1000 });
}

export function useSaveDiscountCard() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: api.saveDiscountCard, onSuccess: () => qc.invalidateQueries({ queryKey: ['discount-cards'] }) });
}

export function useDeleteDiscountCard() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: api.deleteDiscountCard, onSuccess: () => qc.invalidateQueries({ queryKey: ['discount-cards'] }) });
}

export function useConfirmEventBilling() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: api.confirmEventBilling,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['events'] });
      qc.invalidateQueries({ queryKey: ['client-benefits'] });
      qc.invalidateQueries({ queryKey: ['commission-report'] });
    },
  });
}

export function useMarkEventPaid() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: api.markEventPaid,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['events'] }),
  });
}

export function useCommissionReport(start: string, end: string, enabled = true) {
  return useQuery({
    queryKey: ['commission-report', start, end],
    queryFn: () => api.fetchCommissionReport(start, end),
    enabled: enabled && !!start && !!end,
    refetchInterval: false,
  });
}

export function useSetEventOutcome() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: api.setEventOutcome,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['events'] });
      qc.invalidateQueries({ queryKey: ['client-benefits'] });
      qc.invalidateQueries({ queryKey: ['commission-report'] });
    },
  });
}
