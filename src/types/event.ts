// Calendar events are `activities` rows with a `due_at` set — not a
// separate table. `type` is a free-text VARCHAR(50) in your schema (no CHECK constraint).
// An event's type is the `key` of a row in the event_types table (Settings > Event Types), so it is plain text:
// the list is edited by the customer, not fixed in the code.
export type EventType = string;

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
  // Linked catalog product/service (picked from the Event Title dropdown); product_price is the price saved on the event when it was booked.
  product_id?: number | null;
  product_name?: string | null;
  // The therapist/staff member who performs the booking (they never sign in; see Settings > Staff).
  staff_id?: number | null;
  staff_name?: string | null;
  // Set when the rep confirms the booking (client arrived) and picks a discount card. amount_paid is the price after the
  // discount; the commission is the staff member's percentage of that and is worked out by the database.
  confirmed_at?: string | null;
  discount_name?: string | null;
  discount_percent?: number | null;
  amount_paid?: number | null;
  commission_percent?: number | null;
  commission_amount?: number | null;
  // How the client paid (cash / kaspi / card, or package / membership when prepaid) and when.
  payment_method?: string | null;
  paid_at?: string | null;
  client_package_id?: number | null;
  client_membership_id?: number | null;
  product_price?: number | string | null;
  // Set when the booking was cancelled or the client did not show up. It stays on the calendar but frees the slot and earns nothing.
  outcome?: 'cancelled' | 'no_show' | null;
}

export type CalendarViewMode = 'month' | 'week' | 'day' | 'agenda';
