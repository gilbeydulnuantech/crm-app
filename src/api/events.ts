import { apiFetch } from './client';
import { CalendarEvent } from '../types/event';

// resource_ids isn't part of the read-side CalendarEvent shape (that has
// resources: {id, name}[] instead) — it's how the form tells the backend
// which activity_resources rows to (re)link on save.
export type EventPayload = Partial<CalendarEvent> & { resource_ids?: number[] };

export function fetchEvents(monthStart: string, monthEnd: string) {
  return apiFetch<CalendarEvent[]>(
    `/webhook/get-events?start=${monthStart}&end=${monthEnd}`
  );
}

export function addEvent(payload: EventPayload) {
  return apiFetch<{ success: boolean; error?: string; id?: number }>('/webhook/add-event', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function updateEvent(id: number, payload: EventPayload) {
  return apiFetch<{ success: boolean; error?: string }>('/webhook/update-event', {
    method: 'POST',
    body: JSON.stringify({ id, ...payload }),
  });
}

export function deleteEvent(id: number) {
  return apiFetch<{ success: boolean; error?: string }>('/webhook/delete-event', {
    method: 'POST',
    body: JSON.stringify({ ids: [id] }),
  });
}
