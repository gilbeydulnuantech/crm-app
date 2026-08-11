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
