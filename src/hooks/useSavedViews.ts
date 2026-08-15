import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as api from '../api/savedViews';

export function useSavedViews<TFilters>(entityType: string) {
  return useQuery({
    queryKey: ['saved-views', entityType],
    queryFn: () => api.fetchSavedViews<TFilters>(entityType),
  });
}

export function useAddSavedView<TFilters>(entityType: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ name, filters }: { name: string; filters: TFilters }) =>
      api.addSavedView(entityType, name, filters),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['saved-views', entityType] }),
  });
}

export function useDeleteSavedView(entityType: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api.deleteSavedView(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['saved-views', entityType] }),
  });
}
