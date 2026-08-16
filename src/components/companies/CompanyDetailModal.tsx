import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Company } from '../../types/company';
import { Contact } from '../../types/contact';
import { CalendarEvent } from '../../types/event';
import { ActivityLogEntry } from '../../types/activity';
import { useContacts, useUsers } from '../../hooks/useContacts';
import { usePipelines, useAllOpportunities, useAllStages } from '../../hooks/useOpportunities';
import { useEntityActivity } from '../../hooks/useActivity';
import { useAddNote, useDeleteNote, useNotes, useUpdateNote } from '../../hooks/useNotes';
import { useUpdateCompany } from '../../hooks/useCompanies';
import { useTasks } from '../../hooks/useTasks';
import { useEvents } from '../../hooks/useEvents';
import * as chatApi from '../../api/chat';
import { toTitleCase, formatPhone } from '../../utils/text';
import { COMPANY_HEALTH_DISPLAY } from '../../utils/companyHealth';
import Avatar from '../Avatar';
import DealFormModal from '../pipeline/DealFormModal';
import AddContactModal from '../contacts/AddContactModal';
import TaskFormModal from '../tasks/TaskFormModal';
import EventFormModal from '../calendar/EventFormModal';
import LogCallModal from '../LogCallModal';
import ComposeEmailPopover from '../contacts/ComposeEmailPopover';
import ActivityTimeline from '../ActivityTimeline';
import ActivityLogModal from '../ActivityLogModal';
import ConfirmDialog from '../ConfirmDialog';
import OwnerBadge from '../OwnerBadge';

const ACCOUNT_STATUS_COLORS: Record<string, string> = {
  Prospect: 'bg-slate-100 text-slate-700',
  'Customer - Active': 'bg-emerald-100 text-emerald-800',
  'Customer - Churned': 'bg-rose-100 text-rose-700',
  Partner: 'bg-blue-100 text-blue-800',
};

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
  company: Company | null;
  onClose: () => void;
  onEdit: (company: Company) => void;
  onContactClick?: (contactId: number) => void;
  onViewHierarchy?: (company: Company) => void;
  isAdmin: boolean;
  currentUserId?: number;
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

export default function CompanyDetailModal({
  company,
  onClose,
  onEdit,
  onContactClick,
  onViewHierarchy,
  isAdmin,
  currentUserId,
}: Props) {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const notesRef = useRef<HTMLDivElement>(null);
  const [dealFormOpen, setDealFormOpen] = useState(false);
  const [addContactOpen, setAddContactOpen] = useState(false);
  const [logCallOpen, setLogCallOpen] = useState(false);
  const [emailContact, setEmailContact] = useState<Contact | null>(null);
  const [noteDraft, setNoteDraft] = useState('');
  const [noteError, setNoteError] = useState<string | null>(null);
  const [editingNoteId, setEditingNoteId] = useState<number | null>(null);
  const [editDraft, setEditDraft] = useState('');
  const [deleteNoteTargetId, setDeleteNoteTargetId] = useState<number | null>(null);
  const [deleteNoteError, setDeleteNoteError] = useState<string | null>(null);
  const NOTES_PAGE_SIZE = 10;
  const LINKED_PAGE_SIZE = 5;
  const [visibleNotesCount, setVisibleNotesCount] = useState(NOTES_PAGE_SIZE);
  const [visibleTasksCount, setVisibleTasksCount] = useState(LINKED_PAGE_SIZE);
  const [visibleEventsCount, setVisibleEventsCount] = useState(LINKED_PAGE_SIZE);
  const [selectedActivity, setSelectedActivity] = useState<ActivityLogEntry | null>(null);
  const [taskFormOpen, setTaskFormOpen] = useState(false);
  const [eventFormOpen, setEventFormOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);
  const [relatedTab, setRelatedTab] = useState<'opportunities' | 'tasks' | 'events'>('tasks');

  // A read-only company otherwise dead-ends the rep — no path forward
  // except finding the right person outside the app. DMs whoever can
  // actually grant access, exactly like ContactDetailModal: the current
  // owner if there is one, or every admin if the company is unassigned —
  // only admins can assign an owner in the first place (update-companies'
  // owner_id write requires role='admin' when the requester doesn't already
  // own the row), so they're the correct recipient, not a self-serve claim.
  const { data: teamUsers = [] } = useUsers();
  const updateCompany = useUpdateCompany();
  const [ownerPickerOpen, setOwnerPickerOpen] = useState(false);
  const [requestSentConversationId, setRequestSentConversationId] = useState<number | null>(null);
  const requestOwnership = useMutation({
    mutationFn: async (target: { ownerIds: number[]; companyName: string; forAssignment: boolean }) => {
      const message = target.forAssignment
        ? `Hi, "${target.companyName}" is unassigned — could you assign it to me? I need edit access.`
        : `Hi, could you transfer ownership of "${target.companyName}" to me? I need edit access.`;
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

  useEffect(() => {
    setVisibleNotesCount(NOTES_PAGE_SIZE);
    setVisibleTasksCount(LINKED_PAGE_SIZE);
    setVisibleEventsCount(LINKED_PAGE_SIZE);
    setRequestSentConversationId(null);
    setDeleteNoteTargetId(null);
    setDeleteNoteError(null);
    setOwnerPickerOpen(false);
    setSelectedActivity(null);
  }, [company?.id]);

  const { data: allContacts = [], isLoading: contactsLoading } = useContacts();
  const { data: pipelines = [] } = usePipelines();
  const defaultPipelineId = pipelines.find((p) => p.is_default)?.id ?? pipelines[0]?.id;
  // Fan out across every pipeline (not just the default one) so a deal
  // living in any pipeline still shows up here — matches ContactDetailModal.
  const pipelineIds = useMemo(() => pipelines.map((p) => p.id), [pipelines]);
  const { data: opportunities = [], isLoading: oppsLoading } = useAllOpportunities(pipelineIds);
  const { data: stages = [] } = useAllStages(pipelineIds);
  const { data: activity = [], isLoading: activityLoading } = useEntityActivity('company', company?.id ?? null);
  const { data: notes = [], isLoading: notesLoading } = useNotes('company', company?.id ?? null);
  const addNote = useAddNote('company', company?.id ?? null);
  const updateNote = useUpdateNote('company', company?.id ?? null);
  const deleteNote = useDeleteNote('company', company?.id ?? null);
  const { data: allTasks = [] } = useTasks();
  // get-events is date-range scoped (no "all events for a company" endpoint
  // exists) — a wide ±1 year window is a pragmatic stand-in, same tradeoff
  // as ContactDetailModal's Events section.
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
  const { data: allEvents = [] } = useEvents(eventsRangeStart, eventsRangeEnd, !!company);

  if (!company) return null;

  // View All, Edit Owned Only: matches Contacts/Companies table policy.
  const canEdit = isAdmin || company.owner_id === currentUserId;

  const companyContacts = allContacts.filter((c) => c.account_id === company.id);
  const companyOpportunities = opportunities.filter((o) => o.account_id === company.id);
  // Open items first, soonest-due/most-overdue before items further out;
  // items with no date sort last within their group. Finished items (done
  // tasks, closed deals) go after everything still actionable, most
  // recently finished first — a rep triaging this account should see what
  // needs attention before what's already handled.
  const byDateAsc = (a?: string | null, b?: string | null) => {
    if (!a && !b) return 0;
    if (!a) return 1;
    if (!b) return -1;
    return new Date(a).getTime() - new Date(b).getTime();
  };
  // Grouped into sections (Active, Closed Won, Closed Lost) instead of one
  // flat list, so closed deals are easy to spot separately from open ones.
  // Active sorts soonest-expected-close first; closed sections sort most
  // recently closed first.
  const dealSections = [
    {
      key: 'active',
      label: 'Active',
      items: [...companyOpportunities.filter((d) => d.status === 'Open')].sort((a, b) =>
        byDateAsc(a.expected_close, b.expected_close)
      ),
    },
    {
      key: 'won',
      label: 'Closed Won',
      items: [...companyOpportunities.filter((d) => d.status === 'Won')].sort((a, b) =>
        byDateAsc(b.closed_at ?? b.created_at, a.closed_at ?? a.created_at)
      ),
    },
    {
      key: 'lost',
      label: 'Closed Lost',
      items: [...companyOpportunities.filter((d) => d.status === 'Lost')].sort((a, b) =>
        byDateAsc(b.closed_at ?? b.created_at, a.closed_at ?? a.created_at)
      ),
    },
  ].filter((section) => section.items.length > 0);
  const stageName = (stageId: number) => stages.find((s) => s.id === stageId)?.name ?? '--';

  // No contract-value/ARR column exists in the schema — this sums Won deals
  // as the closest real proxy (same computation CompaniesTable's ARR column
  // already uses), rather than showing a fabricated number.
  const wonValue = companyOpportunities
    .filter((o) => o.status === 'Won')
    .reduce((sum, o) => sum + Number(o.deal_value ?? 0), 0);
  const openPipelineValue = companyOpportunities
    .filter((o) => o.status === 'Open')
    .reduce((sum, o) => sum + Number(o.deal_value ?? 0), 0);

  const companyTasks = [...allTasks.filter((t) => t.account_id === company.id)].sort((a, b) => {
    if (a.is_completed !== b.is_completed) return a.is_completed ? 1 : -1;
    return a.is_completed ? byDateAsc(b.due_at, a.due_at) : byDateAsc(a.due_at, b.due_at);
  });
  const companyEvents = [...allEvents.filter((e) => e.company_id === company.id)].sort((a, b) => {
    if (a.is_completed !== b.is_completed) return a.is_completed ? 1 : -1;
    return a.is_completed ? byDateAsc(b.due_at, a.due_at) : byDateAsc(a.due_at, b.due_at);
  });

  function openAddDeal() {
    setDealFormOpen(true);
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

  function openParentCompany() {
    if (!company!.parent_company_id) return;
    onClose();
    navigate(`/companies?companyId=${company!.parent_company_id}`);
  }

  // Takes over the deal's real pipeline (it may not be the default one) and
  // switches the board to it, scrolling the specific card into view and
  // ringing it for a few seconds (Pipeline.tsx's ?highlight= deep link) —
  // matches ContactDetailModal's openPipelineView.
  function openPipelineView(dealId: number, dealPipelineId?: number | null) {
    onClose();
    const pid = dealPipelineId ?? defaultPipelineId;
    navigate(`/pipeline?pipeline=${pid}&highlight=${dealId}`);
  }

  return (
    <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl h-[85vh] flex flex-col overflow-hidden">
        {/* Header — just the close button; company identity/actions now live at the top of the left column */}
        <div className="flex justify-end px-4 py-2 shrink-0">
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <i className="fa-solid fa-xmark text-lg" />
          </button>
        </div>

        {/* 3-column body */}
        <div className="flex-1 grid grid-cols-3 min-h-0">
          {/* Column 1: Identity + Firmographics + Contacts + Opportunities */}
          <div className="border-r border-slate-200 overflow-y-auto p-5 space-y-5">
            <div className="border border-slate-200 rounded-xl p-4 space-y-1.5">
              <div className="flex items-start gap-3">
                <div className="w-14 h-14 rounded-full bg-indigo-100 text-indigo-700 font-bold flex items-center justify-center text-lg shrink-0">
                  <i className="fa-solid fa-building" />
                </div>
                <div className="min-w-0 flex-1 pt-1">
              <h2 className="text-base font-bold text-slate-800 truncate flex items-center gap-1.5">
                {toTitleCase(company.name)}
                {company.tier && (
                  <span className="inline-flex items-center px-2 py-0.5 text-[10px] font-semibold rounded-full bg-indigo-50 text-indigo-700 shrink-0">
                    {company.tier}
                  </span>
                )}
                {canEdit && (
                  <button
                    onClick={() => onEdit(company)}
                    className="text-slate-300 hover:text-indigo-600"
                    title="Edit company"
                  >
                    <i className="fa-solid fa-pen text-xs" />
                  </button>
                )}
                {onViewHierarchy && (
                  <button
                    onClick={() => onViewHierarchy(company)}
                    className="text-slate-300 hover:text-indigo-600"
                    title="View account hierarchy"
                  >
                    <i className="fa-solid fa-sitemap text-xs" />
                  </button>
                )}
              </h2>
              <p className="text-xs text-slate-500 flex items-center gap-1.5 flex-wrap">
                {company.parent_company_name && (
                  <span>
                    Parent:{' '}
                    {company.parent_company_id ? (
                      <button onClick={openParentCompany} className="text-indigo-600 hover:underline font-medium">
                        {toTitleCase(company.parent_company_name)}
                      </button>
                    ) : (
                      toTitleCase(company.parent_company_name)
                    )}
                  </span>
                )}
                {company.parent_company_name && company.industry && <span className="text-slate-300">|</span>}
                {company.industry && <span>Industry: {toTitleCase(company.industry)}</span>}
                <span className="text-slate-300">|</span>
                <span className="relative flex items-center gap-1.5">
                  Owner:
                  {(() => {
                    const ownerAvatarUrl = teamUsers.find((u) => u.id === company.owner_id)?.avatar_url;
                    const label = (
                      <OwnerBadge
                        name={company.owner_name}
                        color={company.owner_color}
                        avatarUrl={ownerAvatarUrl}
                      />
                    );

                    // Owner reassignment (including initial assignment of an
                    // unassigned company) — same gate as the pencil/tags/
                    // notes edit affordances, not a separate self-serve
                    // claim. For a genuinely unassigned company that's
                    // admin-only, since canEdit only allows the *current*
                    // owner or an admin, and there is no current owner yet.
                    if (!canEdit) return label;

                    return (
                      <>
                        <button
                          type="button"
                          onClick={() => setOwnerPickerOpen((v) => !v)}
                          className="hover:ring-2 hover:ring-[var(--theme-accent)] rounded-full transition-shadow"
                          title="Click to assign owner"
                        >
                          {label}
                        </button>
                        {ownerPickerOpen && (
                          <>
                            <div className="fixed inset-0 z-10" onClick={() => setOwnerPickerOpen(false)} />
                            <div className="absolute left-0 top-full mt-1 w-44 max-h-56 overflow-y-auto bg-white border border-slate-200 rounded-lg shadow-lg z-20 py-1 text-xs">
                              {teamUsers.map((u) => (
                                <button
                                  key={u.id}
                                  onClick={() => {
                                    setOwnerPickerOpen(false);
                                    if (u.id !== company.owner_id) {
                                      updateCompany.mutate({ id: company.id, payload: { owner_id: u.id } });
                                    }
                                  }}
                                  className={`w-full flex items-center gap-1.5 text-left px-3 py-1.5 hover:bg-slate-50 truncate ${
                                    u.id === company.owner_id ? 'font-semibold text-slate-800' : 'text-slate-600'
                                  }`}
                                >
                                  <Avatar name={u.name} size="xs" avatarUrl={u.avatar_url} />
                                  <span className="truncate">{toTitleCase(u.name)}</span>
                                </button>
                              ))}
                            </div>
                          </>
                        )}
                      </>
                    );
                  })()}
                </span>
                {!canEdit && (() => {
                  const isUnassigned = company.owner_id == null;
                  const requestTargetIds = isUnassigned
                    ? teamUsers.filter((u) => u.role === 'admin').map((u) => u.id)
                    : [company.owner_id!];
                  if (requestTargetIds.length === 0) return null;
                  return (
                    <>
                      <span className="inline-flex items-center gap-1 ml-1 px-2 py-0.5 text-[10px] font-semibold bg-slate-100 text-slate-500 rounded-full border border-slate-200">
                        <i className="fa-solid fa-lock text-[9px]" />
                        {isUnassigned ? 'Unassigned' : 'Read Only'}
                      </span>
                      {requestSentConversationId != null ? (
                        <button
                          onClick={() => {
                            navigate(`/team-chat?conversation=${requestSentConversationId}`);
                            onClose();
                          }}
                          className="text-[10px] font-semibold text-emerald-600 hover:underline"
                        >
                          <i className="fa-solid fa-check mr-1" />
                          Request sent — view conversation
                        </button>
                      ) : (
                        <button
                          onClick={() =>
                            requestOwnership.mutate({
                              ownerIds: requestTargetIds,
                              companyName: company.name,
                              forAssignment: isUnassigned,
                            })
                          }
                          disabled={requestOwnership.isPending}
                          className="text-[10px] font-semibold text-[var(--theme-accent)] hover:underline disabled:opacity-50"
                        >
                          {requestOwnership.isPending
                            ? 'Sending...'
                            : isUnassigned
                              ? 'Request Assignment'
                              : 'Request Ownership'}
                        </button>
                      )}
                    </>
                  );
                })()}
              </p>

              <div className="flex items-center gap-1.5 flex-wrap pt-1">
                {company.is_archived ? (
                  <span className="inline-flex items-center gap-1.5 px-2 py-0.5 text-xs font-medium rounded-full bg-slate-100 text-slate-500">
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                    Archived
                  </span>
                ) : (
                  <>
                    {company.account_status && (
                      <span
                        className={`px-2 py-0.5 text-xs font-medium rounded-full ${
                          ACCOUNT_STATUS_COLORS[company.account_status] ?? 'bg-slate-100 text-slate-700'
                        }`}
                      >
                        {company.account_status}
                      </span>
                    )}
                    {company.account_health && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full bg-slate-50 border border-slate-200 text-slate-700">
                        {COMPANY_HEALTH_DISPLAY[company.account_health]?.emoji ?? '⚪'}
                        {COMPANY_HEALTH_DISPLAY[company.account_health]?.label ?? company.account_health}
                      </span>
                    )}
                  </>
                )}
              </div>
                </div>
              </div>

              {/* Account value — the first thing an exec check-in needs: what
                  this account is actually worth, not just its own firmographic
                  size. No contract-value/renewal-date column exists in the
                  schema yet, so Won-deal total is used as the closest real
                  proxy instead of fabricating a number. */}
              <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-100">
                <div className="bg-emerald-50 border border-emerald-100 rounded-lg px-3 py-2">
                  <p className="text-[10px] font-semibold text-emerald-700 uppercase tracking-wide">Revenue Won</p>
                  <p className="text-base font-bold text-emerald-800">
                    ${wonValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                  </p>
                </div>
                <div className="bg-blue-50 border border-blue-100 rounded-lg px-3 py-2">
                  <p className="text-[10px] font-semibold text-blue-700 uppercase tracking-wide">Open Pipeline</p>
                  <p className="text-base font-bold text-blue-800">
                    ${openPipelineValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                  </p>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-100">
                <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">Firmographics</h3>
                <div className="grid grid-cols-2 gap-x-4 gap-y-3">
                  <DetailField label="Website" value={company.website} />
                  <DetailField label="Phone" value={formatPhone(company.phone)} />
                  <DetailField label="Revenue" value={company.annual_revenue ?? undefined} />
                  <DetailField label="Employees" value={company.employee_count ?? undefined} />
                  <DetailField
                    label="Location"
                    value={toTitleCase(
                      [company.street_address, company.city, company.state, company.zip_code, company.country]
                        .filter(Boolean)
                        .join(', ')
                    )}
                  />
                  <DetailField label="Region" value={company.territory ?? undefined} />
                </div>
              </div>

              <div className="flex items-stretch gap-1 bg-slate-50 border border-slate-200 rounded-xl p-1.5">
                <ActionButton
                  icon="fa-phone"
                  label="Call"
                  onClick={() => setLogCallOpen(true)}
                />
                <ActionButton
                  icon="fa-note-sticky"
                  label="Notes"
                  onClick={() => notesRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
                />
                <ActionButton icon="fa-handshake" label="Deal" onClick={canEdit ? openAddDeal : undefined} />
                <ActionButton
                  icon="fa-check"
                  label="Tasks"
                  onClick={canEdit ? () => setTaskFormOpen(true) : undefined}
                />
                <ActionButton
                  icon="fa-calendar-plus"
                  label="Event"
                  onClick={
                    canEdit
                      ? () => {
                          setEditingEvent(null);
                          setEventFormOpen(true);
                        }
                      : undefined
                  }
                />
              </div>
            </div>

            <div className="pt-2 border-t border-slate-100">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wide">
                  Associated Contacts ({companyContacts.length})
                </h3>
                {canEdit && (
                  <button
                    onClick={() => setAddContactOpen(true)}
                    className="text-xs font-semibold text-indigo-600 hover:underline"
                  >
                    + Add
                  </button>
                )}
              </div>

              {contactsLoading ? (
                <p className="text-sm text-slate-400">Loading contacts...</p>
              ) : companyContacts.length === 0 ? (
                <p className="text-xs text-slate-400">
                  No contacts linked to this company yet. Add or edit a contact and pick this
                  company to link them here.
                </p>
              ) : (
                <div className="divide-y divide-slate-100 border border-slate-200 rounded-lg">
                  {companyContacts.map((c) => {
                    const fullName = toTitleCase(`${c.first_name} ${c.last_name}`.trim()) || 'No Name';
                    const status = c.lead_status || 'New';
                    return (
                      <button
                        key={c.id}
                        onClick={() => onContactClick?.(c.id)}
                        className="w-full text-left px-3 py-2.5 space-y-1 hover:bg-slate-50"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-sm font-medium text-slate-800 truncate hover:text-indigo-600">
                            {fullName}
                            {(c.company_role || c.job_title) && (
                              <span className="text-slate-400 font-normal">
                                {' '}
                                ({toTitleCase(c.company_role || c.job_title || '')})
                              </span>
                            )}
                          </p>
                          <span
                            className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full shrink-0 ${
                              STATUS_COLORS[status] ?? 'bg-slate-100 text-slate-800'
                            }`}
                          >
                            {status}
                          </span>
                        </div>
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-xs text-slate-400 truncate">{c.email || '--'}</p>
                          <div className="flex items-center gap-1 shrink-0">
                            <span
                              role="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setLogCallOpen(true);
                              }}
                              title="Log a call"
                              className="w-6 h-6 flex items-center justify-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-indigo-600"
                            >
                              <i className="fa-solid fa-phone text-[10px]" />
                            </span>
                            <span
                              role="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                if (c.email) setEmailContact(c);
                              }}
                              title="Email"
                              className={`w-6 h-6 flex items-center justify-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-indigo-600 ${
                                !c.email ? 'opacity-30 pointer-events-none' : ''
                              }`}
                            >
                              <i className="fa-solid fa-envelope text-[10px]" />
                            </span>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="pt-2 border-t border-slate-100">
              <div className="flex items-center gap-1 border-b border-slate-200 mb-2">
                {(
                  [
                    ['opportunities', `Opportunities (${companyOpportunities.length})`],
                    ['tasks', `Tasks (${companyTasks.length})`],
                    ['events', `Events (${companyEvents.length})`],
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
                (oppsLoading ? (
                  <p className="text-sm text-slate-400">Loading opportunities...</p>
                ) : companyOpportunities.length === 0 ? (
                  <p className="text-xs text-slate-400">No opportunities for this company yet.</p>
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
                            const isClosed = d.status !== 'Open';
                            const closeDate = isClosed ? d.closed_at ?? d.created_at : d.expected_close;
                            return (
                              <div key={d.id} className="px-3 py-2.5 space-y-1">
                                <div className="flex items-center justify-between gap-2">
                                  <p className="text-sm font-medium text-slate-800 truncate">{toTitleCase(d.name)}</p>
                                  <span className="text-sm font-semibold text-emerald-600 shrink-0">
                                    {d.deal_value != null
                                      ? `$${Number(d.deal_value).toLocaleString(undefined, { minimumFractionDigits: 2 })}`
                                      : '--'}
                                  </span>
                                </div>
                                <p className="text-xs text-slate-400 truncate">
                                  Stage: {stageName(d.stage_id)}
                                  {closeDate &&
                                    ` | ${isClosed ? 'Closed' : 'Close'}: ${new Date(closeDate).toLocaleDateString(undefined, {
                                      month: 'short',
                                      day: '2-digit',
                                      year: 'numeric',
                                    })}`}
                                </p>
                                {d.status === 'Lost' && d.lost_reason && (
                                  <p className="text-xs text-rose-600">Lost Reason: {d.lost_reason}</p>
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
                ))}

              {relatedTab === 'tasks' &&
                (companyTasks.length === 0 ? (
                  <p className="text-xs text-slate-400">No tasks linked to this company yet.</p>
                ) : (
                  <>
                    <div className="divide-y divide-slate-100 border border-slate-200 rounded-lg">
                      {companyTasks.slice(0, visibleTasksCount).map((t) => (
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
                    {companyTasks.length > visibleTasksCount && (
                      <button
                        onClick={() => setVisibleTasksCount((c) => c + LINKED_PAGE_SIZE)}
                        className="w-full mt-1.5 text-xs font-semibold text-[var(--theme-accent)] hover:underline py-1"
                      >
                        Show {Math.min(companyTasks.length - visibleTasksCount, LINKED_PAGE_SIZE)} more (
                        {companyTasks.length - visibleTasksCount} remaining)
                      </button>
                    )}
                  </>
                ))}

              {relatedTab === 'events' &&
                (companyEvents.length === 0 ? (
                  <p className="text-xs text-slate-400">No events linked to this company yet.</p>
                ) : (
                  <>
                    <div className="divide-y divide-slate-100 border border-slate-200 rounded-lg">
                      {companyEvents.slice(0, visibleEventsCount).map((e) => (
                        <div key={e.id} className="px-3 py-2.5 space-y-1">
                          <p className={`text-sm font-medium truncate ${e.is_completed ? 'text-slate-400 line-through' : 'text-slate-800'}`}>
                            {toTitleCase(e.subject)}
                          </p>
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs text-slate-500">
                              {new Date(e.due_at).toLocaleDateString(undefined, { month: 'short', day: '2-digit', year: 'numeric' })}
                            </span>
                            {e.assigned_user_name && (
                              <OwnerBadge
                                name={e.assigned_user_name}
                                color={e.assigned_user_color}
                                avatarUrl={e.assigned_user_avatar_url}
                                size="xs"
                              />
                            )}
                          </div>
                          <button
                            onClick={() => openEventView(e)}
                            className="w-full mt-1.5 text-xs font-semibold text-indigo-600 border border-indigo-200 rounded-lg py-1.5 hover:bg-indigo-50"
                          >
                            View Event
                          </button>
                        </div>
                      ))}
                    </div>
                    {companyEvents.length > visibleEventsCount && (
                      <button
                        onClick={() => setVisibleEventsCount((c) => c + LINKED_PAGE_SIZE)}
                        className="w-full mt-1.5 text-xs font-semibold text-[var(--theme-accent)] hover:underline py-1"
                      >
                        Show {Math.min(companyEvents.length - visibleEventsCount, LINKED_PAGE_SIZE)} more (
                        {companyEvents.length - visibleEventsCount} remaining)
                      </button>
                    )}
                  </>
                ))}
            </div>
          </div>

          {/* Column 2: Activity Timeline */}
          <div className="border-r border-slate-200 overflow-y-auto p-5 space-y-3">
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Activity Timeline</h3>
            <ActivityTimeline
              activity={activity}
              isLoading={activityLoading}
              onEmailClick={() => {}}
              onActivityClick={(entry) => setSelectedActivity(entry)}
              onClose={onClose}
            />
          </div>

          {/* Column 3: Notes & Account Team */}
          <div ref={notesRef} className="overflow-y-auto p-5 space-y-5">
            <div>
              <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">Notes</h3>
              <textarea
                value={noteDraft}
                onChange={(e) => setNoteDraft(e.target.value)}
                placeholder="Write a note about this company..."
                rows={4}
                disabled={!canEdit}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-[var(--theme-accent)] disabled:bg-slate-50 disabled:text-slate-400"
              />
              {noteError && (
                <p className="text-[11px] text-rose-600 bg-rose-50 border border-rose-200 rounded-md px-2 py-1 mt-1.5">
                  {noteError}
                </p>
              )}
              <button
                disabled={!canEdit || !noteDraft.trim() || addNote.isPending}
                onClick={() => {
                  setNoteError(null);
                  addNote.mutate(
                    { body: noteDraft.trim(), requesterId: currentUserId },
                    {
                      onSuccess: () => setNoteDraft(''),
                      onError: (err) => setNoteError(err instanceof Error ? err.message : 'Failed to add note.'),
                    }
                  );
                }}
                className="w-full mt-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-semibold py-2 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
                    const canEditNote = isAdmin || note.created_by === currentUserId;
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
                              {new Date(note.created_at).toLocaleDateString(undefined, { month: 'short', day: '2-digit' })}
                              {note.updated_at ? ' (edited)' : ''}
                            </span>
                            {canEdit && (
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
                            {canEditNote && (
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

            <div className="pt-2 border-t border-slate-100">
              <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">Account Team</h3>
              <div className="border border-slate-200 rounded-xl p-3 space-y-1.5">
                <TeamMemberRow
                  label="Owner"
                  name={company.owner_name}
                  color={company.owner_color}
                  avatarUrl={teamUsers.find((u) => u.id === company.owner_id)?.avatar_url}
                />
                <TeamMemberRow
                  label="SE"
                  name={company.se_user_name}
                  avatarUrl={teamUsers.find((u) => u.id === company.se_user_id)?.avatar_url}
                />
                <TeamMemberRow
                  label="CS Rep"
                  name={company.csm_user_name}
                  avatarUrl={teamUsers.find((u) => u.id === company.csm_user_id)?.avatar_url}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {defaultPipelineId && (
        <DealFormModal
          open={dealFormOpen}
          opportunity={null}
          pipelineId={defaultPipelineId}
          defaultAccountId={company.id}
          defaultCompanyName={company.name}
          onClose={() => setDealFormOpen(false)}
        />
      )}
      <AddContactModal
        open={addContactOpen}
        defaultAccountId={company.id}
        defaultCompanyName={company.name}
        onClose={() => setAddContactOpen(false)}
      />
      <TaskFormModal
        open={taskFormOpen}
        defaultAccountId={company.id}
        defaultCompanyName={company.name}
        onClose={() => setTaskFormOpen(false)}
      />
      <EventFormModal
        open={eventFormOpen}
        event={editingEvent}
        defaultAccountId={company.id}
        defaultCompanyName={company.name}
        onClose={() => {
          setEventFormOpen(false);
          setEditingEvent(null);
        }}
      />
      <LogCallModal
        open={logCallOpen}
        entityType="company"
        entityId={company.id}
        entityLabel={company.name}
        onClose={() => setLogCallOpen(false)}
      />
      {emailContact && (
        <ComposeEmailPopover contact={emailContact} open onClose={() => setEmailContact(null)} />
      )}
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
    </div>
  );
}

function DetailField({ label, value }: { label: string; value?: string }) {
  return (
    <div>
      <label className="block text-[11px] font-medium text-slate-500 mb-1">{label}</label>
      <p className="text-sm text-slate-700 break-words">{value || '--'}</p>
    </div>
  );
}

function TeamMemberRow({
  label,
  name,
  color,
  avatarUrl,
}: {
  label: string;
  name?: string;
  color?: string;
  avatarUrl?: string | null;
}) {
  return (
    <div className="flex items-center justify-between text-xs">
      <span className="text-slate-500">{label}:</span>
      <OwnerBadge name={name} color={color} avatarUrl={avatarUrl} size="xs" />
    </div>
  );
}
