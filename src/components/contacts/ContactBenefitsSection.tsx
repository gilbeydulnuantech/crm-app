import { useState } from 'react';
import { PAYMENT_METHOD_LABELS, PaymentMethod } from '../../api/benefits';
import { useBenefitCatalog, useCancelClientBenefitSafe, useClientBenefits, useRenewMembership, useSellMembership, useSellPackage } from '../../hooks/useBenefits';
import { formatMoney } from '../../utils/eventPrice';

interface Props {
  contactId: number;
  canSell: boolean; // the contact's owner or an admin
  isAdmin: boolean;
}

const dateOnly = (iso: string) => new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
const selectClass = 'px-2 py-1.5 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[var(--theme-accent)]';

function MethodSelect({ value, onChange }: { value: PaymentMethod; onChange: (m: PaymentMethod) => void }) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value as PaymentMethod)} className={selectClass} aria-label="Paid by">
      {(['cash', 'kaspi', 'card'] as const).map((m) => (
        <option key={m} value={m}>
          Paid by {PAYMENT_METHOD_LABELS[m].toLowerCase()}
        </option>
      ))}
    </select>
  );
}

// A client's prepaid packages and memberships: what is left, when it runs out, and selling or renewing one.
export default function ContactBenefitsSection({ contactId, canSell, isAdmin }: Props) {
  const { data: benefits, isLoading } = useClientBenefits(contactId);
  const { data: catalog } = useBenefitCatalog();
  const sellPackage = useSellPackage();
  const sellMembership = useSellMembership();
  const renew = useRenewMembership();
  const cancel = useCancelClientBenefitSafe();
  const [pkgId, setPkgId] = useState('');
  const [planId, setPlanId] = useState('');
  const [method, setMethod] = useState<PaymentMethod>('cash');
  const [error, setError] = useState<string | null>(null);

  const packages = catalog?.packages.filter((p) => p.is_active) ?? [];
  const plans = catalog?.plans.filter((p) => p.is_active) ?? [];

  function run<T extends { success: boolean; error?: string }>(promise: Promise<T>, after?: () => void) {
    setError(null);
    promise
      .then((res) => {
        if (!res.success) setError(res.error || 'Something went wrong.');
        else after?.();
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Something went wrong.'));
  }

  return (
    <div className="space-y-4 text-sm">
      {isLoading && <p className="text-xs text-slate-400">Loading...</p>}

      <div>
        <div className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1">Packages</div>
        {(benefits?.packages ?? []).length === 0 && <p className="text-xs text-slate-400">No packages bought yet.</p>}
        {(benefits?.packages ?? []).map((p) => (
          <div key={p.id} className={`flex items-center gap-3 py-1.5 border-b border-slate-100 ${p.usable ? '' : 'opacity-60'}`}>
            <div className="flex-1 min-w-0">
              <div className="font-medium text-slate-800 truncate">
                {p.name}
                {p.product_name && <span className="ml-1 text-xs font-normal text-slate-400">· {p.product_name} only</span>}
              </div>
              <div className="text-xs text-slate-500">
                Bought {dateOnly(p.purchased_at)} for {formatMoney(p.price_paid)} · {formatMoney(p.session_value)} per session · {p.status === 'cancelled' ? 'cancelled' : `valid until ${dateOnly(p.expires_at)}`}
              </div>
            </div>
            <span className="shrink-0 text-xs font-semibold rounded-full bg-slate-100 text-slate-700 px-2 py-0.5">
              {p.remaining} of {p.sessions_total} left
            </span>
            {isAdmin && p.status === 'active' && (
              <button type="button" onClick={() => run(cancel.mutateAsync({ kind: 'package', id: p.id }))} className="text-[11px] text-slate-300 hover:text-rose-500" title="Cancel this package">
                <i className="fa-solid fa-ban" />
              </button>
            )}
          </div>
        ))}
        {canSell && packages.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 mt-2">
            <select value={pkgId} onChange={(e) => setPkgId(e.target.value)} className={`${selectClass} flex-1 min-w-[10rem]`} aria-label="Package to sell">
              <option value="">Sell a package...</option>
              {packages.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} — {p.sessions} sessions, {formatMoney(p.price)}
                </option>
              ))}
            </select>
            <MethodSelect value={method} onChange={setMethod} />
            <button
              type="button"
              disabled={!pkgId || sellPackage.isPending}
              onClick={() => run(sellPackage.mutateAsync({ contact_id: contactId, item_id: Number(pkgId), payment_method: method }), () => setPkgId(''))}
              className="px-3 py-1.5 text-sm font-semibold text-white rounded-lg disabled:opacity-50"
              style={{ backgroundColor: 'var(--theme-accent)' }}
            >
              Sell
            </button>
          </div>
        )}
      </div>

      <div>
        <div className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1">Memberships</div>
        {(benefits?.memberships ?? []).length === 0 && <p className="text-xs text-slate-400">No membership yet.</p>}
        {(benefits?.memberships ?? []).map((m) => (
          <div key={m.id} className={`flex items-center gap-3 py-1.5 border-b border-slate-100 ${m.status === 'cancelled' ? 'opacity-60' : ''}`}>
            <div className="flex-1 min-w-0">
              <div className="font-medium text-slate-800 truncate">
                {m.name}
                {m.status === 'active' && !m.usable && <span className="ml-2 text-[11px] font-semibold text-amber-700 bg-amber-100 rounded-full px-2 py-0.5">Expired</span>}
              </div>
              <div className="text-xs text-slate-500">
                {m.discount_percent > 0 ? `${m.discount_percent}% off` : ''}
                {m.discount_percent > 0 && m.included_sessions > 0 ? ' · ' : ''}
                {m.included_sessions > 0 ? `${m.remaining} of ${m.included_sessions} included sessions left this period` : ''}
                {' · '}
                {m.status === 'cancelled' ? 'cancelled' : `paid until ${dateOnly(m.renews_at)}`}
              </div>
            </div>
            {canSell && m.status === 'active' && (
              <button
                type="button"
                disabled={renew.isPending}
                onClick={() => run(renew.mutateAsync({ membership_id: m.id, payment_method: method }))}
                className="shrink-0 px-2.5 py-1 text-xs font-semibold border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 disabled:opacity-50"
                title={`Take another payment (${PAYMENT_METHOD_LABELS[method]}) and add one period`}
              >
                Renew
              </button>
            )}
            {isAdmin && m.status === 'active' && (
              <button type="button" onClick={() => run(cancel.mutateAsync({ kind: 'membership', id: m.id }))} className="text-[11px] text-slate-300 hover:text-rose-500" title="Cancel this membership">
                <i className="fa-solid fa-ban" />
              </button>
            )}
          </div>
        ))}
        {canSell && plans.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 mt-2">
            <select value={planId} onChange={(e) => setPlanId(e.target.value)} className={`${selectClass} flex-1 min-w-[10rem]`} aria-label="Membership to sell">
              <option value="">Start a membership...</option>
              {plans.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} — {formatMoney(p.price)} per {p.period_days} days
                </option>
              ))}
            </select>
            <MethodSelect value={method} onChange={setMethod} />
            <button
              type="button"
              disabled={!planId || sellMembership.isPending}
              onClick={() => run(sellMembership.mutateAsync({ contact_id: contactId, item_id: Number(planId), payment_method: method }), () => setPlanId(''))}
              className="px-3 py-1.5 text-sm font-semibold text-white rounded-lg disabled:opacity-50"
              style={{ backgroundColor: 'var(--theme-accent)' }}
            >
              Start
            </button>
          </div>
        )}
      </div>

      {!canSell && <p className="text-[11px] text-slate-400">Only this client's owner or an admin can sell or renew.</p>}
      {error && <p className="text-xs text-rose-600">{error}</p>}
    </div>
  );
}
