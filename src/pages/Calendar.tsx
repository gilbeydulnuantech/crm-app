import { useEffect, useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { CalendarEvent, CalendarViewMode, EVENT_TYPES, EventType } from '../types/event';
import { Opportunity } from '../types/opportunity';
import { useEvents } from '../hooks/useEvents';
import { useAllOpportunities, useAllStages, usePipelines, useUpdateOpportunity } from '../hooks/useOpportunities';
import { useUsers } from '../hooks/useContacts';
import { useCompanyProfile } from '../hooks/useCompanyProfile';
import { useAddNote } from '../hooks/useNotes';
import { useAddTask } from '../hooks/useTasks';
import { useResources } from '../hooks/useResources';
import { useAuth } from '../context/AuthContext';
import CalendarTabs from '../components/calendar/CalendarTabs';
import CalendarStatsBar, { CalendarStatFilter, STAT_FILTER_LABELS } from '../components/calendar/CalendarStatsBar';
import CalendarLegend from '../components/calendar/CalendarLegend';
import MonthView from '../components/calendar/MonthView';
import WeekView from '../components/calendar/WeekView';
import { EventListView } from '../components/calendar/EventListView';
import DealMonthView from '../components/calendar/DealMonthView';
import DealWeekView from '../components/calendar/DealWeekView';
import DealListView from '../components/calendar/DealListView';
import EventDetailModal from '../components/calendar/EventDetailModal';
import EventQuickView from '../components/calendar/EventQuickView';
import EventFormModal from '../components/calendar/EventFormModal';
import DealQuickView from '../components/pipeline/DealQuickView';
import DealDetailModal from '../components/pipeline/DealDetailModal';
import DealFormModal from '../components/pipeline/DealFormModal';
import MarkLostModal, { MarkLostResult } from '../components/pipeline/MarkLostModal';
import SearchToolbar from '../components/SearchToolbar';

const CLOSED_LOST_STAGE = /lost/i;

type CalendarMode = 'events' | 'deals';

// 'deals' is still the internal mode/data name (Opportunity records), but
// the tab reads "Pipeline" to match the rest of the app's terminology.
const MODE_LABELS: Record<CalendarMode, string> = { events: 'Events', deals: 'Pipeline' };

function startOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}
function endOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59);
}
function startOfWeek(d: Date) {
  const copy = new Date(d);
  copy.setDate(d.getDate() - d.getDay());
  copy.setHours(0, 0, 0, 0);
  return copy;
}
function toISODate(d: Date) {
  return d.toISOString().slice(0, 10);
}

const DEFAULT_RESOURCE_COLOR = '#CBD5E1';

export default function Calendar() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user, isAdmin } = useAuth();
  const [mode, setMode] = useState<CalendarMode>('events');
  const [viewMode, setViewMode] = useState<CalendarViewMode>('week');
  const [cursorDate, setCursorDate] = useState(new Date());
  const [search, setSearch] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);
  const [activeEvent, setActiveEvent] = useState<CalendarEvent | null>(null);
  const [quickViewEvent, setQuickViewEvent] = useState<CalendarEvent | null>(null);
  const [addDefaultDate, setAddDefaultDate] = useState<Date | null>(null);
  const [highlightEventId, setHighlightEventId] = useState<number | null>(null);

  const [quickViewDeal, setQuickViewDeal] = useState<Opportunity | null>(null);
  const [detailDeal, setDetailDeal] = useState<Opportunity | null>(null);
  const [lostDeal, setLostDeal] = useState<Opportunity | null>(null);
  const [dealFormOpen, setDealFormOpen] = useState(false);
  const [editingDeal, setEditingDeal] = useState<Opportunity | null>(null);

  // Overlay controls (sidebar) — defaults to just the dispatcher's own
  // schedule, matching "Sarah's schedule is currently active" being an
  // opt-in overlay rather than everyone being shown at once.
  const [checkedUserIds, setCheckedUserIds] = useState<Set<number>>(() => new Set(user ? [user.id] : []));
  const [checkedResourceIds, setCheckedResourceIds] = useState<Set<number>>(new Set());
  const [visibleTypes, setVisibleTypes] = useState<EventType[]>([...EVENT_TYPES]);
  const [statFilter, setStatFilter] = useState<CalendarStatFilter | null>(null);

  const { data: users = [] } = useUsers();
  const { data: companyProfile } = useCompanyProfile();
  const crmTimezone = companyProfile?.timezone || undefined;
  const { data: resources = [] } = useResources();
  const resourceColorById = useMemo(
    () => new Map(resources.map((r) => [r.id, r.color || DEFAULT_RESOURCE_COLOR])),
    [resources]
  );

  // Always fetch a full month range regardless of view mode — keeps the
  // query cache simple and lets Week/Day/Agenda reuse the same fetched set.
  const rangeStart = startOfMonth(cursorDate);
  const rangeEnd = endOfMonth(cursorDate);
  const { data: allEvents = [], isLoading: eventsLoading } = useEvents(toISODate(rangeStart), toISODate(rangeEnd));

  // get-opportunities is per-pipeline — fan out across every pipeline so
  // "all deals" really means all of them, not just the default pipeline.
  const { data: pipelines = [] } = usePipelines();
  const pipelineIds = useMemo(() => pipelines.map((p) => p.id), [pipelines]);
  const activePipelineIds = mode === 'deals' ? pipelineIds : [];
  const { data: allDealsRaw = [], isLoading: dealsLoading } = useAllOpportunities(activePipelineIds);
  const { data: allStages = [] } = useAllStages(activePipelineIds);

  const stagesById = useMemo(() => new Map(allStages.map((s) => [s.id, s])), [allStages]);

  const qc = useQueryClient();
  // Calendar deals span every pipeline, so this instance isn't scoped to one
  // ['opportunities', id] cache entry — invalidate broadly (all pipelines)
  // after each mutation instead.
  const updateOpportunity = useUpdateOpportunity(undefined);
  const addLostDealNote = useAddNote('opportunity', lostDeal?.id ?? null);
  const addTask = useAddTask();

  useEffect(() => {
    if (!updateOpportunity.isSuccess) return;
    qc.invalidateQueries({ queryKey: ['opportunities'] });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [updateOpportunity.isSuccess]);

  // Only deals with an expected close date can be placed on the calendar.
  const allDeals = useMemo(() => allDealsRaw.filter((d) => !!d.expected_close), [allDealsRaw]);

  // Once a mode has successfully loaded once, never show the full-page
  // "Loading..." state for it again — the 15s background poll (global
  // default) can flip isLoading true again mid-session even with cached
  // data present, which was blanking the whole grid every cycle instead of
  // updating it in place. Background refreshes should be invisible.
  const [eventsEverLoaded, setEventsEverLoaded] = useState(false);
  const [dealsEverLoaded, setDealsEverLoaded] = useState(false);
  useEffect(() => {
    if (!eventsLoading) setEventsEverLoaded(true);
  }, [eventsLoading]);
  useEffect(() => {
    if (!dealsLoading) setDealsEverLoaded(true);
  }, [dealsLoading]);

  const isLoading = mode === 'events' ? eventsLoading && !eventsEverLoaded : dealsLoading && !dealsEverLoaded;

  function toggleUser(id: number) {
    setCheckedUserIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function toggleResource(id: number) {
    setCheckedResourceIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function toggleAllUsers() {
    setCheckedUserIds((prev) =>
      users.length > 0 && users.every((u) => prev.has(u.id)) ? new Set() : new Set(users.map((u) => u.id))
    );
  }

  // Idempotent, unlike toggleAllUsers — clicking the "All Events" tab
  // again should keep showing everyone, not clear back to nothing the way
  // the "All Team Members" checkbox's toggle behavior does.
  function selectAllUsers() {
    setCheckedUserIds(new Set(users.map((u) => u.id)));
  }

  function selectOnlyMe() {
    setCheckedUserIds(new Set(user ? [user.id] : []));
  }

  function toggleAllResources() {
    setCheckedResourceIds((prev) =>
      resources.length > 0 && resources.every((r) => prev.has(r.id))
        ? new Set()
        : new Set(resources.map((r) => r.id))
    );
  }

  function toggleType(type: EventType) {
    setVisibleTypes((prev) => (prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]));
  }

  function selectStatFilter(filter: CalendarStatFilter) {
    if (statFilter === filter) {
      setStatFilter(null);
      if (filter === 'today' || filter === 'week') setViewMode('month');
      return;
    }
    setStatFilter(filter);
    if (filter === 'today') {
      setCursorDate(new Date());
      setViewMode('day');
    } else if (filter === 'week') {
      setCursorDate(new Date());
      setViewMode('week');
    }
  }

  // Sidebar overlay (Team Members checked + Resources checked) + legend
  // type toggles, applied before search/stat-card filters — this is also
  // what stat counts and the Today/Upcoming sidebar are computed from, so
  // everything on screen stays consistent with what's actually overlaid.
  const overlayFilteredEvents = useMemo(() => {
    return allEvents.filter((e) => {
      if (!visibleTypes.includes(e.type)) return false;
      if (e.user_id == null) return true; // unassigned — nobody to toggle it under
      const byUser = checkedUserIds.has(e.user_id);
      const byResource = (e.resources ?? []).some((r) => checkedResourceIds.has(r.id));
      return byUser || byResource;
    });
  }, [allEvents, visibleTypes, checkedUserIds, checkedResourceIds]);

  const visibleEvents = useMemo(() => {
    let list = overlayFilteredEvents;

    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(
        (e) =>
          e.subject.toLowerCase().includes(q) ||
          e.contact_name?.toLowerCase().includes(q) ||
          e.company_name?.toLowerCase().includes(q)
      );
    }

    if (statFilter) {
      const now = new Date();
      if (statFilter === 'today') {
        const today = now.toDateString();
        list = list.filter((e) => new Date(e.due_at).toDateString() === today);
      } else if (statFilter === 'week') {
        // Matches the Sun–Sat week the grid actually shows, not a rolling
        // "next 7 days" from right now — same range CalendarStatsBar counts.
        const weekStart = startOfWeek(cursorDate);
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekStart.getDate() + 7);
        list = list.filter((e) => {
          const d = new Date(e.due_at);
          return d >= weekStart && d < weekEnd;
        });
      } else if (statFilter === 'inspections') {
        list = list.filter((e) => e.type === 'inspection');
      } else if (statFilter === 'meetings') {
        list = list.filter((e) => e.type === 'meeting');
      } else if (statFilter === 'overdue') {
        list = list.filter((e) => !e.is_completed && new Date(e.due_at) < now);
      }
    }

    return list;
  }, [overlayFilteredEvents, search, statFilter, cursorDate]);

  // Deep link from ContactDetailModal's/CompanyDetailModal's "View Event" —
  // ?highlight=<eventId> jumps to Month view on the event's own month
  // (?date= carries that, since get-events is range-scoped and we can't
  // know the date without fetching first) and rings the card once it's
  // actually on screen.
  useEffect(() => {
    const highlightParam = searchParams.get('highlight');
    if (!highlightParam) return;
    const dateParam = searchParams.get('date');
    setMode('events');
    setViewMode('month');
    if (dateParam) setCursorDate(new Date(dateParam));
    setHighlightEventId(Number(highlightParam));
    const next = new URLSearchParams(searchParams);
    next.delete('highlight');
    next.delete('date');
    setSearchParams(next, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  // Overrides the default "just my schedule" sidebar overlay so a
  // colleague's event isn't silently hidden while a highlight is pending.
  // Split out from the effect above because selectAllUsers() reads `users`
  // from its closure — calling it there would run before useUsers() has
  // resolved on first mount (users still []), locking in an EMPTY checked
  // set that hides every assigned event until the sidebar is toggled by
  // hand. Depending on `users` here lets it fire once the team list is
  // actually loaded, however long that takes.
  useEffect(() => {
    if (highlightEventId == null || users.length === 0) return;
    selectAllUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [highlightEventId, users]);

  useEffect(() => {
    if (highlightEventId == null) return;
    if (!visibleEvents.some((e) => e.id === highlightEventId)) return;
    document
      .getElementById(`event-card-${highlightEventId}`)
      ?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    const t = setTimeout(() => setHighlightEventId(null), 3000);
    return () => clearTimeout(t);
  }, [highlightEventId, visibleEvents]);

  const weekEvents = useMemo(() => {
    const start = startOfWeek(cursorDate);
    const end = new Date(start);
    end.setDate(start.getDate() + 7);
    return visibleEvents.filter((e) => {
      const d = new Date(e.due_at);
      return d >= start && d < end;
    });
  }, [visibleEvents, cursorDate]);

  const dayEvents = useMemo(
    () => visibleEvents.filter((e) => new Date(e.due_at).toDateString() === cursorDate.toDateString()),
    [visibleEvents, cursorDate]
  );

  // Same opt-in overlay as Events — a deal only shows once its owner
  // (assigned_user) is checked under Team Members in the sidebar.
  const overlayFilteredDeals = useMemo(() => {
    return allDeals.filter((d) => {
      if (d.assigned_user == null) return true; // unassigned — nobody to toggle it under
      return checkedUserIds.has(d.assigned_user);
    });
  }, [allDeals, checkedUserIds]);

  const visibleDeals = useMemo(() => {
    if (!search.trim()) return overlayFilteredDeals;
    const q = search.trim().toLowerCase();
    return overlayFilteredDeals.filter(
      (d) =>
        d.name.toLowerCase().includes(q) ||
        d.contact_name?.toLowerCase().includes(q) ||
        d.company_name?.toLowerCase().includes(q)
    );
  }, [overlayFilteredDeals, search]);

  const weekDeals = useMemo(() => {
    const start = startOfWeek(cursorDate);
    const end = new Date(start);
    end.setDate(start.getDate() + 7);
    return visibleDeals.filter((d) => {
      const dt = new Date(d.expected_close!);
      return dt >= start && dt < end;
    });
  }, [visibleDeals, cursorDate]);

  const dayDeals = useMemo(
    () => visibleDeals.filter((d) => new Date(d.expected_close!).toDateString() === cursorDate.toDateString()),
    [visibleDeals, cursorDate]
  );

  function openAddModal(date?: Date) {
    setEditingEvent(null);
    setAddDefaultDate(date ?? cursorDate);
    setFormOpen(true);
  }

  function openEditModal(event: CalendarEvent) {
    setActiveEvent(null);
    setEditingEvent(event);
    setFormOpen(true);
  }

  function openAddDeal() {
    setEditingDeal(null);
    setDealFormOpen(true);
  }

  function openEditDeal(deal: Opportunity) {
    setEditingDeal(deal);
    setDealFormOpen(true);
  }

  function handleMarkDealWon(deal: Opportunity) {
    updateOpportunity.mutate({ id: deal.id, payload: { status: 'Won', closed_at: new Date().toISOString() } });
  }

  function handleConfirmMarkLost({ reason, competitor, details, followUp }: MarkLostResult) {
    if (!lostDeal) return;

    const lostStage = allStages.find(
      (s) => s.pipeline_id === lostDeal.pipeline_id && CLOSED_LOST_STAGE.test(s.name)
    );

    updateOpportunity.mutate({
      id: lostDeal.id,
      payload: {
        status: 'Lost',
        closed_at: new Date().toISOString(),
        lost_reason: reason,
        probability: 0,
        ...(lostStage ? { stage_id: lostStage.id } : {}),
      },
    });

    const noteBody = [competitor && `Competitor: ${competitor}`, details].filter(Boolean).join('\n');
    if (noteBody) {
      addLostDealNote.mutate({ body: noteBody, requesterId: user?.id });
    }

    if (followUp) {
      addTask.mutate({
        subject: `Re-engage: ${lostDeal.name}`,
        contact_id: lostDeal.contact_id,
        opportunity_id: lostDeal.id,
        user_id: followUp.assignedUserId,
        due_at: new Date(`${followUp.date}T09:00`).toISOString(),
        task_type: 'Follow-up',
      });
    }

    setLostDeal(null);
  }

  function goToday() {
    setCursorDate(new Date());
  }

  function goPrev() {
    const d = new Date(cursorDate);
    if (viewMode === 'month') d.setMonth(d.getMonth() - 1);
    else if (viewMode === 'week') d.setDate(d.getDate() - 7);
    else d.setDate(d.getDate() - 1);
    setCursorDate(d);
  }

  function goNext() {
    const d = new Date(cursorDate);
    if (viewMode === 'month') d.setMonth(d.getMonth() + 1);
    else if (viewMode === 'week') d.setDate(d.getDate() + 7);
    else d.setDate(d.getDate() + 1);
    setCursorDate(d);
  }

  const defaultPipelineId = pipelines.find((p) => p.is_default)?.id ?? pipelines[0]?.id;

  return (
    <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
      {/* Header: title + month/year + stats, then nav + add button */}
      <div className="px-4 py-3 flex items-center gap-4 shrink-0 border-b border-slate-200">
        <div className="flex items-center gap-3 min-w-0">
          <h1 className="text-lg font-bold text-slate-800 shrink-0">Calendar</h1>
          <span className="text-slate-300 shrink-0">|</span>
          <h2 className="text-sm font-semibold text-slate-700 shrink-0">
            {cursorDate.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}
          </h2>
          {mode === 'events' && (
            <CalendarStatsBar
              events={overlayFilteredEvents}
              weekStart={startOfWeek(cursorDate)}
              activeFilter={statFilter}
              onSelect={selectStatFilter}
            />
          )}
        </div>
        <div className="flex-1" />
        <button
          onClick={() => (mode === 'events' ? openAddModal() : openAddDeal())}
          className="bg-[var(--theme-accent)] hover:bg-[var(--theme-accent-hover)] text-white text-sm font-medium px-3 py-1.5 rounded-lg flex items-center space-x-2 shadow-sm transition-all shrink-0"
        >
          <i className="fa-solid fa-plus text-xs" />
          <span>{mode === 'events' ? 'New Event' : 'New Deal'}</span>
        </button>
      </div>

      <CalendarTabs
        users={users}
        resources={resources}
        currentUserId={user?.id}
        isAdmin={isAdmin}
        checkedUserIds={checkedUserIds}
        checkedResourceIds={checkedResourceIds}
        onToggleUser={toggleUser}
        onToggleResource={toggleResource}
        onToggleAllUsers={toggleAllUsers}
        onToggleAllResources={toggleAllResources}
        onSelectAllUsers={selectAllUsers}
        onSelectOnlyMe={selectOnlyMe}
        endExtra={
          <>
            <button onClick={goPrev} className="text-xs font-medium text-slate-600 hover:bg-slate-100 px-2 py-1 rounded">
              &#9664; Previous
            </button>
            <button onClick={goToday} className="text-xs font-medium text-slate-600 hover:bg-slate-100 px-2 py-1 rounded">
              Today
            </button>
            <button onClick={goNext} className="text-xs font-medium text-slate-600 hover:bg-slate-100 px-2 py-1 rounded">
              Next &#9654;
            </button>
          </>
        }
      />

      {/* Events/Deals toggle + view toggle + search */}
      <SearchToolbar
        search={search}
        onSearchChange={setSearch}
        placeholder={mode === 'events' ? 'Search events...' : 'Search deals...'}
        rightExtra={
          statFilter && (
            <span className="flex items-center gap-1.5 text-xs font-medium text-indigo-700 bg-indigo-50 border border-indigo-200 rounded-full px-2.5 py-1">
              Filter: {STAT_FILTER_LABELS[statFilter]}
              <button onClick={() => setStatFilter(null)} className="hover:text-indigo-900">
                <i className="fa-solid fa-xmark text-[10px]" />
              </button>
            </span>
          )
        }
        endExtra={
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 border border-slate-200 rounded-md p-0.5 bg-slate-50">
              {(['events', 'deals'] as CalendarMode[]).map((m) => (
                <button
                  key={m}
                  onClick={() => setMode(m)}
                  className={`px-2.5 py-1 text-xs font-semibold rounded ${
                    mode === m ? 'bg-white shadow-sm text-slate-700' : 'text-slate-500'
                  }`}
                >
                  {MODE_LABELS[m]}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-1 border border-slate-200 rounded-md p-0.5 bg-slate-50">
              {(['month', 'week', 'day', 'agenda'] as CalendarViewMode[]).map((m) => (
                <button
                  key={m}
                  onClick={() => setViewMode(m)}
                  className={`px-2.5 py-1 text-xs font-semibold rounded capitalize ${
                    viewMode === m ? 'bg-white shadow-sm text-slate-700' : 'text-slate-500'
                  }`}
                >
                  {m}
                </button>
              ))}
            </div>
          </div>
        }
      />

      {mode === 'events' && <CalendarLegend visibleTypes={visibleTypes} onToggle={toggleType} />}

      {isLoading ? (
        <div className="flex-1 flex items-center justify-center text-sm text-slate-400">
          {mode === 'events' ? 'Loading events...' : 'Loading deals...'}
        </div>
      ) : mode === 'events' ? (
        <>
          {viewMode === 'month' && (
            <MonthView
              monthDate={cursorDate}
              events={visibleEvents}
              checkedResourceIds={checkedResourceIds}
              resourceColorById={resourceColorById}
              onEventClick={setQuickViewEvent}
              onDayClick={(date) => openAddModal(date)}
              highlightEventId={highlightEventId}
            />
          )}
          {viewMode === 'week' && (
            <WeekView
              weekStart={startOfWeek(cursorDate)}
              events={weekEvents}
              checkedResourceIds={checkedResourceIds}
              resourceColorById={resourceColorById}
              onEventClick={setQuickViewEvent}
              timezone={crmTimezone}
            />
          )}
          {viewMode === 'day' && (
            <EventListView
              events={dayEvents}
              checkedResourceIds={checkedResourceIds}
              resourceColorById={resourceColorById}
              onEventClick={setQuickViewEvent}
              emptyLabel="No events on this day."
              timezone={crmTimezone}
            />
          )}
          {viewMode === 'agenda' && (
            <EventListView
              events={visibleEvents}
              checkedResourceIds={checkedResourceIds}
              resourceColorById={resourceColorById}
              onEventClick={setQuickViewEvent}
              emptyLabel="No events this month."
              timezone={crmTimezone}
            />
          )}
        </>
      ) : (
        <>
          {viewMode === 'month' && (
            <DealMonthView monthDate={cursorDate} deals={visibleDeals} onDealClick={setQuickViewDeal} />
          )}
          {viewMode === 'week' && (
            <DealWeekView
              weekStart={startOfWeek(cursorDate)}
              deals={weekDeals}
              stagesById={stagesById}
              onDealClick={setQuickViewDeal}
            />
          )}
          {viewMode === 'day' && (
            <DealListView
              deals={dayDeals}
              stagesById={stagesById}
              onDealClick={setQuickViewDeal}
              emptyLabel="No deals closing this day."
            />
          )}
          {viewMode === 'agenda' && (
            <DealListView
              deals={visibleDeals}
              stagesById={stagesById}
              onDealClick={setQuickViewDeal}
              emptyLabel="No deals closing this month."
            />
          )}
        </>
      )}

      <EventFormModal
        open={formOpen}
        event={editingEvent}
        defaultDate={addDefaultDate}
        onClose={() => setFormOpen(false)}
      />

      <EventQuickView
        event={quickViewEvent}
        onClose={() => setQuickViewEvent(null)}
        onViewFullDetails={(event) => {
          setQuickViewEvent(null);
          setActiveEvent(event);
        }}
        onEdit={(event) => {
          setQuickViewEvent(null);
          openEditModal(event);
        }}
        isAdmin={isAdmin}
        currentUserId={user?.id}
        timezone={crmTimezone}
      />

      <EventDetailModal
        event={activeEvent}
        onClose={() => setActiveEvent(null)}
        onEdit={openEditModal}
        onOpenContact={(contactId) => {
          setActiveEvent(null);
          navigate(`/contacts?contactId=${contactId}`);
        }}
        onOpenCompany={(companyId) => {
          setActiveEvent(null);
          navigate(`/companies?companyId=${companyId}`);
        }}
        onOpenOpportunity={(opportunityId) => {
          setActiveEvent(null);
          navigate(`/pipeline?highlight=${opportunityId}`);
        }}
        isAdmin={isAdmin}
        currentUserId={user?.id}
        timezone={crmTimezone}
      />

      <DealQuickView
        deal={quickViewDeal}
        stages={allStages}
        isAdmin={isAdmin}
        currentUserId={user?.id}
        onClose={() => setQuickViewDeal(null)}
        onEdit={(deal) => {
          setQuickViewDeal(null);
          openEditDeal(deal);
        }}
        onMarkWon={handleMarkDealWon}
        onMarkLost={(deal) => {
          setQuickViewDeal(null);
          setLostDeal(deal);
        }}
        onOpenFullDetails={(deal) => {
          setQuickViewDeal(null);
          setDetailDeal(deal);
        }}
      />

      <DealDetailModal
        deal={detailDeal}
        stages={allStages}
        stagesById={stagesById}
        isAdmin={isAdmin}
        currentUserId={user?.id}
        onClose={() => setDetailDeal(null)}
        onEdit={(deal) => {
          setDetailDeal(null);
          openEditDeal(deal);
        }}
        onMarkWon={handleMarkDealWon}
        onMarkLost={(deal) => {
          setDetailDeal(null);
          setLostDeal(deal);
        }}
      />

      <MarkLostModal
        open={!!lostDeal}
        dealName={lostDeal?.name}
        dealValue={lostDeal?.deal_value}
        onConfirm={handleConfirmMarkLost}
        onCancel={() => setLostDeal(null)}
        isSubmitting={updateOpportunity.isPending}
      />

      {defaultPipelineId && (
        <DealFormModal
          open={dealFormOpen}
          opportunity={editingDeal}
          pipelineId={editingDeal?.pipeline_id ?? defaultPipelineId}
          onClose={() => setDealFormOpen(false)}
        />
      )}
    </div>
  );
}
