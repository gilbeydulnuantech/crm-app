import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as api from '../api/contractTemplates';
import { ContractTemplate } from '../api/contractTemplates';

export function useContractTemplates() {
  return useQuery({
    queryKey: ['contractTemplates'],
    queryFn: api.fetchContractTemplates,
  });
}

export function useSaveContractTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: api.saveContractTemplate,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['contractTemplates'] }),
  });
}

export function useDeleteContractTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api.deleteContractTemplate(id),
    onSuccess: (_data, id) => {
      qc.setQueriesData<ContractTemplate[]>({ queryKey: ['contractTemplates'] }, (old) => old?.filter((c) => c.id !== id));
      qc.invalidateQueries({ queryKey: ['contractTemplates'] });
    },
  });
}
