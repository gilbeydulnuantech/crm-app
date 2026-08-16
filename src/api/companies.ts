import { apiFetch } from './client';
import { Company } from '../types/company';

export function fetchCompanies() {
  return apiFetch<Company[]>('/webhook/get-companies');
}

export function fetchArchivedCompanies() {
  return apiFetch<Company[]>('/webhook/get-archived-companies');
}

// requester_id identifies who's actually creating the record (-> created_by)
// separately from owner_id, since an admin can create a company and assign
// it to someone else in the same request. contact_id/contact_role are the
// optional "Initial Contact Link" — linked server-side, not columns on
// companies itself.
export function addCompany(
  payload: Partial<Company> & {
    requester_id?: number | null;
    contact_id?: number | null;
    contact_role?: string | null;
  }
) {
  return apiFetch<{ success: boolean; error?: string; id?: number }>(
    '/webhook/add-companies',
    {
      method: 'POST',
      body: JSON.stringify(payload),
    }
  );
}

// edit_reason is required for audit logging (see entity_activity_log) — not
// a column on companies, just carried through to the update-companies
// workflow so it can write a system_audit row.
// True partial update — omit a field to leave it untouched server-side
// (update-companies builds its SET clause dynamically from whatever keys
// are actually present in the body), so a minimal payload like
// { owner_id } is safe and won't null out the rest of the row.
export function updateCompany(id: number, payload: Partial<Company> & { edit_reason?: string }) {
  return apiFetch<{ success: boolean; error?: string }>('/webhook/update-companies', {
    method: 'POST',
    body: JSON.stringify({ id, ...payload }),
  });
}

export function archiveCompanies(ids: number[]) {
  return apiFetch<{ success: boolean; error?: string }>('/webhook/archive-companies', {
    method: 'POST',
    body: JSON.stringify({ ids }),
  });
}

export function restoreCompanies(ids: number[]) {
  return apiFetch<{ success: boolean; error?: string }>('/webhook/restore-companies', {
    method: 'POST',
    body: JSON.stringify({ ids }),
  });
}

export function deleteCompanies(ids: number[]) {
  return apiFetch<{ success: boolean; error?: string }>('/webhook/delete-companies', {
    method: 'POST',
    body: JSON.stringify({ ids }),
  });
}
