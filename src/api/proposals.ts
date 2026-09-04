import { apiFetch } from './client';

export interface Proposal {
  id: number;
  opportunity_id: number;
  opportunity_name?: string;
  assigned_user?: number | null;
  flow_id: number | null;
  public_token: string;
  title: string;
  content_html: string;
  total_amount: number;
  email_subject: string;
  email_body: string;
  client_name: string | null;
  client_company_name: string | null;
  client_address: string | null;
  client_email: string | null;
  client_phone: string | null;
  contractor_company_name: string | null;
  contractor_email: string | null;
  contractor_phone: string | null;
  linked_contract_template_id: number | null;
  status: 'draft' | 'emailed' | 'viewed' | 'approved';
  created_at: string;
  emailed_at: string | null;
  viewed_at: string | null;
  approved_at: string | null;
  inspection_date: string | null;
  deal_value: number | null;
  deal_name: string | null;
  deal_created_at: string | null;
  deal_due_at: string | null;
  down_payment_amount: number | null;
  down_payment_paid_at: string | null;
  balance_amount: number | null;
  balance_paid_at: string | null;
}

// opportunityId omitted = every proposal the requester can see (admin: all, rep: own deals).
export function fetchProposals(opportunityId?: number) {
  const qs = opportunityId ? `?opportunity_id=${opportunityId}` : '';
  return apiFetch<Proposal[]>(`/webhook/get-proposals${qs}`);
}

export interface SaveProposalPayload {
  id?: number;
  opportunity_id: number;
  title: string;
  content_html: string;
  total_amount: number;
  email_subject?: string;
  email_body?: string;
  client_name?: string;
  client_company_name?: string;
  client_address?: string;
  client_email?: string;
  client_phone?: string;
  contractor_company_name?: string;
  contractor_email?: string;
  contractor_phone?: string;
  linked_contract_template_id: number;
}

export function saveProposal(payload: SaveProposalPayload) {
  return apiFetch<{ success: boolean; id?: number; error?: string }>('/webhook/save-proposal', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function sendProposal(proposalId: number) {
  return apiFetch<{ success: boolean; error?: string }>('/webhook/send-proposal', {
    method: 'POST',
    body: JSON.stringify({ proposal_id: proposalId }),
  });
}

// Syncs status/emailed_at without sending another email — for the
// proposal editor's own Send flow, which delivers the email itself via
// the generic contact-email workflow and only needs the status to follow.
export function markProposalEmailed(proposalId: number) {
  return apiFetch<{ success: boolean; error?: string }>('/webhook/mark-proposal-emailed', {
    method: 'POST',
    body: JSON.stringify({ proposal_id: proposalId }),
  });
}

export function archiveProposal(id: number) {
  return apiFetch<{ success: boolean; error?: string }>('/webhook/archive-proposal', {
    method: 'POST',
    body: JSON.stringify({ id }),
  });
}

export function deleteProposal(id: number) {
  return apiFetch<{ success: boolean; error?: string }>('/webhook/delete-proposal', {
    method: 'POST',
    body: JSON.stringify({ id }),
  });
}

// --- Public (no auth) — used by the lead-facing proposal page ---

export interface PublicProposal {
  success: boolean;
  title: string;
  content_html: string;
  total_amount: number;
  status: Proposal['status'];
  opportunity_name: string;
  first_name: string | null;
  last_name: string | null;
  contact_email: string | null;
  public_token: string;
  client_name: string | null;
  client_company_name: string | null;
  client_address: string | null;
  client_email: string | null;
  client_phone: string | null;
  contractor_company_name: string | null;
  contractor_email: string | null;
  contractor_phone: string | null;
  owner_name: string | null;
  owner_email: string | null;
  owner_phone: string | null;
  logo_url: string | null;
  field_values: Record<string, string | boolean> | null;
  inspection_date: string | null;
  deal_value: number | null;
  deal_name: string | null;
  deal_created_at: string | null;
  deal_due_at: string | null;
  down_payment_amount: number | null;
  down_payment_paid_at: string | null;
  balance_amount: number | null;
  balance_paid_at: string | null;
  error?: string;
}

// preview=true is set when a rep opens their own proposal's public link to check it
// (Documents/Deal Detail "View" button) — it must not count as the lead viewing it.
export function fetchPublicProposal(token: string, preview = false) {
  const qs = `token=${encodeURIComponent(token)}${preview ? '&preview=1' : ''}`;
  return apiFetch<PublicProposal>(`/webhook/get-proposal-public?${qs}`);
}

export function approveProposal(token: string, fieldValues?: Record<string, string | boolean>) {
  return apiFetch<{ success: boolean; contract_token?: string; error?: string }>('/webhook/approve-proposal-public', {
    method: 'POST',
    body: JSON.stringify({ token, field_values: fieldValues || {} }),
  });
}

// Internal, authenticated view of an approved proposal — the CRM equivalent
// of PublicProposal, but fetched by internal id (not public_token) and
// gated by the requester's role/deal ownership, same as fetchProposals.
export interface ApprovedProposal {
  success: boolean;
  id: number;
  title: string;
  content_html: string;
  total_amount: number;
  public_token: string;
  status: Proposal['status'];
  client_name: string | null;
  client_company_name: string | null;
  client_address: string | null;
  client_email: string | null;
  client_phone: string | null;
  contractor_company_name: string | null;
  contractor_email: string | null;
  contractor_phone: string | null;
  field_values: Record<string, string | boolean> | null;
  approved_at: string | null;
  opportunity_name: string;
  first_name: string | null;
  last_name: string | null;
  contact_email: string | null;
  owner_name: string | null;
  owner_email: string | null;
  owner_phone: string | null;
  inspection_date: string | null;
  deal_value: number | null;
  deal_name: string | null;
  deal_created_at: string | null;
  deal_due_at: string | null;
  down_payment_amount: number | null;
  down_payment_paid_at: string | null;
  balance_amount: number | null;
  balance_paid_at: string | null;
  error?: string;
}

export function fetchApprovedProposal(id: number) {
  return apiFetch<ApprovedProposal>(`/webhook/get-proposal-approved?id=${id}`);
}
