import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as api from '../api/calendarIntegrations';

export function useCalendarIntegrations(enabled: boolean) {
  return useQuery({
    queryKey: ['calendar-integrations'],
    queryFn: api.fetchCalendarIntegrations,
    enabled,
  });
}

export function useAddCalendarIntegration() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: api.addCalendarIntegration,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['calendar-integrations'] }),
  });
}

export function useUpdateCalendarIntegration() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, isActive }: { id: number; isActive: boolean }) => api.updateCalendarIntegration(id, isActive),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['calendar-integrations'] }),
  });
}

export function useDeleteCalendarIntegration() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api.deleteCalendarIntegration(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['calendar-integrations'] }),
  });
}
