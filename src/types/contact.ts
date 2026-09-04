export interface Contact {
  id: number;
  first_name: string;
  last_name: string;
  job_title?: string;
  account_id?: number | null;
  company_name?: string;
  company_role?: string; // set via a company's "Initial Contact Link" (CompanyFormModal)
  email?: string;
  secondary_email?: string;
  phone?: string;
  secondary_phone?: string;
  linkedin_url?: string;
  city?: string;
  state?: string;
  zip_code?: string;
  country?: string;
  lead_status?: string;
  lead_source?: string;
  // Recomputed every 15 min by the "Lead Scoring Engine" n8n workflow from
  // engagement/fit signals (email opens, completed activities, proposal/
  // contract/payment milestones, deal value, recency decay). Forced to 0
  // for any DNC contact — see that workflow's SQL for the exact formula.
  lead_score?: number;
  birthdate?: string; // YYYY-MM-DD; age is computed on the fly, not stored
  do_not_contact?: boolean;
  dnc_email?: boolean;
  dnc_call?: boolean;
  dnc_sms?: boolean;
  owner_id?: number | null;
  owner_name?: string;
  created_at?: string;
  last_contacted_at?: string;
  // GREATEST(contacts.updated_at, most recent entity_activity_log entry) —
  // computed server-side in get-contacts, not a real column.
  last_activity_at?: string;
  email_logs?: EmailLog[] | string;
  tags?: { id: number; name: string }[];
  // ASSUMPTION: these need a join in get-contacts that doesn't exist yet —
  // stage_name from the contact's most recent open opportunity, has_open_task
  // from an EXISTS check against activities. Documented in n8n-workflows/README.md.
  stage_name?: string;
  has_open_task?: boolean;
  // ASSUMPTION: no `timezone` column exists on contacts yet (unlike
  // secondary_email/secondary_phone/linkedin_url, which are already wired
  // through add-contact/update-contact/get-contacts). Renders as "--" until
  // a real column + form field are added.
  timezone?: string;
}

export interface EmailLog {
  id?: string; // present on logs written by contact-email-crud.json; older/legacy entries may lack it
  type: 'sent' | 'received';
  subject?: string;
  message?: string;
  to?: string;
  from?: string;
  sent_at?: string;
  is_read?: boolean;
  attachments?: { name: string; url?: string }[];
}

export interface ArchivedContact extends Contact {
  archived_by?: number | null; // raw FK to users.id
  archived_by_name?: string; // joined display name — see get-contacts README note
  archived_at?: string;
  archive_reason?: string;
}

export type ContactsView = 'all' | 'mine' | 'archived';

export const DO_NOT_CONTACT_STATUS = 'Do Not Contact';
export const LEAD_STATUS_OPTIONS = ['New', 'Active', 'Customer', 'Inactive', 'Unqualified', DO_NOT_CONTACT_STATUS];

export type DncChannel = 'email' | 'call' | 'sms';
export const DNC_CHANNELS: { channel: DncChannel; label: string; field: 'dnc_email' | 'dnc_call' | 'dnc_sms' }[] = [
  { channel: 'email', label: 'Email', field: 'dnc_email' },
  { channel: 'call', label: 'Call', field: 'dnc_call' },
  { channel: 'sms', label: 'SMS', field: 'dnc_sms' },
];

// Matches import-contacts.json's "Validate Token & Rows" node — only
// first_name is required there, everything else is optional and trimmed.
export interface ImportContactRow {
  first_name: string;
  last_name?: string;
  email?: string;
  phone?: string;
  city?: string;
  country?: string;
  lead_status?: string;
}

export const IMPORT_CONTACTS_MAX_ROWS = 500;
