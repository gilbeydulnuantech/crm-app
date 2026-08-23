export const TICKET_STATUSES = ['open', 'pending', 'resolved', 'closed'] as const;
export type TicketStatus = (typeof TICKET_STATUSES)[number];

export const TICKET_PRIORITIES = ['low', 'normal', 'high', 'urgent'] as const;
export type TicketPriority = (typeof TICKET_PRIORITIES)[number];

export const TICKET_CATEGORIES = ['Technical', 'Billing', 'General', 'Feature Request', 'Bug', 'Other'] as const;
export type TicketCategory = (typeof TICKET_CATEGORIES)[number];

export const TICKET_COMMENT_CHANNELS = ['internal', 'email'] as const;
export type TicketCommentChannel = (typeof TICKET_COMMENT_CHANNELS)[number];

export const TICKET_PRIORITY_BADGE: Record<TicketPriority, string> = {
  low: 'bg-slate-100 text-slate-600',
  normal: 'bg-blue-50 text-blue-700',
  high: 'bg-amber-50 text-amber-700',
  urgent: 'bg-rose-50 text-rose-700',
};

export const TICKET_STATUS_BADGE: Record<TicketStatus, string> = {
  open: 'bg-emerald-50 text-emerald-700',
  pending: 'bg-amber-50 text-amber-700',
  resolved: 'bg-slate-100 text-slate-600',
  closed: 'bg-slate-200 text-slate-500',
};

export interface Ticket {
  id: number;
  subject: string;
  description: string | null;
  status: TicketStatus;
  priority: TicketPriority;
  category: string | null;
  contact_id: number | null;
  account_id: number | null;
  assigned_user: number | null;
  contact_first_name?: string | null;
  contact_last_name?: string | null;
  contact_email?: string | null;
  contact_phone?: string | null;
  contact_status?: string | null;
  contact_created_at?: string | null;
  account_name?: string | null;
  account_owner_name?: string | null;
  assigned_name?: string | null;
  resolution_notes?: string | null;
  resolved_by_name?: string | null;
  // Raw identity captured on the public intake form — present even when
  // contact_id resolved to a match, so a ticket never loses who submitted it.
  submitter_name?: string | null;
  submitter_email?: string | null;
  sla_due_at: string | null;
  first_response_at: string | null;
  resolved_at: string | null;
  created_at: string;
  updated_at: string;
  comment_count?: number;
}

export interface TicketComment {
  kind: 'comment';
  id: number;
  ticket_id: number;
  author_id: number | null;
  author_name: string | null;
  body: string;
  channel: TicketCommentChannel;
  created_at: string;
}

export interface TicketActivityEvent {
  kind: 'event';
  id: number;
  category: string;
  subtype: string | null;
  summary: string;
  detail: Record<string, unknown> | null;
  actor_name: string | null;
  created_at: string;
}

export type TicketTimelineItem = TicketComment | TicketActivityEvent;

export interface TicketRelatedDeal {
  id: number;
  name: string;
  deal_value: number | null;
  status: string;
  stage_name: string | null;
}

export interface TicketDetail extends Ticket {
  timeline: TicketTimelineItem[];
  open_ticket_count: number;
  previous_ticket_count: number;
  related_deal: TicketRelatedDeal | null;
}
