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
  activeFilter: CalendarStatFilter | null;
  onSelect: (filter: CalendarStatFilter) => void;
}

export default function CalendarStatsBar({ events, activeFilter, onSelect }: Props) {
  const stats = useMemo(() => {
    const today = new Date().toDateString();
    const now = new Date();
    const weekFromNow = new Date();
    weekFromNow.setDate(now.getDate() + 7);

    const eventsToday = events.filter((e) => new Date(e.due_at).toDateString() === today);
    const thisWeek = events.filter((e) => {
      const d = new Date(e.due_at);
      return d >= now && d <= weekFromNow;
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
  }, [events]);

  const cards: { filter: CalendarStatFilter; label: string; value: number; tone?: string }[] = [
    { filter: 'today', label: 'Events Today', value: stats.today },
    { filter: 'week', label: 'This Week', value: stats.thisWeek },
    { filter: 'inspections', label: 'Inspections', value: stats.inspections },
    { filter: 'meetings', label: 'Meetings', value: stats.meetings },
    { filter: 'overdue', label: 'Overdue', value: stats.overdue, tone: 'text-rose-600' },
  ];

  return (
    <div className="px-4 pt-4 grid grid-cols-5 gap-3 shrink-0">
      {cards.map((c) => {
        const isActive = activeFilter === c.filter;
        return (
          <button
            key={c.label}
            onClick={() => onSelect(c.filter)}
            title={`Filter to ${c.label}`}
            className={`border rounded-lg p-3 text-center cursor-pointer transition-all hover:shadow-md hover:-translate-y-0.5 ${
              isActive
                ? 'border-indigo-400 ring-2 ring-indigo-100 bg-indigo-50/50'
                : 'border-slate-200 hover:border-slate-300'
            }`}
          >
            <div className={`text-xl font-bold ${c.tone ?? 'text-slate-800'}`}>{c.value}</div>
            <div className="text-[11px] text-slate-500 uppercase tracking-wide">{c.label}</div>
          </button>
        );
      })}
    </div>
  );
}
