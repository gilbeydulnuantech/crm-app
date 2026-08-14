import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Contact, DNC_CHANNELS, EmailLog, LEAD_STATUS_OPTIONS } from '../../types/contact';
import { ActivityLogEntry } from '../../types/activity';
import { useMarkContactEmailRead, useToggleContactDncChannel, useUpdateContact } from '../../hooks/useContacts';
import { useAddNote, useDeleteNote, useNotes, useUpdateNote } from '../../hooks/useNotes';
import { useEntityActivity } from '../../hooks/useActivity';
import { useAuth } from '../../context/AuthContext';
import { useAllOpportunities, useAllStages, usePipelines } from '../../hooks/useOpportunities';
import TagsDropdown from './TagsDropdown';
import OwnerDropdown from './OwnerDropdown';
import AddContactModal from './AddContactModal';
import ComposeEmailPopover from './ComposeEmailPopover';
import DealFormModal from '../pipeline/DealFormModal';
import TaskFormModal from '../tasks/TaskFormModal';
import ActivityTimeline from '../ActivityTimeline';
import LogCallModal from '../LogCallModal';
import { toTitleCase } from '../../utils/text';
import { parseEmailLogs } from '../../utils/emailLogs';

const STATUS_COLORS: Record<string, string> = {
  New: 'bg-slate-100 text-slate-800',
  Active: 'bg-blue-100 text-blue-800',
  Customer: 'bg-emerald-100 text-emerald-800',
  Inactive: 'bg-slate-200 text-slate-600',
  Unqualified: 'bg-rose-100 text-rose-700',
  'Do Not Contact': 'bg-red-100 text-red-800',
};

const DEAL_SECTION_COLORS: Record<string, { text: string; border: string }> = {
  active: { text: 'text-blue-600', border: 'border-blue-200' },
  won: { text: 'text-emerald-600', border: 'border-emerald-200' },
  lost: { text: 'text-rose-600', border: 'border-rose-200' },
};

interface Props {
  contact: Contact | null;
  onClose: () => void;
}

function ActionButton({
  icon,
  label,
  onClick,
  disabled,
  title,
}: {
  icon: string;
  label: string;
  onClick?: () => void;
  disabled?: boolean;
  title?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || !onClick}
      title={title}
      className="flex-1 flex flex-col items-center gap-1 py-2.5 rounded-lg text-slate-600 hover:bg-white hover:shadow-sm disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:shadow-none transition-colors"
    >
      <i className={`fa-solid ${icon} text-sm`} />
      <span className="text-[11px] font-medium">{label}</span>
    </button>
  );
}

export default function ContactDetailModal({ contact, onClose }: Props) {
  const { user, isAdmin } = useAuth();
  const navigate = useNavigate();
  const toggleDncChannel = useToggleContactDncChannel();
  const updateContact = useUpdateContact();
  const markEmailRead = useMarkContactEmailRead();
  const notesRef = useRef<HTMLDivElement>(null);
  const dndRef = useRef<HTMLDivElement>(null);

  const [quickEditOpen, setQuickEditOpen] = useState(false);
  const [dndOpen, setDndOpen] = useState(false);
  const [composeOpen, setComposeOpen] = useState(false);
  const [dealFormOpen, setDealFormOpen] = useState(false);
  const [taskFormOpen, setTaskFormOpen] = useState(false);
  const [logCallOpen, setLogCallOpen] = useState(false);
  const [selectedLog, setSelectedLog] = useState<EmailLog | null>(null);
  const [selectedActivity, setSelectedActivity] = useState<ActivityLogEntry | null>(null);
  const [markReadError, setMarkReadError] = useState<string | null>(null);
  const [noteDraft, setNoteDraft] = useState('');
  const [noteError, setNoteError] = useState<string | null>(null);
  const [editingNoteId, setEditingNoteId] = useState<number | null>(null);
  const [editDraft, setEditDraft] = useState('');

  const { data: pipelines = [] } = usePipelines();
  const defaultPipelineId = pipelines.find((p) => p.is_default)?.id ?? pipelines[0]?.id;
  // Fan out across every pipeline (not just the default one) so a deal
  // living in any pipeline still shows up on the contact — matches the same
  // pattern Calendar.tsx uses for "all deals regardless of pipeline".
  const pipelineIds = useMemo(() => pipelines.map((p) => p.id), [pipelines]);
  const { data: allOpportunities = [] } = useAllOpportunities(pipelineIds);
  const { data: allStages = [] } = useAllStages(pipelineIds);
  const { data: notes = [], isLoading: notesLoading } = useNotes('contact', contact?.id ?? null);
  const addNote = useAddNote('contact', contact?.id ?? null);
  const updateNote = useUpdateNote('contact', contact?.id ?? null);
  const deleteNote = useDeleteNote('contact', contact?.id ?? null);
  const { data: activity = [], isLoading: activityLoading } = useEntityActivity('contact', contact?.id ?? null);

  // The 15s global refetchInterval (src/main.tsx) can flip `activityLoading`
  // back to true mid-session even though data was already shown once, which
  // reads as the Activity Log flashing back to "Loading..." every poll —
  // same class of bug as Calendar.tsx's eventsEverLoaded/dealsEverLoaded
  // gate. Once loaded for the current contact, don't show the loading state
  // again until a different contact is opened.
  const [activityEverLoaded, setActivityEverLoaded] = useState(false);
  useEffect(() => {
    setActivityEverLoaded(false);
  }, [contact?.id]);
  useEffect(() => {
    if (!activityLoading) setActivityEverLoaded(true);
  }, [activityLoading]);

  useEffect(() => {
    if (!dndOpen) return;
    function handleClickOutside(e: MouseEvent) {
      if (dndRef.current && !dndRef.current.contains(e.target as Node)) {
        setDndOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [dndOpen]);

  if (!contact) return null;

  // View All, Edit Owned Only: standard users can open any contact but only
  // edit the ones they own. Admins can always edit.
  const isReadOnly = !isAdmin && contact.owner_id !== user?.id;

  const fullName = toTitleCase(`${contact.first_name} ${contact.last_name}`.trim()) || 'No Name';
  const initials =
    fullName !== 'No Name'
      ? fullName
          .split(' ')
          .map((n) => n[0])
          .join('')
          .slice(0, 2)
      : '--';

  // Admins can jump to any company; standard users only from contacts they
  // own — mirrors isReadOnly, the same edit-permission rule used elsewhere
  // in this modal.
  const canClickCompany = !isReadOnly && !!contact.account_id;

  const logs = parseEmailLogs(contact.email_logs).slice().reverse();
  const contactDeals = allOpportunities.filter((o) => o.contact_id === contact.id);
  // Grouped into sections (Active, Closed Won, Closed Lost) instead of one
  // flat list, so closed deals are easy to spot separately from open ones.
  const dealSections = [
    { key: 'active', label: 'Active', items: contactDeals.filter((d) => d.status === 'Open') },
    { key: 'won', label: 'Closed Won', items: contactDeals.filter((d) => d.status === 'Won') },
    { key: 'lost', label: 'Closed Lost', items: contactDeals.filter((d) => d.status === 'Lost') },
  ].filter((section) => section.items.length > 0);
  const stageName = (stageId: number) => allStages.find((s) => s.id === stageId)?.name ?? '--';

  function handleStatusChange(value: string) {
    if (isReadOnly) return;
    updateContact.mutate({ id: contact!.id, payload: { lead_status: value } });
  }

  function openAddDeal() {
    setDealFormOpen(true);
  }

  // Takes over the deal's real pipeline (it may not be the default one) and
  // switches the board to it, scrolling the specific card into view and
  // ringing it for a few seconds (Pipeline.tsx's ?highlight= deep link).
  function openPipelineView(dealId: number, dealPipelineId?: number | null) {
    onClose();
    const pid = dealPipelineId ?? defaultPipelineId;
    navigate(`/pipeline?pipeline=${pid}&highlight=${dealId}`);
  }

  function openCompanyView() {
    if (!contact.account_id) return;
    onClose();
    navigate(`/companies?companyId=${contact.account_id}`);
  }

  return (
    <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl h-[85vh] flex flex-col overflow-hidden">
        <div className="flex justify-end px-4 py-2 shrink-0">
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <i className="fa-solid fa-xmark text-lg" />
          </button>
        </div>

        <div className="flex-1 grid grid-cols-3 min-h-0">
          {/* Column 1: Contact Details */}
          <div className="border-r border-slate-200 overflow-y-auto px-6 pb-6 space-y-5">
            <div className="border border-slate-200 rounded-xl p-4 space-y-4">
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
                        title="Edit contact"
                      >
                        <i className="fa-solid fa-pen text-xs" />
                      </button>
                    )}
                    <div className="relative ml-auto" ref={dndRef}>
                      <button
                        type="button"
                        onClick={() => !isReadOnly && setDndOpen((v) => !v)}
                        disabled={isReadOnly}
                        title="Do Not Contact preferences"
                        className={`flex items-center gap-1 text-[11px] font-medium ${
                          isReadOnly ? 'text-slate-300 cursor-not-allowed' : 'text-slate-500 hover:text-slate-700 cursor-pointer'
                        }`}
                      >
                        {(contact.dnc_email || contact.dnc_call || contact.dnc_sms) && (
                          <i className="fa-solid fa-ban text-rose-500 text-[10px]" />
                        )}
                        DND
                        <i className="fa-solid fa-chevron-down text-[9px]" />
                      </button>
                      {dndOpen && (
                        <div className="absolute right-0 top-full mt-1.5 w-36 bg-white border border-slate-200 rounded-lg shadow-lg py-1.5 z-10">
                          {DNC_CHANNELS.map(({ channel, label, field }) => (
                            <label
                              key={channel}
                              className="flex items-center gap-2 px-3 py-1 text-xs text-slate-600 cursor-pointer hover:bg-slate-50"
                            >
                              <input
                                type="checkbox"
                                checked={!!contact[field]}
                                onChange={(e) =>
                                  toggleDncChannel.mutate({
                                    contactId: contact.id,
                                    channel,
                                    value: e.target.checked,
                                  })
                                }
                                className="rounded border-slate-300 text-rose-600 focus:ring-rose-500"
                              />
                              {label}
                            </label>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                  <p className="text-xs text-slate-500 truncate">
                    {toTitleCase(contact.job_title)}
                    {contact.job_title && contact.company_name && ' at '}
                    {contact.company_name &&
                      (canClickCompany ? (
                        <button
                          type="button"
                          onClick={openCompanyView}
                          className="inline text-indigo-600 hover:underline"
                        >
                          {toTitleCase(contact.company_name)}
                        </button>
                      ) : (
                        toTitleCase(contact.company_name)
                      ))}
                    {!contact.job_title && !contact.company_name && 'No position set'}
                  </p>
                  <p className="text-xs text-slate-500 truncate">{contact.email || '--'}</p>
                  <div className="flex items-center gap-1.5 mt-1.5">
                    <span className="text-[10px] font-medium text-slate-400">Status:</span>
                    {isReadOnly ? (
                      <span
                        className={`px-1.5 py-0.5 text-[10px] font-medium rounded-full ${
                          STATUS_COLORS[contact.lead_status ?? 'New'] ?? 'bg-slate-100 text-slate-800'
                        }`}
                      >
                        {contact.lead_status ?? 'New'}
                      </span>
                    ) : (
                      <select
                        value={contact.lead_status ?? 'New'}
                        onChange={(e) => handleStatusChange(e.target.value)}
                        className={`px-1.5 py-0.5 text-[10px] font-medium rounded-full border-0 cursor-pointer ${
                          STATUS_COLORS[contact.lead_status ?? 'New'] ?? 'bg-slate-100 text-slate-800'
                        }`}
                      >
                        {LEAD_STATUS_OPTIONS.map((s) => (
                          <option key={s} value={s}>
                            {s}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>
                </div>
              </div>

              {isReadOnly && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-semibold bg-slate-100 text-slate-500 rounded-full border border-slate-200">
                  <i className="fa-solid fa-lock text-[10px]" />
                  {contact.owner_name
                    ? `Read Only — Owned by ${toTitleCase(contact.owner_name)}`
                    : 'Read Only'}
                </span>
              )}

              <div className="grid grid-cols-2 gap-4 items-start">
                <TagsDropdown contact={contact} disabled={isReadOnly} />
                <OwnerDropdown contact={contact} disabled={isReadOnly} />
              </div>

              <div className="flex items-stretch gap-1 bg-slate-50 border border-slate-200 rounded-xl p-1.5">
                <ActionButton
                  icon="fa-envelope"
                  label="Email"
                  onClick={!isReadOnly ? () => setComposeOpen(true) : undefined}
                  disabled={!!contact.dnc_email}
                  title={contact.dnc_email ? 'Marked Do Not Contact: Email' : undefined}
                />
                <ActionButton
                  icon="fa-phone"
                  label="Call"
                  onClick={() => setLogCallOpen(true)}
                  disabled={!!contact.dnc_call}
                  title={contact.dnc_call ? 'Marked Do Not Contact: Call' : 'Log a call'}
                />
                <ActionButton
                  icon="fa-comment-sms"
                  label="SMS"
                  disabled={!!contact.dnc_sms}
                  title={contact.dnc_sms ? 'Marked Do Not Contact: SMS' : undefined}
                />
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
            </div>

            <div>
              <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">
                Contact Information
              </h3>
              <div className="border border-slate-200 rounded-xl p-4 grid grid-cols-2 gap-x-6 gap-y-4">
                <DetailField label="First Name" value={toTitleCase(contact.first_name)} />
                <DetailField label="Last Name" value={toTitleCase(contact.last_name)} />
                {/* Full width — a long email would otherwise overflow into
                    Phone's column and visually overlap it. */}
                <DetailField label="Email" value={contact.email} className="col-span-2" />
                <DetailField label="Phone" value={toTitleCase(contact.phone)} />
                <DetailField label="Secondary Phone" value={toTitleCase(contact.secondary_phone)} />
                <DetailField label="Company" value={toTitleCase(contact.company_name)} />
                <DetailField label="Position" value={toTitleCase(contact.job_title)} />
                <DetailField label="Secondary Email" value={contact.secondary_email} className="col-span-2" />
                <DetailField
                  label="Location"
                  value={toTitleCase([contact.city, contact.state, contact.country].filter(Boolean).join(', '))}
                  className="col-span-2"
                />
                <DetailField label="Timezone" value={contact.timezone} className="col-span-2" />
                <DetailField label="LinkedIn Profile" value={contact.linkedin_url} className="col-span-2" />
                <DetailField label="Lead Source" value={toTitleCase(contact.lead_source)} className="col-span-2" />
                <DetailField
                  label="Created"
                  value={contact.created_at ? new Date(contact.created_at).toLocaleDateString() : undefined}
                  className="col-span-2"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wide">
                  Opportunities ({contactDeals.length})
                </h3>
                {!isReadOnly && (
                  <button
                    onClick={openAddDeal}
                    className="text-xs font-semibold text-indigo-600 hover:underline"
                  >
                    + New Opportunity
                  </button>
                )}
              </div>

              {contactDeals.length === 0 ? (
                <p className="text-xs text-slate-400">No opportunities for this contact yet.</p>
              ) : (
                <div className="space-y-4">
                  {dealSections.map((section) => {
                    const color = DEAL_SECTION_COLORS[section.key] ?? { text: 'text-slate-400', border: 'border-slate-200' };
                    return (
                    <div key={section.key}>
                      <div className="flex items-center gap-2 mb-1.5">
                        <span className={`text-[10px] font-bold uppercase tracking-wide shrink-0 ${color.text}`}>
                          {section.label}
                        </span>
                        <div className={`flex-1 border-t ${color.border}`} />
                      </div>
                      <div className="divide-y divide-slate-100 border border-slate-200 rounded-lg">
                        {section.items.map((d) => {
                          const pipelineName = pipelines.find((p) => p.id === d.pipeline_id)?.name;
                          const isClosed = d.status !== 'Open';
                          const closedDate = d.closed_at ?? d.created_at;
                          return (
                            <div key={d.id} className="px-3 py-2.5 space-y-1">
                              <div className="flex items-center justify-between gap-2">
                                <p className="text-sm font-medium text-slate-800 truncate">{d.name}</p>
                                <span className="text-sm font-semibold text-emerald-600 shrink-0">
                                  {d.deal_value != null
                                    ? `$${d.deal_value.toLocaleString(undefined, { minimumFractionDigits: 2 })}`
                                    : '--'}
                                </span>
                              </div>
                              <p className="text-xs text-slate-400 truncate">
                                {[pipelineName, stageName(d.stage_id)].filter(Boolean).join(' · ')}
                              </p>
                              {d.status === 'Lost' && d.lost_reason && (
                                <p className="text-xs text-rose-600">Lost Reason: {d.lost_reason}</p>
                              )}
                              <p className="text-xs text-slate-500">
                                {d.assigned_user_name ? `Owner: ${toTitleCase(d.assigned_user_name)}` : 'Unassigned'}
                              </p>
                              {(isClosed ? closedDate : d.created_at) && (
                                <p className="text-[11px] text-slate-400">
                                  {isClosed ? 'Closed: ' : 'Created: '}
                                  {new Date((isClosed ? closedDate : d.created_at)!).toLocaleDateString(undefined, {
                                    month: 'short',
                                    day: '2-digit',
                                    year: 'numeric',
                                  })}
                                </p>
                              )}
                              <button
                                onClick={() => openPipelineView(d.id, d.pipeline_id)}
                                className="w-full mt-1.5 text-xs font-semibold text-indigo-600 border border-indigo-200 rounded-lg py-1.5 hover:bg-indigo-50"
                              >
                                View Deal
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Column 2: Activity Log */}
          <div className="border-r border-slate-200 overflow-y-auto p-5 space-y-3">
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wide">
              Activity Log
            </h3>

            {markReadError && (
              <p className="text-[11px] text-rose-600 bg-rose-50 border border-rose-200 rounded-md px-2 py-1">
                {markReadError}
              </p>
            )}

            <ActivityTimeline
              emails={logs}
              activity={activity}
              isLoading={activityLoading && !activityEverLoaded}
              onEmailClick={(log) => {
                const isUnread = log.type === 'received' && log.is_read !== true;
                if (isUnread && log.id) {
                  setMarkReadError(null);
                  markEmailRead.mutate(
                    { contactId: contact.id, logId: log.id },
                    {
                      onError: (err) =>
                        setMarkReadError(err instanceof Error ? err.message : 'Failed to mark as read.'),
                    }
                  );
                }
                setSelectedLog(log);
              }}
              onActivityClick={(entry) => setSelectedActivity(entry)}
            />
          </div>

          {/* Column 3: Notes */}
          <div ref={notesRef} className="overflow-y-auto p-5 space-y-3">
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Notes</h3>
            <textarea
              value={noteDraft}
              onChange={(e) => setNoteDraft(e.target.value)}
              placeholder="Write a note about this contact..."
              rows={4}
              disabled={isReadOnly}
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-slate-50 disabled:text-slate-400"
            />
            {noteError && (
              <p className="text-[11px] text-rose-600 bg-rose-50 border border-rose-200 rounded-md px-2 py-1">
                {noteError}
              </p>
            )}
            <button
              disabled={isReadOnly || !noteDraft.trim() || addNote.isPending}
              onClick={() => {
                setNoteError(null);
                addNote.mutate(
                  { body: noteDraft.trim(), requesterId: user?.id },
                  {
                    onSuccess: () => setNoteDraft(''),
                    onError: (err) => setNoteError(err instanceof Error ? err.message : 'Failed to add note.'),
                  }
                );
              }}
              className="w-full bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-semibold py-2 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {addNote.isPending ? 'Adding...' : '+ Add Note'}
            </button>

            <div className="space-y-2 pt-2">
              {notesLoading ? (
                <p className="text-xs text-slate-400 italic">Loading notes...</p>
              ) : notes.length === 0 ? (
                <p className="text-xs text-slate-400 italic">No notes yet.</p>
              ) : (
                notes.map((note) => {
                  const canEdit = isAdmin || note.created_by === user?.id;
                  const isEditing = editingNoteId === note.id;
                  return (
                    <div key={note.id} className="p-3 rounded-lg border border-slate-100 bg-slate-50 space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-medium text-slate-700">
                          {note.created_by_name ? toTitleCase(note.created_by_name) : 'Unknown'}
                        </span>
                        <span className="text-slate-400 text-[10px]">
                          {new Date(note.created_at).toLocaleString(undefined, {
                            dateStyle: 'medium',
                            timeStyle: 'short',
                          })}
                          {note.updated_at ? ' (edited)' : ''}
                        </span>
                      </div>
                      {isEditing ? (
                        <>
                          <textarea
                            value={editDraft}
                            onChange={(e) => setEditDraft(e.target.value)}
                            rows={3}
                            className="w-full px-2 py-1.5 text-xs border border-slate-200 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500"
                          />
                          <div className="flex justify-end gap-3 pt-0.5">
                            <button
                              onClick={() => setEditingNoteId(null)}
                              className="text-[11px] font-medium text-slate-500 hover:text-slate-700"
                            >
                              Cancel
                            </button>
                            <button
                              onClick={() =>
                                updateNote.mutate(
                                  { id: note.id, body: editDraft.trim() },
                                  { onSuccess: () => setEditingNoteId(null) }
                                )
                              }
                              disabled={!editDraft.trim() || updateNote.isPending}
                              className="text-[11px] font-semibold text-indigo-600 hover:text-indigo-700 disabled:opacity-50"
                            >
                              Save
                            </button>
                          </div>
                        </>
                      ) : (
                        <>
                          <p className="text-slate-600 text-xs whitespace-pre-wrap">{note.body}</p>
                          {canEdit && (
                            <div className="flex justify-end gap-3 pt-0.5">
                              <button
                                onClick={() => {
                                  setEditingNoteId(note.id);
                                  setEditDraft(note.body);
                                }}
                                className="text-[10px] font-medium text-slate-400 hover:text-indigo-600"
                              >
                                Edit
                              </button>
                              <button
                                onClick={() => {
                                  if (confirm('Delete this note?')) deleteNote.mutate(note.id);
                                }}
                                className="text-[10px] font-medium text-slate-400 hover:text-rose-600"
                              >
                                Delete
                              </button>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>

      <AddContactModal
        contact={contact}
        open={quickEditOpen}
        onClose={() => setQuickEditOpen(false)}
      />
      <ComposeEmailPopover contact={contact} open={composeOpen} onClose={() => setComposeOpen(false)} />
      {defaultPipelineId && (
        <DealFormModal
          open={dealFormOpen}
          opportunity={null}
          pipelineId={defaultPipelineId}
          defaultContactId={contact.id}
          onClose={() => setDealFormOpen(false)}
        />
      )}
      <TaskFormModal
        open={taskFormOpen}
        defaultContactId={contact.id}
        onClose={() => setTaskFormOpen(false)}
      />
      <LogCallModal
        open={logCallOpen}
        entityType="contact"
        entityId={contact.id}
        entityLabel={fullName}
        onClose={() => setLogCallOpen(false)}
      />
      <EmailLogModal log={selectedLog} onClose={() => setSelectedLog(null)} />
      <ActivityLogModal entry={selectedActivity} onClose={() => setSelectedActivity(null)} />
    </div>
  );
}

function EmailLogModal({ log, onClose }: { log: EmailLog | null; onClose: () => void }) {
  if (!log) return null;
  const isReceived = log.type === 'received';

  return (
    <div
      className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm z-[110] flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[80vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 px-5 py-4 border-b border-slate-100 shrink-0">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide">
              {isReceived ? 'Reply' : 'Sent'}
            </p>
            <h3 className="text-sm font-bold text-slate-800 truncate">{log.subject || 'No Subject'}</h3>
            {(log.to || log.from) && (
              <p className="text-xs text-slate-500 mt-0.5">
                {isReceived ? `From: ${log.from ?? '--'}` : `To: ${log.to ?? '--'}`}
              </p>
            )}
            {log.sent_at && (
              <p className="text-[11px] text-slate-400 mt-0.5">{new Date(log.sent_at).toLocaleString()}</p>
            )}
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 shrink-0">
            <i className="fa-solid fa-xmark text-lg" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          <p className="text-sm text-slate-700 whitespace-pre-wrap">{log.message || '--'}</p>

          {log.attachments && log.attachments.length > 0 && (
            <div>
              <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide mb-1.5">
                Attachments ({log.attachments.length})
              </p>
              <div className="flex flex-wrap gap-1.5">
                {log.attachments.map((a, ai) => (
                  <a
                    key={ai}
                    href={a.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 px-2 py-1 text-xs font-medium bg-slate-50 text-slate-600 border border-slate-200 rounded-full hover:border-indigo-300 hover:text-indigo-600"
                  >
                    <i className="fa-solid fa-paperclip text-[10px]" />
                    <span className="max-w-[180px] truncate">{a.name}</span>
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

const DETAIL_LABELS: Record<string, string> = {
  field: 'Field',
  old: 'Old Value',
  new: 'New Value',
  from: 'From',
  to: 'To',
  location: 'Location',
  due_at: 'Starts',
  end_at: 'Ends',
  is_all_day: 'All Day',
};

function formatDetailValue(key: string, value: unknown): string {
  if (value === null || value === undefined || value === '') return '--';
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (key.endsWith('_at') && typeof value === 'string') {
    const d = new Date(value);
    if (!isNaN(d.getTime())) return d.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
  }
  return String(value);
}

const ACTIVITY_CATEGORY_LABELS: Record<ActivityLogEntry['category'], string> = {
  call: 'Call',
  meeting: 'Meeting',
  system_audit: 'System Audit',
};

function ActivityLogModal({ entry, onClose }: { entry: ActivityLogEntry | null; onClose: () => void }) {
  if (!entry) return null;
  const detailEntries = entry.detail ? Object.entries(entry.detail).filter(([, v]) => v !== null && v !== undefined && v !== '') : [];

  return (
    <div
      className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm z-[110] flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[80vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 px-5 py-4 border-b border-slate-100 shrink-0">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide">
              {ACTIVITY_CATEGORY_LABELS[entry.category]}
              {entry.subtype ? ` · ${toTitleCase(entry.subtype.replace(/_/g, ' '))}` : ''}
            </p>
            <h3 className="text-sm font-bold text-slate-800 break-words">{entry.summary}</h3>
            {entry.actor_name && <p className="text-xs text-slate-500 mt-0.5">By {toTitleCase(entry.actor_name)}</p>}
            <p className="text-[11px] text-slate-400 mt-0.5">
              {new Date(entry.created_at).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}
            </p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 shrink-0">
            <i className="fa-solid fa-xmark text-lg" />
          </button>
        </div>

        {detailEntries.length > 0 && (
          <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
            {detailEntries.map(([key, value]) => (
              <div key={key}>
                <label className="block text-[11px] font-medium text-slate-500 mb-1">
                  {DETAIL_LABELS[key] ?? toTitleCase(key.replace(/_/g, ' '))}
                </label>
                <p className="text-sm text-slate-700 break-words">{formatDetailValue(key, value)}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function DetailField({
  label,
  value,
  className = '',
}: {
  label: string;
  value?: string;
  className?: string;
}) {
  return (
    <div className={className}>
      <label className="block text-[11px] font-medium text-slate-500 mb-1">{label}</label>
      <p className="text-xs text-slate-700 break-words">{value || '--'}</p>
    </div>
  );
}
