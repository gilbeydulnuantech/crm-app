import { apiFetch } from './client';
import { BookingHours } from './companyProfile';

export interface IndustryPreset {
  key: string;
  name: string;
  description: string;
  staff_label: string;
  staff_enabled: boolean;
  booking: BookingHours;
  event_types: string[];
  appointment_name: string;
}

export interface IndustrySettings {
  success: boolean;
  industry: string | null;
  staff_enabled: boolean;
  online_provider_choice: boolean;
  staff_label: string;
  booking_hours: BookingHours;
  presets: IndustryPreset[];
}

export function fetchIndustrySettings() {
  return apiFetch<IndustrySettings>('/webhook/get-industry-settings');
}

// Adds the preset's starter event types and defaults. Never deletes or overwrites anything the customer created.
export function applyIndustryPreset(industry: string) {
  return apiFetch<{ success: boolean; types_added?: number; renamed?: number; error?: string }>('/webhook/apply-industry-preset', {
    method: 'POST',
    body: JSON.stringify({ industry }),
  });
}

export interface IndustryFeaturesPayload {
  staff_enabled?: boolean;
  online_provider_choice?: boolean;
  staff_label?: string;
  booking_hours?: BookingHours;
}

export function saveIndustryFeatures(payload: IndustryFeaturesPayload) {
  return apiFetch<{ success: boolean; error?: string }>('/webhook/save-industry-features', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}
