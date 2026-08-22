import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as api from '../api/proposalTemplates';
import { ProposalTemplate } from '../api/proposalTemplates';

export function useProposalTemplates() {
  return useQuery({
    queryKey: ['proposalTemplates'],
    queryFn: api.fetchProposalTemplates,
  });
}

export function useSaveProposalTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: api.saveProposalTemplate,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['proposalTemplates'] }),
  });
}

export function useDeleteProposalTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api.deleteProposalTemplate(id),
    onSuccess: (_data, id) => {
      qc.setQueriesData<ProposalTemplate[]>({ queryKey: ['proposalTemplates'] }, (old) => old?.filter((p) => p.id !== id));
      qc.invalidateQueries({ queryKey: ['proposalTemplates'] });
    },
  });
}
