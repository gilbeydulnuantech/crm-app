import { apiFetch } from './client';

export function confirmUnsubscribe(token: string) {
  return apiFetch<{ success: boolean; contact_id?: number; first_name?: string; error?: string }>(
    `/webhook/unsubscribe-public?token=${encodeURIComponent(token)}`
  );
}
