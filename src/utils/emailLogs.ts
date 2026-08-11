import { Contact, EmailLog } from '../types/contact';

// email_logs comes back as a jsonb array, but arrives stringified in some
// code paths — normalize both shapes here so every caller can treat it as
// EmailLog[].
export function parseEmailLogs(raw: Contact['email_logs']): EmailLog[] {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw;
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function isUnreadEmailLog(log: EmailLog): boolean {
  return log.type === 'received' && log.is_read !== true;
}

export function countUnreadEmails(contacts: Contact[]): number {
  return contacts.reduce(
    (total, c) => total + parseEmailLogs(c.email_logs).filter(isUnreadEmailLog).length,
    0
  );
}

export interface ContactUnreadSummary {
  contact: Contact;
  unreadCount: number;
  latestLog: EmailLog;
}

// One row per contact (not per email) for the notification bell dropdown —
// sorted most-recently-received first.
export function getContactsWithUnreadEmail(contacts: Contact[]): ContactUnreadSummary[] {
  const summaries: ContactUnreadSummary[] = [];

  contacts.forEach((contact) => {
    const unread = parseEmailLogs(contact.email_logs).filter(isUnreadEmailLog);
    if (unread.length === 0) return;
    const latestLog = unread.reduce((latest, log) =>
      new Date(log.sent_at ?? 0).getTime() > new Date(latest.sent_at ?? 0).getTime() ? log : latest
    );
    summaries.push({ contact, unreadCount: unread.length, latestLog });
  });

  return summaries.sort(
    (a, b) => new Date(b.latestLog.sent_at ?? 0).getTime() - new Date(a.latestLog.sent_at ?? 0).getTime()
  );
}
