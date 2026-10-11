import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as api from '../api/industry';
import { useCompanyProfile } from './useCompanyProfile';

export function useIndustrySettings(enabled = true) {
  return useQuery({ queryKey: ['industry-settings'], queryFn: api.fetchIndustrySettings, enabled });
}

function useRefresh() {
  const qc = useQueryClient();
  return () => {
    qc.invalidateQueries({ queryKey: ['industry-settings'] });
    qc.invalidateQueries({ queryKey: ['company-profile'] });
    qc.invalidateQueries({ queryKey: ['event-types'] });
  };
}

export function useApplyIndustryPreset() {
  const refresh = useRefresh();
  return useMutation({ mutationFn: api.applyIndustryPreset, onSuccess: refresh });
}

export function useSaveIndustryFeatures() {
  const refresh = useRefresh();
  return useMutation({ mutationFn: api.saveIndustryFeatures, onSuccess: refresh });
}

// What the rest of the app needs to know about the chosen industry: whether Staff is on, and what to call a staff member.
export function useStaffFeature() {
  const { data } = useCompanyProfile();
  return { enabled: data?.staff_enabled === true, label: data?.staff_label || 'Therapist' };
}
