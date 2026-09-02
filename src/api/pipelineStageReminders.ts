import { apiFetch } from './client';

export interface StageReminderStep {
  id: number;
  // Positive = fires that many hours BEFORE the appointment (e.g. 24 = day
  // before). Zero/negative = fires |offset_hours| AFTER it (no-show follow-up).
  offset_hours: number;
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
  created_at: string;
  deals_in_stage: number;
  on_complete_advance_stage_id: number | null;
  on_complete_advance_stage_name: string | null;
  on_complete_email_subject: string | null;
  on_complete_email_body: string | null;
  steps: StageReminderStep[];
}

export function fetchStageReminders() {
  return apiFetch<StageReminderRule[]>('/webhook/get-stage-reminders');
}

export interface StageReminderStepDraft {
  offset_hours: number;
  email_subject: string;
  email_body: string;
}

export interface SaveStageReminderPayload {
  id?: number;
  name: string;
  stage_id: number;
  steps: StageReminderStepDraft[];
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

export function setStageReminderActive(id: number, is_active: boolean) {
  return apiFetch<{ success: boolean; error?: string }>('/webhook/update-stage-reminder-active', {
    method: 'POST',
    body: JSON.stringify({ id, is_active }),
  });
}

export function deleteStageReminder(id: number) {
  return apiFetch<{ success: boolean; error?: string }>('/webhook/delete-stage-reminder', {
    method: 'POST',
    body: JSON.stringify({ id }),
  });
}
