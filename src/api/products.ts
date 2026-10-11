import { apiFetch } from './client';

// One length a client can choose when booking online, with its own price.
export interface ServiceDuration {
  minutes: number;
  price: number;
}

export interface Product {
  id: number;
  name: string;
  // Fixed at creation; the {{product_<slug>}} merge token.
  slug: string;
  description_html: string;
  sku: string | null;
  category: string | null;
  unit: string;
  unit_price: number;
  tax_rate: number;
  is_active: boolean;
  created_by: number | null;
  created_by_name: string | null;
  created_at: string;
  updated_at: string;
  // Calendar event type this service belongs to: picking the service in a new event fills the type in.
  bookable_online?: boolean; // offered on the public booking page
  durations?: ServiceDuration[]; // empty = one length, priced at unit_price
  event_type_id?: number | null;
  event_type_key?: string | null;
  event_type_name?: string | null;
  event_type_color?: string | null;
}

// See fetchProposalTemplates (api/proposalTemplates.ts) for why this falls
// back to [] instead of letting apiFetch's undefined pass straight into
// React Query.
export async function fetchProducts() {
  return (await apiFetch<Product[]>('/webhook/get-products')) ?? [];
}

export interface SaveProductPayload {
  id?: number;
  name: string;
  description_html: string;
  sku?: string;
  category?: string;
  unit: string;
  unit_price: number;
  tax_rate: number;
  is_active: boolean;
  bookable_online?: boolean;
  durations?: ServiceDuration[];
  event_type_id?: number | null;
}

export function saveProduct(payload: SaveProductPayload) {
  return apiFetch<{ success: boolean; id?: number; error?: string }>('/webhook/save-product', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function deleteProduct(id: number) {
  return apiFetch<{ success: boolean; error?: string }>('/webhook/delete-product', {
    method: 'POST',
    body: JSON.stringify({ id }),
  });
}
