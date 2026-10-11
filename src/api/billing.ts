import { apiFetch } from './client';

export interface DiscountCard {
  id: number;
  name: string;
  percent: number;
  is_active: boolean;
  sort_order: number;
  uses: number; // events that used this card (history keeps its own copy of name and percent)
}

export async function fetchDiscountCards() {
  return (await apiFetch<DiscountCard[]>('/webhook/get-discount-cards')) ?? [];
}

export function saveDiscountCard(payload: { id?: number; name: string; percent: number; is_active?: boolean }) {
  return apiFetch<{ success: boolean; id?: number; error?: string }>('/webhook/save-discount-card', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function deleteDiscountCard(id: number) {
  return apiFetch<{ success: boolean; error?: string }>('/webhook/delete-discount-card', {
    method: 'POST',
    body: JSON.stringify({ id }),
  });
}

// Confirms the booking (the client arrived) and saves the chosen card, or none. Commission follows automatically.
export function confirmEventBilling(payload: {
  event_id: number;
  discount_card_id?: number | null;
  client_package_id?: number | null;
  client_membership_id?: number | null;
  membership_mode?: 'discount' | 'session';
  unconfirm?: boolean;
}) {
  return apiFetch<{
    success: boolean;
    error?: string;
    price?: number | null;
    discount_name?: string | null;
    discount_percent?: number | null;
    amount_paid?: number | null;
    commission_percent?: number | null;
    commission_amount?: number | null;
  }>('/webhook/confirm-event-billing', { method: 'POST', body: JSON.stringify(payload) });
}

// Record how the client paid once the booking is confirmed.
export function markEventPaid(payload: { event_id: number; payment_method?: 'cash' | 'kaspi' | 'card'; unpaid?: boolean }) {
  return apiFetch<{ success: boolean; error?: string; payment_method?: string; paid_at?: string }>('/webhook/mark-event-paid', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export interface CommissionSummaryRow {
  staff_id: number;
  staff_name: string;
  owner_name: string | null;
  visits: number;
  paid: number;
  commission: number;
}

export interface CommissionVisitRow {
  id: number;
  due_at: string;
  subject: string;
  client: string;
  staff_id: number;
  staff_name: string;
  price: number | null;
  discount_name: string | null;
  discount_percent: number | null;
  amount_paid: number | null;
  commission_percent: number | null;
  commission_amount: number | null;
}

export function fetchCommissionReport(start: string, end: string) {
  return apiFetch<{ success: boolean; summary: CommissionSummaryRow[]; visits: CommissionVisitRow[]; error?: string }>(
    `/webhook/get-commission-report?start=${encodeURIComponent(start)}&end=${encodeURIComponent(end)}`
  );
}

// Mark a booking cancelled or a no-show (or restore it with null). It frees the time slot, earns no commission and gives back any package session.
export function setEventOutcome(payload: { event_id: number; outcome: 'cancelled' | 'no_show' | null }) {
  return apiFetch<{ success: boolean; error?: string }>('/webhook/set-event-outcome', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}
