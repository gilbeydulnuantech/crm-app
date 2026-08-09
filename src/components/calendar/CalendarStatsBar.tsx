import { useMemo } from 'react';
import { CalendarEvent } from '../../types/event';

export default function CalendarStatsBar({ events }: { events: CalendarEvent[] }) {
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

  const cards = [
    { label: 'Events Today', value: stats.today },
    { label: 'This Week', value: stats.thisWeek },
    { label: 'Inspections', value: stats.inspections },
    { label: 'Meetings', value: stats.meetings },
    { label: 'Overdue', value: stats.overdue, tone: 'text-rose-600' },
  ];

  return (
    <div className="px-4 pt-4 grid grid-cols-5 gap-3 shrink-0">
      {cards.map((c) => (
        <div key={c.label} className="border border-slate-200 rounded-lg p-3 text-center">
          <div className={`text-xl font-bold ${c.tone ?? 'text-slate-800'}`}>{c.value}</div>
          <div className="text-[11px] text-slate-500 uppercase tracking-wide">{c.label}</div>
        </div>
      ))}
    </div>
  );
}
