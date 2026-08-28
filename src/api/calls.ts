import { apiFetch } from './client';

export interface TriggerCallResult {
  success: boolean;
  error?: string;
}

export function triggerRetellCall(contactId: number) {
  return apiFetch<TriggerCallResult>('/webhook/trigger-retell-call', {
    method: 'POST',
    body: JSON.stringify({ contact_id: contactId }),
  });
}

export function triggerVapiCall(contactId: number) {
  return apiFetch<TriggerCallResult>('/webhook/trigger-vapi-call', {
    method: 'POST',
    body: JSON.stringify({ contact_id: contactId }),
  });
}

// Tries Retell first, falls back to Vapi if Retell isn't the one currently
// configured active — lets the UI offer a single "AI Call" action without
// the rep needing to know which provider is set up in Settings.
export async function triggerAiCall(contactId: number): Promise<TriggerCallResult> {
  try {
    const retell = await triggerRetellCall(contactId);
    if (retell.success) return retell;
  } catch {
    // fall through to Vapi
  }
  return triggerVapiCall(contactId);
}
