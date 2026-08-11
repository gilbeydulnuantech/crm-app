import { useMemo } from 'react';
import { CalendarEvent } from '../../types/event';

export type CalendarStatFilter = 'today' | 'week' | 'inspections' | 'meetings' | 'overdue';

export const STAT_FILTER_LABELS: Record<CalendarStatFilter, string> = {
  today: 'Today',
  week: 'This Week',
  inspections: 'Inspections',
  meetings: 'Meetings',
  overdue: 'Overdue',
};

interface Props {
  events: CalendarEvent[];
  // The Sun–Sat week currently shown in Week view — "This Week" counts
  // against this range, not a rolling "next 7 days" from right now, so the
  // stat always matches what Previous/Next/the grid actually display.
  weekStart: Date;
  activeFilter: CalendarStatFilter | null;
  onSelect: (filter: CalendarStatFilter) => void;
}

export default function CalendarStatsBar({ events, weekStart, activeFilter, onSelect }: Props) {
  const stats = useMemo(() => {
    const today = new Date().toDateString();
    const now = new Date();
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 7);

    const eventsToday = events.filter((e) => new Date(e.due_at).toDateString() === today);
    const thisWeek = events.filter((e) => {
      const d = new Date(e.due_at);
      return d >= weekStart && d < weekEnd;
    });
    const inspections = events.filter((e) => e.type === 'inspection').length;
    const meetings = events.filter((e) => e.type === 'meeting').length;
    const overdue = events.filter((e) => !e.is_completed && new Date(e.due_at) < now).length;

    return {
      today: eventsToday.length,
      thisWeek: thisWeek.length,
      inspections,
      meetings,
      overdue,
    };
  }, [events, weekStart]);

  const cards: { filter: CalendarStatFilter; label: string; value: number; tone?: string }[] = [
    { filter: 'today', label: 'Events Today', value: stats.today },
    { filter: 'week', label: 'This Week', value: stats.thisWeek },
    { filter: 'inspections', label: 'Inspections', value: stats.inspections },
    { filter: 'meetings', label: 'Meetings', value: stats.meetings },
    { filter: 'overdue', label: 'Overdue', value: stats.overdue, tone: 'text-rose-600' },
  ];

  return (
    <div className="flex items-center gap-1.5">
      {cards.map((c) => {
        const isActive = activeFilter === c.filter;
        return (
          <button
            key={c.label}
            onClick={() => onSelect(c.filter)}
            title={`Filter to ${c.label}`}
            className={`flex items-center gap-1 px-2 py-1 rounded-full border text-[11px] font-medium cursor-pointer transition-all hover:shadow-sm ${
              isActive
                ? 'border-indigo-400 ring-1 ring-indigo-100 bg-indigo-50 text-indigo-700'
                : 'border-slate-200 text-slate-600 hover:border-slate-300'
            }`}
          >
            <span className={`font-bold ${c.tone ?? (isActive ? 'text-indigo-700' : 'text-slate-800')}`}>
              {c.value}
            </span>
            {c.label}
          </button>
        );
      })}
    </div>
  );
}
