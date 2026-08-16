import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Contact, DNC_CHANNELS, EmailLog, LEAD_STATUS_OPTIONS } from '../../types/contact';
import { ActivityLogEntry } from '../../types/activity';
import {
  useContacts,
  useMarkContactEmailRead,
  useMergeContacts,
  useToggleContactDncChannel,
  useUpdateContact,
  useUsers,
} from '../../hooks/useContacts';
import { useCompanies } from '../../hooks/useCompanies';
import * as chatApi from '../../api/chat';
import CompanyQuickView from '../companies/CompanyQuickView';
import ConfirmDialog from '../ConfirmDialog';
import { useAddNote, useDeleteNote, useNotes, useUpdateNote } from '../../hooks/useNotes';
import { useEntityActivity } from '../../hooks/useActivity';
import { useAuth } from '../../context/AuthContext';
import { useAllOpportunities, useAllStages, usePipelines } from '../../hooks/useOpportunities';
import { useTasks } from '../../hooks/useTasks';
import { useEvents } from '../../hooks/useEvents';
import TagsDropdown from './TagsDropdown';
import OwnerDropdown from './OwnerDropdown';
import AddContactModal from './AddContactModal';
import ComposeEmailPopover from './ComposeEmailPopover';
import DealFormModal from '../pipeline/DealFormModal';
import TaskFormModal from '../tasks/TaskFormModal';
import EventFormModal from '../calendar/EventFormModal';
import ActivityTimeline from '../ActivityTimeline';
import ActivityLogModal from '../ActivityLogModal';
import LogCallModal from '../LogCallModal';
import OwnerBadge from '../OwnerBadge';
import { toTitleCase } from '../../utils/text';
import { parseEmailLogs } from '../../utils/emailLogs';
import { CalendarEvent } from '../../types/event';

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
  const qc = useQueryClient();
  const toggleDncChannel = useToggleContactDncChannel();
  const updateContact = useUpdateContact();
  const markEmailRead = useMarkContactEmailRead();
  const notesRef = useRef<HTMLDivElement>(null);
  const dndRef = useRef<HTMLDivElement>(null);

  // A read-only contact otherwise dead-ends the rep — no owner, no edit
  // access, no path forward except finding the right person in Slack/email
  // outside the app. DMs whoever can actually grant access, through the
  // existing Team Chat system: the current owner if there is one, or every
  // admin if the contact is unassigned — admins are the only ones with the
  // power to assign an owner in the first place (assign-contact-owner is
  // admin-only), so they're the correct recipient, not a single arbitrary one.
  const { data: teamUsers = [] } = useUsers();
  const [requestSentConversationId, setRequestSentConversationId] = useState<number | null>(null);
  const requestOwnership = useMutation({
    mutationFn: async (target: { ownerIds: number[]; contactName: string; forAssignment: boolean }) => {
      const message = target.forAssignment
        ? `Hi, "${target.contactName}" is unassigned — could you assign it to me? I need edit access.`
        : `Hi, could you transfer ownership of "${target.contactName}" to me? I need edit access.`;
      const conversationIds = await Promise.all(
        target.ownerIds.map(async (id) => {
          const dm = await chatApi.startDm(id);
          await chatApi.sendMessage(dm.id, message);
          return dm.id;
        })
      );
      return conversationIds[0];
    },
    onSuccess: (conversationId) => {
      qc.invalidateQueries({ queryKey: ['conversations'] });
      setRequestSentConversationId(conversationId);
    },
  });

  // Duplicate detection reuses the already-cached ['contacts'] list (same
  // query Contacts.tsx populated) — no extra request. Merge is admin-only
  // and irreversible-by-undo-button (though the loser is archived, not
  // deleted, so it's recoverable from the Archived tab if needed).
  const { data: allContacts = [] } = useContacts();
  const mergeContacts = useMergeContacts();
  const [mergeTarget, setMergeTarget] = useState<Contact | null>(null);

  const [quickEditOpen, setQuickEditOpen] = useState(false);
  const [dndOpen, setDndOpen] = useState(false);
  const [composeOpen, setComposeOpen] = useState(false);
  const [dealFormOpen, setDealFormOpen] = useState(false);
  const [taskFormOpen, setTaskFormOpen] = useState(false);
  const [eventFormOpen, setEventFormOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);
  const [relatedTab, setRelatedTab] = useState<'opportunities' | 'tasks' | 'events'>('tasks');
  const [logCallOpen, setLogCallOpen] = useState(false);
  const [selectedLog, setSelectedLog] = useState<EmailLog | null>(null);
  const [selectedActivity, setSelectedActivity] = useState<ActivityLogEntry | null>(null);
  const [quickViewCompanyId, setQuickViewCompanyId] = useState<number | null>(null);
  const [markReadError, setMarkReadError] = useState<string | null>(null);
  const [noteDraft, setNoteDraft] = useState('');
  const [noteError, setNoteError] = useState<string | null>(null);
  const [editingNoteId, setEditingNoteId] = useState<number | null>(null);
  const [editDraft, setEditDraft] = useState('');
  const [deleteNoteTargetId, setDeleteNoteTargetId] = useState<number | null>(null);
  const [deleteNoteError, setDeleteNoteError] = useState<string | null>(null);
  const [mergeError, setMergeError] = useState<string | null>(null);

  const { data: companies = [] } = useCompanies();
  const quickViewCompany = useMemo(
    () => companies.find((c) => c.id === quickViewCompanyId) ?? null,
    [companies, quickViewCompanyId]
  );
  const { data: pipelines = [] } = usePipelines();
  const defaultPipelineId = pipelines.find((p) => p.is_default)?.id ?? pipelines[0]?.id;
  // Fan out across every pipeline (not just the default one) so a deal
  // living in any pipeline still shows up on the contact — matches the same
  // pattern Calendar.tsx uses for "all deals regardless of pipeline".
  const pipelineIds = useMemo(() => pipelines.map((p) => p.id), [pipelines]);
  const { data: allOpportunities = [] } = useAllOpportunities(pipelineIds);
  const { data: allStages = [] } = useAllStages(pipelineIds);
  const { data: allTasks = [] } = useTasks();
  // get-events is date-range scoped (no "all events for a contact" endpoint
  // exists) — a wide ±1 year window is a pragmatic stand-in so this section
  // still shows the contact's near-term history without a backend change.
  const eventsRangeStart = useMemo(() => {
    const d = new Date();
    d.setFullYear(d.getFullYear() - 1);
    return d.toISOString().slice(0, 10);
  }, []);
  const eventsRangeEnd = useMemo(() => {
    const d = new Date();
    d.setFullYear(d.getFullYear() + 1);
    return d.toISOString().slice(0, 10);
  }, []);
  const { data: allEvents = [] } = useEvents(eventsRangeStart, eventsRangeEnd, !!contact);
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
  // Notes and per-section deal lists are already fully loaded client-side —
  // capping how many render at once (with a "Show more") keeps a very
  // active account's DOM from ballooning without needing real pagination.
  const NOTES_PAGE_SIZE = 10;
  const DEALS_PAGE_SIZE = 5;
  const LINKED_PAGE_SIZE = 5;
  const [visibleNotesCount, setVisibleNotesCount] = useState(NOTES_PAGE_SIZE);
  const [visibleDealsCount, setVisibleDealsCount] = useState<Record<string, number>>({});
  const [visibleTasksCount, setVisibleTasksCount] = useState(LINKED_PAGE_SIZE);
  const [visibleEventsCount, setVisibleEventsCount] = useState(LINKED_PAGE_SIZE);
  useEffect(() => {
    setActivityEverLoaded(false);
    setRequestSentConversationId(null);
    setVisibleNotesCount(NOTES_PAGE_SIZE);
    setVisibleDealsCount({});
    setVisibleTasksCount(LINKED_PAGE_SIZE);
    setVisibleEventsCount(LINKED_PAGE_SIZE);
    setMergeTarget(null);
    setMergeError(null);
    setDeleteNoteTargetId(null);
    setDeleteNoteError(null);
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

  // Same email, different row — the most common source of duplicate
  // contacts (a rep re-adding someone who's already in the system, or two
  // reps entering the same lead independently).
  const duplicateMatch = contact.email
    ? allContacts.find(
        (c) => c.id !== contact.id && (c.email ?? '').trim().toLowerCase() === contact.email!.trim().toLowerCase()
      ) ?? null
    : null;

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
  // Open items first, soonest-due/most-overdue before items further out;
  // items with no date sort last within their group. Finished items (done
  // tasks, closed deals) go after everything still actionable, most
  // recently finished first — a rep triaging this contact should see what
  // needs attention before what's already handled.
  const byDateAsc = (a?: string | null, b?: string | null) => {
    if (!a && !b) return 0;
    if (!a) return 1;
    if (!b) return -1;
    return new Date(a).getTime() - new Date(b).getTime();
  };
  const contactTasks = [...allTasks.filter((t) => t.contact_id === contact.id)].sort((a, b) => {
    if (a.is_completed !== b.is_completed) return a.is_completed ? 1 : -1;
    return a.is_completed ? byDateAsc(b.due_at, a.due_at) : byDateAsc(a.due_at, b.due_at);
  });
  const contactEvents = [...allEvents.filter((e) => e.contact_id === contact.id)].sort((a, b) => {
    if (a.is_completed !== b.is_completed) return a.is_completed ? 1 : -1;
    return a.is_completed ? byDateAsc(b.due_at, a.due_at) : byDateAsc(a.due_at, b.due_at);
  });
  // Grouped into sections (Active, Closed Won, Closed Lost) instead of one
  // flat list, so closed deals are easy to spot separately from open ones.
  // Active sorts soonest-expected-close first; closed sections sort most
  // recently closed first.
  const dealSections = [
    {
      key: 'active',
      label: 'Active',
      items: [...contactDeals.filter((d) => d.status === 'Open')].sort((a, b) =>
        byDateAsc(a.expected_close, b.expected_close)
      ),
    },
    {
      key: 'won',
      label: 'Closed Won',
      items: [...contactDeals.filter((d) => d.status === 'Won')].sort((a, b) =>
        byDateAsc(b.closed_at ?? b.created_at, a.closed_at ?? a.created_at)
      ),
    },
    {
      key: 'lost',
      label: 'Closed Lost',
      items: [...contactDeals.filter((d) => d.status === 'Lost')].sort((a, b) =>
        byDateAsc(b.closed_at ?? b.created_at, a.closed_at ?? a.created_at)
      ),
    },
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

  function openTaskView(taskId: number) {
    onClose();
    navigate(`/tasks?highlight=${taskId}`);
  }

  // Lands on Calendar with the event highlighted instead of a quick-view
  // popup — seeing an event's surrounding schedule (conflicts, what's
  // before/after) is the point, which an isolated popup can't show.
  function openEventView(event: CalendarEvent) {
    onClose();
    const d = new Date(event.due_at);
    const eventDate = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    navigate(`/calendar?highlight=${event.id}&date=${eventDate}`);
  }

  function openCompanyView() {
    if (!contact!.account_id) return;
    // Opens the Quick View in place instead of navigating to /companies —
    // "review account health... without losing their context" is the whole
    // point of the Quick View popover (see CompanyQuickView.tsx).
    setQuickViewCompanyId(contact!.account_id);
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
            {duplicateMatch && (
              <div className="flex items-center gap-2 px-3 py-2 text-xs bg-amber-50 border border-amber-200 rounded-lg text-amber-800">
                <i className="fa-solid fa-triangle-exclamation shrink-0" />
                <span className="flex-1 min-w-0">
                  Possible duplicate — same email as{' '}
                  <span className="font-semibold">
                    {toTitleCase(`${duplicateMatch.first_name} ${duplicateMatch.last_name}`.trim()) || 'another contact'}
                  </span>
                  .
                </span>
                {isAdmin && (
                  <button
                    onClick={() => {
                      setMergeError(null);
                      setMergeTarget(duplicateMatch);
                    }}
                    className="shrink-0 font-semibold text-amber-900 hover:underline"
                  >
                    Merge
                  </button>
                )}
              </div>
            )}
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

              {isReadOnly && (() => {
                const isUnassigned = contact.owner_id == null;
                const requestTargetIds = isUnassigned
                  ? teamUsers.filter((u) => u.role === 'admin').map((u) => u.id)
                  : [contact.owner_id!];
                return (
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-semibold bg-slate-100 text-slate-500 rounded-full border border-slate-200">
                      <i className="fa-solid fa-lock text-[10px]" />
                      {contact.owner_name
                        ? `Read Only — Owned by ${toTitleCase(contact.owner_name)}`
                        : 'Read Only — Unassigned'}
                    </span>
                    {requestTargetIds.length > 0 &&
                      (requestSentConversationId != null ? (
                        <button
                          onClick={() => {
                            navigate(`/team-chat?conversation=${requestSentConversationId}`);
                            onClose();
                          }}
                          className="text-[11px] font-semibold text-emerald-600 hover:underline"
                        >
                          <i className="fa-solid fa-check mr-1" />
                          Request sent — view conversation
                        </button>
                      ) : (
                        <button
                          onClick={() =>
                            requestOwnership.mutate({
                              ownerIds: requestTargetIds,
                              contactName: fullName,
                              forAssignment: isUnassigned,
                            })
                          }
                          disabled={requestOwnership.isPending}
                          className="text-[11px] font-semibold text-[var(--theme-accent)] hover:underline disabled:opacity-50"
                        >
                          {requestOwnership.isPending
                            ? 'Sending...'
                            : isUnassigned
                              ? 'Request Assignment'
                              : 'Request Ownership'}
                        </button>
                      ))}
                  </div>
                );
              })()}

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
                  disabled
                  title={
                    contact.dnc_sms
                      ? 'Marked Do Not Contact: SMS'
                      : 'SMS sending is not connected yet — no provider is configured'
                  }
                />
                <ActionButton
                  icon="fa-note-sticky"
                  label="Notes"
                  onClick={() => notesRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
                />
                <ActionButton
                  icon="fa-handshake"
                  label="Deal"
                  onClick={!isReadOnly ? openAddDeal : undefined}
                />
                <ActionButton
                  icon="fa-check"
                  label="Tasks"
                  onClick={!isReadOnly ? () => setTaskFormOpen(true) : undefined}
                />
                <ActionButton
                  icon="fa-calendar-plus"
                  label="Event"
                  onClick={
                    !isReadOnly
                      ? () => {
                          setEditingEvent(null);
                          setEventFormOpen(true);
                        }
                      : undefined
                  }
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
              <div className="flex items-center gap-1 border-b border-slate-200 mb-2">
                {(
                  [
                    ['opportunities', `Opportunities (${contactDeals.length})`],
                    ['tasks', `Tasks (${contactTasks.length})`],
                    ['events', `Events (${contactEvents.length})`],
                  ] as const
                ).map(([key, label]) => (
                  <button
                    key={key}
                    onClick={() => setRelatedTab(key)}
                    className={`px-2.5 py-1.5 text-xs font-semibold border-b-2 whitespace-nowrap transition-colors -mb-px ${
                      relatedTab === key
                        ? 'border-indigo-600 text-indigo-600'
                        : 'border-transparent text-slate-400 hover:text-slate-600'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>

              {relatedTab === 'opportunities' &&
                (contactDeals.length === 0 ? (
                  <p className="text-xs text-slate-400">No opportunities for this contact yet.</p>
                ) : (
                  <div className="space-y-4">
                    {dealSections.map((section) => {
                      const color = DEAL_SECTION_COLORS[section.key] ?? { text: 'text-slate-400', border: 'border-slate-200' };
                      const shown = visibleDealsCount[section.key] ?? DEALS_PAGE_SIZE;
                      const visibleItems = section.items.slice(0, shown);
                      const remaining = section.items.length - visibleItems.length;
                      return (
                      <div key={section.key}>
                        <div className="flex items-center gap-2 mb-1.5">
                          <span className={`text-[10px] font-bold uppercase tracking-wide shrink-0 ${color.text}`}>
                            {section.label} ({section.items.length})
                          </span>
                          <div className={`flex-1 border-t ${color.border}`} />
                        </div>
                        <div className="divide-y divide-slate-100 border border-slate-200 rounded-lg">
                          {visibleItems.map((d) => {
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
                                <OwnerBadge
                                  name={d.assigned_user_name}
                                  color={d.assigned_user_color}
                                  avatarUrl={d.assigned_user_avatar_url}
                                  size="xs"
                                />
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
                        {remaining > 0 && (
                          <button
                            onClick={() =>
                              setVisibleDealsCount((prev) => ({ ...prev, [section.key]: shown + DEALS_PAGE_SIZE }))
                            }
                            className="w-full mt-1.5 text-xs font-semibold text-[var(--theme-accent)] hover:underline py-1"
                          >
                            Show {Math.min(remaining, DEALS_PAGE_SIZE)} more ({remaining} remaining)
                          </button>
                        )}
                      </div>
                      );
                    })}
                  </div>
                ))}

              {relatedTab === 'tasks' &&
                (contactTasks.length === 0 ? (
                  <p className="text-xs text-slate-400">No tasks linked to this contact yet.</p>
                ) : (
                  <>
                    <div className="divide-y divide-slate-100 border border-slate-200 rounded-lg">
                      {contactTasks.slice(0, visibleTasksCount).map((t) => (
                        <div key={t.id} className="px-3 py-2.5 space-y-1">
                          <div className="flex items-center justify-between gap-2">
                            <p className={`text-sm font-medium truncate ${t.is_completed ? 'text-slate-400 line-through' : 'text-slate-800'}`}>
                              {toTitleCase(t.subject)}
                            </p>
                            {t.priority && (
                              <span className="text-[10px] font-semibold text-slate-500 shrink-0">{t.priority}</span>
                            )}
                          </div>
                          <div className="flex items-center gap-1.5">
                            <OwnerBadge
                              name={t.assigned_user_name}
                              color={t.assigned_user_color}
                              avatarUrl={t.assigned_user_avatar_url}
                              size="xs"
                            />
                            {t.due_at && (
                              <span className="text-xs text-slate-500">
                                Due {new Date(t.due_at).toLocaleDateString(undefined, { month: 'short', day: '2-digit' })}
                              </span>
                            )}
                          </div>
                          <button
                            onClick={() => openTaskView(t.id)}
                            className="w-full mt-1.5 text-xs font-semibold text-indigo-600 border border-indigo-200 rounded-lg py-1.5 hover:bg-indigo-50"
                          >
                            View Task
                          </button>
                        </div>
                      ))}
                    </div>
                    {contactTasks.length > visibleTasksCount && (
                      <button
                        onClick={() => setVisibleTasksCount((c) => c + LINKED_PAGE_SIZE)}
                        className="w-full mt-1.5 text-xs font-semibold text-[var(--theme-accent)] hover:underline py-1"
                      >
                        Show {Math.min(contactTasks.length - visibleTasksCount, LINKED_PAGE_SIZE)} more (
                        {contactTasks.length - visibleTasksCount} remaining)
                      </button>
                    )}
                  </>
                ))}

              {relatedTab === 'events' &&
                (contactEvents.length === 0 ? (
                  <p className="text-xs text-slate-400">No events linked to this contact yet.</p>
                ) : (
                  <>
                    <div className="divide-y divide-slate-100 border border-slate-200 rounded-lg">
                      {contactEvents.slice(0, visibleEventsCount).map((e) => (
                        <div key={e.id} className="px-3 py-2.5 space-y-1">
                          <p className={`text-sm font-medium truncate ${e.is_completed ? 'text-slate-400 line-through' : 'text-slate-800'}`}>
                            {toTitleCase(e.subject)}
                          </p>
                          <p className="text-xs text-slate-500">
                            {new Date(e.due_at).toLocaleDateString(undefined, { month: 'short', day: '2-digit', year: 'numeric' })}
                            {e.assigned_user_name ? ` · ${toTitleCase(e.assigned_user_name)}` : ''}
                          </p>
                          <button
                            onClick={() => openEventView(e)}
                            className="w-full mt-1.5 text-xs font-semibold text-indigo-600 border border-indigo-200 rounded-lg py-1.5 hover:bg-indigo-50"
                          >
                            View Event
                          </button>
                        </div>
                      ))}
                    </div>
                    {contactEvents.length > visibleEventsCount && (
                      <button
                        onClick={() => setVisibleEventsCount((c) => c + LINKED_PAGE_SIZE)}
                        className="w-full mt-1.5 text-xs font-semibold text-[var(--theme-accent)] hover:underline py-1"
                      >
                        Show {Math.min(contactEvents.length - visibleEventsCount, LINKED_PAGE_SIZE)} more (
                        {contactEvents.length - visibleEventsCount} remaining)
                      </button>
                    )}
                  </>
                ))}
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
              onClose={onClose}
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
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-[var(--theme-accent)] disabled:bg-slate-50 disabled:text-slate-400"
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
                notes.slice(0, visibleNotesCount).map((note) => {
                  const canEdit = isAdmin || note.created_by === user?.id;
                  const isEditing = editingNoteId === note.id;
                  return (
                    <div
                      key={note.id}
                      className={`p-3 rounded-lg border space-y-1.5 ${
                        note.is_pinned ? 'bg-amber-50 border-amber-200' : 'bg-slate-50 border-slate-100'
                      }`}
                    >
                      <div className="flex items-center justify-between text-xs">
                        <span className="flex items-center gap-1.5 font-medium text-slate-700 min-w-0">
                          {note.is_pinned && <i className="fa-solid fa-thumbtack text-amber-600 text-[10px] shrink-0" />}
                          <span className="truncate">
                            {note.created_by_name ? toTitleCase(note.created_by_name) : 'Unknown'}
                          </span>
                        </span>
                        <span className="flex items-center gap-2 shrink-0">
                          <span className="text-slate-400 text-[10px]">
                            {new Date(note.created_at).toLocaleString(undefined, {
                              dateStyle: 'medium',
                              timeStyle: 'short',
                            })}
                            {note.updated_at ? ' (edited)' : ''}
                          </span>
                          {!isReadOnly && (
                            <button
                              onClick={() => {
                                setNoteError(null);
                                updateNote.mutate(
                                  { id: note.id, isPinned: !note.is_pinned },
                                  {
                                    onError: (err) =>
                                      setNoteError(err instanceof Error ? err.message : 'Failed to update pin.'),
                                  }
                                );
                              }}
                              title={note.is_pinned ? 'Unpin note' : 'Pin note to top'}
                              className={`text-[10px] ${
                                note.is_pinned ? 'text-amber-600 hover:text-amber-700' : 'text-slate-300 hover:text-amber-600'
                              }`}
                            >
                              <i className="fa-solid fa-thumbtack" />
                            </button>
                          )}
                        </span>
                      </div>
                      {isEditing ? (
                        <>
                          <textarea
                            value={editDraft}
                            onChange={(e) => setEditDraft(e.target.value)}
                            rows={3}
                            className="w-full px-2 py-1.5 text-xs border border-slate-200 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-[var(--theme-accent)]"
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
                              className="text-[11px] font-semibold text-[var(--theme-accent)] hover:text-[var(--theme-accent-hover)] disabled:opacity-50"
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
                                  setDeleteNoteError(null);
                                  setDeleteNoteTargetId(note.id);
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
              {!notesLoading && notes.length > visibleNotesCount && (
                <button
                  onClick={() => setVisibleNotesCount((c) => c + NOTES_PAGE_SIZE)}
                  className="w-full text-xs font-semibold text-[var(--theme-accent)] hover:underline py-1"
                >
                  Show {Math.min(notes.length - visibleNotesCount, NOTES_PAGE_SIZE)} more (
                  {notes.length - visibleNotesCount} remaining)
                </button>
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
      <EventFormModal
        open={eventFormOpen}
        event={editingEvent}
        defaultContactId={contact.id}
        onClose={() => {
          setEventFormOpen(false);
          setEditingEvent(null);
        }}
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
      <ConfirmDialog
        open={deleteNoteTargetId !== null}
        title="Delete this note?"
        confirmLabel="Delete"
        isSubmitting={deleteNote.isPending}
        error={deleteNoteError}
        onConfirm={() => {
          if (deleteNoteTargetId == null) return;
          setDeleteNoteError(null);
          deleteNote.mutate(deleteNoteTargetId, {
            onSuccess: () => setDeleteNoteTargetId(null),
            onError: (err) => setDeleteNoteError(err instanceof Error ? err.message : 'Failed to delete note.'),
          });
        }}
        onCancel={() => {
          setDeleteNoteTargetId(null);
          setDeleteNoteError(null);
        }}
      />
      <ConfirmDialog
        open={mergeTarget !== null}
        title="Merge duplicate contact?"
        body={
          mergeTarget
            ? `"${toTitleCase(`${mergeTarget.first_name} ${mergeTarget.last_name}`.trim())}" will be merged into "${fullName}" — its deals, tasks, notes, activity, and tags all move onto this contact, any field left blank here gets filled in from the duplicate, and the duplicate is archived (not deleted, so it's recoverable from the Archived tab).`
            : undefined
        }
        confirmLabel="Merge"
        isSubmitting={mergeContacts.isPending}
        error={mergeError}
        onConfirm={() => {
          if (!mergeTarget) return;
          setMergeError(null);
          mergeContacts.mutate(
            { primaryId: contact.id, duplicateId: mergeTarget.id },
            {
              onSuccess: () => setMergeTarget(null),
              onError: (err) => setMergeError(err instanceof Error ? err.message : 'Failed to merge contacts.'),
            }
          );
        }}
        onCancel={() => {
          setMergeTarget(null);
          setMergeError(null);
        }}
      />
      <CompanyQuickView
        company={quickViewCompany}
        onClose={() => setQuickViewCompanyId(null)}
        onEdit={(company) => {
          setQuickViewCompanyId(null);
          onClose();
          navigate(`/companies?companyId=${company.id}`);
        }}
        onOpenFullRecord={(company) => {
          setQuickViewCompanyId(null);
          onClose();
          navigate(`/companies?companyId=${company.id}`);
        }}
        canEdit={isAdmin || quickViewCompany?.owner_id === user?.id}
      />
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
