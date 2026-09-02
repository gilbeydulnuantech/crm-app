import { apiFetch } from './client';

export interface Contract {
  id: number;
  opportunity_id: number;
  opportunity_name?: string;
  proposal_id: number | null;
  flow_id: number | null;
  public_token: string;
  title: string;
  content_html: string;
  total_amount: number;
  email_subject: string;
  email_body: string;
  status: 'draft' | 'sent' | 'signed';
  signature_name: string | null;
  signed_at: string | null;
  created_at: string;
  sent_at: string | null;
  // Only populated for admins — the backend nulls this out for reps.
  signature_ip: string | null;
}

// opportunityId omitted = every contract the requester can see (admin: all, rep: own deals).
export function fetchContracts(opportunityId?: number) {
  const qs = opportunityId ? `?opportunity_id=${opportunityId}` : '';
  return apiFetch<Contract[]>(`/webhook/get-contracts${qs}`);
}

export interface SaveContractPayload {
  id?: number;
  opportunity_id: number;
  title: string;
  content_html: string;
  total_amount?: number;
  email_subject?: string;
  email_body?: string;
}

export function saveContract(payload: SaveContractPayload) {
  return apiFetch<{ success: boolean; id?: number; error?: string }>('/webhook/save-contract', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function sendContract(contractId: number) {
  return apiFetch<{ success: boolean; error?: string }>('/webhook/send-contract', {
    method: 'POST',
    body: JSON.stringify({ contract_id: contractId }),
  });
}

export function archiveContract(id: number) {
  return apiFetch<{ success: boolean; error?: string }>('/webhook/archive-contract', {
    method: 'POST',
    body: JSON.stringify({ id }),
  });
}

export function deleteContract(id: number) {
  return apiFetch<{ success: boolean; error?: string }>('/webhook/delete-contract', {
    method: 'POST',
    body: JSON.stringify({ id }),
  });
}

export interface PublicContract {
  success: boolean;
  id: number;
  title: string;
  content_html: string;
  total_amount: number;
  status: 'draft' | 'sent' | 'signed';
  public_token: string;
  signature_name: string | null;
  signature_email: string | null;
  signature_date: string | null;
  signature_data: string | null;
  pdf_base64: string | null;
  signed_at: string | null;
  opportunity_name: string;
  first_name: string | null;
  last_name: string | null;
  contact_email: string | null;
  owner_name: string | null;
  owner_email: string | null;
  owner_phone: string | null;
  company_name: string | null;
  field_values: Record<string, string | boolean> | null;
  thank_you_page_id: number | null;
  thank_you_page_content_html: string | null;
  down_payment_token: string | null;
  down_payment_amount: number | null;
  down_payment_paid: boolean;
  cosigned_by_name: string | null;
  cosigned_at: string | null;
  error?: string;
}

export function fetchPublicContract(token: string) {
  return apiFetch<PublicContract>(`/webhook/get-contract-public?token=${encodeURIComponent(token)}`);
}

export interface SignContractPayload {
  token: string;
  signature_name: string;
  signature_email: string;
  signature_date: string;
  signature_data: string;
  field_values?: Record<string, string | boolean>;
}

export function signContract(payload: SignContractPayload) {
  return apiFetch<{ success: boolean; error?: string; down_payment_token?: string; down_payment_amount?: number }>(
    '/webhook/sign-contract-public',
    {
      method: 'POST',
      body: JSON.stringify(payload),
    }
  );
}

// Internal, authenticated view of a signed contract — the CRM equivalent of
// PublicContract, but fetched by internal id (not public_token) and gated
// by the requester's role/deal ownership, same as fetchContracts.
export interface SignedContract {
  success: boolean;
  id: number;
  title: string;
  content_html: string;
  total_amount: number;
  public_token: string;
  signature_name: string | null;
  signature_email: string | null;
  signature_date: string | null;
  signature_data: string | null;
  signed_at: string | null;
  opportunity_name: string;
  first_name: string | null;
  last_name: string | null;
  contact_email: string | null;
  owner_name: string | null;
  owner_email: string | null;
  owner_phone: string | null;
  company_name: string | null;
  field_values: Record<string, string | boolean> | null;
  // Only populated for admins — the backend nulls this out for reps.
  signature_ip: string | null;
  // Needed so the frontend can decide whether the current user may co-sign.
  assigned_user: number | null;
  cosign_signature_data: string | null;
  cosigned_by: number | null;
  cosigned_by_name: string | null;
  cosigned_at: string | null;
  error?: string;
}

export function fetchSignedContract(id: number) {
  return apiFetch<SignedContract>(`/webhook/get-contract-signed?id=${id}`);
}

export function cosignContract(
  contractId: number,
  ownerFieldId: string,
  signatureData: string,
  fieldValues?: Record<string, string | boolean>
) {
  return apiFetch<{ success: boolean; error?: string }>('/webhook/cosign-contract', {
    method: 'POST',
    body: JSON.stringify({
      contract_id: contractId,
      owner_field_id: ownerFieldId,
      signature_data: signatureData,
      field_values: fieldValues || {},
    }),
  });
}

export interface SendSignedContractEmailPayload {
  contract_id: number;
  to: string;
  subject: string;
  body: string;
}

export function sendSignedContractEmail(payload: SendSignedContractEmailPayload) {
  return apiFetch<{ success: boolean; error?: string }>('/webhook/send-signed-contract-email', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

// Server-side PDF (via Puppeteer navigating to /print/contract/:token on the
// same machine as n8n) — a real rendered page, so cross-origin images (the
// Drive-hosted logo) load normally with no CORS involved at all.
export function generateContractPdf(contractId: number) {
  return apiFetch<{ success: boolean; title?: string; pdfBase64?: string; error?: string }>('/webhook/generate-contract-pdf', {
    method: 'POST',
    body: JSON.stringify({ contract_id: contractId }),
  });
}
