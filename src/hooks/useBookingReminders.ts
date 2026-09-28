import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as api from '../api/bookingReminders';

export function useBookingReminderStatus(contactId: number | null) {
  return useQuery({
    queryKey: ['bookingReminderStatus', contactId],
    queryFn: () => api.fetchBookingReminderStatus(contactId as number),
    enabled: contactId != null,
  });
}

export function useForceRunBookingReminder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ activityId, reminderStep }: { activityId: number; reminderStep: 'booking_reminder_24h' | 'booking_reminder_2h' }) =>
      api.forceRunBookingReminder(activityId, reminderStep),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['bookingReminderStatus'] }),
  });
}
