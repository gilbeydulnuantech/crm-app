export interface Contact {
  id: number;
  first_name: string;
  last_name: string;
  job_title?: string;
  account_id?: number | null;
  company_name?: string;
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
  do_not_contact?: boolean;
  owner_id?: number | null;
  owner_name?: string;
  created_at?: string;
  last_contacted_at?: string;
  email_logs?: EmailLog[] | string;
  tags?: { id: number; name: string }[];
  // ASSUMPTION: these need a join in get-contacts that doesn't exist yet —
  // stage_name from the contact's most recent open opportunity, has_open_task
  // from an EXISTS check against activities. Documented in n8n-workflows/README.md.
  stage_name?: string;
  has_open_task?: boolean;
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

export const LEAD_STATUS_OPTIONS = ['New', 'Contacted', 'Qualified', 'Unqualified', 'Customer'];

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
