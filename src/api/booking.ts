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

export function fetchGenericBookingAvailability() {
  return apiFetch<BookingAvailability>('/webhook/get-availability-generic');
}

export interface GenericBookingPayload {
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  start_at: string;
  website_hp?: string;
}

export function bookGenericInspection(payload: GenericBookingPayload) {
  return apiFetch<{ success: boolean; error?: string }>('/webhook/book-inspection-generic', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function cancelBooking(activityId: string, token: string) {
  return apiFetch<{ success: boolean; first_name?: string; error?: string }>(
    `/webhook/cancel-booking-public?activity_id=${encodeURIComponent(activityId)}&token=${encodeURIComponent(token)}`
  );
}
