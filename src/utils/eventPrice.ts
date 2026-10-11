import { CalendarEvent } from '../types/event';

export function formatMoney(n: number | string | null | undefined): string | null {
  if (n == null || n === '') return null;
  const v = Number(n);
  if (!isFinite(v)) return null;
  return `$${v.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

// The price on an event card: what the client actually pays once the booking is confirmed (after any discount card),
// otherwise the list price saved at booking. Null when the event has no price.
export function eventPriceLabel(e: Pick<CalendarEvent, 'product_price' | 'amount_paid' | 'confirmed_at'>): string | null {
  if (e.confirmed_at && e.amount_paid != null) return formatMoney(e.amount_paid);
  return formatMoney(e.product_price);
}

// "-20%" style tag when a discount card was applied.
export function eventDiscountLabel(e: Pick<CalendarEvent, 'discount_percent' | 'confirmed_at'>): string | null {
  if (!e.confirmed_at || !e.discount_percent) return null;
  return `-${Number(e.discount_percent)}%`;
}
