import { apiFetch } from './client';

export function confirmUnsubscribe(token: string) {
  return apiFetch<{ success: boolean; first_name?: string; error?: string }>(
    `/webhook/unsubscribe-public?token=${encodeURIComponent(token)}`
  );
}
