import { Contact, EmailLog } from '../../types/contact';
import { useToggleDoNotContact, useUpdateContact } from '../../hooks/useContacts';
import { useAuth } from '../../context/AuthContext';
import TagsDropdown from './TagsDropdown';
import OwnerDropdown from './OwnerDropdown';
import ContactRelatedTree from './ContactRelatedTree';

interface Props {
  contact: Contact | null;
  onClose: () => void;
}

function parseLogs(raw: Contact['email_logs']): EmailLog[] {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw;
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export default function ContactDetailModal({ contact, onClose }: Props) {
  const { user, isAdmin } = useAuth();
  const toggleDnc = useToggleDoNotContact();
  const updateContact = useUpdateContact();

  if (!contact) return null;

  // View All, Edit Owned Only: standard users can open any contact but only
  // edit the ones they own. Admins can always edit.
  const isReadOnly = !isAdmin && contact.owner_id !== user?.id;

  const fullName = `${contact.first_name} ${contact.last_name}`.trim() || 'No Name';
  const initials =
    fullName !== 'No Name'
      ? fullName
          .split(' ')
          .map((n) => n[0])
          .join('')
          .slice(0, 2)
      : '--';

  const logs = parseLogs(contact.email_logs).slice().reverse();

  function handleStatusChange(value: string) {
    if (isReadOnly) return;
    updateContact.mutate({ id: contact!.id, payload: { lead_status: value } });
  }

  return (
    <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl h-[85vh] flex flex-col overflow-hidden">
        {/* Header — "Contact Details" label aligned with the close button */}
        <div className="flex items-center justify-between px-6 py-3 border-b border-slate-200 shrink-0">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wide">
            Contact Details
          </span>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <i className="fa-solid fa-xmark text-lg" />
          </button>
        </div>

        {/* 3-column body */}
        <div className="flex-1 grid grid-cols-3 min-h-0">
          {/* Column 1: Details */}
          <div className="border-r border-slate-200 overflow-y-auto p-5 space-y-4">
            {/* Name + avatar */}
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-indigo-100 text-indigo-700 font-bold flex items-center justify-center text-base shrink-0">
                {initials}
              </div>
              <div className="min-w-0">
                <h2 className="text-base font-bold text-slate-800 truncate">{fullName}</h2>
                <p className="text-xs text-slate-500 truncate">{contact.company_name || 'No Company'}</p>
              </div>
            </div>

            {/* Read Only badge — shown when a standard user opens a contact
                they don't own, per "View All, Edit Owned Only". */}
            {isReadOnly && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-semibold bg-slate-100 text-slate-500 rounded-full border border-slate-200">
                <i className="fa-solid fa-lock text-[10px]" />
                {contact.owner_name ? `Read Only — Owned by ${contact.owner_name}` : 'Read Only'}
              </span>
            )}

            <div>
              <label className="block text-[11px] font-medium text-slate-500 mb-1">Status</label>
              <select
                value={contact.lead_status ?? 'New'}
                onChange={(e) => handleStatusChange(e.target.value)}
                disabled={isReadOnly}
                className={`w-full px-2.5 py-1.5 text-sm border border-slate-200 rounded-lg ${
                  isReadOnly ? 'bg-slate-50 text-slate-400 cursor-not-allowed' : ''
                }`}
              >
                {['New', 'Contacted', 'Qualified', 'Unqualified', 'Customer'].map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <TagsDropdown contact={contact} disabled={isReadOnly} />
              <OwnerDropdown contact={contact} disabled={isReadOnly} />
            </div>

            <DetailField label="Email" value={contact.email} />
            <DetailField label="Phone" value={contact.phone} />
            <DetailField label="Job Title" value={contact.job_title} />
            <DetailField label="Company" value={contact.company_name} />
            <DetailField
              label="Location"
              value={[contact.city, contact.state, contact.country].filter(Boolean).join(', ')}
            />
            <DetailField label="Lead Source" value={contact.lead_source} />

            {/* Related records tree: Company / Deal / Task / Event */}
            <div className="pt-2 border-t border-slate-100">
              <ContactRelatedTree contactId={contact.id} />
            </div>

            <label
              className={`flex items-center gap-2 pt-2 text-sm ${
                isReadOnly ? 'text-slate-400 cursor-not-allowed' : 'text-slate-700'
              }`}
            >
              <input
                type="checkbox"
                checked={!!contact.do_not_contact}
                disabled={isReadOnly}
                onChange={(e) =>
                  !isReadOnly &&
                  toggleDnc.mutate({ contactId: contact.id, value: e.target.checked })
                }
                className="rounded border-slate-300 text-rose-600 focus:ring-rose-500 disabled:opacity-50"
              />
              Do Not Contact
            </label>
          </div>

          {/* Column 2: Activity Log */}
          <div className="border-r border-slate-200 overflow-y-auto p-5 space-y-3">
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wide">
              Activity Log
            </h3>

            {logs.length === 0 ? (
              <p className="text-xs text-slate-400 italic">No activity recorded yet.</p>
            ) : (
              logs.map((log, i) => {
                const isReceived = log.type === 'received';
                const isUnread = isReceived && log.is_read === false;
                return (
                  <div
                    key={i}
                    className={`p-3 rounded-lg border space-y-1 ${
                      isUnread
                        ? 'bg-emerald-50/80 border-emerald-200'
                        : isReceived
                          ? 'bg-blue-50/50 border-blue-100'
                          : 'bg-slate-50 border-slate-100'
                    }`}
                  >
                    <div className="flex items-center justify-between text-xs font-medium">
                      <span className="flex items-center gap-1.5 text-slate-700">
                        <i
                          className={
                            isReceived
                              ? 'fa-solid fa-reply text-blue-500'
                              : 'fa-solid fa-paper-plane text-slate-400'
                          }
                        />
                        {isReceived ? 'Reply:' : 'Sent:'} {log.subject || 'No Subject'}
                      </span>
                      <span className="text-slate-400 text-[10px]">
                        {log.sent_at ? new Date(log.sent_at).toLocaleDateString() : ''}
                      </span>
                    </div>
                    <p className="text-slate-600 text-xs line-clamp-2">{log.message}</p>
                  </div>
                );
              })
            )}
          </div>

          {/* Column 3: Notes */}
          <div className="overflow-y-auto p-5 space-y-3">
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Notes</h3>
            <textarea
              placeholder="Write a note about this contact..."
              rows={6}
              disabled={isReadOnly}
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-slate-50 disabled:text-slate-400"
            />
            <button
              disabled={isReadOnly}
              className="w-full bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-semibold py-2 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              + Add Note
            </button>
            <p className="text-xs text-slate-400 italic pt-2">
              No notes yet — this needs a backend endpoint (e.g. a `notes` table + `get-notes` /
              `add-note` webhooks) since the old app didn't have a notes feature.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function DetailField({ label, value }: { label: string; value?: string }) {
  return (
    <div>
      <label className="block text-[11px] font-medium text-slate-500 mb-1">{label}</label>
      <p className="text-sm text-slate-700">{value || '--'}</p>
    </div>
  );
}
