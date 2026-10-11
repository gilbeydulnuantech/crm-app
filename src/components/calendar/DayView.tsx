import { useEffect, useMemo, useState } from 'react';
import { TeamUser } from '../../api/contacts';
import { CalendarEvent } from '../../types/event';
import { typeCardStyle, useEventTypeLookup } from '../../utils/eventTypes';
import { useCardDisplay } from '../../hooks/useCardDisplay';
import StaffPill from './StaffPill';
import EventQuickMenu from './EventQuickMenu';
import { outcomeLabel } from '../../utils/eventOutcome';
import { Resource } from '../../types/resource';
import { toTitleCase } from '../../utils/text';
import { eventDiscountLabel, eventPriceLabel } from '../../utils/eventPrice';
import { formatClockRange } from '../../utils/timeFormat';
import { matchedResourceColor } from '../../utils/calendarHighlight';
import DayColumnsModal, { hourLabel } from './DayColumnsModal';

interface Props {
  day: Date;
  events: CalendarEvent[];
  users: TeamUser[];
  // Team members ticked in the "All Events" dropdown; a person who is not ticked has no column.
  visibleUserIds?: Set<number>;
  resources: Resource[];
  checkedResourceIds: Set<number>;
  resourceColorById: Map<number, string>;
  onEventClick: (event: CalendarEvent) => void;
  timezone?: string;
  // The Columns dialog is opened from the icon next to "Next" in the page toolbar.
  columnsOpen: boolean;
  onColumnsOpenChange: (open: boolean) => void;
}

// Spa/salon-style day: one column per team member or room, time running down the
// side, and each booking drawn as a block as tall as its duration.
const PX_PER_MIN = 1.2;
const SNAP_MIN = 15;
const MIN_BLOCK_PX = 22;
const CARD_GAP_PX = 20; // empty space kept below a card when another card follows it in the same column
const LANE_GAP_PX = 8; // gap between cards that sit side by side
const DEFAULT_DURATION_MIN = 30;
const DEFAULT_HOURS = [8, 9, 10, 11, 12, 13, 14, 15, 16, 17];
const STORAGE_KEY = 'calendar.dayView.v2';

interface Stored {
  columns: string[] | null; // null = every team member
  hours: number[] | null; // null = 8 AM – 5 PM
}

function loadStored(): Stored {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const p = JSON.parse(raw) as Partial<Stored>;
      return {
        columns: Array.isArray(p.columns) ? p.columns.filter((c) => typeof c === 'string') : null,
        hours: Array.isArray(p.hours) ? p.hours.filter((h) => Number.isInteger(h) && h >= 0 && h <= 23) : null,
      };
    }
  } catch {
    // storage blocked or corrupt — use defaults
  }
  return { columns: null, hours: null };
}

function saveStored(s: Stored) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
  } catch {
    // the choice just won't be remembered
  }
}

interface Column {
  key: string;
  name: string;
  color: string;
  events: CalendarEvent[];
}

interface Placed {
  event: CalendarEvent;
  top: number;
  height: number;
  lane: number;
  lanes: number;
}

export default function DayView({
  day,
  events,
  users,
  visibleUserIds,
  resources,
  checkedResourceIds,
  resourceColorById,
  onEventClick,
  timezone,
  columnsOpen,
  onColumnsOpenChange,
}: Props) {
  const typeOf = useEventTypeLookup();
  const cd = useCardDisplay();
  const [stored, setStoredState] = useState<Stored>(loadStored);
  const [now, setNow] = useState(() => new Date());

  function setStored(next: Stored) {
    setStoredState(next);
    saveStored(next);
  }

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(t);
  }, []);

  const allColumnKeys = useMemo(() => users.map((u) => `u:${u.id}`), [users]);
  const selectedColumns = useMemo(() => new Set(stored.columns ?? allColumnKeys), [stored.columns, allColumnKeys]);
  const hours = useMemo(() => [...new Set(stored.hours ?? DEFAULT_HOURS)].sort((a, b) => a - b), [stored.hours]);
  const selectedHours = useMemo(() => new Set(hours), [hours]);

  function toggleColumn(key: string) {
    const next = new Set(selectedColumns);
    next.has(key) ? next.delete(key) : next.add(key);
    setStored({ ...stored, columns: [...next] });
  }
  function toggleHour(h: number) {
    const next = new Set(selectedHours);
    next.has(h) ? next.delete(h) : next.add(h);
    setStored({ ...stored, hours: [...next] });
  }

  const partsFormatter = useMemo(
    () => new Intl.DateTimeFormat('en-US', { hour: '2-digit', minute: '2-digit', hourCycle: 'h23', timeZone: timezone }),
    [timezone]
  );
  function hm(iso: string | Date) {
    const parts = partsFormatter.formatToParts(typeof iso === 'string' ? new Date(iso) : iso);
    const h = parseInt(parts.find((p) => p.type === 'hour')?.value ?? '0', 10) % 24;
    const m = parseInt(parts.find((p) => p.type === 'minute')?.value ?? '0', 10);
    return { h, m };
  }

  // Row offsets: with unticked hours the grid simply skips them.
  const hourIndex = useMemo(() => new Map(hours.map((h, i) => [h, i])), [hours]);
  function runEndOffset(h: number) {
    let last = h;
    while (hourIndex.has(last + 1)) last += 1;
    return ((hourIndex.get(last) ?? 0) + 1) * 60;
  }
  const totalPx = hours.length * 60 * PX_PER_MIN;

  const columns: Column[] = useMemo(() => {
    const cols: Column[] = [];
    users.forEach((u) => {
      if (selectedColumns.has(`u:${u.id}`) && (!visibleUserIds || visibleUserIds.has(u.id))) {
        cols.push({ key: `u:${u.id}`, name: toTitleCase(u.name) + (u.location ? ` · ${u.location}` : ''), color: u.color || '#94A3B8', events: events.filter((e) => e.user_id === u.id) });
      }
    });
    resources.forEach((r) => {
      if (selectedColumns.has(`r:${r.id}`)) {
        cols.push({
          key: `r:${r.id}`,
          name: r.name,
          color: r.color || resourceColorById.get(r.id) || '#94A3B8',
          events: events.filter((e) => (e.resources ?? []).some((x) => x.id === r.id)),
        });
      }
    });
    if (selectedColumns.has('unassigned')) {
      cols.push({ key: 'unassigned', name: 'Unassigned', color: '#94A3B8', events: events.filter((e) => e.user_id == null) });
    }
    return cols;
  }, [users, visibleUserIds, resources, events, selectedColumns, resourceColorById]);

  // Positions one column's events, putting overlapping bookings side by side.
  function layout(list: CalendarEvent[]): Placed[] {
    const items = list
      .map((e) => {
        const { h, m } = hm(e.due_at);
        const idx = hourIndex.get(h);
        if (idx === undefined) return null;
        const start = idx * 60 + m;
        const rawDur = e.end_at ? (new Date(e.end_at).getTime() - new Date(e.due_at).getTime()) / 60000 : DEFAULT_DURATION_MIN;
        const dur = rawDur > 0 ? rawDur : DEFAULT_DURATION_MIN;
        const end = Math.min(start + dur, runEndOffset(h));
        return { event: e, start, end: Math.max(end, start + 1) };
      })
      .filter((x): x is { event: CalendarEvent; start: number; end: number } => x !== null)
      .sort((a, b) => a.start - b.start || a.end - b.end);

    const placed: Placed[] = [];
    let cluster: { item: (typeof items)[number]; lane: number }[] = [];
    let clusterEnd = -1;
    const flush = () => {
      const lanes = cluster.reduce((mx, c) => Math.max(mx, c.lane + 1), 1);
      cluster.forEach((c) =>
        placed.push({
          event: c.item.event,
          top: c.item.start * PX_PER_MIN,
          height: Math.max((c.item.end - c.item.start) * PX_PER_MIN, MIN_BLOCK_PX),
          lane: c.lane,
          lanes,
        })
      );
      cluster = [];
    };
    const laneEnds: number[] = [];
    items.forEach((it) => {
      if (cluster.length > 0 && it.start >= clusterEnd) {
        flush();
        laneEnds.length = 0;
        clusterEnd = -1;
      }
      let lane = laneEnds.findIndex((le) => le <= it.start);
      if (lane === -1) lane = laneEnds.length;
      laneEnds[lane] = it.end;
      cluster.push({ item: it, lane });
      clusterEnd = Math.max(clusterEnd, it.end);
    });
    if (cluster.length > 0) flush();
    // Cards start exactly where their booking starts, so the 20px gap is made by shortening the one above (never
    // below a readable minimum) whenever the next card in the same lane would be closer than that.
    const byLane = new Map<string, Placed[]>();
    placed.forEach((p) => {
      const key = `${p.lanes}-${p.lane}`;
      if (!byLane.has(key)) byLane.set(key, []);
      byLane.get(key)!.push(p);
    });
    byLane.forEach((list) => {
      list.sort((a, b) => a.top - b.top);
      list.forEach((p, i) => {
        const next = list[i + 1];
        if (next && next.top - (p.top + p.height) < CARD_GAP_PX) {
          p.height = Math.max(MIN_BLOCK_PX, next.top - p.top - CARD_GAP_PX);
        }
      });
    });
    return placed;
  }

  const placedByColumn = useMemo(
    () => new Map(columns.map((c) => [c.key, layout(c.events)])),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [columns, hourIndex, partsFormatter]
  );

  const outsideHours = useMemo(() => {
    const hs = new Set<number>();
    columns.forEach((c) =>
      c.events.forEach((e) => {
        const { h } = hm(e.due_at);
        if (!hourIndex.has(h)) hs.add(h);
      })
    );
    return hs;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [columns, hourIndex, partsFormatter]);

  const hiddenColumnEvents = useMemo(() => {
    const shown = new Set<number>();
    columns.forEach((c) => c.events.forEach((e) => shown.add(e.id)));
    return events.filter((e) => !shown.has(e.id)).length;
  }, [columns, events]);

  const isToday = day.toDateString() === now.toDateString();
  const nowPos = (() => {
    if (!isToday) return null;
    const { h, m } = hm(now);
    const idx = hourIndex.get(h);
    return idx === undefined ? null : (idx * 60 + m) * PX_PER_MIN;
  })();

  return (
    <div className="flex-1 flex flex-col min-h-0">
      {(outsideHours.size > 0 || hiddenColumnEvents > 0) && (
        <div className="px-4 py-2 flex flex-wrap items-center gap-x-4 gap-y-1 border-b border-slate-100 shrink-0">
          {outsideHours.size > 0 && (
            <button
              type="button"
              onClick={() => setStored({ ...stored, hours: [...new Set([...hours, ...outsideHours])] })}
              className="text-xs font-medium text-[var(--theme-accent-hover)] hover:underline"
            >
              Bookings outside the shown hours — show them
            </button>
          )}
          {hiddenColumnEvents > 0 && (
            <button type="button" onClick={() => onColumnsOpenChange(true)} className="text-xs text-slate-500 hover:underline">
              {hiddenColumnEvents} booking{hiddenColumnEvents === 1 ? '' : 's'} in columns that are not shown
            </button>
          )}
        </div>
      )}

      {columns.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-2 text-sm text-slate-400">
          <span>No columns selected.</span>
          <button type="button" onClick={() => onColumnsOpenChange(true)} className="text-[var(--theme-accent-hover)] hover:underline">
            Choose columns
          </button>
        </div>
      ) : hours.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-2 text-sm text-slate-400">
          <span>No hours selected.</span>
          <button type="button" onClick={() => onColumnsOpenChange(true)} className="text-[var(--theme-accent-hover)] hover:underline">
            Choose hours
          </button>
        </div>
      ) : (
        <div className="flex-1 overflow-auto">
          <div className="min-w-max">
            {/* Column headers stay visible while the grid scrolls. */}
            <div className="flex sticky top-0 z-20 bg-white border-b border-slate-200">
              <div className="w-16 shrink-0 sticky left-0 bg-white z-30" />
              {columns.map((c) => (
                <div key={c.key} className="flex-1 min-w-[180px] px-2 py-2 border-l border-slate-100 flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: c.color }} />
                  <span className="text-xs font-semibold text-slate-700 truncate">{c.name}</span>
                  <span className="text-[10px] text-slate-400 ml-auto shrink-0">
                    {c.events.length} booking{c.events.length === 1 ? '' : 's'}
                  </span>
                </div>
              ))}
            </div>

            <div className="flex">
              <div className="w-16 shrink-0 sticky left-0 bg-white z-10" style={{ height: totalPx }}>
                {hours.map((h, i) => (
                  <div
                    key={h}
                    className="text-[10px] text-slate-400 text-right pr-2"
                    style={{ position: 'absolute', top: i * 60 * PX_PER_MIN + 2, width: '4rem' }}
                  >
                    {hourLabel(h)}
                  </div>
                ))}
              </div>
              {columns.map((c) => {
                const placed = placedByColumn.get(c.key) ?? [];
                return (
                  <div
                    key={c.key}
                    className="flex-1 min-w-[180px] relative border-l border-slate-100"
                    style={{ height: totalPx }}
                  >
                    {hours.map((h, i) => (
                      <div key={h} className="absolute inset-x-0 pointer-events-none" style={{ top: i * 60 * PX_PER_MIN }}>
                        <div className="border-t border-slate-200" />
                        <div className="border-t border-dashed border-slate-100" style={{ marginTop: 30 * PX_PER_MIN - 1 }} />
                      </div>
                    ))}
                    {nowPos !== null && (
                      <div className="absolute inset-x-0 border-t-2 border-rose-400 pointer-events-none z-[5]" style={{ top: nowPos }} />
                    )}
                    {placed.map((p) => {
                      const e = p.event;
                      const highlight = matchedResourceColor(e, checkedResourceIds, resourceColorById);
                      return (
                        <div
                          key={e.id}
                          onClick={(ev) => {
                            ev.stopPropagation();
                            onEventClick(e);
                          }}
                          className={`absolute overflow-hidden rounded py-1 text-[11px] leading-tight cursor-pointer border-l-4 shadow-sm ${
                            e.is_completed || e.outcome ? 'opacity-60' : ''
                          }`}
                          style={{
                            ...typeCardStyle(typeOf(e.type).color),
                            paddingLeft: 10,
                            paddingRight: 10,
                            top: p.top,
                            height: p.height - 1,
                            left: `calc(${(p.lane / p.lanes) * 100}% + ${LANE_GAP_PX / 2}px)`,
                            width: `calc(${100 / p.lanes}% - ${LANE_GAP_PX}px)`,
                            borderLeftColor: e.assigned_user_color || c.color,
                            ...(highlight ? { boxShadow: `inset 0 0 0 1.5px ${highlight}` } : {}),
                          }}
                          title={`${e.subject}${e.assigned_user_name ? ` — ${toTitleCase(e.assigned_user_name)}` : ''}`}
                        >
                          <div className="absolute top-0.5 right-0.5 z-10">
                            <EventQuickMenu event={e} onViewDetails={onEventClick} />
                          </div>
                          <div style={cd.zoomStyle}>
                            {outcomeLabel(e) && (
                              <div className="text-[0.85em] font-bold uppercase tracking-wide text-rose-700 pr-5">{outcomeLabel(e)}</div>
                            )}
                            {(cd.show_time || (cd.show_price && eventPriceLabel(e))) && (
                              <div className="font-medium flex items-center justify-between gap-1 pr-5">
                                <span className="truncate">
                                  {e.confirmed_at && <i className="fa-solid fa-circle-check text-emerald-600 mr-1" title="Booking confirmed" />}
                                  {e.paid_at && <i className="fa-solid fa-coins text-sky-600 mr-1" title="Paid" />}
                                  {cd.show_time ? formatClockRange(e.due_at, e.end_at, timezone) : ''}
                                </span>
                                {cd.show_price && eventPriceLabel(e) && (
                                  <span className="shrink-0">
                                    {eventDiscountLabel(e) && <span className="mr-1 text-[0.85em] font-semibold text-rose-600">{eventDiscountLabel(e)}</span>}
                                    {eventPriceLabel(e)}
                                  </span>
                                )}
                              </div>
                            )}
                            <div className={`truncate pr-5 ${e.is_completed || e.outcome ? 'line-through' : ''}`} style={{ fontWeight: cd.titleWeight }}>
                              {e.subject}
                            </div>
                            {cd.show_contact && (e.contact_name || e.company_name) && (
                              <div className="truncate opacity-70">{e.contact_name ? toTitleCase(e.contact_name) : toTitleCase(e.company_name)}</div>
                            )}
                            {cd.show_staff && e.staff_name && (
                              <div className="mt-0.5">
                                <StaffPill name={e.staff_name} commission={cd.show_commission ? e.commission_amount : null} />
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      <DayColumnsModal
        open={columnsOpen}
        onClose={() => onColumnsOpenChange(false)}
        users={users}
        resources={resources}
        selectedColumns={selectedColumns}
        onToggleColumn={toggleColumn}
        selectedHours={selectedHours}
        onToggleHour={toggleHour}
        onReset={() => setStored({ columns: null, hours: null })}
      />
    </div>
  );
}
