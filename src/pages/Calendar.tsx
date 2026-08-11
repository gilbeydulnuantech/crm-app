import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CalendarEvent, CalendarViewMode, EVENT_TYPES, EventType } from '../types/event';
import { Opportunity } from '../types/opportunity';
import { useEvents } from '../hooks/useEvents';
import { useAllOpportunities, useAllStages, usePipelines } from '../hooks/useOpportunities';
import { useUsers } from '../hooks/useContacts';
import { useResources } from '../hooks/useResources';
import { useAuth } from '../context/AuthContext';
import CalendarSidebar from '../components/calendar/CalendarSidebar';
import CalendarStatsBar, { CalendarStatFilter, STAT_FILTER_LABELS } from '../components/calendar/CalendarStatsBar';
import CalendarLegend from '../components/calendar/CalendarLegend';
import MonthView from '../components/calendar/MonthView';
import WeekView from '../components/calendar/WeekView';
import { EventListView } from '../components/calendar/EventListView';
import DealMonthView from '../components/calendar/DealMonthView';
import DealWeekView from '../components/calendar/DealWeekView';
import DealListView from '../components/calendar/DealListView';
import TodayAndUpcoming from '../components/calendar/TodayAndUpcoming';
import EventDetailPanel from '../components/calendar/EventDetailPanel';
import EventFormModal from '../components/calendar/EventFormModal';
import DealDetailPanel from '../components/pipeline/DealDetailPanel';
import DealFormModal from '../components/pipeline/DealFormModal';
import SearchToolbar from '../components/SearchToolbar';

type CalendarMode = 'events' | 'deals';

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

export default function Calendar() {
  const navigate = useNavigate();
  const { user, isAdmin } = useAuth();
  const [mode, setMode] = useState<CalendarMode>('events');
  const [viewMode, setViewMode] = useState<CalendarViewMode>('month');
  const [cursorDate, setCursorDate] = useState(new Date());
  const [search, setSearch] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);
  const [activeEvent, setActiveEvent] = useState<CalendarEvent | null>(null);
  const [addDefaultDate, setAddDefaultDate] = useState<Date | null>(null);

  const [activeDeal, setActiveDeal] = useState<Opportunity | null>(null);
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
  const { data: resources = [] } = useResources();

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
  const stagesByPipelineId = useMemo(() => {
    const map = new Map<number, typeof allStages>();
    allStages.forEach((s) => {
      if (!map.has(s.pipeline_id)) map.set(s.pipeline_id, []);
      map.get(s.pipeline_id)!.push(s);
    });
    return map;
  }, [allStages]);

  // Only deals with an expected close date can be placed on the calendar.
  const allDeals = useMemo(() => allDealsRaw.filter((d) => !!d.expected_close), [allDealsRaw]);

  const isLoading = mode === 'events' ? eventsLoading : dealsLoading;

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

  function toggleType(type: EventType) {
    setVisibleTypes((prev) => (prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]));
  }

  function selectStatFilter(filter: CalendarStatFilter) {
    if (statFilter === filter) {
      setStatFilter(null);
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
        const weekFromNow = new Date();
        weekFromNow.setDate(now.getDate() + 7);
        list = list.filter((e) => {
          const d = new Date(e.due_at);
          return d >= now && d <= weekFromNow;
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
  }, [overlayFilteredEvents, search, statFilter]);

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

  const visibleDeals = useMemo(() => {
    if (!search.trim()) return allDeals;
    const q = search.trim().toLowerCase();
    return allDeals.filter(
      (d) =>
        d.name.toLowerCase().includes(q) ||
        d.contact_name?.toLowerCase().includes(q) ||
        d.company_name?.toLowerCase().includes(q)
    );
  }, [allDeals, search]);

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
    setActiveDeal(null);
    setEditingDeal(deal);
    setDealFormOpen(true);
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
    <div className="flex-1 flex min-h-0 overflow-hidden">
      <CalendarSidebar
        users={users}
        resources={resources}
        currentUserId={user?.id}
        isAdmin={isAdmin}
        checkedUserIds={checkedUserIds}
        checkedResourceIds={checkedResourceIds}
        onToggleUser={toggleUser}
        onToggleResource={toggleResource}
      />

      <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
        {/* Header */}
        <div className="px-4 py-4 flex items-center justify-between shrink-0 border-b border-slate-200">
          <h1 className="text-lg font-bold text-slate-800">Calendar</h1>
          <button
            onClick={() => (mode === 'events' ? openAddModal() : openAddDeal())}
            className="bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium px-3 py-1.5 rounded-lg flex items-center space-x-2 shadow-sm transition-all"
          >
            <i className="fa-solid fa-plus text-xs" />
            <span>{mode === 'events' ? 'New Event' : 'New Deal'}</span>
          </button>
        </div>

        {/* Month label + nav */}
        <div className="px-4 py-3 flex items-center justify-between shrink-0 border-b border-slate-200">
          <h2 className="text-sm font-semibold text-slate-700">
            {cursorDate.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}
          </h2>
          <div className="flex items-center gap-2">
            <button onClick={goPrev} className="text-xs font-medium text-slate-600 hover:bg-slate-100 px-2 py-1 rounded">
              &#9664; Previous
            </button>
            <button onClick={goToday} className="text-xs font-medium text-slate-600 hover:bg-slate-100 px-2 py-1 rounded">
              Today
            </button>
            <button onClick={goNext} className="text-xs font-medium text-slate-600 hover:bg-slate-100 px-2 py-1 rounded">
              Next &#9654;
            </button>
          </div>
        </div>

        {mode === 'events' && (
          <CalendarStatsBar events={overlayFilteredEvents} activeFilter={statFilter} onSelect={selectStatFilter} />
        )}

        {/* Events/Deals toggle + view toggle + search */}
        <SearchToolbar
          search={search}
          onSearchChange={setSearch}
          placeholder={mode === 'events' ? 'Search events...' : 'Search deals...'}
          rightExtra={
            <div className="flex items-center gap-2">
              {statFilter && (
                <span className="flex items-center gap-1.5 text-xs font-medium text-indigo-700 bg-indigo-50 border border-indigo-200 rounded-full px-2.5 py-1">
                  Filter: {STAT_FILTER_LABELS[statFilter]}
                  <button onClick={() => setStatFilter(null)} className="hover:text-indigo-900">
                    <i className="fa-solid fa-xmark text-[10px]" />
                  </button>
                </span>
              )}

              <div className="flex items-center gap-1 border border-slate-200 rounded-md p-0.5 bg-slate-50">
                {(['events', 'deals'] as CalendarMode[]).map((m) => (
                  <button
                    key={m}
                    onClick={() => setMode(m)}
                    className={`px-2.5 py-1 text-xs font-semibold rounded capitalize ${
                      mode === m ? 'bg-white shadow-sm text-slate-700' : 'text-slate-500'
                    }`}
                  >
                    {m}
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
                onEventClick={setActiveEvent}
                onDayClick={(date) => openAddModal(date)}
              />
            )}
            {viewMode === 'week' && (
              <WeekView weekStart={startOfWeek(cursorDate)} events={weekEvents} onEventClick={setActiveEvent} />
            )}
            {viewMode === 'day' && (
              <EventListView events={dayEvents} onEventClick={setActiveEvent} emptyLabel="No events on this day." />
            )}
            {viewMode === 'agenda' && (
              <EventListView events={visibleEvents} onEventClick={setActiveEvent} emptyLabel="No events this month." />
            )}

            {viewMode === 'month' && <TodayAndUpcoming events={overlayFilteredEvents} onEventClick={setActiveEvent} />}
          </>
        ) : (
          <>
            {viewMode === 'month' && (
              <DealMonthView monthDate={cursorDate} deals={visibleDeals} onDealClick={setActiveDeal} />
            )}
            {viewMode === 'week' && (
              <DealWeekView
                weekStart={startOfWeek(cursorDate)}
                deals={weekDeals}
                stagesById={stagesById}
                onDealClick={setActiveDeal}
              />
            )}
            {viewMode === 'day' && (
              <DealListView
                deals={dayDeals}
                stagesById={stagesById}
                onDealClick={setActiveDeal}
                emptyLabel="No deals closing this day."
              />
            )}
            {viewMode === 'agenda' && (
              <DealListView
                deals={visibleDeals}
                stagesById={stagesById}
                onDealClick={setActiveDeal}
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

        <EventDetailPanel
          event={activeEvent}
          onClose={() => setActiveEvent(null)}
          onEdit={openEditModal}
          onOpenContact={() => navigate('/contacts')}
          onOpenOpportunity={() => navigate('/pipeline')}
        />

        <DealDetailPanel
          opportunity={activeDeal}
          stages={activeDeal?.pipeline_id ? stagesByPipelineId.get(activeDeal.pipeline_id) ?? [] : []}
          pipelineId={activeDeal?.pipeline_id ?? defaultPipelineId ?? 0}
          onClose={() => setActiveDeal(null)}
          onEdit={openEditDeal}
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
    </div>
  );
}
