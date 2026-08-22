import { apiFetch } from './client';
import { readFileAsDataUrl } from '../utils/file';

export interface CompanyProfile {
  success: boolean;
  company_name: string;
  email: string;
  phone: string;
  logo_url: string | null;
}

export function fetchCompanyProfile() {
  return apiFetch<CompanyProfile>('/webhook/get-company-profile');
}

export interface SaveCompanyProfilePayload {
  company_name: string;
  email: string;
  phone: string;
}

export function saveCompanyProfile(payload: SaveCompanyProfilePayload) {
  return apiFetch<{ success: boolean; error?: string }>('/webhook/save-company-profile', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function uploadCompanyLogo(file: File) {
  const url = await readFileAsDataUrl(file);
  return apiFetch<{ success: boolean; logo_url?: string; error?: string }>('/webhook/upload-company-logo', {
    method: 'POST',
    body: JSON.stringify({ photo: { name: file.name, url } }),
  });
}
