import { useMemo } from 'react';
import { CalendarEvent, EVENT_TYPE_META } from '../../types/event';

interface Props {
  events: CalendarEvent[];
  onEventClick: (event: CalendarEvent) => void;
}

export default function TodayAndUpcoming({ events, onEventClick }: Props) {
  const { todayEvents, upcomingByDay } = useMemo(() => {
    const today = new Date();
    const todayStr = today.toDateString();

    const todayEvents = events
      .filter((e) => new Date(e.due_at).toDateString() === todayStr)
      .sort((a, b) => new Date(a.due_at).getTime() - new Date(b.due_at).getTime());

    const upcoming = events
      .filter((e) => new Date(e.due_at) > today && new Date(e.due_at).toDateString() !== todayStr)
      .sort((a, b) => new Date(a.due_at).getTime() - new Date(b.due_at).getTime())
      .slice(0, 8);

    const upcomingByDay = new Map<string, CalendarEvent[]>();
    upcoming.forEach((e) => {
      const label = new Date(e.due_at).toLocaleDateString(undefined, { weekday: 'long' });
      if (!upcomingByDay.has(label)) upcomingByDay.set(label, []);
      upcomingByDay.get(label)!.push(e);
    });

    return { todayEvents, upcomingByDay };
  }, [events]);

  return (
    <div className="grid grid-cols-2 gap-4 px-4 pb-4">
      {/* Today's Schedule */}
      <div className="border border-slate-200 rounded-xl p-4">
        <h3 className="text-sm font-semibold text-slate-800 mb-3">Today's Schedule</h3>
        {todayEvents.length === 0 ? (
          <p className="text-xs text-slate-400">Nothing scheduled today.</p>
        ) : (
          <div className="space-y-2">
            {todayEvents.map((e) => (
              <div
                key={e.id}
                onClick={() => onEventClick(e)}
                className="flex items-center gap-2 text-sm cursor-pointer hover:bg-slate-50 rounded px-1.5 py-1"
              >
                <span className={`w-2 h-2 rounded-full shrink-0 ${EVENT_TYPE_META[e.type]?.dot ?? 'bg-slate-400'}`} />
                <span className="w-16 text-xs text-slate-500 shrink-0">
                  {new Date(e.due_at).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}
                </span>
                <span className="flex-1 truncate text-slate-700">{e.subject}</span>
                {e.assigned_user_name && (
                  <span className="text-xs text-slate-400 shrink-0">{e.assigned_user_name}</span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Upcoming */}
      <div className="border border-slate-200 rounded-xl p-4">
        <h3 className="text-sm font-semibold text-slate-800 mb-3">Upcoming</h3>
        {upcomingByDay.size === 0 ? (
          <p className="text-xs text-slate-400">Nothing upcoming.</p>
        ) : (
          <div className="space-y-3">
            {Array.from(upcomingByDay.entries()).map(([day, dayEvents]) => (
              <div key={day}>
                <div className="text-xs font-semibold text-slate-500 mb-1">{day}</div>
                {dayEvents.map((e) => (
                  <div
                    key={e.id}
                    onClick={() => onEventClick(e)}
                    className="text-sm text-slate-700 pl-3 cursor-pointer hover:text-indigo-600"
                  >
                    &bull; {e.subject}
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
