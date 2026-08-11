import { CalendarEvent, EVENT_TYPE_META } from '../../types/event';
import { toTitleCase } from '../../utils/text';
import { matchedResourceColor } from '../../utils/calendarHighlight';

interface Props {
  events: CalendarEvent[];
  checkedResourceIds: Set<number>;
  resourceColorById: Map<number, string>;
  onEventClick: (event: CalendarEvent) => void;
  emptyLabel?: string;
}

export function EventListView({
  events,
  checkedResourceIds,
  resourceColorById,
  onEventClick,
  emptyLabel = 'No events.',
}: Props) {
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
            style={
              highlight
                ? { boxShadow: `inset 0 0 0 1.5px ${highlight}`, backgroundColor: `${highlight}14` }
                : undefined
            }
          >
            {/* Assigned user's color — lets an overlaid multi-person view tell
                whose event this is at a glance, separate from the type dot. */}
            <span
              className="w-1 self-stretch rounded-full shrink-0"
              style={{ backgroundColor: e.assigned_user_color || 'transparent' }}
              title={e.assigned_user_name}
            />
            <span className={`w-2 h-2 rounded-full shrink-0 ${EVENT_TYPE_META[e.type]?.dot ?? 'bg-slate-400'}`} />
            <div className="w-20 shrink-0 text-xs text-slate-500">
              {new Date(e.due_at).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}
            </div>
            <div className="flex-1 min-w-0">
              <div className={`text-sm font-medium truncate ${e.is_completed ? 'text-slate-400 line-through' : 'text-slate-800'}`}>
                {e.subject}
              </div>
              {(e.company_name || e.contact_name) && (
                <div className="text-xs text-slate-400 truncate">
                  {e.company_name || toTitleCase(e.contact_name)}
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
            {e.assigned_user_name && (
              <span className="text-xs text-slate-500 shrink-0">{toTitleCase(e.assigned_user_name)}</span>
            )}
          </div>
        );
      })}
    </div>
  );
}
