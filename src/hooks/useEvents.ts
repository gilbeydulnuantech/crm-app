import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as api from '../api/events';

export function useEvents(monthStart: string, monthEnd: string) {
  return useQuery({
    queryKey: ['events', monthStart, monthEnd],
    queryFn: () => api.fetchEvents(monthStart, monthEnd),
  });
}

function useInvalidateEvents() {
  const qc = useQueryClient();
  return () => qc.invalidateQueries({ queryKey: ['events'] });
}

export function useAddEvent() {
  const invalidate = useInvalidateEvents();
  return useMutation({
    mutationFn: (payload: api.EventPayload) => api.addEvent(payload),
    onSuccess: invalidate,
  });
}

export function useUpdateEvent() {
  const invalidate = useInvalidateEvents();
  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: api.EventPayload }) =>
      api.updateEvent(id, payload),
    onSuccess: invalidate,
  });
}

export function useDeleteEvent() {
  const invalidate = useInvalidateEvents();
  return useMutation({
    mutationFn: (id: number) => api.deleteEvent(id),
    onSuccess: invalidate,
  });
}
