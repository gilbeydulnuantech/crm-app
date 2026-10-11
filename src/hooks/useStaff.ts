import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as api from '../api/staff';

export function useStaff() {
  return useQuery({ queryKey: ['staff'], queryFn: api.fetchStaff, staleTime: 60 * 1000 });
}

export function useSaveStaff() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: api.saveStaff,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['staff'] });
      qc.invalidateQueries({ queryKey: ['events'] });
    },
  });
}

export function useDeleteStaff() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: api.deleteStaff,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['staff'] });
      qc.invalidateQueries({ queryKey: ['events'] });
    },
  });
}
