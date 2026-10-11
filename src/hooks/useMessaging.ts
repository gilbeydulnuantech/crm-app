import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as api from '../api/messaging';

export function useMessagingSettings(enabled = true) {
  return useQuery({ queryKey: ['messaging-settings'], queryFn: api.fetchMessagingSettings, enabled });
}

export function useReminderLog(enabled = true) {
  return useQuery({ queryKey: ['reminder-log'], queryFn: api.fetchReminderLog, enabled });
}

export function useSaveMessagingSettings() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: api.saveMessagingSettings,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['messaging-settings'] }),
  });
}

export function useSendTestMessage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: api.sendTestMessage,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['reminder-log'] }),
  });
}
