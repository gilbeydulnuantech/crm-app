import { useMemo } from 'react';
import { CalendarEvent, EVENT_TYPE_META } from '../../types/event';
import { matchedResourceColor } from '../../utils/calendarHighlight';

interface Props {
  weekStart: Date;
  events: CalendarEvent[];
  checkedResourceIds: Set<number>;
  resourceColorById: Map<number, string>;
  onEventClick: (event: CalendarEvent) => void;
  timezone?: string;
}

export default function WeekView({
  weekStart,
  events,
  checkedResourceIds,
  resourceColorById,
  onEventClick,
  timezone,
}: Props) {
  const days = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(weekStart);
      d.setDate(weekStart.getDate() + i);
      return d;
    });
  }, [weekStart]);

  const eventsByDay = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>();
    events.forEach((e) => {
      const key = new Date(e.due_at).toDateString();
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(e);
    });
    map.forEach((list) =>
      list.sort((a, b) => new Date(a.due_at).getTime() - new Date(b.due_at).getTime())
    );
    return map;
  }, [events]);

  return (
    <div className="flex-1 overflow-auto p-4">
      <div className="grid grid-cols-7 gap-3">
        {days.map((day) => {
          const dayEvents = eventsByDay.get(day.toDateString()) ?? [];
          const isToday = day.toDateString() === new Date().toDateString();
          return (
            <div key={day.toISOString()} className="border border-slate-200 rounded-lg p-2 min-h-[300px]">
              <div className={`text-xs font-semibold mb-2 ${isToday ? 'text-[var(--theme-accent)]' : 'text-slate-600'}`}>
                {day.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric' })}
              </div>
              <div className="space-y-1">
                {dayEvents.map((e) => {
                  const highlight = matchedResourceColor(e, checkedResourceIds, resourceColorById);
                  return (
                    <div
                      key={e.id}
                      onClick={() => onEventClick(e)}
                      className={`text-[11px] px-1.5 py-1 rounded cursor-pointer ${EVENT_TYPE_META[e.type]?.color ?? 'bg-slate-100 text-slate-700'}`}
                      style={highlight ? { boxShadow: `inset 0 0 0 1.5px ${highlight}` } : undefined}
                    >
                      <div className="font-medium">
                        {new Date(e.due_at).toLocaleTimeString(undefined, {
                          hour: 'numeric',
                          minute: '2-digit',
                          timeZone: timezone,
                        })}
                      </div>
                      <div className="truncate">{e.subject}</div>
                    </div>
                  );
                })}
                {dayEvents.length === 0 && (
                  <div className="text-[10px] text-slate-300 text-center pt-4">No events</div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
