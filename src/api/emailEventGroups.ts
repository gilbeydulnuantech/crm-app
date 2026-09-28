import { apiFetch } from './client';

export interface EmailEventGroup {
  id: number;
  name: string;
  description: string | null;
  trigger_events: string[];
  created_at: string;
  updated_at: string;
}

export function fetchEmailEventGroups() {
  return apiFetch<EmailEventGroup[]>('/webhook/get-email-event-groups');
}

export interface SaveEmailEventGroupPayload {
  id?: number;
  name: string;
  description?: string;
  trigger_events: string[];
}

export function saveEmailEventGroup(payload: SaveEmailEventGroupPayload) {
  return apiFetch<{ success: boolean; id?: number; error?: string }>('/webhook/save-email-event-group', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function deleteEmailEventGroup(id: number) {
  return apiFetch<{ success: boolean; error?: string }>('/webhook/delete-email-event-group', {
    method: 'POST',
    body: JSON.stringify({ id }),
  });
}
