import { useEffect, useMemo, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { CalendarEvent, CalendarViewMode } from '../types/event';
import { useEventTypeLookup } from '../utils/eventTypes';
import CardDisplayPanel from '../components/CardDisplayPanel';
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
import MonthView from '../components/calendar/MonthView';
import WeekView from '../components/calendar/WeekView';
import DayView from '../components/calendar/DayView';
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
// The search box also stands in for the old type filter: "inspection", "phone call" or
// "meeting" match the event's type, as well as its title, contact and company.
function eventMatchesSearch(e: CalendarEvent, q: string, typeLabel: string) {
  return (
    e.subject.toLowerCase().includes(q) ||
    e.contact_name?.toLowerCase().includes(q) ||
    e.company_name?.toLowerCase().includes(q) ||
    e.staff_name?.toLowerCase().includes(q) ||
    typeLabel.toLowerCase().includes(q) ||
    e.type.replace(/_/g, ' ').includes(q)
  );
}
function toISODate(d: Date) {
  return d.toISOString().slice(0, 10);
}

const DEFAULT_RESOURCE_COLOR = '#CBD5E1';

const VIEW_ICONS: { view: CalendarViewMode; icon: string; label: string }[] = [
  { view: 'month', icon: 'fa-calendar', label: 'Month' },
  { view: 'week', icon: 'fa-calendar-week', label: 'Week' },
  { view: 'day', icon: 'fa-calendar-day', label: 'Day' },
  { view: 'agenda', icon: 'fa-list', label: 'Agenda' },
];

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
  const [addSlot, setAddSlot] = useState<{ time?: string; userId?: number; resourceId?: number }>({});
  const [highlightEventId, setHighlightEventId] = useState<number | null>(null);
  const [fullScreen, setFullScreen] = useState(false);
  const [dayColumnsOpen, setDayColumnsOpen] = useState(false);
  const [cardDisplayOpen, setCardDisplayOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

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
  const [statFilter, setStatFilter] = useState<CalendarStatFilter | null>(null);

  const typeOf = useEventTypeLookup();
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
  const { data: fetchedEvents = [], isLoading: eventsLoading } = useEvents(toISODate(rangeStart), toISODate(rangeEnd));
  // Tasks are activities with a due date too, but they live on the Tasks page, not the calendar.
  const allEvents = useMemo(() => fetchedEvents.filter((e) => e.type !== 'task'), [fetchedEvents]);

  // activeEvent is a snapshot passed to EventDetailModal — without this, a
  // mutation made inside the modal (Complete, Reschedule) invalidates and
  // refetches allEvents, but the modal keeps showing the stale snapshot, so
  // actions that clearly succeeded appear to do nothing.
  useEffect(() => {
    if (!activeEvent) return;
    const fresh = allEvents.find((e) => e.id === activeEvent.id);
    if (fresh && fresh !== activeEvent) setActiveEvent(fresh);
  }, [allEvents, activeEvent]);

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
      if (e.user_id == null) return true; // unassigned — nobody to toggle it under
      const byUser = checkedUserIds.has(e.user_id);
      const byResource = (e.resources ?? []).some((r) => checkedResourceIds.has(r.id));
      return byUser || byResource;
    });
  }, [allEvents, checkedUserIds, checkedResourceIds]);

  const visibleEvents = useMemo(() => {
    let list = overlayFilteredEvents;

    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter((e) => eventMatchesSearch(e, q, typeOf(e.type).label));
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

  // The Day view has its own Columns dialog, but unchecking a team member in the "All Events" dropdown still hides
  // that person's events (and their column), same as in the other views. Search applies on top.
  const dayColumnEvents = useMemo(() => {
    const q = search.trim().toLowerCase();
    return overlayFilteredEvents.filter((e) => {
      if (new Date(e.due_at).toDateString() !== cursorDate.toDateString()) return false;
      if (!q) return true;
      return eventMatchesSearch(e, q, typeOf(e.type).label);
    });
  }, [overlayFilteredEvents, cursorDate, search]);


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

  function openAddModal(date?: Date, slot?: { time?: string; userId?: number; resourceId?: number }) {
    setEditingEvent(null);
    setAddDefaultDate(date ?? cursorDate);
    setAddSlot(slot ?? {});
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

  // Real browser full screen where available; if the browser refuses (or lacks
  // the API) the fixed overlay class below still fills the window, with the
  // same button to leave it.
  useEffect(() => {
    function onChange() {
      if (!document.fullscreenElement) setFullScreen(false);
    }
    document.addEventListener('fullscreenchange', onChange);
    return () => {
      document.removeEventListener('fullscreenchange', onChange);
      if (document.fullscreenElement) document.exitFullscreen().catch(() => undefined);
    };
  }, []);

  async function toggleFullScreen() {
    if (fullScreen) {
      if (document.fullscreenElement) await document.exitFullscreen().catch(() => undefined);
      setFullScreen(false);
      return;
    }
    setFullScreen(true);
    try {
      await rootRef.current?.requestFullscreen?.();
    } catch {
      // overlay fallback already applied
    }
  }

  const isViewingToday = cursorDate.toDateString() === new Date().toDateString();

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
    <div
      ref={rootRef}
      className={`flex-1 flex flex-col min-h-0 overflow-hidden ${fullScreen ? 'fixed inset-0 z-[60] bg-white' : ''}`}
    >
      {/* Header: title + month/year + stats, then nav + add button */}
      <div className="px-4 py-3 flex flex-wrap items-center gap-x-4 gap-y-2 shrink-0 border-b border-slate-200">
        <div className="flex items-center gap-3 min-w-0">
          <h1 className="text-lg font-bold text-slate-800 shrink-0">Calendar</h1>
          <span className="text-slate-300 shrink-0">|</span>
          <h2 className="text-sm font-semibold text-slate-700 shrink-0">
            {cursorDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
          </h2>
          {mode === 'events' && (
            <CalendarStatsBar
              events={overlayFilteredEvents}
              weekStart={startOfWeek(cursorDate)}
              activeFilter={statFilter}
              onSelect={selectStatFilter}
            />
          )}
          <div className="flex items-center gap-1 border border-slate-200 rounded-md p-0.5 bg-slate-50 shrink-0">
            {VIEW_ICONS.map(({ view, icon, label }) => (
              <button
                key={view}
                onClick={() => setViewMode(view)}
                title={label}
                aria-label={label}
                aria-pressed={viewMode === view}
                className={`w-7 h-6 flex items-center justify-center rounded ${
                  viewMode === view ? 'bg-white shadow-sm text-slate-700' : 'text-slate-400 hover:text-slate-600'
                }`}
              >
                <i className={`fa-solid ${icon} text-xs`} />
              </button>
            ))}
          </div>
        </div>
        <div className="flex-1" />
        <div className="relative shrink-0">
          <button
            onClick={() => setCardDisplayOpen((v) => !v)}
            title="Card display (text size)"
            aria-label="Card display"
            className="w-8 h-8 flex items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 text-xs font-bold"
          >
            Aa
          </button>
          {cardDisplayOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setCardDisplayOpen(false)} />
              <div className="absolute right-0 top-full mt-1 z-20 w-64 bg-white border border-slate-200 rounded-xl shadow-lg p-4">
                <CardDisplayPanel />
              </div>
            </>
          )}
        </div>
        <button
          onClick={toggleFullScreen}
          title={fullScreen ? 'Exit full screen' : 'Full screen'}
          aria-label={fullScreen ? 'Exit full screen' : 'Full screen'}
          className="w-8 h-8 flex items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 shrink-0"
        >
          <i className={`fa-solid ${fullScreen ? 'fa-compress' : 'fa-expand'} text-xs`} />
        </button>
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
        startExtra={
          <div className="relative w-56 shrink-0">
            <i className="fa-solid fa-magnifying-glass absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={mode === 'events' ? 'Search events...' : 'Search deals...'}
              className="w-full pl-8 pr-8 py-1.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--theme-accent)]"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                title="Clear search"
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-300 hover:text-slate-500"
              >
                <i className="fa-solid fa-xmark text-xs" />
              </button>
            )}
          </div>
        }
        afterResources={
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
        }
        endExtra={
          <>
            {statFilter && (
              <span className="flex items-center gap-1.5 text-xs font-medium text-[var(--theme-accent-hover)] bg-[var(--theme-accent-tint)] border border-[var(--theme-accent-tint)] rounded-full px-2.5 py-1">
                Filter: {STAT_FILTER_LABELS[statFilter]}
                <button onClick={() => setStatFilter(null)} className="hover:text-[var(--theme-accent-hover)]">
                  <i className="fa-solid fa-xmark text-[10px]" />
                </button>
              </span>
            )}
            <button onClick={goPrev} className="text-xs font-medium text-slate-600 hover:bg-slate-100 px-2 py-1 rounded">
              &#9664; Previous
            </button>
            <button
              onClick={goToday}
              title={isViewingToday ? 'Today' : 'Back to today'}
              className={`px-2 py-1 rounded min-w-[3rem] hover:bg-slate-100 ${
                isViewingToday ? 'text-xs font-medium text-slate-600' : 'text-base font-bold text-slate-800 leading-none'
              }`}
            >
              {/* "Today" while you are on today; once you move, it shows the day of the month you are on (12, 13...). */}
              {isViewingToday ? 'Today' : cursorDate.getDate()}
            </button>
            <button onClick={goNext} className="text-xs font-medium text-slate-600 hover:bg-slate-100 px-2 py-1 rounded">
              Next &#9654;
            </button>
            {mode === 'events' && viewMode === 'day' && (
              <button
                onClick={() => setDayColumnsOpen(true)}
                title="Day view columns"
                aria-label="Day view columns"
                className="w-7 h-7 flex items-center justify-center rounded text-slate-500 hover:bg-slate-100 hover:text-slate-700"
              >
                <i className="fa-solid fa-table-columns text-xs" />
              </button>
            )}
          </>
        }
      />

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
            <DayView
              day={cursorDate}
              events={dayColumnEvents}
              users={users}
              visibleUserIds={checkedUserIds}
              resources={resources}
              checkedResourceIds={checkedResourceIds}
              resourceColorById={resourceColorById}
              onEventClick={setQuickViewEvent}
              timezone={crmTimezone}
              columnsOpen={dayColumnsOpen}
              onColumnsOpenChange={setDayColumnsOpen}
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
        defaultStartTime={addSlot.time}
        defaultUserId={addSlot.userId}
        defaultResourceId={addSlot.resourceId}
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
