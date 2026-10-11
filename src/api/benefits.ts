import { apiFetch } from './client';

export type PaymentMethod = 'cash' | 'kaspi' | 'card';
export const PAYMENT_METHOD_LABELS: Record<string, string> = { cash: 'Cash', kaspi: 'Kaspi', card: 'Card', package: 'Package', membership: 'Membership' };

export interface PackageDef {
  id: number;
  name: string;
  sessions: number;
  price: number;
  valid_days: number;
  product_id: number | null;
  product_name: string | null;
  is_active: boolean;
  sold: number;
}

export interface MembershipPlan {
  id: number;
  name: string;
  price: number;
  period_days: number;
  discount_percent: number;
  included_sessions: number;
  is_active: boolean;
  sold: number;
}

export function fetchBenefitCatalog() {
  return apiFetch<{ success: boolean; packages: PackageDef[]; plans: MembershipPlan[] }>('/webhook/get-benefit-catalog');
}

export function savePackage(payload: { id?: number; name: string; sessions: number; price: number; valid_days: number; product_id?: number | null; is_active?: boolean }) {
  return apiFetch<{ success: boolean; id?: number; error?: string }>('/webhook/save-package', { method: 'POST', body: JSON.stringify(payload) });
}
export function deletePackage(id: number) {
  return apiFetch<{ success: boolean; error?: string }>('/webhook/delete-package', { method: 'POST', body: JSON.stringify({ id }) });
}
export function saveMembershipPlan(payload: { id?: number; name: string; price: number; period_days: number; discount_percent: number; included_sessions: number; is_active?: boolean }) {
  return apiFetch<{ success: boolean; id?: number; error?: string }>('/webhook/save-membership-plan', { method: 'POST', body: JSON.stringify(payload) });
}
export function deleteMembershipPlan(id: number) {
  return apiFetch<{ success: boolean; error?: string }>('/webhook/delete-membership-plan', { method: 'POST', body: JSON.stringify({ id }) });
}

export interface ClientPackage {
  id: number;
  name: string;
  sessions_total: number;
  remaining: number;
  price_paid: number;
  session_value: number;
  product_id: number | null;
  product_name: string | null;
  purchased_at: string;
  expires_at: string;
  status: 'active' | 'cancelled';
  usable: boolean;
}

export interface ClientMembership {
  id: number;
  name: string;
  price: number;
  discount_percent: number;
  included_sessions: number;
  remaining: number; // included sessions left in the current period
  session_value: number;
  period_start: string;
  renews_at: string;
  status: 'active' | 'cancelled';
  usable: boolean;
}

export function fetchClientBenefits(contactId: number) {
  return apiFetch<{ success: boolean; packages: ClientPackage[]; memberships: ClientMembership[] }>(`/webhook/get-client-benefits?contact_id=${contactId}`);
}
export function sellPackage(payload: { contact_id: number; item_id: number; payment_method: PaymentMethod }) {
  return apiFetch<{ success: boolean; id?: number; error?: string }>('/webhook/sell-package', { method: 'POST', body: JSON.stringify(payload) });
}
export function sellMembership(payload: { contact_id: number; item_id: number; payment_method: PaymentMethod }) {
  return apiFetch<{ success: boolean; id?: number; error?: string }>('/webhook/sell-membership', { method: 'POST', body: JSON.stringify(payload) });
}
export function renewMembership(payload: { membership_id: number; payment_method: PaymentMethod }) {
  return apiFetch<{ success: boolean; error?: string }>('/webhook/renew-membership', { method: 'POST', body: JSON.stringify(payload) });
}
export function cancelClientBenefit(payload: { kind: 'package' | 'membership'; id: number }) {
  return apiFetch<{ success: boolean; error?: string }>('/webhook/cancel-client-benefit', { method: 'POST', body: JSON.stringify(payload) });
}
