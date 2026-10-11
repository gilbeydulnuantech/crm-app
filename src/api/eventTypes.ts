import { apiFetch } from './client';

export interface EventTypeRow {
  id: number;
  // What events store in `type`. Made from the first name and never changed, so renaming is safe.
  key: string;
  name: string;
  color: string; // "#RRGGBB"
  sort_order: number;
  // Used by the booking page and reminders: can be renamed and recolored but not deleted.
  is_system: boolean;
  event_count: number;
  product_count: number;
}

export async function fetchEventTypes() {
  return (await apiFetch<EventTypeRow[]>('/webhook/get-event-types')) ?? [];
}

export function saveEventType(payload: { id?: number; name: string; color?: string }) {
  return apiFetch<{ success: boolean; id?: number; key?: string; error?: string }>('/webhook/save-event-type', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

// An in-use type needs `reassign_to_id`: its events (and services) move to that type first.
export function deleteEventType(payload: { id: number; reassign_to_id?: number }) {
  return apiFetch<{ success: boolean; moved?: number; error?: string }>('/webhook/delete-event-type', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}
