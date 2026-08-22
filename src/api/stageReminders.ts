import { apiFetch } from './client';

export interface StageReminderStep {
  id?: number;
  offset_hours: number; // positive = hours before appointment, 0/negative = hours after (no-show)
  email_subject: string;
  email_body: string;
}

export interface StageReminderRule {
  id: number;
  name: string;
  stage_id: number;
  stage_name: string;
  pipeline_id: number;
  pipeline_name: string;
  is_active: boolean;
  deals_in_stage: number;
  steps: StageReminderStep[];
  on_complete_advance_stage_id: number | null;
  on_complete_advance_stage_name: string | null;
  on_complete_email_subject: string | null;
  on_complete_email_body: string | null;
  created_at: string;
}

export function fetchStageReminders() {
  return apiFetch<StageReminderRule[]>('/webhook/get-stage-reminders');
}

export interface SaveStageReminderPayload {
  id?: number;
  name: string;
  stage_id: number;
  steps: { offset_hours: number; email_subject: string; email_body: string }[];
  on_complete_advance_stage_id?: number | null;
  on_complete_email_subject?: string | null;
  on_complete_email_body?: string | null;
}

export function saveStageReminder(payload: SaveStageReminderPayload) {
  return apiFetch<{ success: boolean; error?: string }>('/webhook/save-stage-reminder', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function updateStageReminderActive(id: number, isActive: boolean) {
  return apiFetch<{ success: boolean; error?: string }>('/webhook/update-stage-reminder-active', {
    method: 'POST',
    body: JSON.stringify({ id, is_active: isActive }),
  });
}

export function deleteStageReminder(id: number) {
  return apiFetch<{ success: boolean; error?: string }>('/webhook/delete-stage-reminder', {
    method: 'POST',
    body: JSON.stringify({ id }),
  });
}

// Sends the given step's content as-is to a chosen address — no real
// deal, contact, or send log is touched, safe to use on unsaved edits.
export function testStageReminderStep(payload: { email_subject: string; email_body: string; test_email: string }) {
  return apiFetch<{ success: boolean; error?: string }>('/webhook/test-stage-reminder-step', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

// Processes this rule's real candidates right now instead of waiting for
// the next 30-minute tick — still respects "already sent," only skips the
// due-window timing check. Sends real emails and can move real deals.
export function forceRunStageReminder(ruleId: number) {
  return apiFetch<{ success: boolean; processed?: number; error?: string }>('/webhook/force-run-stage-reminder', {
    method: 'POST',
    body: JSON.stringify({ rule_id: ruleId }),
  });
}
