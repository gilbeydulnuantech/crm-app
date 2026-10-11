import { useState } from 'react';
import { MembershipPlan, PackageDef } from '../../api/benefits';
import { useBenefitCatalog, useDeleteMembershipPlan, useDeletePackage, useSaveMembershipPlan, useSavePackage } from '../../hooks/useBenefits';
import { useProducts } from '../../hooks/useProducts';

interface Props {
  open: boolean;
  onClose: () => void;
}

const input = 'px-2 py-1 text-sm border border-slate-200 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-[var(--theme-accent)]';
const num = (v: string) => v.replace(/[^0-9.]/g, '');

function PackageRow({ pkg }: { pkg: PackageDef }) {
  const save = useSavePackage();
  const del = useDeletePackage();
  const { data: products = [] } = useProducts();
  const [f, setF] = useState({ name: pkg.name, sessions: String(pkg.sessions), price: String(pkg.price), days: String(pkg.valid_days) });
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function commit(patch: Partial<{ product_id: number | null; is_active: boolean }> = {}) {
    const next = { name: f.name.trim(), sessions: Number(f.sessions), price: Number(f.price), valid_days: Number(f.days), product_id: pkg.product_id, is_active: pkg.is_active, ...patch };
    if (!next.name || !(next.sessions >= 1) || !(next.price >= 0) || !(next.valid_days >= 1)) {
      setF({ name: pkg.name, sessions: String(pkg.sessions), price: String(pkg.price), days: String(pkg.valid_days) });
      return;
    }
    if (next.name === pkg.name && next.sessions === pkg.sessions && next.price === pkg.price && next.valid_days === pkg.valid_days && next.product_id === pkg.product_id && next.is_active === pkg.is_active) return;
    setError(null);
    save.mutate({ id: pkg.id, ...next }, { onSuccess: (r) => !r.success && setError(r.error || 'Could not save.'), onError: (e) => setError(e instanceof Error ? e.message : 'Could not save.') });
  }

  return (
    <div className={`py-2 ${pkg.is_active ? '' : 'opacity-60'}`}>
      <div className="flex flex-wrap items-center gap-2">
        <input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} onBlur={() => commit()} maxLength={80} aria-label="Name" className={`${input} flex-1 min-w-[8rem] font-medium`} />
        <input value={f.sessions} onChange={(e) => setF({ ...f, sessions: num(e.target.value) })} onBlur={() => commit()} aria-label="Sessions" className={`${input} w-14 text-right`} />
        <span className="text-xs text-slate-400">sessions</span>
        <input value={f.price} onChange={(e) => setF({ ...f, price: num(e.target.value) })} onBlur={() => commit()} aria-label="Price" className={`${input} w-24 text-right`} />
        <input value={f.days} onChange={(e) => setF({ ...f, days: num(e.target.value) })} onBlur={() => commit()} aria-label="Valid days" className={`${input} w-14 text-right`} />
        <span className="text-xs text-slate-400">days</span>
        <select value={pkg.product_id ?? ''} onChange={(e) => commit({ product_id: e.target.value ? Number(e.target.value) : null })} className={input} aria-label="Service">
          <option value="">Any service</option>
          {products.filter((p) => p.is_active).map((p) => (
            <option key={p.id} value={p.id}>
              {p.name} only
            </option>
          ))}
        </select>
        <button type="button" onClick={() => commit({ is_active: !pkg.is_active })} title={pkg.is_active ? 'Hide (stops being sold; clients keep theirs)' : 'Sell again'} className="w-7 text-slate-400 hover:text-slate-700">
          <i className={`fa-solid ${pkg.is_active ? 'fa-eye' : 'fa-eye-slash'} text-xs`} />
        </button>
        {confirming ? (
          <span className="flex items-center gap-1">
            <button type="button" onClick={() => del.mutate(pkg.id, { onError: (e) => setError(e instanceof Error ? e.message : 'Could not delete.') })} className="px-2 py-1 text-[11px] font-semibold text-white bg-rose-600 rounded-md">
              Delete
            </button>
            <button type="button" onClick={() => setConfirming(false)} className="text-[11px] text-slate-400">
              Keep
            </button>
          </span>
        ) : (
          <button type="button" onClick={() => setConfirming(true)} title="Delete" className="w-7 text-slate-300 hover:text-rose-500">
            <i className="fa-solid fa-trash text-xs" />
          </button>
        )}
      </div>
      <p className="text-[11px] text-slate-400">
        Sold {pkg.sold} time{pkg.sold === 1 ? '' : 's'}. Each session is worth {(Number(f.price) / Math.max(1, Number(f.sessions))).toFixed(2)} (this is what commission is based on).{confirming && pkg.sold > 0 ? ' Packages already sold are not affected.' : ''}
      </p>
      {error && <p className="text-[11px] text-rose-600">{error}</p>}
    </div>
  );
}

function PlanRow({ plan }: { plan: MembershipPlan }) {
  const save = useSaveMembershipPlan();
  const del = useDeleteMembershipPlan();
  const [f, setF] = useState({ name: plan.name, price: String(plan.price), days: String(plan.period_days), disc: String(plan.discount_percent), inc: String(plan.included_sessions) });
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function commit(patch: Partial<{ is_active: boolean }> = {}) {
    const next = { name: f.name.trim(), price: Number(f.price), period_days: Number(f.days), discount_percent: Number(f.disc || 0), included_sessions: Number(f.inc || 0), is_active: plan.is_active, ...patch };
    if (!next.name || !(next.price >= 0) || !(next.period_days >= 1) || next.discount_percent > 100) {
      setF({ name: plan.name, price: String(plan.price), days: String(plan.period_days), disc: String(plan.discount_percent), inc: String(plan.included_sessions) });
      return;
    }
    if (next.name === plan.name && next.price === plan.price && next.period_days === plan.period_days && next.discount_percent === plan.discount_percent && next.included_sessions === plan.included_sessions && next.is_active === plan.is_active) return;
    setError(null);
    save.mutate({ id: plan.id, ...next }, { onSuccess: (r) => !r.success && setError(r.error || 'Could not save.'), onError: (e) => setError(e instanceof Error ? e.message : 'Could not save.') });
  }

  return (
    <div className={`py-2 ${plan.is_active ? '' : 'opacity-60'}`}>
      <div className="flex flex-wrap items-center gap-2">
        <input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} onBlur={() => commit()} maxLength={80} aria-label="Name" className={`${input} flex-1 min-w-[8rem] font-medium`} />
        <input value={f.price} onChange={(e) => setF({ ...f, price: num(e.target.value) })} onBlur={() => commit()} aria-label="Price" className={`${input} w-24 text-right`} />
        <span className="text-xs text-slate-400">every</span>
        <input value={f.days} onChange={(e) => setF({ ...f, days: num(e.target.value) })} onBlur={() => commit()} aria-label="Days per period" className={`${input} w-14 text-right`} />
        <span className="text-xs text-slate-400">days</span>
        <input value={f.disc} onChange={(e) => setF({ ...f, disc: num(e.target.value) })} onBlur={() => commit()} aria-label="Discount percent" className={`${input} w-14 text-right`} />
        <span className="text-xs text-slate-400">% off</span>
        <input value={f.inc} onChange={(e) => setF({ ...f, inc: num(e.target.value) })} onBlur={() => commit()} aria-label="Included sessions" className={`${input} w-12 text-right`} />
        <span className="text-xs text-slate-400">included</span>
        <button type="button" onClick={() => commit({ is_active: !plan.is_active })} title={plan.is_active ? 'Hide (stops being sold; members keep theirs)' : 'Sell again'} className="w-7 text-slate-400 hover:text-slate-700">
          <i className={`fa-solid ${plan.is_active ? 'fa-eye' : 'fa-eye-slash'} text-xs`} />
        </button>
        {confirming ? (
          <span className="flex items-center gap-1">
            <button type="button" onClick={() => del.mutate(plan.id, { onError: (e) => setError(e instanceof Error ? e.message : 'Could not delete.') })} className="px-2 py-1 text-[11px] font-semibold text-white bg-rose-600 rounded-md">
              Delete
            </button>
            <button type="button" onClick={() => setConfirming(false)} className="text-[11px] text-slate-400">
              Keep
            </button>
          </span>
        ) : (
          <button type="button" onClick={() => setConfirming(true)} title="Delete" className="w-7 text-slate-300 hover:text-rose-500">
            <i className="fa-solid fa-trash text-xs" />
          </button>
        )}
      </div>
      <p className="text-[11px] text-slate-400">Sold {plan.sold} time{plan.sold === 1 ? '' : 's'}. Members get the % off, and the included sessions each period (0 = none).</p>
      {error && <p className="text-[11px] text-rose-600">{error}</p>}
    </div>
  );
}

// Admin: the packages and membership plans the business sells. Reps sell them from a client's record (Packages tab).
export default function PackagesMembershipsModal({ open, onClose }: Props) {
  const { data, isLoading } = useBenefitCatalog();
  const savePkg = useSavePackage();
  const savePlan = useSaveMembershipPlan();
  const [pk, setPk] = useState({ name: '', sessions: '', price: '', days: '180' });
  const [pl, setPl] = useState({ name: '', price: '', days: '30', disc: '', inc: '' });
  const [error, setError] = useState<string | null>(null);

  if (!open) return null;

  function addPackage() {
    if (!pk.name.trim() || !Number(pk.sessions) || pk.price === '') return setError('Give the package a name, a number of sessions and a price.');
    setError(null);
    savePkg.mutate({ name: pk.name.trim(), sessions: Number(pk.sessions), price: Number(pk.price), valid_days: Number(pk.days || 180) }, {
      onSuccess: (r) => (r.success ? setPk({ name: '', sessions: '', price: '', days: '180' }) : setError(r.error || 'Could not add.')),
      onError: (e) => setError(e instanceof Error ? e.message : 'Could not add.'),
    });
  }
  function addPlan() {
    if (!pl.name.trim() || pl.price === '') return setError('Give the membership a name and a price.');
    setError(null);
    savePlan.mutate({ name: pl.name.trim(), price: Number(pl.price), period_days: Number(pl.days || 30), discount_percent: Number(pl.disc || 0), included_sessions: Number(pl.inc || 0) }, {
      onSuccess: (r) => (r.success ? setPl({ name: '', price: '', days: '30', disc: '', inc: '' }) : setError(r.error || 'Could not add.')),
      onError: (e) => setError(e instanceof Error ? e.message : 'Could not add.'),
    });
  }

  return (
    <div className="fixed inset-0 bg-slate-900/70 z-[100] flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl p-6 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-1">
          <h3 className="text-lg font-bold text-slate-800">Packages &amp; memberships</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600" aria-label="Close">
            <i className="fa-solid fa-xmark" />
          </button>
        </div>
        <p className="text-xs text-slate-500 mb-4">
          Packages are bought up front (for example 10 massages) and each visit uses one session. A membership is paid every period and gives a % off and/or
          included sessions. Reps sell them from the client's record, in the Packages tab. On a visit, the rep picks one in the booking's payment box.
        </p>

        <div className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1">Packages</div>
        <div className="flex flex-wrap items-center gap-2 mb-1">
          <input value={pk.name} onChange={(e) => setPk({ ...pk, name: e.target.value })} placeholder="Name, e.g. 10 massages" maxLength={80} className={`${input} flex-1 min-w-[8rem]`} />
          <input value={pk.sessions} onChange={(e) => setPk({ ...pk, sessions: num(e.target.value) })} placeholder="Sessions" className={`${input} w-20 text-right`} />
          <input value={pk.price} onChange={(e) => setPk({ ...pk, price: num(e.target.value) })} placeholder="Price" className={`${input} w-24 text-right`} />
          <input value={pk.days} onChange={(e) => setPk({ ...pk, days: num(e.target.value) })} placeholder="Valid days" className={`${input} w-20 text-right`} />
          <button type="button" onClick={addPackage} disabled={savePkg.isPending} className="px-3 py-1 text-sm font-semibold text-white rounded-md disabled:opacity-50" style={{ backgroundColor: 'var(--theme-accent)' }}>
            Add
          </button>
        </div>
        <div className="divide-y divide-slate-100 mb-5">
          {isLoading && <p className="text-xs text-slate-400 py-2">Loading...</p>}
          {!isLoading && (data?.packages.length ?? 0) === 0 && <p className="text-xs text-slate-400 py-2">No packages yet.</p>}
          {data?.packages.map((p) => <PackageRow key={p.id} pkg={p} />)}
        </div>

        <div className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1">Memberships</div>
        <div className="flex flex-wrap items-center gap-2 mb-1">
          <input value={pl.name} onChange={(e) => setPl({ ...pl, name: e.target.value })} placeholder="Name, e.g. Gold" maxLength={80} className={`${input} flex-1 min-w-[8rem]`} />
          <input value={pl.price} onChange={(e) => setPl({ ...pl, price: num(e.target.value) })} placeholder="Price" className={`${input} w-24 text-right`} />
          <input value={pl.days} onChange={(e) => setPl({ ...pl, days: num(e.target.value) })} placeholder="Days" className={`${input} w-16 text-right`} />
          <input value={pl.disc} onChange={(e) => setPl({ ...pl, disc: num(e.target.value) })} placeholder="% off" className={`${input} w-16 text-right`} />
          <input value={pl.inc} onChange={(e) => setPl({ ...pl, inc: num(e.target.value) })} placeholder="Included" className={`${input} w-20 text-right`} />
          <button type="button" onClick={addPlan} disabled={savePlan.isPending} className="px-3 py-1 text-sm font-semibold text-white rounded-md disabled:opacity-50" style={{ backgroundColor: 'var(--theme-accent)' }}>
            Add
          </button>
        </div>
        <div className="divide-y divide-slate-100">
          {!isLoading && (data?.plans.length ?? 0) === 0 && <p className="text-xs text-slate-400 py-2">No memberships yet.</p>}
          {data?.plans.map((p) => <PlanRow key={p.id} plan={p} />)}
        </div>

        {error && <p className="text-xs text-rose-600 mt-3">{error}</p>}
        <div className="flex justify-end pt-4">
          <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 rounded-lg">
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
