export const PAYMENT_STATUSES = [
  'pending',
  'processing',
  'paid',
  'partially_paid',
  'failed',
  'refunded',
  'partially_refunded',
  'cancelled',
] as const;
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];

export const PAYMENT_METHODS = ['credit_card', 'bank_transfer', 'check', 'cash', 'other'] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

export const PAYMENT_STATUS_BADGE: Record<PaymentStatus, string> = {
  pending: 'bg-amber-50 text-amber-700',
  processing: 'bg-blue-50 text-blue-700',
  paid: 'bg-emerald-50 text-emerald-700',
  partially_paid: 'bg-teal-50 text-teal-700',
  failed: 'bg-rose-50 text-rose-700',
  refunded: 'bg-slate-100 text-slate-600',
  partially_refunded: 'bg-slate-100 text-slate-600',
  cancelled: 'bg-slate-200 text-slate-500',
};

export interface Payment {
  id: number;
  payment_number: string;
  invoice_id: number | null;
  invoice_number?: string | null;
  opportunity_id: number | null;
  deal_name?: string | null;
  contact_id: number | null;
  contact_first_name?: string | null;
  contact_last_name?: string | null;
  contact_email?: string | null;
  contact_phone?: string | null;
  account_id: number | null;
  account_name?: string | null;
  account_owner_name?: string | null;
  amount: number;
  amount_received: number;
  refunded_amount: number;
  method: PaymentMethod | string | null;
  status: PaymentStatus;
  reference: string | null;
  payment_date: string | null;
  due_date: string | null;
  is_overdue: boolean;
  notes: string | null;
  owner_id: number | null;
  owner_name?: string | null;
  created_at: string;
  updated_at: string;
}

export interface PaymentTimelineEvent {
  id: number;
  category: string;
  subtype: string | null;
  summary: string;
  detail: Record<string, unknown> | null;
  actor_name: string | null;
  created_at: string;
}

export interface PaymentDetail extends Payment {
  timeline: PaymentTimelineEvent[];
  customer_total_spent: number;
  customer_total_refunded: number;
  customer_outstanding_count: number;
  customer_failed_count: number;
  customer_total_payments: number;
}

export const INVOICE_STATUSES = ['pending', 'partially_paid', 'paid', 'overdue', 'voided'] as const;
export type InvoiceStatus = (typeof INVOICE_STATUSES)[number];

export const INVOICE_STATUS_BADGE: Record<InvoiceStatus, string> = {
  pending: 'bg-amber-50 text-amber-700',
  partially_paid: 'bg-teal-50 text-teal-700',
  paid: 'bg-emerald-50 text-emerald-700',
  overdue: 'bg-rose-50 text-rose-700',
  voided: 'bg-slate-200 text-slate-500',
};

export interface InvoiceLineItem {
  product: string;
  qty: number;
  unit_price: number;
  discount: number;
  tax: number;
  total: number;
}

export interface Invoice {
  id: number;
  invoice_number: string;
  opportunity_id: number | null;
  deal_name?: string | null;
  contact_id: number | null;
  contact_first_name?: string | null;
  contact_last_name?: string | null;
  account_id: number | null;
  account_name?: string | null;
  amount: number;
  tax: number;
  discount: number;
  total: number;
  amount_paid: number;
  issue_date?: string;
  due_date: string | null;
  is_voided: boolean;
  created_at: string;
}

export interface InvoicePaymentSummary {
  id: number;
  payment_number: string;
  amount: number;
  amount_received: number;
  refunded_amount: number;
  method: string | null;
  status: PaymentStatus;
  reference: string | null;
  payment_date: string | null;
}

export interface InvoiceRelatedTicket {
  id: number;
  subject: string;
  status: string;
  priority: string;
  created_at: string;
}

export interface InvoiceDetail extends Invoice {
  line_items: InvoiceLineItem[];
  issue_date: string;
  internal_notes: string | null;
  customer_notes: string | null;
  is_voided: boolean;
  contact_email?: string | null;
  contact_phone?: string | null;
  street_address?: string | null;
  city?: string | null;
  state?: string | null;
  zip_code?: string | null;
  country?: string | null;
  owner_name?: string | null;
  status: InvoiceStatus;
  amount_paid: number;
  outstanding: number;
  payments: InvoicePaymentSummary[];
  timeline: PaymentTimelineEvent[];
  related_tickets: InvoiceRelatedTicket[];
  is_admin: boolean;
}
