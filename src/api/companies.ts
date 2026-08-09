import { apiFetch } from './client';
import { Company } from '../types/company';

export function fetchCompanies() {
  return apiFetch<Company[]>('/webhook/get-companies');
}

export function fetchArchivedCompanies() {
  return apiFetch<Company[]>('/webhook/get-archived-companies');
}

export function addCompany(payload: Partial<Company>) {
  return apiFetch<{ success: boolean; error?: string; id?: number }>(
    '/webhook/add-companies',
    {
      method: 'POST',
      body: JSON.stringify(payload),
    }
  );
}

export function updateCompany(id: number, payload: Partial<Company>) {
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

export function deleteCompanies(ids: number[]) {
  return apiFetch<{ success: boolean; error?: string }>('/webhook/delete-companies', {
    method: 'POST',
    body: JSON.stringify({ ids }),
  });
}
