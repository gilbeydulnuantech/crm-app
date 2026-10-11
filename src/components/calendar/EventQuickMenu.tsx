import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { CalendarEvent } from '../../types/event';
import { PaymentMethod } from '../../api/benefits';
import { useAuth } from '../../context/AuthContext';
import { useConfirmEventBilling, useMarkEventPaid, useSetEventOutcome } from '../../hooks/useBilling';
import { useUpdateEvent } from '../../hooks/useEvents';

interface Props {
  event: CalendarEvent;
  onViewDetails: (event: CalendarEvent) => void;
}

const METHODS: { key: PaymentMethod; label: string }[] = [
  { key: 'cash', label: 'Cash' },
  { key: 'kaspi', label: 'Kaspi' },
  { key: 'card', label: 'Card' },
];

// The ⋮ button on an event card. It opens a small menu of quick actions: client arrived / paid, completed, cancelled, no-show.
// A rep can act on their own events until the visit is completed; an admin can act on any.
export default function EventQuickMenu({ event, onViewDetails }: Props) {
  const { user, isAdmin } = useAuth();
  const confirm = useConfirmEventBilling();
  const markPaid = useMarkEventPaid();
  const setOutcome = useSetEventOutcome();
  const updateEvent = useUpdateEvent();
  const btnRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number }>({ top: 0, left: 0 });
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  // After an action succeeds the menu stays open. Until the refreshed event arrives its buttons are locked, so a slow
  // refresh can't lead to a second click on a button that is already out of date.
  const stateSig = `${event.confirmed_at ?? ''}|${event.paid_at ?? ''}|${event.is_completed}|${event.outcome ?? ''}`;
  const [waitingFor, setWaitingFor] = useState<string | null>(null);
  const updating = waitingFor !== null && waitingFor === stateSig;

  const mine = isAdmin || event.user_id === user?.id;
  const canAct = mine && !(event.is_completed && !isAdmin);
  const priced = event.product_price != null || !!event.staff_id;
  const confirmed = !!event.confirmed_at;
  const prepaid = event.payment_method === 'package' || event.payment_method === 'membership';

  useLayoutEffect(() => {
    if (!open || !btnRef.current) return;
    const r = btnRef.current.getBoundingClientRect();
    const w = 224;
    const h = menuRef.current?.offsetHeight ?? 280;
    setPos({
      left: Math.max(8, Math.min(window.innerWidth - w - 8, r.right - w)),
      top: r.bottom + h + 8 > window.innerHeight ? Math.max(8, r.top - h - 4) : r.bottom + 4,
    });
  }, [open, error]);

  useEffect(() => {
    if (!open) return;
    const close = (ev: Event) => {
      if (menuRef.current?.contains(ev.target as Node) || btnRef.current?.contains(ev.target as Node)) return;
      setOpen(false);
    };
    const esc = (ev: KeyboardEvent) => ev.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', close, true);
    document.addEventListener('touchstart', close, true);
    document.addEventListener('keydown', esc);
    window.addEventListener('scroll', close, true);
    window.addEventListener('resize', close);
    return () => {
      document.removeEventListener('mousedown', close, true);
      document.removeEventListener('touchstart', close, true);
      document.removeEventListener('keydown', esc);
      window.removeEventListener('scroll', close, true);
      window.removeEventListener('resize', close);
    };
  }, [open]);

  async function run(action: () => Promise<{ success?: boolean; error?: string } | unknown>) {
    setError(null);
    setBusy(true);
    try {
      const res = (await action()) as { success?: boolean; error?: string } | undefined;
      if (res && res.success === false) setError(res.error || 'Could not do that.');
      else {
        setWaitingFor(stateSig);
        window.setTimeout(() => setWaitingFor(null), 10000);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not do that.');
    } finally {
      setBusy(false);
    }
  }

  const arrive = () => confirm.mutateAsync({ event_id: event.id });
  const pay = async (method: PaymentMethod) => {
    if (!confirmed) {
      const c = await arrive();
      if (!c.success) return c;
    }
    return markPaid.mutateAsync({ event_id: event.id, payment_method: method });
  };
  const complete = () => updateEvent.mutateAsync({ id: event.id, payload: { is_completed: true, completed_at: new Date().toISOString() } });

  const item = 'w-full text-left px-3 py-1.5 text-sm hover:bg-slate-50 disabled:opacity-50 flex items-center gap-2';
  const heading = 'px-3 pt-2 pb-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-400';
  const canPay = canAct && !event.outcome && !event.is_completed && priced && !event.paid_at && !prepaid;

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        aria-label="Quick actions"
        title="Quick actions"
        onClick={(ev) => {
          ev.stopPropagation();
          setOpen((o) => !o);
          setError(null);
        }}
        onMouseDown={(ev) => ev.stopPropagation()}
        className="w-5 h-5 flex items-center justify-center rounded text-slate-500 hover:bg-black/10 hover:text-slate-800"
      >
        <i className="fa-solid fa-ellipsis-vertical text-[11px]" />
      </button>
      {open &&
        createPortal(
          <div
            ref={menuRef}
            onClick={(ev) => ev.stopPropagation()}
            className="fixed z-[200] w-56 bg-white border border-slate-200 rounded-xl shadow-xl py-1 text-slate-700"
            style={{ top: pos.top, left: pos.left }}
          >
            {canAct && event.outcome && (
              <button className={item} disabled={busy || updating} onClick={() => run(() => setOutcome.mutateAsync({ event_id: event.id, outcome: null }))}>
                <i className="fa-solid fa-rotate-left w-4 text-slate-400" /> Restore booking
              </button>
            )}

            {canAct && !event.outcome && !event.is_completed && priced && !confirmed && (
              <button className={item} disabled={busy || updating} onClick={() => run(arrive)}>
                <i className="fa-solid fa-circle-check w-4 text-emerald-600" /> Client arrived
              </button>
            )}

            {canPay && (
              <>
                <div className={heading}>{confirmed ? 'Mark paid' : 'Arrived and paid'}</div>
                <div className="flex gap-1 px-2 pb-1">
                  {METHODS.map((m) => (
                    <button
                      key={m.key}
                      disabled={busy || updating}
                      onClick={() => run(() => pay(m.key))}
                      className="flex-1 px-2 py-1 text-xs font-medium border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-50"
                    >
                      {m.label}
                    </button>
                  ))}
                </div>
              </>
            )}

            {canAct && !event.outcome && !event.is_completed && (
              <button className={item} disabled={busy || updating} onClick={() => run(complete)}>
                <i className="fa-solid fa-check-double w-4 text-emerald-600" /> Mark completed
              </button>
            )}
            {canAct && !event.outcome && (
              <>
                <button className={item} disabled={busy || updating} onClick={() => run(() => setOutcome.mutateAsync({ event_id: event.id, outcome: 'cancelled' }))}>
                  <i className="fa-solid fa-ban w-4 text-rose-500" /> Cancelled
                </button>
                <button className={item} disabled={busy || updating} onClick={() => run(() => setOutcome.mutateAsync({ event_id: event.id, outcome: 'no_show' }))}>
                  <i className="fa-solid fa-user-slash w-4 text-amber-600" /> No-show
                </button>
              </>
            )}

            {updating && <div className="mx-2 my-1 text-xs text-slate-500">Updating…</div>}
            {error && <div className="mx-2 my-1 text-xs text-rose-700 bg-rose-50 rounded-lg px-2 py-1">{error}</div>}
            <div className="border-t border-slate-100 mt-1 pt-1">
              <button
                className={item}
                onClick={() => {
                  setOpen(false);
                  onViewDetails(event);
                }}
              >
                <i className="fa-solid fa-up-right-from-square w-4 text-slate-400" /> View full details
              </button>
            </div>
          </div>,
          // In full-screen mode only the full-screen element is drawn, so the menu has to live inside it.
          document.fullscreenElement ?? document.body
        )}
    </>
  );
}
