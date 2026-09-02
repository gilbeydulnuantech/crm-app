import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as api from '../api/pipelineStageReminders';

export function useStageReminders() {
  return useQuery({
    queryKey: ['stageReminders'],
    queryFn: api.fetchStageReminders,
  });
}

export function useSaveStageReminder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: api.saveStageReminder,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['stageReminders'] }),
  });
}

export function useSetStageReminderActive() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, is_active }: { id: number; is_active: boolean }) => api.setStageReminderActive(id, is_active),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['stageReminders'] }),
  });
}

export function useDeleteStageReminder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api.deleteStageReminder(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['stageReminders'] }),
  });
}
