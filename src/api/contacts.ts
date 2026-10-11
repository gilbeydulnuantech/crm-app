import { apiFetch } from './client';
import { ArchivedContact, Contact, DncChannel, DO_NOT_CONTACT_STATUS, ImportContactRow } from '../types/contact';
import { ContactRelated } from '../types/contactRelated';

// Fire-and-forget call into the Contact status system webhook (n8n) — a
// rules engine that recomputes lead_status from whatever context the caller
// knows (deal stage, last activity). Every field but contact_id is optional:
// a caller only passes what it actually knows, and rules keyed on missing
// fields simply don't fire (see Contact status system.json). Deliberately
// has no DNC-related field — do_not_contact/dnc_email/dnc_call/dnc_sms are
// only ever set by a rep directly checking a DNC checkbox, never by this
// engine. Never throws — this is a best-effort background sync, never the
// reason a UI action (stage move, unsubscribe) should appear to fail.
export function syncContactStatus(payload: {
  contact_id: number;
  contact_name?: string;
  contact_created_at?: string | null;
  last_activity?: string | null;
  deal_stage?: string;
  deal_tag?: string;
}) {
  return apiFetch<{ success: boolean; error?: string }>('/webhook/contact-status-system', {
    method: 'POST',
    body: JSON.stringify(payload),
  }).catch(() => undefined);
}

export function fetchContacts() {
  return apiFetch<Contact[]>('/webhook/get-contacts?archived=false');
}

// Single-contact fetch — same get-contacts webhook, narrowed with ?id=,
// so a caller that only needs one contact (e.g. DealDetailModal's sidebar)
// isn't stuck sharing the full list's ['contacts'] cache entry and its
// notification-bell-driven 15s poll (see useContactsForNotifications).
export function fetchContact(id: number) {
  return apiFetch<Contact[]>(`/webhook/get-contacts?archived=false&id=${id}`).then((rows) => rows[0]);
}

// One company's contacts — same get-contacts webhook, narrowed with
// ?account_id=, so CompanyDetailModal isn't pulling + polling the entire
// contacts list just to filter it down to one company client-side.
export function fetchContactsByCompany(accountId: number) {
  return apiFetch<Contact[]>(`/webhook/get-contacts?archived=false&account_id=${accountId}`);
}

// Same get-contacts webhook, just asking for the archived set instead of a
// separate endpoint — see n8n-workflows/README.md for the Build Query node
// change this requires (reading a new `archived` query param).
export function fetchArchivedContacts() {
  return apiFetch<ArchivedContact[]>('/webhook/get-contacts?archived=true');
}

export function addContact(payload: Partial<Contact>) {
  return apiFetch<{ success: boolean; error?: string }>('/webhook/add-contact', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

// Calendar Contact Create workflow: adds the client typed into the New Event form. Matches an
// existing contact by email or phone first, so the same person is never added twice.
export interface CalendarContactPayload {
  name: string;
  email?: string;
  phone?: string;
  owner_id?: number;
  account_id?: number;
}
export function createCalendarContact(payload: CalendarContactPayload) {
  return apiFetch<{ success: boolean; contact_id?: number; existing?: boolean; name?: string; error?: string }>(
    '/webhook/add-calendar-contact',
    { method: 'POST', body: JSON.stringify(payload) }
  );
}

// import-contacts.json caps this at 500 rows per request and silently drops
// any row missing first_name — inserted_count tells the caller how many of
// the rows sent actually landed.
export function importContacts(contacts: ImportContactRow[]) {
  return apiFetch<{ success: boolean; inserted_count: number; inserted_ids: number[]; error?: string }>(
    '/webhook/import-contacts',
    {
      method: 'POST',
      body: JSON.stringify({ contacts }),
    }
  );
}

export function updateContact(id: number, payload: Partial<Contact>) {
  return apiFetch<{ success: boolean; error?: string }>('/webhook/update-contact', {
    method: 'POST',
    body: JSON.stringify({ id, ...payload }),
  });
}

export async function archiveContacts(ids: number[], reason?: string) {
  // Confirmed: archive-contact expects a single integer `contact_id` per
  // request, not an array — fires one request per selected contact instead.
  const results = await Promise.all(
    ids.map((contact_id) =>
      apiFetch<{ success: boolean; error?: string }>('/webhook/archive-contact', {
        method: 'POST',
        body: JSON.stringify({ contact_id, reason: reason?.trim() || undefined }),
      })
    )
  );
  const failed = results.find((r) => r?.success === false);
  if (failed) {
    throw new Error(failed.error || 'One or more contacts failed to archive.');
  }
  return { success: true };
}

export function deleteContacts(ids: number[]) {
  return apiFetch<{ success: boolean; error?: string }>('/webhook/delete-contacts', {
    method: 'POST',
    body: JSON.stringify({ ids }),
  });
}

// ASSUMPTION: mirrors archive/delete shape. Needs a matching n8n workflow
// that flips archived = false (and clears archived_by/archived_at).
export function restoreContacts(ids: number[]) {
  return apiFetch<{ success: boolean; error?: string }>('/webhook/restore-contacts', {
    method: 'POST',
    body: JSON.stringify({ ids }),
  });
}

// New workflow (contact-email-crud.json, not part of the original backend) —
// appends a "sent" entry to the contact's email_logs. Doesn't actually
// deliver an email yet; see n8n-workflows/README.md. Attachments are sent as
// data: URLs (base64) — no file storage exists, so they're stored inline on
// the log entry itself.
export function sendContactEmail(
  contactId: number,
  subject: string,
  message: string,
  to: string,
  from: string,
  attachments: { name: string; url: string }[],
  htmlMessage?: string
) {
  return apiFetch<{ success: boolean; error?: string }>('/webhook/send-email', {
    method: 'POST',
    // Formatted sends: `message` is the plain-text copy (what gets logged on the contact), `html_message` the HTML body.
    body: JSON.stringify({ contact_id: contactId, subject, message, to, from, attachments, ...(htmlMessage ? { is_html: true, html_message: htmlMessage } : {}) }),
  });
}

// New workflow (contact-email-crud.json) — flips one email_logs entry's
// is_read to true. Entries logged before the `id` field existed can't be
// targeted (harmless no-op); see n8n-workflows/README.md.
export function markContactEmailRead(contactId: number, logId: string) {
  return apiFetch<{ success: boolean; error?: string }>('/webhook/mark-log-read', {
    method: 'POST',
    body: JSON.stringify({ contact_id: contactId, log_id: logId }),
  });
}

export function assignContactOwner(contactId: number, ownerId: number | null) {
  return apiFetch<{ success: boolean; error?: string }>('/webhook/assign-contact-owner', {
    method: 'POST',
    body: JSON.stringify({ contact_id: contactId, owner_id: ownerId }),
  });
}

// Admin-only. primaryId survives; duplicateId's deals/tasks/notes/activity/
// tags get reassigned onto it, its email_logs get merged in, and it's
// archived (not deleted) so the merge itself stays undo-able by restoring
// from the Archived tab.
export function mergeContacts(primaryId: number, duplicateId: number) {
  return apiFetch<{ success: boolean; primary_id?: number; merged_id?: number; error?: string }>(
    '/webhook/merge-contacts',
    {
      method: 'POST',
      body: JSON.stringify({ primary_id: primaryId, duplicate_id: duplicateId }),
    }
  );
}

export function toggleDoNotContact(contactId: number, doNotContact: boolean) {
  return apiFetch<{ success: boolean; error?: string }>('/webhook/update-contact', {
    method: 'POST',
    body: JSON.stringify({
      id: contactId,
      do_not_contact: doNotContact,
      // Checking DND also flips the status to match — unchecking it doesn't
      // guess what the status should revert to, so that's left for the
      // status dropdown itself.
      ...(doNotContact ? { lead_status: DO_NOT_CONTACT_STATUS } : {}),
    }),
  });
}

export function toggleContactDncChannel(contactId: number, channel: DncChannel, value: boolean) {
  return apiFetch<{ success: boolean; error?: string }>('/webhook/update-contact', {
    method: 'POST',
    body: JSON.stringify({
      id: contactId,
      [`dnc_${channel}`]: value,
    }),
  });
}

export function fetchContactIdsByTag(tagName: string) {
  return apiFetch<Array<{ id: number } | number>>(
    `/webhook/filter-contacts-by-tag?tag_name=${encodeURIComponent(tagName)}`
  );
}

export interface NotificationPreferences {
  email?: boolean;
  chat?: boolean;
  tasks_due?: boolean;
  // Distinct from `chat` (which only controls the notification-bell badge
  // for messages that already exist) — this controls whether automations
  // (hot lead replies, no-shows, deals won/lost, etc.) send you a DM at
  // all. Off means the message is never created, not just unbadged.
  automation_dms?: boolean;
}

export interface TeamUser {
  id: number;
  name: string;
  email?: string;
  phone?: string | null;
  color?: string;
  role?: 'admin' | 'user';
  notification_preferences?: NotificationPreferences;
  avatar_url?: string | null;
  timezone?: string | null;
  // Branch name set by an admin (Settings > User management), e.g. "Almaty".
  location?: string | null;
  // Shown at the bottom of emails this person sends (when company email branding is on).
  email_signature?: string | null;
}

export function updateUserLocation(userId: number, location: string) {
  return apiFetch<{ success: boolean; location?: string | null; error?: string }>('/webhook/update-user-location', {
    method: 'POST',
    body: JSON.stringify({ user_id: userId, location }),
  });
}

export function fetchUsers() {
  return apiFetch<TeamUser[]>('/webhook/get-users');
}

export interface ManagedUser extends TeamUser {
  active: boolean;
  created_at: string;
}

// Admin-only, unlike fetchUsers() — includes inactive accounts too, for the
// Settings > User Management table.
export function fetchAllUsers() {
  return apiFetch<ManagedUser[]>('/webhook/get-all-users');
}

export function updateUserRole(userId: number, role: 'admin' | 'user') {
  return apiFetch<{ success: boolean; user?: TeamUser; error?: string }>('/webhook/update-user-role', {
    method: 'POST',
    body: JSON.stringify({ user_id: userId, role }),
  });
}

export function updateUserActive(userId: number, active: boolean) {
  return apiFetch<{ success: boolean; user?: TeamUser; error?: string }>('/webhook/update-user-active', {
    method: 'POST',
    body: JSON.stringify({ user_id: userId, active }),
  });
}

// Backend resolves the target user from the session token — you can only
// ever change your own password, and it re-verifies current_password
// server-side before hashing/storing new_password.
export function changePassword(currentPassword: string, newPassword: string) {
  return apiFetch<{ success: boolean; error?: string }>('/webhook/change-password', {
    method: 'POST',
    body: JSON.stringify({ current_password: currentPassword, new_password: newPassword }),
  });
}

export function updateUserColor(userId: number, color: string) {
  return apiFetch<{ success: boolean; user?: TeamUser; error?: string }>('/webhook/update-user-color', {
    method: 'POST',
    body: JSON.stringify({ user_id: userId, color }),
  });
}

export function updateUserPhone(userId: number, phone: string) {
  return apiFetch<{ success: boolean; user?: TeamUser; error?: string }>('/webhook/update-user-phone', {
    method: 'POST',
    body: JSON.stringify({ user_id: userId, phone }),
  });
}

export function updateUserSignature(userId: number, signature: string) {
  return apiFetch<{ success: boolean; user?: TeamUser; error?: string }>('/webhook/update-user-signature', {
    method: 'POST',
    body: JSON.stringify({ user_id: userId, signature }),
  });
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

// Backend resolves the target user from the session token, same as
// updateNotificationPreferences — you can only ever upload your own avatar.
export async function uploadAvatar(file: File) {
  const url = await readFileAsDataUrl(file);
  return apiFetch<{ success: boolean; user?: TeamUser; error?: string }>('/webhook/upload-avatar', {
    method: 'POST',
    body: JSON.stringify({ photo: { name: file.name, url } }),
  });
}

export interface UserTheme {
  header_color: string | null;
  main_color: string | null;
  accent_color: string | null;
}

export function updateUserTheme(userId: number, theme: UserTheme) {
  return apiFetch<{ success: boolean; user?: unknown; error?: string }>('/webhook/update-user-theme', {
    method: 'POST',
    body: JSON.stringify({ user_id: userId, ...theme }),
  });
}

// Backend resolves the target user from the session token — a user can
// only ever update their own notification preferences.
export function updateNotificationPreferences(preferences: NotificationPreferences) {
  return apiFetch<{ success: boolean; user?: TeamUser; error?: string }>(
    '/webhook/update-notification-preferences',
    {
      method: 'POST',
      body: JSON.stringify({ preferences }),
    }
  );
}

export function fetchTags() {
  return apiFetch<{ id: number; name: string }[]>('/webhook/get-tags');
}

export function fetchContactRelated(contactId: number) {
  return apiFetch<ContactRelated>(`/webhook/get-contact-related?contact_id=${contactId}`);
}

export async function createTag(name: string) {
  const result = await apiFetch<{ id: number; name: string; success?: boolean; error?: string }>(
    '/webhook/create-tag',
    { method: 'POST', body: JSON.stringify({ name }) }
  );
  if (!result?.id) {
    throw new Error(result?.error || 'create-tag did not return a tag id — check its response shape.');
  }
  return result;
}

export async function tagContact(contactId: number, tagId: number) {
  const result = await apiFetch<{ success?: boolean; error?: string }>('/webhook/tag-entity', {
    method: 'POST',
    body: JSON.stringify({ entity_type: 'contact', entity_id: contactId, tag_id: tagId }),
  });
  if (result?.success === false) {
    throw new Error(result.error || 'tag-entity returned success: false');
  }
  return result;
}

export async function untagContact(contactId: number, tagId: number) {
  const result = await apiFetch<{ success?: boolean; error?: string }>('/webhook/untag-entity', {
    method: 'POST',
    body: JSON.stringify({ entity_type: 'contact', entity_id: contactId, tag_id: tagId }),
  });
  if (result?.success === false) {
    throw new Error(result.error || 'untag-entity returned success: false');
  }
  return result;
}

// Personal Telegram invite link for a contact. A Telegram bot can't message
// anyone who hasn't started a chat with it, so the contact opens this link
// and presses Start — the Telegram Inbound workflow then stores their chat id.
export interface TelegramInvite {
  success: boolean;
  error?: string;
  configured?: boolean; // bot username saved in Settings > Integrations
  linked?: boolean;
  linked_at?: string | null;
  opted_out?: boolean;
  invite_url?: string | null;
}

// Manual one-to-one Telegram message from a rep. The server refuses (success:false
// with a reason) when the contact isn't linked, has opted out with STOP, or is
// Do Not Contact, and logs the sent message on the contact's timeline.
export function sendTelegramMessage(contactId: number, message: string) {
  return apiFetch<{ success: boolean; error?: string }>('/webhook/send-telegram', {
    method: 'POST',
    body: JSON.stringify({ contact_id: contactId, message }),
  });
}

export function fetchTelegramInvite(contactId: number) {
  return apiFetch<TelegramInvite>(`/webhook/get-telegram-invite?contact_id=${contactId}`);
}
