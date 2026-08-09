import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as api from '../api/companies';
import { Company } from '../types/company';

export function useCompanies() {
  return useQuery({
    queryKey: ['companies'],
    queryFn: api.fetchCompanies,
  });
}

export function useArchivedCompanies(enabled: boolean) {
  return useQuery({
    queryKey: ['companies', 'archived'],
    queryFn: api.fetchArchivedCompanies,
    enabled,
  });
}

function useInvalidateCompanies() {
  const qc = useQueryClient();
  return () => qc.invalidateQueries({ queryKey: ['companies'] });
}

export function useAddCompany() {
  const invalidate = useInvalidateCompanies();
  return useMutation({
    mutationFn: (payload: Partial<Company> & { requester_id?: number | null }) =>
      api.addCompany(payload),
    onSuccess: invalidate,
  });
}

export function useUpdateCompany() {
  const invalidate = useInvalidateCompanies();
  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: Partial<Company> }) =>
      api.updateCompany(id, payload),
    onSuccess: invalidate,
  });
}

export function useArchiveCompanies() {
  const invalidate = useInvalidateCompanies();
  return useMutation({
    mutationFn: (ids: number[]) => api.archiveCompanies(ids),
    onSuccess: invalidate,
  });
}

export function useDeleteCompanies() {
  const invalidate = useInvalidateCompanies();
  return useMutation({
    mutationFn: (ids: number[]) => api.deleteCompanies(ids),
    onSuccess: invalidate,
  });
}
