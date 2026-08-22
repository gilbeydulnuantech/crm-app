import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as api from '../api/proposals';
import { Proposal } from '../api/proposals';

// opportunityId omitted/null = global listing (Documents page); a number scopes
// to one deal (Deal Detail modal). Both share the ['proposals', ...] key prefix
// so a save from either place invalidates and refreshes the other.
export function useProposals(opportunityId?: number | null, enabled = true) {
  return useQuery({
    queryKey: ['proposals', opportunityId ?? 'all'],
    queryFn: () => api.fetchProposals(opportunityId ?? undefined),
    enabled,
  });
}

export function useSaveProposal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: api.saveProposal,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['proposals'] }),
  });
}

export function useSendProposal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (proposalId: number) => api.sendProposal(proposalId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['proposals'] }),
  });
}

export function useArchiveProposal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api.archiveProposal(id),
    onSuccess: (_data, id) => {
      qc.setQueriesData<Proposal[]>({ queryKey: ['proposals'] }, (old) => old?.filter((p) => p.id !== id));
      qc.invalidateQueries({ queryKey: ['proposals'] });
    },
  });
}

export function useDeleteProposal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api.deleteProposal(id),
    onSuccess: (_data, id) => {
      qc.setQueriesData<Proposal[]>({ queryKey: ['proposals'] }, (old) => old?.filter((p) => p.id !== id));
      qc.invalidateQueries({ queryKey: ['proposals'] });
    },
  });
}

export function useApprovedProposal(id: number | null, enabled = true) {
  return useQuery({
    queryKey: ['approved-proposal', id],
    queryFn: () => api.fetchApprovedProposal(id!),
    enabled: enabled && id != null,
  });
}
