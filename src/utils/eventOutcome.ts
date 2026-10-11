import { CalendarEvent } from '../types/event';

export const OUTCOME_LABELS: Record<string, string> = { cancelled: 'Cancelled', no_show: 'No-show' };

// Cancelled and no-show bookings stay visible but faded, so the day still shows what happened.
export function outcomeLabel(e: CalendarEvent): string | null {
  return e.outcome ? OUTCOME_LABELS[e.outcome] ?? null : null;
}
