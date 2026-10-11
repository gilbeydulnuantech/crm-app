import { apiFetch } from './client';

export interface StaffMember {
  id: number;
  owner_user_id: number | null;
  owner_name: string | null; // the user whose list this person is on
  name: string;
  phone: string | null;
  email: string | null;
  color: string | null;
  is_active: boolean;
  bookable_online: boolean; // offered on the public booking page
  commission_percent: number; // share of the amount paid that this person earns
  event_count: number;
}

// A user gets their own staff; an admin gets everyone's.
export async function fetchStaff() {
  return (await apiFetch<StaffMember[]>('/webhook/get-staff')) ?? [];
}

export interface SaveStaffPayload {
  id?: number;
  name: string;
  phone?: string;
  email?: string;
  is_active?: boolean;
  bookable_online?: boolean;
  commission_percent?: number;
  // Admin only: whose list the new person goes on. Ignored for everyone else (it is always their own).
  owner_user_id?: number;
}

export function saveStaff(payload: SaveStaffPayload) {
  return apiFetch<{ success: boolean; id?: number; error?: string }>('/webhook/save-staff', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function deleteStaff(id: number) {
  return apiFetch<{ success: boolean; error?: string }>('/webhook/delete-staff', {
    method: 'POST',
    body: JSON.stringify({ id }),
  });
}
