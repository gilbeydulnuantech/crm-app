import { apiFetch } from './client';
import { Ticket, TicketDetail, TicketStatus, TicketPriority, TicketCommentChannel } from '../types/ticket';

export function fetchTickets() {
  return apiFetch<Ticket[]>('/webhook/get-tickets');
}

export function fetchTicket(id: number) {
  return apiFetch<TicketDetail>(`/webhook/get-ticket?id=${id}`);
}

export interface CreateTicketPayload {
  subject: string;
  description?: string;
  priority?: TicketPriority;
  contact_id?: number | null;
  account_id?: number | null;
  assigned_user?: number | null;
}

export function createTicket(payload: CreateTicketPayload) {
  return apiFetch<{ success: boolean; id: number }>('/webhook/create-ticket', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export interface UpdateTicketPayload {
  id: number;
  subject?: string;
  description?: string;
  status?: TicketStatus;
  priority?: TicketPriority;
  category?: string | null;
  contact_id?: number | null;
  account_id?: number | null;
  assigned_user?: number | null;
  resolution_notes?: string | null;
}

export function updateTicket(payload: UpdateTicketPayload) {
  return apiFetch<{ success: boolean; id: number }>('/webhook/update-ticket', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function addTicketComment(ticketId: number, body: string, channel: TicketCommentChannel = 'internal') {
  return apiFetch<{ success: boolean }>('/webhook/add-ticket-comment', {
    method: 'POST',
    body: JSON.stringify({ ticket_id: ticketId, body, channel }),
  });
}

export function archiveTicket(id: number) {
  return apiFetch<{ success: boolean }>('/webhook/archive-ticket', {
    method: 'POST',
    body: JSON.stringify({ id }),
  });
}

export interface CreateTicketPublicPayload {
  name: string;
  email: string;
  subject: string;
  description?: string;
  priority?: TicketPriority;
  // Honeypot — left empty by real visitors, hidden via CSS on the form.
  // A bot filling every field trips it; the backend then silently no-ops.
  website?: string;
}

// No auth — this is the public "submit a support ticket" form, same
// unauthenticated-webhook pattern as the public proposal/contract pages.
export function createTicketPublic(payload: CreateTicketPublicPayload) {
  return apiFetch<{ success: boolean; id?: number }>('/webhook/create-ticket-public', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}
