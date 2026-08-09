import { apiFetch } from './client';
import { CalendarEvent } from '../types/event';

export function fetchEvents(monthStart: string, monthEnd: string) {
  return apiFetch<CalendarEvent[]>(
    `/webhook/get-events?start=${monthStart}&end=${monthEnd}`
  );
}

export function addEvent(payload: Partial<CalendarEvent>) {
  return apiFetch<{ success: boolean; error?: string; id?: number }>('/webhook/add-event', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function updateEvent(id: number, payload: Partial<CalendarEvent>) {
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
