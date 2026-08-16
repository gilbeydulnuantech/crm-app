// Calendar events are `activities` rows with a `due_at` set — not a
// separate table. `type` is a free-text VARCHAR(50) in your schema (no CHECK
// constraint), so we can safely use richer values than the original
// call/email/task/note/meeting comment suggested.
export const EVENT_TYPES = [
  'inspection',
  'call',
  'meeting',
  'proposal',
  'material_delivery',
  'site_visit',
  'personal',
] as const;

export type EventType = (typeof EVENT_TYPES)[number];

export const EVENT_TYPE_META: Record<EventType, { label: string; color: string; dot: string }> = {
  inspection: { label: 'Inspection', color: 'bg-emerald-100 text-emerald-800', dot: 'bg-emerald-500' },
  call: { label: 'Phone Call', color: 'bg-blue-100 text-blue-800', dot: 'bg-blue-500' },
  meeting: { label: 'Meeting', color: 'bg-amber-100 text-amber-800', dot: 'bg-amber-500' },
  proposal: { label: 'Proposal', color: 'bg-purple-100 text-purple-800', dot: 'bg-purple-500' },
  material_delivery: { label: 'Material Delivery', color: 'bg-orange-100 text-orange-800', dot: 'bg-orange-500' },
  site_visit: { label: 'Site Visit', color: 'bg-rose-100 text-rose-800', dot: 'bg-rose-500' },
  personal: { label: 'Personal', color: 'bg-slate-200 text-slate-800', dot: 'bg-slate-500' },
};

export interface CalendarEvent {
  id: number;
  contact_id?: number | null;
  contact_name?: string; // joined
  opportunity_id?: number | null;
  opportunity_name?: string; // joined
  account_id?: number | null; // direct company link on the event itself
  company_id?: number | null; // resolved: own account_id, else the linked deal's,
  company_name?: string; // else the linked contact's — whichever is set first
  user_id?: number | null;
  assigned_user_name?: string; // joined
  assigned_user_color?: string; // joined from users.color
  assigned_user_avatar_url?: string | null; // joined from users.avatar_url
  type: EventType;
  subject: string;
  body?: string; // used as "Notes" — stored in activities.body
  is_completed: boolean;
  due_at: string; // start time
  end_at?: string | null;
  location?: string | null;
  is_all_day?: boolean;
  completed_at?: string | null;
  created_at?: string;
  // Linked via activity_resources — which shared resources (rooms, vehicles,
  // equipment) this event has booked.
  resources?: { id: number; name: string }[];
}

export type CalendarViewMode = 'month' | 'week' | 'day' | 'agenda';
