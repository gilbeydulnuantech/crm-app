import { apiFetch } from './client';

export interface DocumentFlow {
  id: number;
  name: string;
  trigger_stage_id: number;
  trigger_stage_name: string;
  pipeline_id: number;
  pipeline_name: string;
  delay_hours: number;
  proposal_email_subject: string;
  proposal_email_body: string;
  proposal_viewed_stage_id: number | null;
  proposal_viewed_stage_name: string | null;
  proposal_approved_stage_id: number | null;
  proposal_approved_stage_name: string | null;
  contract_email_subject: string;
  contract_email_body: string;
  contract_signed_stage_id: number | null;
  contract_signed_stage_name: string | null;
  contract_template_id: number | null;
  contract_template_title: string | null;
  proposal_reminder_delay_hours: number | null;
  proposal_reminder_email_subject: string | null;
  proposal_reminder_email_body: string | null;
  is_active: boolean;
  deals_in_stage: number;
  created_at: string;
}

export function fetchDocumentFlows() {
  return apiFetch<DocumentFlow[]>('/webhook/get-document-flows');
}

export interface SaveDocumentFlowPayload {
  id?: number;
  name: string;
  trigger_stage_id: number;
  delay_hours: number;
  proposal_email_subject: string;
  proposal_email_body: string;
  proposal_viewed_stage_id?: number | null;
  proposal_approved_stage_id?: number | null;
  contract_email_subject: string;
  contract_email_body: string;
  contract_signed_stage_id?: number | null;
  contract_template_id?: number | null;
  proposal_reminder_delay_hours?: number | null;
  proposal_reminder_email_subject?: string | null;
  proposal_reminder_email_body?: string | null;
}

export function saveDocumentFlow(payload: SaveDocumentFlowPayload) {
  return apiFetch<{ success: boolean; error?: string }>('/webhook/save-document-flow', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function updateDocumentFlowActive(id: number, isActive: boolean) {
  return apiFetch<{ success: boolean; error?: string }>('/webhook/update-document-flow-active', {
    method: 'POST',
    body: JSON.stringify({ id, is_active: isActive }),
  });
}

export function deleteDocumentFlow(id: number) {
  return apiFetch<{ success: boolean; error?: string }>('/webhook/delete-document-flow', {
    method: 'POST',
    body: JSON.stringify({ id }),
  });
}
