// Single source of truth for every auto-send trigger_event this app knows
// about, so the Email Template Editor's dropdown, the Email Templates
// panel's badge labels, and the event-grouping picker can't drift out of
// sync with each other.
export interface EmailTriggerEventOption {
  value: string;
  label: string;
}

export const EMAIL_TRIGGER_EVENTS: EmailTriggerEventOption[] = [
  { value: 'proposal_approved', label: 'When a proposal is approved' },
  { value: 'google_maps_lead', label: 'When a Google Maps lead is enriched' },
  { value: 'contact_added_manually', label: 'When a contact is added manually' },
  { value: 'booking_reminder_24h', label: 'Booking reminder: 24 hours before' },
  { value: 'booking_reminder_2h', label: 'Booking reminder: 2 hours before' },
];

export const TRIGGER_EVENT_LABEL: Record<string, string> = Object.fromEntries(
  EMAIL_TRIGGER_EVENTS.map((t) => [t.value, t.label])
);
