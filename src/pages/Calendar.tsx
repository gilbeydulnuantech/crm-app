import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CalendarEvent, CalendarViewMode } from '../types/event';
import { useEvents } from '../hooks/useEvents';
import CalendarStatsBar from '../components/calendar/CalendarStatsBar';
import CalendarLegend from '../components/calendar/CalendarLegend';
import MonthView from '../components/calendar/MonthView';
import WeekView from '../components/calendar/WeekView';
import { EventListView } from '../components/calendar/EventListView';
import TodayAndUpcoming from '../components/calendar/TodayAndUpcoming';
import EventDetailPanel from '../components/calendar/EventDetailPanel';
import EventFormModal from '../components/calendar/EventFormModal';
import SearchToolbar from '../components/SearchToolbar';

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
  const [viewMode, setViewMode] = useState<CalendarViewMode>('month');
  const [cursorDate, setCursorDate] = useState(new Date());
  const [search, setSearch] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);
  const [activeEvent, setActiveEvent] = useState<CalendarEvent | null>(null);
  const [addDefaultDate, setAddDefaultDate] = useState<Date | null>(null);

  // Always fetch a full month range regardless of view mode — keeps the
  // query cache simple and lets Week/Day/Agenda reuse the same fetched set.
  const rangeStart = startOfMonth(cursorDate);
  const rangeEnd = endOfMonth(cursorDate);
  const { data: allEvents = [], isLoading } = useEvents(toISODate(rangeStart), toISODate(rangeEnd));

  const visibleEvents = useMemo(() => {
    if (!search.trim()) return allEvents;
    const q = search.trim().toLowerCase();
    return allEvents.filter(
      (e) =>
        e.subject.toLowerCase().includes(q) ||
        e.contact_name?.toLowerCase().includes(q) ||
        e.company_name?.toLowerCase().includes(q)
    );
  }, [allEvents, search]);

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

  return (
    <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
      {/* Header */}
      <div className="px-4 py-4 flex items-center justify-between shrink-0 border-b border-slate-200">
        <h1 className="text-lg font-bold text-slate-800">Calendar</h1>
        <button
          onClick={() => openAddModal()}
          className="bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium px-3 py-1.5 rounded-lg flex items-center space-x-2 shadow-sm transition-all"
        >
          <i className="fa-solid fa-plus text-xs" />
          <span>New Event</span>
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

      <CalendarStatsBar events={allEvents} />

      {/* View toggle + search */}
      <SearchToolbar
        search={search}
        onSearchChange={setSearch}
        placeholder="Search events..."
        rightExtra={
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
        }
      />

      <CalendarLegend />

      {isLoading ? (
        <div className="flex-1 flex items-center justify-center text-sm text-slate-400">
          Loading events...
        </div>
      ) : (
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
            <EventListView
              events={dayEvents}
              onEventClick={setActiveEvent}
              emptyLabel="No events on this day."
            />
          )}
          {viewMode === 'agenda' && (
            <EventListView
              events={visibleEvents}
              onEventClick={setActiveEvent}
              emptyLabel="No events this month."
            />
          )}

          {viewMode === 'month' && <TodayAndUpcoming events={allEvents} onEventClick={setActiveEvent} />}
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
    </div>
  );
}
