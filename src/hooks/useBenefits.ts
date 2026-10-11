import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as api from '../api/benefits';

export function useBenefitCatalog() {
  return useQuery({ queryKey: ['benefit-catalog'], queryFn: api.fetchBenefitCatalog, staleTime: 60 * 1000 });
}

function useCatalogMutation<TArgs, TRes>(fn: (a: TArgs) => Promise<TRes>) {
  const qc = useQueryClient();
  return useMutation({ mutationFn: fn, onSuccess: () => qc.invalidateQueries({ queryKey: ['benefit-catalog'] }) });
}
export const useSavePackage = () => useCatalogMutation(api.savePackage);
export const useDeletePackage = () => useCatalogMutation(api.deletePackage);
export const useSaveMembershipPlan = () => useCatalogMutation(api.saveMembershipPlan);
export const useDeleteMembershipPlan = () => useCatalogMutation(api.deleteMembershipPlan);

export function useClientBenefits(contactId: number | null | undefined) {
  return useQuery({
    queryKey: ['client-benefits', contactId],
    queryFn: () => api.fetchClientBenefits(contactId as number),
    enabled: !!contactId,
    refetchInterval: false,
  });
}

function useBenefitMutation<TArgs, TRes>(fn: (a: TArgs) => Promise<TRes>) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['client-benefits'] });
      qc.invalidateQueries({ queryKey: ['events'] });
    },
  });
}
export const useSellPackage = () => useBenefitMutation(api.sellPackage);
export const useSellMembership = () => useBenefitMutation(api.sellMembership);
export const useRenewMembership = () => useBenefitMutation(api.renewMembership);
export const useCancelClientBenefit = () => useBenefitMutation(api.cancelClientBenefit);
export const useCancelClientBenefitSafe = useCancelClientBenefit;
