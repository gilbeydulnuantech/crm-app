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

// ---- Online booking with a chosen provider (Public Booking Providers workflow) ----
export interface BookingOptions {
  success: boolean;
  enabled: boolean;
  staff_label: string;
  timezone: string;
  company_name: string;
  industry?: string | null;
  services: { id: number; name: string; price: number; durations?: { minutes: number; price: number }[] }[];
  providers: { id: number; name: string }[];
}

export function fetchBookingOptions() {
  return apiFetch<BookingOptions>('/webhook/get-booking-options-public');
}

// staffId 'any' = the first free provider at each time
export function fetchProviderAvailability(staffId: string, duration?: number | null) {
  const len = duration ? `&duration=${duration}` : '';
  return apiFetch<BookingAvailability>(`/webhook/get-availability-provider?staff_id=${encodeURIComponent(staffId)}${len}`);
}

export interface ProviderBookingPayload {
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  staff_id: string; // a staff id or 'any'
  service_id: number | null;
  duration?: number | null; // chosen length in minutes, for services that offer several
  start_at: string;
  website_hp?: string;
}

export function bookWithProvider(payload: ProviderBookingPayload) {
  return apiFetch<{ success: boolean; provider?: string; error?: string }>('/webhook/book-provider-public', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}
