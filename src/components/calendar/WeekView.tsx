import { useMemo } from 'react';
import { CalendarEvent } from '../../types/event';
import { typeCardStyle, useEventTypeLookup } from '../../utils/eventTypes';
import { useCardDisplay } from '../../hooks/useCardDisplay';
import StaffPill from './StaffPill';
import EventQuickMenu from './EventQuickMenu';
import { outcomeLabel } from '../../utils/eventOutcome';
import { matchedResourceColor } from '../../utils/calendarHighlight';
import { eventDiscountLabel, eventPriceLabel } from '../../utils/eventPrice';
import { formatClockRange } from '../../utils/timeFormat';
import { toTitleCase } from '../../utils/text';

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
  const typeOf = useEventTypeLookup();
  const cd = useCardDisplay();
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
                      className={`relative text-[11px] px-1.5 py-1 rounded cursor-pointer ${e.outcome ? 'opacity-60' : ''}`}
                      style={{ ...typeCardStyle(typeOf(e.type).color), ...(highlight ? { boxShadow: `inset 0 0 0 1.5px ${highlight}` } : {}) }}
                    >
                      <div className="absolute top-0.5 right-0.5 z-10">
                        <EventQuickMenu event={e} onViewDetails={onEventClick} />
                      </div>
                      <div style={cd.zoomStyle}>
                        {outcomeLabel(e) && <div className="text-[0.85em] font-bold uppercase tracking-wide text-rose-700 pr-5">{outcomeLabel(e)}</div>}
                        {cd.show_time && <div className="font-medium pr-5">{formatClockRange(e.due_at, e.end_at, timezone)}</div>}
                        <div className={`truncate pr-5 ${e.outcome ? 'line-through' : ''}`} style={{ fontWeight: cd.titleWeight }}>
                          {e.subject}
                        </div>
                        {cd.show_contact && e.contact_name && <div className="truncate opacity-70">{toTitleCase(e.contact_name)}</div>}
                        {cd.show_staff && e.staff_name && (
                          <div className="mt-0.5">
                            <StaffPill name={e.staff_name} commission={cd.show_commission ? e.commission_amount : null} />
                          </div>
                        )}
                        {cd.show_price && eventPriceLabel(e) && (
                          <div className="font-semibold">
                            {eventDiscountLabel(e) && <span className="mr-1 text-rose-600">{eventDiscountLabel(e)}</span>}
                            {eventPriceLabel(e)}
                          </div>
                        )}
                      </div>
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
