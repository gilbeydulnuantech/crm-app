import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as api from '../api/calendarIntegrations';
import { CalendarIntegration } from '../api/calendarIntegrations';

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
    onSuccess: (_data, id) => {
      // Remove it from the cache directly instead of relying only on the
      // background refetch from invalidateQueries below — if that refetch
      // silently fails, the row would otherwise sit there looking
      // undeleted even though the delete itself succeeded.
      qc.setQueriesData<CalendarIntegration[]>({ queryKey: ['calendar-integrations'] }, (old) =>
        old?.filter((ci) => ci.id !== id)
      );
      qc.invalidateQueries({ queryKey: ['calendar-integrations'] });
    },
  });
}
