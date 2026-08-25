import { apiFetch } from './client';
import { Payment, PaymentDetail, PaymentStatus, Invoice, InvoiceDetail, InvoiceLineItem } from '../types/payment';

export function fetchPayments() {
  return apiFetch<Payment[]>('/webhook/get-payments');
}

export function fetchPayment(id: number) {
  return apiFetch<PaymentDetail>(`/webhook/get-payment?id=${id}`);
}

export function fetchInvoices() {
  return apiFetch<Invoice[]>('/webhook/get-invoices');
}

export function fetchInvoice(id: number) {
  return apiFetch<InvoiceDetail>(`/webhook/get-invoice?id=${id}`);
}

export interface InvoiceLineItemInput {
  product: string;
  qty: number;
  unit_price: number;
  discount?: number;
  tax?: number;
}

export interface CreateInvoicePayload {
  opportunity_id?: number | null;
  contact_id?: number | null;
  account_id?: number | null;
  line_items: InvoiceLineItemInput[];
  issue_date?: string;
  due_date?: string | null;
  internal_notes?: string;
  customer_notes?: string;
}

export function createInvoice(payload: CreateInvoicePayload) {
  return apiFetch<{ success: boolean; id: number; invoice_number: string }>('/webhook/create-invoice', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export interface UpdateInvoicePayload {
  id: number;
  line_items?: InvoiceLineItemInput[];
  due_date?: string | null;
  internal_notes?: string;
  customer_notes?: string;
}

export function updateInvoice(payload: UpdateInvoicePayload) {
  return apiFetch<{ success: boolean; id: number }>('/webhook/update-invoice', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function voidInvoice(id: number) {
  return apiFetch<{ success: boolean }>('/webhook/void-invoice', {
    method: 'POST',
    body: JSON.stringify({ id }),
  });
}

export function sendInvoice(invoiceId: number) {
  return apiFetch<{ success: boolean; error?: string }>('/webhook/send-invoice', {
    method: 'POST',
    body: JSON.stringify({ invoice_id: invoiceId }),
  });
}

export type { InvoiceLineItem };

export interface CreatePaymentPayload {
  invoice_id?: number | null;
  opportunity_id?: number | null;
  contact_id?: number | null;
  account_id?: number | null;
  amount: number;
  amount_received?: number;
  method?: string;
  status?: PaymentStatus;
  reference?: string;
  payment_date?: string;
  due_date?: string | null;
  notes?: string;
  owner_id?: number | null;
}

export function createPayment(payload: CreatePaymentPayload) {
  return apiFetch<{ success: boolean; id: number }>('/webhook/create-payment', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export interface UpdatePaymentPayload {
  id: number;
  status?: PaymentStatus;
  amount_received?: number;
  refunded_amount?: number;
  method?: string;
  reference?: string;
  payment_date?: string;
  due_date?: string | null;
  notes?: string;
  owner_id?: number | null;
}

export function updatePayment(payload: UpdatePaymentPayload) {
  return apiFetch<{ success: boolean; id: number }>('/webhook/update-payment', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function addPaymentNote(paymentId: number, note: string) {
  return apiFetch<{ success: boolean }>('/webhook/add-payment-note', {
    method: 'POST',
    body: JSON.stringify({ payment_id: paymentId, note }),
  });
}

export function sendReceipt(paymentId: number) {
  return apiFetch<{ success: boolean; error?: string }>('/webhook/send-receipt', {
    method: 'POST',
    body: JSON.stringify({ payment_id: paymentId }),
  });
}

export function archivePayment(id: number) {
  return apiFetch<{ success: boolean }>('/webhook/archive-payment', {
    method: 'POST',
    body: JSON.stringify({ id }),
  });
}
