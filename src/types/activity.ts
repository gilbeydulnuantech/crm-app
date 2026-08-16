// Mirrors notes.ts's entity_type/entity_id polymorphic pattern. Distinct from
// the Dashboard's global "Recent Activity" feed (see activity_log_schema.sql)
// — this is a per-record timeline (Calls, Meetings, System Audit tabs on
// ContactDetailModal/CompanyDetailModal). Email isn't stored here; it lives
// in Contact.email_logs and the timeline merges it in client-side.
export type ActivityCategory = 'call' | 'meeting' | 'system_audit';

export type ActivitySubtype =
  | 'manual' // call: logged by a rep from the Call button
  | 'calendar_sync' | 'video_call' | 'physical' | 'transcript' // meeting
  | 'field_change' | 'automation' | 'ownership_change' | 'integration_sync' | 'permission' // system_audit
  | 'archived' | 'restored' | 'merge' | 'created' | 'completed' | 'noted' | 'subtask'; // system_audit

export interface ActivityLogEntry {
  id: number;
  entity_type: 'contact' | 'company';
  entity_id: number;
  category: ActivityCategory;
  subtype?: ActivitySubtype | null;
  summary: string;
  detail?: Record<string, unknown> | null;
  actor_id?: number | null;
  actor_name?: string | null;
  created_at: string;
}

export const ACTIVITY_TABS = ['All', 'Emails', 'Calls', 'Meetings', 'System Audit'] as const;
export type ActivityTab = (typeof ACTIVITY_TABS)[number];
