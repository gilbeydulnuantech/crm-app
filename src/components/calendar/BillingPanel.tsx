import { useEffect, useState } from 'react';
import { CalendarEvent } from '../../types/event';
import { PAYMENT_METHOD_LABELS, PaymentMethod } from '../../api/benefits';
import { useConfirmEventBilling, useDiscountCards, useMarkEventPaid } from '../../hooks/useBilling';
import { useClientBenefits } from '../../hooks/useBenefits';
import { useStaff } from '../../hooks/useStaff';
import { useStaffFeature } from '../../hooks/useIndustry';
import { formatMoney } from '../../utils/eventPrice';
import { toTitleCase } from '../../utils/text';

interface Props {
  event: CalendarEvent;
  isAdmin: boolean;
  currentUserId?: number;
}

const round2 = (n: number) => Math.round(n * 100) / 100;

// What covers the visit, as one dropdown value: '' = full price, card:ID, pkg:ID (a package session),
// memd:ID (membership discount) or mems:ID (a session included in the membership).
type Choice = string;

// "Client arrived": confirm the booking and say what covers it (a discount card, a package session or a membership), then
// record how they paid. Shows the amount and the staff member's commission. A rep can do this for their own events until
// the visit is completed; after that only an admin can change it.
export default function BillingPanel({ event, isAdmin, currentUserId }: Props) {
  const { data: cards = [] } = useDiscountCards();
  const { data: benefits } = useClientBenefits(event.contact_id);
  const { data: staff = [] } = useStaff();
  const staffLabel = useStaffFeature().label;
  const confirm = useConfirmEventBilling();
  const markPaid = useMarkEventPaid();
  const [choice, setChoice] = useState<Choice>('');
  const [method, setMethod] = useState<PaymentMethod>('cash');
  const [error, setError] = useState<string | null>(null);

  const listPrice = event.product_price != null ? Number(event.product_price) : null;
  const confirmed = !!event.confirmed_at;
  const owns = isAdmin || event.user_id === currentUserId;
  const locked = event.is_completed && !isAdmin;
  const activeCards = cards.filter((c) => c.is_active);
  const packages = (benefits?.packages ?? []).filter(
    (p) => (p.usable && p.remaining > 0 && (!p.product_id || p.product_id === event.product_id)) || p.id === event.client_package_id
  );
  const memberships = (benefits?.memberships ?? []).filter((m) => m.usable || m.id === event.client_membership_id);

  // Show what is saved on the event.
  useEffect(() => {
    let current: Choice = '';
    if (event.client_package_id) current = `pkg:${event.client_package_id}`;
    else if (event.client_membership_id) current = `${event.payment_method === 'membership' ? 'mems' : 'memd'}:${event.client_membership_id}`;
    else if (event.discount_percent) {
      const card = cards.find((c) => c.name === event.discount_name);
      current = card ? `card:${card.id}` : '';
    }
    setChoice(current);
    setError(null);
  }, [event.id, event.confirmed_at, event.client_package_id, event.client_membership_id, event.payment_method, event.discount_name, event.discount_percent, cards]);

  if (listPrice == null && !event.staff_id) return null;
  if (event.outcome) {
    return (
      <p className="text-xs text-slate-500 bg-slate-50 rounded-lg px-3 py-2">
        This booking is marked {event.outcome === 'no_show' ? 'no-show' : 'cancelled'}, so it earns no revenue or commission. Use the ⋮ menu on the card to restore it.
      </p>
    );
  }

  // Preview of the picked option (before confirming) so the rep sees the amount first.
  const [kind, rawId] = choice.split(':');
  const picked = Number(rawId);
  const pickedCard = kind === 'card' ? activeCards.find((c) => c.id === picked) : undefined;
  const pickedPkg = kind === 'pkg' ? packages.find((p) => p.id === picked) : undefined;
  const pickedMem = kind === 'memd' || kind === 'mems' ? memberships.find((m) => m.id === picked) : undefined;

  let previewPct = 0;
  let previewAmount: number | null = listPrice;
  let previewLabel = '';
  if (pickedCard) {
    previewPct = Number(pickedCard.percent);
    previewLabel = pickedCard.name;
  } else if (pickedPkg) {
    previewAmount = Number(pickedPkg.session_value);
    previewLabel = `Package: ${pickedPkg.name}`;
  } else if (pickedMem && kind === 'memd') {
    previewPct = Number(pickedMem.discount_percent);
    previewLabel = `Membership: ${pickedMem.name}`;
  } else if (pickedMem && kind === 'mems') {
    previewAmount = Number(pickedMem.session_value);
    previewLabel = `Membership session: ${pickedMem.name}`;
  }
  if (previewAmount != null && previewPct > 0 && listPrice != null && !pickedPkg && kind !== 'mems') previewAmount = round2(listPrice * (1 - previewPct / 100));

  const amount = confirmed && event.amount_paid != null ? Number(event.amount_paid) : previewAmount;
  const pct = confirmed ? Number(event.discount_percent ?? 0) : previewPct;
  const rate = confirmed && event.commission_percent != null ? Number(event.commission_percent) : staff.find((s) => s.id === event.staff_id)?.commission_percent ?? null;
  const commission = confirmed && event.commission_amount != null ? Number(event.commission_amount) : amount != null && rate != null ? round2((amount * Number(rate)) / 100) : null;
  const prepaid = event.payment_method === 'package' || event.payment_method === 'membership';
  const paid = !!event.paid_at;

  function send(next: Choice, unconfirm = false) {
    setError(null);
    const [k, id] = next.split(':');
    const payload = {
      event_id: event.id,
      unconfirm,
      discount_card_id: k === 'card' ? Number(id) : null,
      client_package_id: k === 'pkg' ? Number(id) : null,
      client_membership_id: k === 'memd' || k === 'mems' ? Number(id) : null,
      membership_mode: k === 'mems' ? ('session' as const) : k === 'memd' ? ('discount' as const) : undefined,
    };
    confirm.mutate(payload, {
      onSuccess: (res) => !res.success && setError(res.error || 'Could not update.'),
      onError: (err) => setError(err instanceof Error ? err.message : 'Could not update.'),
    });
  }

  function pay(unpaid = false) {
    setError(null);
    markPaid.mutate(unpaid ? { event_id: event.id, unpaid: true } : { event_id: event.id, payment_method: method }, {
      onSuccess: (res) => !res.success && setError(res.error || 'Could not record the payment.'),
      onError: (err) => setError(err instanceof Error ? err.message : 'Could not record the payment.'),
    });
  }

  const select = (disabled: boolean, onChange: (v: Choice) => void) => (
    <select
      value={choice}
      disabled={disabled}
      onChange={(e) => onChange(e.target.value)}
      className="w-full px-2.5 py-1.5 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[var(--theme-accent)] disabled:bg-slate-50 disabled:text-slate-400"
      aria-label="What covers this visit"
    >
      <option value="">Full price (no discount)</option>
      {activeCards.length > 0 && (
        <optgroup label="Discount card">
          {activeCards.map((c) => (
            <option key={c.id} value={`card:${c.id}`}>
              {c.name} — {Number(c.percent)}% off
            </option>
          ))}
        </optgroup>
      )}
      {packages.length > 0 && (
        <optgroup label="Package">
          {packages.map((p) => (
            <option key={p.id} value={`pkg:${p.id}`}>
              {p.name} — use 1 session ({p.remaining} left)
            </option>
          ))}
        </optgroup>
      )}
      {memberships.length > 0 && (
        <optgroup label="Membership">
          {memberships.flatMap((m) => [
            ...(m.discount_percent > 0 ? [{ v: `memd:${m.id}`, t: `${m.name} — ${Number(m.discount_percent)}% off` }] : []),
            ...(m.included_sessions > 0 && (m.remaining > 0 || event.client_membership_id === m.id)
              ? [{ v: `mems:${m.id}`, t: `${m.name} — included session (${m.remaining} left)` }]
              : []),
          ]).map((o) => (
            <option key={o.v} value={o.v}>
              {o.t}
            </option>
          ))}
        </optgroup>
      )}
    </select>
  );

  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 space-y-2 text-sm text-slate-700">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Booking &amp; payment</span>
        <span className="flex items-center gap-1.5">
          {paid && (
            <span className="text-[11px] font-semibold text-sky-700 bg-sky-100 rounded-full px-2 py-0.5">
              <i className="fa-solid fa-coins mr-1" />
              Paid · {PAYMENT_METHOD_LABELS[event.payment_method ?? ''] ?? event.payment_method}
            </span>
          )}
          {confirmed && (
            <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-100 rounded-full px-2 py-0.5">
              <i className="fa-solid fa-circle-check mr-1" />
              Confirmed
            </span>
          )}
        </span>
      </div>

      {listPrice != null && (
        <div className="flex items-center justify-between">
          <span className="text-slate-500">List price</span>
          <span className={pct > 0 || prepaid ? 'line-through text-slate-400' : ''}>{formatMoney(listPrice)}</span>
        </div>
      )}

      {!confirmed && owns && (
        <>
          <p className="text-xs text-slate-500">Client arrived? Pick what covers this visit (discount card, package or membership), then confirm.</p>
          {select(false, setChoice)}
        </>
      )}
      {confirmed && owns && !locked && select(confirm.isPending, (v) => { setChoice(v); send(v); })}

      {(pct > 0 || previewLabel || (confirmed && (event.discount_name || prepaid))) && (
        <div className="flex items-center justify-between text-rose-600">
          <span className="truncate">{confirmed ? (prepaid ? (event.payment_method === 'package' ? 'Prepaid package session' : 'Included membership session') : event.discount_name) : previewLabel}</span>
          {pct > 0 && <span>-{pct}%</span>}
        </div>
      )}
      {amount != null && (
        <div className="flex items-center justify-between font-semibold text-slate-800">
          <span>{confirmed ? (prepaid ? 'Counted as' : 'Amount paid') : 'Amount to pay'}</span>
          <span>{formatMoney(amount)}</span>
        </div>
      )}
      {event.staff_name && (
        <div className="flex items-center justify-between text-emerald-800">
          <span>
            {staffLabel}: {toTitleCase(event.staff_name)}
            {rate != null ? ` (${Number(rate)}%)` : ''}
          </span>
          <span className="font-semibold">{commission != null ? formatMoney(commission) : '—'}</span>
        </div>
      )}
      {event.staff_name && !event.is_completed && <p className="text-[11px] text-slate-400">Commission counts in the report once the visit is marked completed.</p>}

      {!confirmed && owns && (
        <button
          type="button"
          onClick={() => send(choice)}
          disabled={confirm.isPending}
          className="w-full py-1.5 text-sm font-semibold text-white rounded-lg disabled:opacity-50"
          style={{ backgroundColor: 'var(--theme-accent)' }}
        >
          {confirm.isPending ? 'Confirming...' : 'Confirm booking'}
        </button>
      )}

      {confirmed && !prepaid && amount != null && owns && (
        <div className="flex items-center gap-2 pt-1">
          {!paid ? (
            <>
              <select
                value={method}
                onChange={(e) => setMethod(e.target.value as PaymentMethod)}
                className="flex-1 px-2.5 py-1.5 text-sm border border-slate-200 rounded-lg bg-white"
                aria-label="Paid by"
              >
                <option value="cash">Paid by cash</option>
                <option value="kaspi">Paid by Kaspi</option>
                <option value="card">Paid by card</option>
              </select>
              <button
                type="button"
                onClick={() => pay()}
                disabled={markPaid.isPending}
                className="px-3 py-1.5 text-sm font-semibold text-white rounded-lg disabled:opacity-50"
                style={{ backgroundColor: 'var(--theme-accent)' }}
              >
                Mark as paid
              </button>
            </>
          ) : (
            isAdmin && (
              <button type="button" onClick={() => pay(true)} disabled={markPaid.isPending} className="text-[11px] text-slate-400 hover:text-slate-600 underline">
                Undo payment
              </button>
            )
          )}
        </div>
      )}
      {confirmed && isAdmin && (
        <button type="button" onClick={() => send('', true)} disabled={confirm.isPending} className="text-[11px] text-slate-400 hover:text-slate-600 underline">
          Undo confirmation
        </button>
      )}
      {locked && <p className="text-[11px] text-amber-700">This visit is completed. Only an admin can change what covers it now.</p>}
      {error && <p className="text-xs text-rose-600">{error}</p>}
    </div>
  );
}
