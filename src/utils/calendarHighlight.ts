import { CalendarEvent } from '../types/event';

// An event is "highlighted" when one of its booked resources is checked in
// the sidebar's Resources overlay — lets checking e.g. Service Truck make
// every event that has the truck booked visually pop, not just appear.
export function matchedResourceColor(
  event: CalendarEvent,
  checkedResourceIds: Set<number>,
  resourceColorById: Map<number, string>
): string | undefined {
  const match = (event.resources ?? []).find((r) => checkedResourceIds.has(r.id));
  return match ? resourceColorById.get(match.id) : undefined;
}
