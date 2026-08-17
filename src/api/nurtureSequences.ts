import { apiFetch } from './client';

export interface NurtureSequenceStep {
  id?: number;
  step_number: number;
  delay_days: number;
  email_subject: string;
  email_body: string;
}

export interface NurtureSequence {
  id: number;
  name: string;
  trigger_inactive_days: number;
  exit_on_reply: boolean;
  exit_lead_status: string | null;
  is_active: boolean;
  active_enrollments: number;
  steps: NurtureSequenceStep[];
  created_at: string;
}

export function fetchNurtureSequences() {
  return apiFetch<NurtureSequence[]>('/webhook/get-nurture-sequences');
}

export interface SaveNurtureSequencePayload {
  id?: number;
  name: string;
  trigger_inactive_days: number;
  exit_on_reply: boolean;
  exit_lead_status?: string | null;
  steps: { delay_days: number; email_subject: string; email_body: string }[];
}

export function saveNurtureSequence(payload: SaveNurtureSequencePayload) {
  return apiFetch<{ success: boolean; error?: string }>('/webhook/save-nurture-sequence', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function updateNurtureSequenceActive(id: number, isActive: boolean) {
  return apiFetch<{ success: boolean; error?: string }>('/webhook/update-nurture-sequence-active', {
    method: 'POST',
    body: JSON.stringify({ id, is_active: isActive }),
  });
}

export function deleteNurtureSequence(id: number) {
  return apiFetch<{ success: boolean; error?: string }>('/webhook/delete-nurture-sequence', {
    method: 'POST',
    body: JSON.stringify({ id }),
  });
}

// Sends the given step's content as-is to a chosen address — no real
// contact or enrollment is touched, safe to use on unsaved edits.
export function testNurtureStep(payload: { email_subject: string; email_body: string; test_email: string }) {
  return apiFetch<{ success: boolean; error?: string }>('/webhook/test-nurture-step', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

// Processes this sequence's real enrollments right now instead of waiting
// for the hourly check — still respects "stop on reply," only skips the
// per-step day delay. Sends real emails to real contacts.
export function forceRunNurtureSequence(sequenceId: number) {
  return apiFetch<{ success: boolean; processed?: number; error?: string }>('/webhook/force-run-nurture-sequence', {
    method: 'POST',
    body: JSON.stringify({ sequence_id: sequenceId }),
  });
}
