import { apiFetch } from './client';

export interface AutomationEmailStep {
  step_key: string;
  label: string;
  sort_order: number;
  email_template_id: number;
  subject: string;
  body: string;
}

export function fetchAutomationEmailSteps(workflowId: string) {
  return apiFetch<AutomationEmailStep[]>(`/webhook/get-automation-email-steps?workflow_id=${encodeURIComponent(workflowId)}`);
}

export function updateAutomationEmailStep(payload: { n8n_workflow_id: string; step_key: string; email_template_id: number }) {
  return apiFetch<{ success: boolean; error?: string }>('/webhook/update-automation-email-step', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}
