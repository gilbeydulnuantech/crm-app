import { apiFetch } from './client';

export interface BookingSlot {
  start_at: string;
  label: string;
}

export interface BookingDay {
  date: string;
  label: string;
  slots: BookingSlot[];
}

export interface BookingAvailability {
  success: boolean;
  contact_first_name?: string;
  contact_last_name?: string;
  owner_name?: string;
  timezone?: string;
  days?: BookingDay[];
  error?: string;
}

export function fetchBookingAvailability(token: string) {
  return apiFetch<BookingAvailability>(`/webhook/get-availability-public?token=${encodeURIComponent(token)}`);
}

export function bookInspection(token: string, startAt: string) {
  return apiFetch<{ success: boolean; error?: string }>('/webhook/book-inspection-public', {
    method: 'POST',
    body: JSON.stringify({ token, start_at: startAt }),
  });
}
