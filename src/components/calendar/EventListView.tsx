import { CalendarEvent } from '../../types/event';
import { useEventTypeLookup } from '../../utils/eventTypes';
import { useCardDisplay } from '../../hooks/useCardDisplay';
import StaffPill from './StaffPill';
import EventQuickMenu from './EventQuickMenu';
import { outcomeLabel } from '../../utils/eventOutcome';
import { toTitleCase } from '../../utils/text';
import { eventDiscountLabel, eventPriceLabel } from '../../utils/eventPrice';
import { formatClockRange } from '../../utils/timeFormat';
import { matchedResourceColor } from '../../utils/calendarHighlight';

interface Props {
  events: CalendarEvent[];
  checkedResourceIds: Set<number>;
  resourceColorById: Map<number, string>;
  onEventClick: (event: CalendarEvent) => void;
  emptyLabel?: string;
  timezone?: string;
}

export function EventListView({
  events,
  checkedResourceIds,
  resourceColorById,
  onEventClick,
  emptyLabel = 'No events.',
  timezone,
}: Props) {
  const typeOf = useEventTypeLookup();
  const cd = useCardDisplay();
  const sorted = [...events].sort(
    (a, b) => new Date(a.due_at).getTime() - new Date(b.due_at).getTime()
  );

  if (sorted.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center text-sm text-slate-400">
        {emptyLabel}
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-auto p-4 space-y-2">
      {sorted.map((e) => {
        const highlight = matchedResourceColor(e, checkedResourceIds, resourceColorById);
        const highlightedResource = highlight
          ? (e.resources ?? []).find((r) => checkedResourceIds.has(r.id))
          : undefined;
        return (
          <div
            key={e.id}
            onClick={() => onEventClick(e)}
            className="flex items-center gap-3 border border-slate-200 rounded-lg pl-2 pr-3 py-2.5 cursor-pointer hover:bg-slate-50"
            style={{
              ...cd.zoomStyle,
              ...(highlight ? { boxShadow: `inset 0 0 0 1.5px ${highlight}`, backgroundColor: `${highlight}14` } : {}),
            }}
          >
            {/* Assigned user's color — lets an overlaid multi-person view tell
                whose event this is at a glance, separate from the type dot. */}
            <span
              className="w-1 self-stretch rounded-full shrink-0"
              style={{ backgroundColor: e.assigned_user_color || 'transparent' }}
              title={e.assigned_user_name}
            />
            <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: typeOf(e.type).color }} title={typeOf(e.type).label} />
            {cd.show_time && <div className="w-28 shrink-0 text-xs text-slate-500">{formatClockRange(e.due_at, e.end_at, timezone)}</div>}
            <div className="flex-1 min-w-0">
              <div
                className={`text-sm truncate ${cd.bold_title ? '' : 'font-medium'} ${e.is_completed || e.outcome ? 'text-slate-400 line-through' : 'text-slate-800'}`}
                style={{ fontWeight: cd.titleWeight }}
              >
                {e.subject}
                {cd.show_price && eventPriceLabel(e) && (
                  <span className="ml-2 text-xs font-semibold text-slate-500 no-underline">
                    {eventDiscountLabel(e) && <span className="mr-1 text-rose-600">{eventDiscountLabel(e)}</span>}
                    {eventPriceLabel(e)}
                  </span>
                )}
              </div>
              {cd.show_contact && (e.contact_name || e.company_name) && (
                <div className="text-xs text-slate-400 truncate">
                  {e.contact_name ? toTitleCase(e.contact_name) : toTitleCase(e.company_name)}
                </div>
              )}
              {cd.show_staff && e.staff_name && (
                <div className="mt-0.5">
                  <StaffPill name={e.staff_name} commission={cd.show_commission ? e.commission_amount : null} />
                </div>
              )}
            </div>
            {highlightedResource && (
              <i
                className="fa-solid fa-truck text-xs shrink-0"
                style={{ color: highlight }}
                title={highlightedResource.name}
              />
            )}
            {outcomeLabel(e) && <span className="text-[10px] font-bold uppercase tracking-wide text-rose-700 shrink-0">{outcomeLabel(e)}</span>}
            {e.assigned_user_name && (
              <span className="text-xs text-slate-500 shrink-0">{toTitleCase(e.assigned_user_name)}</span>
            )}
            <EventQuickMenu event={e} onViewDetails={onEventClick} />
          </div>
        );
      })}
    </div>
  );
}
