import { useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { usePayments } from '../hooks/usePayments';
import { useContacts } from '../hooks/useContacts';
import { useCompanies } from '../hooks/useCompanies';
import { useUsers } from '../hooks/useContacts';
import {
  PAYMENT_STATUSES,
  PAYMENT_METHODS,
  PAYMENT_STATUS_BADGE,
  PaymentStatus,
  Payment,
} from '../types/payment';
import { toTitleCase } from '../utils/text';
import NewPaymentModal from '../components/payments/NewPaymentModal';

const inputClass =
  'px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--theme-accent)]';

function money(n: number) {
  return `$${Number(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatDate(iso: string | null) {
  if (!iso) return '--';
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

function displayStatus(p: Payment): PaymentStatus | 'overdue' {
  return p.is_overdue ? 'overdue' : p.status;
}

const STATUS_FILTER_OPTIONS: (PaymentStatus | 'overdue')[] = [...PAYMENT_STATUSES, 'overdue'];

export default function Payments() {
  const navigate = useNavigate();
  const { data: payments = [], isLoading, error } = usePayments();
  const { data: contacts = [] } = useContacts();
  const { data: companies = [] } = useCompanies();
  const { data: users = [] } = useUsers();
  const [newPaymentOpen, setNewPaymentOpen] = useState(false);
  const [searchParams] = useSearchParams();

  const [search, setSearch] = useState('');
  const [status, setStatus] = useState(searchParams.get('status') || '');
  const [method, setMethod] = useState('');
  const [contactId, setContactId] = useState('');
  const [accountId, setAccountId] = useState('');
  const [ownerId, setOwnerId] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [amountMin, setAmountMin] = useState('');
  const [amountMax, setAmountMax] = useState('');

  const summary = useMemo(() => {
    let received = 0;
    let pending = 0;
    let failed = 0;
    let refunded = 0;
    let outstanding = 0;
    for (const p of payments) {
      received += Number(p.amount_received) || 0;
      refunded += Number(p.refunded_amount) || 0;
      if (p.status === 'pending' || p.status === 'processing') pending += Number(p.amount) || 0;
      if (p.status === 'failed') failed += Number(p.amount) || 0;
      if (p.status === 'pending' || p.status === 'processing' || p.status === 'partially_paid') {
        outstanding += (Number(p.amount) || 0) - (Number(p.amount_received) || 0);
      }
    }
    return { revenue: received - refunded, received, pending, failed, refunded, outstanding };
  }, [payments]);

  const filtered = useMemo(() => {
    return payments.filter((p) => {
      if (search) {
        const q = search.toLowerCase();
        const hay = [
          p.payment_number,
          p.invoice_number,
          p.deal_name,
          p.reference,
          toTitleCase(`${p.contact_first_name || ''} ${p.contact_last_name || ''}`),
          p.account_name,
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        if (!hay.includes(q)) return false;
      }
      if (status && displayStatus(p) !== status) return false;
      if (method && p.method !== method) return false;
      if (contactId && String(p.contact_id) !== contactId) return false;
      if (accountId && String(p.account_id) !== accountId) return false;
      if (ownerId && String(p.owner_id) !== ownerId) return false;
      if (dateFrom && (!p.payment_date || p.payment_date < dateFrom)) return false;
      if (dateTo && (!p.payment_date || p.payment_date > dateTo)) return false;
      if (amountMin && Number(p.amount) < Number(amountMin)) return false;
      if (amountMax && Number(p.amount) > Number(amountMax)) return false;
      return true;
    });
  }, [payments, search, status, method, contactId, accountId, ownerId, dateFrom, dateTo, amountMin, amountMax]);

  return (
    <div className="flex-1 overflow-y-auto p-6">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-lg font-bold text-slate-800">Payments</h1>
        <button
          type="button"
          onClick={() => setNewPaymentOpen(true)}
          className="px-4 py-2 text-sm font-semibold bg-[var(--theme-accent)] hover:bg-[var(--theme-accent-hover)] text-white rounded-lg flex items-center gap-2"
        >
          <i className="fa-solid fa-plus" />
          Record Payment
        </button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-3 mb-4">
        <div className="bg-white border border-slate-200 rounded-xl p-3">
          <div className="text-[10px] font-semibold text-slate-400 uppercase">Total Revenue</div>
          <div className="text-lg font-bold text-slate-800">{money(summary.revenue)}</div>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-3">
          <div className="text-[10px] font-semibold text-slate-400 uppercase">Received</div>
          <div className="text-lg font-bold text-emerald-600">{money(summary.received)}</div>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-3">
          <div className="text-[10px] font-semibold text-slate-400 uppercase">Pending</div>
          <div className="text-lg font-bold text-amber-600">{money(summary.pending)}</div>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-3">
          <div className="text-[10px] font-semibold text-slate-400 uppercase">Failed</div>
          <div className="text-lg font-bold text-rose-600">{money(summary.failed)}</div>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-3">
          <div className="text-[10px] font-semibold text-slate-400 uppercase">Refunded</div>
          <div className="text-lg font-bold text-slate-500">{money(summary.refunded)}</div>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-3">
          <div className="text-[10px] font-semibold text-slate-400 uppercase">Outstanding</div>
          <div className="text-lg font-bold text-slate-800">{money(summary.outstanding)}</div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2 mb-4 bg-white border border-slate-200 rounded-xl p-3">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search payment #, invoice, deal, reference..."
          className={`${inputClass} w-64`}
        />
        <select value={status} onChange={(e) => setStatus(e.target.value)} className={inputClass}>
          <option value="">All Statuses</option>
          {STATUS_FILTER_OPTIONS.map((s) => (
            <option key={s} value={s}>
              {toTitleCase(s.replace('_', ' '))}
            </option>
          ))}
        </select>
        <select value={method} onChange={(e) => setMethod(e.target.value)} className={inputClass}>
          <option value="">All Methods</option>
          {PAYMENT_METHODS.map((m) => (
            <option key={m} value={m}>
              {toTitleCase(m.replace('_', ' '))}
            </option>
          ))}
        </select>
        <select value={contactId} onChange={(e) => setContactId(e.target.value)} className={inputClass}>
          <option value="">All Customers</option>
          {contacts.map((c) => (
            <option key={c.id} value={c.id}>
              {toTitleCase(`${c.first_name} ${c.last_name}`.trim())}
            </option>
          ))}
        </select>
        <select value={accountId} onChange={(e) => setAccountId(e.target.value)} className={inputClass}>
          <option value="">All Companies</option>
          {companies.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <select value={ownerId} onChange={(e) => setOwnerId(e.target.value)} className={inputClass}>
          <option value="">All Reps</option>
          {users.map((u) => (
            <option key={u.id} value={u.id}>
              {toTitleCase(u.name)}
            </option>
          ))}
        </select>
        <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className={inputClass} title="From date" />
        <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className={inputClass} title="To date" />
        <input
          type="number"
          value={amountMin}
          onChange={(e) => setAmountMin(e.target.value)}
          placeholder="Min $"
          className={`${inputClass} w-20`}
        />
        <input
          type="number"
          value={amountMax}
          onChange={(e) => setAmountMax(e.target.value)}
          placeholder="Max $"
          className={`${inputClass} w-20`}
        />
        {(search || status || method || contactId || accountId || ownerId || dateFrom || dateTo || amountMin || amountMax) && (
          <button
            type="button"
            onClick={() => {
              setSearch('');
              setStatus('');
              setMethod('');
              setContactId('');
              setAccountId('');
              setOwnerId('');
              setDateFrom('');
              setDateTo('');
              setAmountMin('');
              setAmountMax('');
            }}
            className="text-xs text-slate-400 hover:text-slate-600"
          >
            Clear filters
          </button>
        )}
      </div>

      {isLoading ? (
        <p className="text-sm text-slate-400">Loading...</p>
      ) : error ? (
        <p className="text-sm text-rose-600 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2">
          {error instanceof Error ? error.message : 'Failed to load payments.'}
        </p>
      ) : filtered.length === 0 ? (
        <p className="text-sm text-slate-400 italic">No payments match these filters.</p>
      ) : (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-left text-slate-400 uppercase tracking-wide border-b border-slate-100">
                <th className="px-4 py-2 font-semibold">Payment ID</th>
                <th className="px-4 py-2 font-semibold">Customer</th>
                <th className="px-4 py-2 font-semibold">Invoice</th>
                <th className="px-4 py-2 font-semibold">Deal</th>
                <th className="px-4 py-2 font-semibold text-right">Amount</th>
                <th className="px-4 py-2 font-semibold">Method</th>
                <th className="px-4 py-2 font-semibold">Status</th>
                <th className="px-4 py-2 font-semibold">Payment Date</th>
                <th className="px-4 py-2 font-semibold">Due Date</th>
                <th className="px-4 py-2 font-semibold">Reference</th>
                <th className="px-4 py-2 font-semibold">Owner</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((p) => (
                <tr
                  key={p.id}
                  onClick={() => navigate(`/payments/${p.id}`)}
                  className="border-b border-slate-50 last:border-0 hover:bg-slate-50 cursor-pointer"
                >
                  <td className="px-4 py-2.5 font-medium text-[var(--theme-accent)]">{p.payment_number}</td>
                  <td className="px-4 py-2.5 text-slate-600">
                    {p.contact_first_name ? toTitleCase(`${p.contact_first_name} ${p.contact_last_name || ''}`.trim()) : p.account_name || '--'}
                  </td>
                  <td className="px-4 py-2.5 text-slate-500">{p.invoice_number || '--'}</td>
                  <td className="px-4 py-2.5 text-slate-500">{p.deal_name || '--'}</td>
                  <td className="px-4 py-2.5 text-right font-semibold text-slate-700">{money(p.amount)}</td>
                  <td className="px-4 py-2.5 text-slate-500">{p.method ? toTitleCase(p.method.replace('_', ' ')) : '--'}</td>
                  <td className="px-4 py-2.5">
                    {p.is_overdue ? (
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-rose-50 text-rose-700">Overdue</span>
                    ) : (
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${PAYMENT_STATUS_BADGE[p.status]}`}>
                        {toTitleCase(p.status.replace('_', ' '))}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-2.5 text-slate-400">{formatDate(p.payment_date)}</td>
                  <td className="px-4 py-2.5 text-slate-400">{formatDate(p.due_date)}</td>
                  <td className="px-4 py-2.5 text-slate-400">{p.reference || '--'}</td>
                  <td className="px-4 py-2.5 text-slate-500">{p.owner_name ? toTitleCase(p.owner_name) : '--'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <NewPaymentModal
        open={newPaymentOpen}
        onClose={() => setNewPaymentOpen(false)}
        onCreated={(id) => {
          setNewPaymentOpen(false);
          navigate(`/payments/${id}`);
        }}
      />
    </div>
  );
}
