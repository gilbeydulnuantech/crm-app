import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as api from '../api/companyProfile';

export function useCompanyProfile(enabled = true) {
  return useQuery({
    queryKey: ['company-profile'],
    queryFn: api.fetchCompanyProfile,
    enabled,
  });
}

export function useSaveCompanyProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: api.saveCompanyProfile,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['company-profile'] }),
  });
}

export function useUploadCompanyLogo() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: api.uploadCompanyLogo,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['company-profile'] }),
  });
}
