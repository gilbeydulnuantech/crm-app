import { apiFetch } from './client';
import { readFileAsDataUrl } from '../utils/file';

export interface BookingHours {
  start: number; // whole hours, 9 = 9am
  end: number; // 17 = 5pm
  days: number[]; // 0 = Sunday .. 6 = Saturday
  slot_minutes: number; // how long one booking lasts
  step_minutes?: number; // how often a start time is offered (defaults to the slot length)
  buffer_minutes?: number; // gap kept free before and after each booking (default 0)
  lead_hours?: number;
  window_days?: number;
}

export interface CompanyProfile {
  success: boolean;
  company_name: string;
  email: string;
  phone: string;
  logo_url: string | null;
  address: string;
  website: string;
  brand_color: string;
  timezone: string;
  // Clock shown across the app: 3:30 PM (12h) or 15:30 (24h).
  time_format?: '12h' | '24h';
  // Industry & features (Settings > Industry & features)
  industry?: string | null;
  staff_enabled?: boolean;
  online_provider_choice?: boolean;
  staff_label?: string;
  booking_hours?: BookingHours | null;
  // When on, formatted emails get a logo/name header, a contact footer and the sending rep's signature.
  email_branding_enabled?: boolean;
  email_footer_note?: string;
  // When on, proposals and contracts (pages, internal views and PDFs) show the company header and footer.
  document_branding_enabled?: boolean;
}

export function fetchCompanyProfile() {
  return apiFetch<CompanyProfile>('/webhook/get-company-profile');
}

export interface SaveCompanyProfilePayload {
  company_name: string;
  email: string;
  phone: string;
  address: string;
  website: string;
  brand_color: string;
  timezone: string;
  time_format?: '12h' | '24h';
  // Optional: a save that leaves them out (like the timezone dialog) keeps the current values.
  email_branding_enabled?: boolean;
  email_footer_note?: string;
  document_branding_enabled?: boolean;
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
