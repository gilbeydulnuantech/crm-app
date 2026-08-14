import { apiFetch } from './client';
import { ArchivedContact, Contact, DncChannel, DO_NOT_CONTACT_STATUS, ImportContactRow } from '../types/contact';
import { ContactRelated } from '../types/contactRelated';

export function fetchContacts() {
  return apiFetch<Contact[]>('/webhook/get-contacts?archived=false');
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
  attachments: { name: string; url: string }[]
) {
  return apiFetch<{ success: boolean; error?: string }>('/webhook/send-email', {
    method: 'POST',
    body: JSON.stringify({ contact_id: contactId, subject, message, to, from, attachments }),
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

export interface TeamUser {
  id: number;
  name: string;
  email?: string;
  color?: string;
}

export function fetchUsers() {
  return apiFetch<TeamUser[]>('/webhook/get-users');
}

export function updateUserColor(userId: number, color: string) {
  return apiFetch<{ success: boolean; user?: TeamUser; error?: string }>('/webhook/update-user-color', {
    method: 'POST',
    body: JSON.stringify({ user_id: userId, color }),
  });
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
