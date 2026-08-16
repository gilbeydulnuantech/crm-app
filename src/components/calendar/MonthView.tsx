import { useMemo } from 'react';
import { CalendarEvent, EVENT_TYPE_META } from '../../types/event';
import { matchedResourceColor } from '../../utils/calendarHighlight';

interface Props {
  monthDate: Date;
  events: CalendarEvent[];
  checkedResourceIds: Set<number>;
  resourceColorById: Map<number, string>;
  onEventClick: (event: CalendarEvent) => void;
  onDayClick: (date: Date) => void;
  highlightEventId?: number | null;
}

const WEEKDAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function isSameDay(a: Date, b: Date) {
  return a.toDateString() === b.toDateString();
}

export default function MonthView({
  monthDate,
  events,
  checkedResourceIds,
  resourceColorById,
  onEventClick,
  onDayClick,
  highlightEventId,
}: Props) {
  const cells = useMemo(() => {
    const year = monthDate.getFullYear();
    const month = monthDate.getMonth();
    const firstOfMonth = new Date(year, month, 1);
    const startOffset = firstOfMonth.getDay(); // 0 = Sunday
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const days: (Date | null)[] = [];
    for (let i = 0; i < startOffset; i++) days.push(null);
    for (let d = 1; d <= daysInMonth; d++) days.push(new Date(year, month, d));
    while (days.length % 7 !== 0) days.push(null);
    return days;
  }, [monthDate]);

  const eventsByDay = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>();
    events.forEach((e) => {
      const key = new Date(e.due_at).toDateString();
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(e);
    });
    return map;
  }, [events]);

  const today = new Date();

  return (
    <div className="flex-1 overflow-auto p-4">
      <div className="grid grid-cols-7 border-t border-l border-slate-200">
        {WEEKDAY_LABELS.map((label) => (
          <div
            key={label}
            className="border-r border-b border-slate-200 bg-slate-50 py-1.5 text-center text-[11px] font-semibold text-slate-500 uppercase tracking-wide"
          >
            {label}
          </div>
        ))}

        {cells.map((date, i) => {
          const dayEvents = date ? eventsByDay.get(date.toDateString()) ?? [] : [];
          const isToday = date && isSameDay(date, today);

          return (
            <div
              key={i}
              onClick={() => date && onDayClick(date)}
              className={`border-r border-b border-slate-200 min-h-[100px] p-1.5 ${
                date ? 'cursor-pointer hover:bg-slate-50' : 'bg-slate-50/40'
              }`}
            >
              {date && (() => {
                // Bubble the deep-linked event to the front so it always
                // lands within the first-3 slice below instead of being
                // silently cut off into "+N more" and never rendered for
                // the scroll-into-view/ring effect to find.
                const orderedDayEvents =
                  highlightEventId != null && dayEvents.some((e) => e.id === highlightEventId)
                    ? [...dayEvents].sort((a, b) => (a.id === highlightEventId ? -1 : b.id === highlightEventId ? 1 : 0))
                    : dayEvents;
                return (
                  <>
                    <div
                      className={`text-xs font-semibold mb-1 w-5 h-5 flex items-center justify-center rounded-full ${
                        isToday ? 'bg-indigo-600 text-white' : 'text-slate-600'
                      }`}
                    >
                      {date.getDate()}
                    </div>
                    <div className="space-y-0.5">
                      {orderedDayEvents.slice(0, 3).map((e) => {
                        const highlight = matchedResourceColor(e, checkedResourceIds, resourceColorById);
                        const isHighlighted = e.id === highlightEventId;
                        return (
                          <div
                            key={e.id}
                            id={`event-card-${e.id}`}
                            onClick={(ev) => {
                              ev.stopPropagation();
                              onEventClick(e);
                            }}
                            className={`text-[10px] px-1 py-0.5 rounded truncate ${EVENT_TYPE_META[e.type]?.color ?? 'bg-slate-100 text-slate-700'} ${
                              isHighlighted ? 'ring-2 ring-indigo-500 ring-offset-1' : ''
                            }`}
                            style={highlight ? { boxShadow: `inset 0 0 0 1.5px ${highlight}` } : undefined}
                            title={e.subject}
                          >
                            {e.subject}
                          </div>
                        );
                      })}
                      {orderedDayEvents.length > 3 && (
                        <div className="text-[10px] text-slate-400 px-1">
                          +{orderedDayEvents.length - 3} more
                        </div>
                      )}
                    </div>
                  </>
                );
              })()}
            </div>
          );
        })}
      </div>
    </div>
  );
}
