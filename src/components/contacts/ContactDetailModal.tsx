import { useRef, useState } from 'react';
import { Contact, EmailLog } from '../../types/contact';
import { useToggleDoNotContact, useUpdateContact } from '../../hooks/useContacts';
import { useAuth } from '../../context/AuthContext';
import { usePipelines, useStages, useOpportunities } from '../../hooks/useOpportunities';
import TagsDropdown from './TagsDropdown';
import OwnerDropdown from './OwnerDropdown';
import ContactQuickEditPopover from './ContactQuickEditPopover';
import ComposeEmailPopover from './ComposeEmailPopover';
import DealFormModal from '../pipeline/DealFormModal';
import TaskFormModal from '../tasks/TaskFormModal';

const STATUS_COLORS: Record<string, string> = {
  New: 'bg-slate-100 text-slate-800',
  Contacted: 'bg-blue-100 text-blue-800',
  Qualified: 'bg-amber-100 text-amber-800',
  Unqualified: 'bg-rose-100 text-rose-700',
  Customer: 'bg-emerald-100 text-emerald-800',
};

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

function ActionButton({
  icon,
  label,
  onClick,
  disabled,
}: {
  icon: string;
  label: string;
  onClick?: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || !onClick}
      className="flex-1 flex flex-col items-center gap-1 py-2.5 rounded-lg text-slate-600 hover:bg-white hover:shadow-sm disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:shadow-none transition-colors"
    >
      <i className={`fa-solid ${icon} text-sm`} />
      <span className="text-[11px] font-medium">{label}</span>
    </button>
  );
}

export default function ContactDetailModal({ contact, onClose }: Props) {
  const { user, isAdmin } = useAuth();
  const toggleDnc = useToggleDoNotContact();
  const updateContact = useUpdateContact();
  const notesRef = useRef<HTMLDivElement>(null);

  const [quickEditOpen, setQuickEditOpen] = useState(false);
  const [composeOpen, setComposeOpen] = useState(false);
  const [dealFormOpen, setDealFormOpen] = useState(false);
  const [taskFormOpen, setTaskFormOpen] = useState(false);

  const { data: pipelines = [] } = usePipelines();
  const defaultPipelineId = pipelines.find((p) => p.is_default)?.id ?? pipelines[0]?.id;
  const { data: stages = [] } = useStages(defaultPipelineId);
  const { data: opportunities = [] } = useOpportunities(defaultPipelineId);

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

  const positionAtCompany = [contact.job_title, contact.company_name]
    .filter(Boolean)
    .join(contact.job_title && contact.company_name ? ' at ' : '');

  const logs = parseLogs(contact.email_logs).slice().reverse();
  const contactDeals = opportunities.filter((o) => o.contact_id === contact.id);
  const stageName = (stageId: number) => stages.find((s) => s.id === stageId)?.name ?? '--';

  function handleStatusChange(value: string) {
    if (isReadOnly) return;
    updateContact.mutate({ id: contact!.id, payload: { lead_status: value } });
  }

  return (
    <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl h-[85vh] flex flex-col overflow-hidden">
        <div className="flex justify-end px-4 py-2 shrink-0">
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <i className="fa-solid fa-xmark text-lg" />
          </button>
        </div>

        <div className="flex-1 grid grid-cols-3 min-h-0">
          {/* Main column: header, actions, contact info, deals */}
          <div className="col-span-2 border-r border-slate-200 overflow-y-auto px-6 pb-6 space-y-5">
            <div className="flex items-start gap-3">
              <div className="w-14 h-14 rounded-full bg-indigo-100 text-indigo-700 font-bold flex items-center justify-center text-lg shrink-0">
                {initials}
              </div>
              <div className="min-w-0 flex-1 pt-1">
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-bold text-slate-800 truncate">{fullName}</h2>
                  {!isReadOnly && (
                    <button
                      onClick={() => setQuickEditOpen(true)}
                      className="text-slate-300 hover:text-indigo-600"
                      title="Quick edit"
                    >
                      <i className="fa-solid fa-pen text-xs" />
                    </button>
                  )}
                </div>
                <p className="text-sm text-slate-500 truncate">{positionAtCompany || 'No position set'}</p>
                <p className="text-sm text-slate-500 truncate">{contact.email || '--'}</p>
              </div>
            </div>

            {isReadOnly && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-semibold bg-slate-100 text-slate-500 rounded-full border border-slate-200">
                <i className="fa-solid fa-lock text-[10px]" />
                {contact.owner_name ? `Read Only — Owned by ${contact.owner_name}` : 'Read Only'}
              </span>
            )}

            <div className="flex items-center gap-4 flex-wrap">
              <TagsDropdown contact={contact} disabled={isReadOnly} />
              <OwnerDropdown contact={contact} disabled={isReadOnly} />
            </div>

            <div className="flex items-stretch gap-1 bg-slate-50 border border-slate-200 rounded-xl p-1.5">
              <ActionButton
                icon="fa-envelope"
                label="Email"
                onClick={!isReadOnly ? () => setComposeOpen(true) : undefined}
              />
              <ActionButton icon="fa-phone" label="Call" />
              <ActionButton
                icon="fa-note-sticky"
                label="Notes"
                onClick={() => notesRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
              />
              <ActionButton
                icon="fa-check"
                label="Tasks"
                onClick={!isReadOnly ? () => setTaskFormOpen(true) : undefined}
              />
            </div>

            <div>
              <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">
                Contact Information
              </h3>
              <div className="border border-slate-200 rounded-xl p-4 grid grid-cols-2 gap-x-6 gap-y-4">
                <DetailField label="First Name" value={contact.first_name} />
                <DetailField label="Last Name" value={contact.last_name} />
                <DetailField label="Email" value={contact.email} />
                <DetailField label="Phone" value={contact.phone} />
                <DetailField label="Position" value={contact.job_title} />
                <DetailField label="Company" value={contact.company_name} />
                <div>
                  <label className="block text-[11px] font-medium text-slate-500 mb-1">Status</label>
                  <select
                    value={contact.lead_status ?? 'New'}
                    onChange={(e) => handleStatusChange(e.target.value)}
                    disabled={isReadOnly}
                    className={`px-2 py-1 text-xs font-medium rounded-full border-0 ${
                      STATUS_COLORS[contact.lead_status ?? 'New'] ?? 'bg-slate-100 text-slate-800'
                    } ${isReadOnly ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'}`}
                  >
                    {['New', 'Contacted', 'Qualified', 'Unqualified', 'Customer'].map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>
                <DetailField
                  label="Created"
                  value={contact.created_at ? new Date(contact.created_at).toLocaleDateString() : undefined}
                />
                <DetailField
                  label="Location"
                  value={[contact.city, contact.state, contact.country].filter(Boolean).join(', ')}
                />
                <DetailField label="Lead Source" value={contact.lead_source} />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wide">
                  Deals ({contactDeals.length})
                </h3>
                {!isReadOnly && (
                  <button
                    onClick={() => setDealFormOpen(true)}
                    className="text-xs font-semibold text-indigo-600 hover:underline"
                  >
                    + Create Deal
                  </button>
                )}
              </div>

              {contactDeals.length === 0 ? (
                <p className="text-xs text-slate-400">No deals for this contact yet.</p>
              ) : (
                <div className="divide-y divide-slate-100 border border-slate-200 rounded-lg">
                  {contactDeals.map((d) => (
                    <div key={d.id} className="px-3 py-2.5">
                      <p className="text-sm font-medium text-slate-800 truncate">{d.name}</p>
                      <div className="flex items-center gap-3 mt-1">
                        <span className="text-xs text-slate-500">
                          {d.deal_value != null ? `$${d.deal_value.toLocaleString()}` : '--'}
                        </span>
                        <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700">
                          {stageName(d.stage_id)}
                        </span>
                        {d.expected_close && (
                          <span className="text-xs text-slate-400">
                            {new Date(d.expected_close).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <label
              className={`flex items-center gap-2 text-sm ${
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

          {/* Right column: Activity Log + Notes */}
          <div className="overflow-y-auto p-5 space-y-6">
            <div>
              <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">
                Activity Log
              </h3>

              {logs.length === 0 ? (
                <p className="text-xs text-slate-400 italic">No activity recorded yet.</p>
              ) : (
                <div className="space-y-3">
                  {logs.map((log, i) => {
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
                  })}
                </div>
              )}
            </div>

            <div ref={notesRef}>
              <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">Notes</h3>
              <textarea
                placeholder="Write a note about this contact..."
                rows={6}
                disabled={isReadOnly}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-slate-50 disabled:text-slate-400"
              />
              <button
                disabled={isReadOnly}
                className="w-full mt-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-semibold py-2 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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

      <ContactQuickEditPopover
        contact={contact}
        open={quickEditOpen}
        onClose={() => setQuickEditOpen(false)}
      />
      <ComposeEmailPopover contact={contact} open={composeOpen} onClose={() => setComposeOpen(false)} />
      {defaultPipelineId && (
        <DealFormModal
          open={dealFormOpen}
          opportunity={null}
          stages={stages}
          pipelineId={defaultPipelineId}
          defaultContactId={contact.id}
          onClose={() => setDealFormOpen(false)}
        />
      )}
      <TaskFormModal
        open={taskFormOpen}
        task={null}
        defaultContactId={contact.id}
        onClose={() => setTaskFormOpen(false)}
      />
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
