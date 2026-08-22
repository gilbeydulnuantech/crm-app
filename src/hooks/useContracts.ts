import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as api from '../api/contracts';
import { Contract } from '../api/contracts';

// opportunityId omitted/null = global listing (Documents page); a number
// scopes to one deal.
export function useContracts(opportunityId?: number | null, enabled = true) {
  return useQuery({
    queryKey: ['contracts', opportunityId ?? 'all'],
    queryFn: () => api.fetchContracts(opportunityId ?? undefined),
    enabled,
  });
}

export function useSaveContract() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: api.saveContract,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['contracts'] }),
  });
}

export function useSendContract() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (contractId: number) => api.sendContract(contractId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['contracts'] }),
  });
}

export function useArchiveContract() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api.archiveContract(id),
    onSuccess: (_data, id) => {
      qc.setQueriesData<Contract[]>({ queryKey: ['contracts'] }, (old) => old?.filter((c) => c.id !== id));
      qc.invalidateQueries({ queryKey: ['contracts'] });
    },
  });
}

export function useDeleteContract() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api.deleteContract(id),
    onSuccess: (_data, id) => {
      qc.setQueriesData<Contract[]>({ queryKey: ['contracts'] }, (old) => old?.filter((c) => c.id !== id));
      qc.invalidateQueries({ queryKey: ['contracts'] });
    },
  });
}

export function useSignedContract(id: number | null, enabled = true) {
  return useQuery({
    queryKey: ['signed-contract', id],
    queryFn: () => api.fetchSignedContract(id!),
    enabled: enabled && id != null,
  });
}

export function useSendSignedContractEmail() {
  return useMutation({
    mutationFn: api.sendSignedContractEmail,
  });
}
