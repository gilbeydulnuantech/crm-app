import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as api from '../api/pages';
import { Page } from '../api/pages';

export function usePages() {
  return useQuery({
    queryKey: ['pages'],
    queryFn: api.fetchPages,
  });
}

export function useSavePage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: api.savePage,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['pages'] }),
  });
}

export function useDeletePage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api.deletePage(id),
    onSuccess: (_data, id) => {
      qc.setQueriesData<Page[]>({ queryKey: ['pages'] }, (old) => old?.filter((p) => p.id !== id));
      qc.invalidateQueries({ queryKey: ['pages'] });
    },
  });
}
