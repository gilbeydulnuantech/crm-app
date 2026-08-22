import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as api from '../api/stageReminders';

export function useStageReminders(enabled: boolean) {
  return useQuery({
    queryKey: ['stage-reminders'],
    queryFn: api.fetchStageReminders,
    enabled,
  });
}

export function useSaveStageReminder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: api.saveStageReminder,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['stage-reminders'] }),
  });
}

export function useUpdateStageReminderActive() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, isActive }: { id: number; isActive: boolean }) => api.updateStageReminderActive(id, isActive),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['stage-reminders'] }),
  });
}

export function useDeleteStageReminder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api.deleteStageReminder(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['stage-reminders'] }),
  });
}

export function useTestStageReminderStep() {
  return useMutation({ mutationFn: api.testStageReminderStep });
}

export function useForceRunStageReminder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (ruleId: number) => api.forceRunStageReminder(ruleId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['stage-reminders'] }),
  });
}
