import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as api from '../api/eventTypes';
import { readCache, writeCache } from '../utils/queryCache';

export function useEventTypes() {
  return useQuery({
    queryKey: ['event-types'],
    queryFn: async () => {
      const fresh = await api.fetchEventTypes();
      writeCache('event-types', fresh);
      return fresh;
    },
    // Colors and names show straight away from the last visit; the fresh list replaces them.
    placeholderData: () => readCache<Awaited<ReturnType<typeof api.fetchEventTypes>>>('event-types'),
    staleTime: 60 * 1000,
  });
}

export function useSaveEventType() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: api.saveEventType,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['event-types'] });
      qc.invalidateQueries({ queryKey: ['products'] });
    },
  });
}

export function useDeleteEventType() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: api.deleteEventType,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['event-types'] });
      qc.invalidateQueries({ queryKey: ['products'] });
      qc.invalidateQueries({ queryKey: ['events'] });
    },
  });
}
