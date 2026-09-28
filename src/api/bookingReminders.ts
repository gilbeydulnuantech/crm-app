import { apiFetch } from './client';

export interface BookingReminderStatus {
  activity_id: number;
  due_at: string;
  is_completed: boolean;
  activity_subject: string | null;
  opportunity_id: number;
  opportunity_status: 'Open' | 'Won' | 'Lost';
  stage_id: number;
  stage_name: string | null;
  reminder_24h_sent: boolean;
  reminder_2h_sent: boolean;
}

export function fetchBookingReminderStatus(contactId: number) {
  return apiFetch<BookingReminderStatus | null>(`/webhook/get-booking-reminder-status?contact_id=${contactId}`);
}

export function forceRunBookingReminder(activityId: number, reminderStep: 'booking_reminder_24h' | 'booking_reminder_2h') {
  return apiFetch<{ success: boolean; activity_id?: number; reminder_step?: string; error?: string }>(
    '/webhook/force-run-booking-reminder',
    {
      method: 'POST',
      body: JSON.stringify({ activity_id: activityId, reminder_step: reminderStep }),
    }
  );
}
