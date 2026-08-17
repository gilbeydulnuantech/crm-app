import { apiFetch } from './client';

export interface CalendarIntegration {
  id: number;
  label: string | null;
  calendar_link: string;
  calendar_id: string;
  owner_user_id: number;
  owner_name?: string;
  is_active: boolean;
  last_synced_at: string | null;
  created_at: string;
}

export function fetchCalendarIntegrations() {
  return apiFetch<CalendarIntegration[]>('/webhook/get-calendar-integrations');
}

export function addCalendarIntegration(payload: { label?: string; calendar_link: string; owner_user_id: number }) {
  return apiFetch<{ success: boolean; integration?: CalendarIntegration; error?: string }>(
    '/webhook/add-calendar-integration',
    { method: 'POST', body: JSON.stringify(payload) }
  );
}

export function updateCalendarIntegration(id: number, isActive: boolean) {
  return apiFetch<{ success: boolean; integration?: CalendarIntegration; error?: string }>(
    '/webhook/update-calendar-integration',
    { method: 'POST', body: JSON.stringify({ id, is_active: isActive }) }
  );
}

export function deleteCalendarIntegration(id: number) {
  return apiFetch<{ success: boolean; error?: string }>('/webhook/delete-calendar-integration', {
    method: 'POST',
    body: JSON.stringify({ id }),
  });
}
