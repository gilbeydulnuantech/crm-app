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
    mutationFn: ({ name, filters, isShared }: { name: string; filters: TFilters; isShared: boolean }) =>
      api.addSavedView(entityType, name, filters, isShared),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['saved-views', entityType] }),
  });
}

export function useUpdateSavedView<TFilters>(entityType: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, updates }: { id: number; updates: api.SavedViewUpdate<TFilters> }) =>
      api.updateSavedView(id, updates),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['saved-views', entityType] }),
  });
}

export function useDeleteSavedView(entityType: string) {
  const qc = useQueryClient();
  const queryKey = ['saved-views', entityType];
  return useMutation({
    mutationFn: (id: number) => api.deleteSavedView(id),
    // Remove it from the cache right away so the chip disappears as soon as
    // the x is clicked, instead of lingering until the invalidate+refetch
    // round trip lands. Roll back if the delete actually fails.
    onMutate: async (id: number) => {
      await qc.cancelQueries({ queryKey });
      const previous = qc.getQueryData(queryKey);
      qc.setQueryData(queryKey, (old: any) =>
        Array.isArray(old) ? old.filter((v) => v.id !== id) : old
      );
      return { previous };
    },
    onError: (_err, _id, context) => {
      if (context?.previous) qc.setQueryData(queryKey, context.previous);
    },
    onSettled: () => qc.invalidateQueries({ queryKey }),
  });
}
