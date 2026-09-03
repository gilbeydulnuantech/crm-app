import { useEffect, useState } from 'react';
import { useContacts } from '../../hooks/useContacts';
import { useCompanies } from '../../hooks/useCompanies';
import { useUsers } from '../../hooks/useContacts';
import { usePipelines, useAllOpportunities } from '../../hooks/useOpportunities';
import { useInvoices, useCreatePayment } from '../../hooks/usePayments';
import { PAYMENT_METHODS, PAYMENT_STATUSES, PaymentMethod, PaymentStatus } from '../../types/payment';
import { toTitleCase } from '../../utils/text';

const inputClass =
  'w-full px-2.5 py-1.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--theme-accent)]';

interface Props {
  open: boolean;
  onClose: () => void;
  onCreated: (id: number) => void;
  initialInvoiceId?: number;
}

// This is a MANUAL ledger entry — there's no payment processor wired into
// this CRM, so "recording a payment" here just logs money the rep already
// collected somewhere else (bank, Stripe dashboard, cash, etc), it doesn't
// charge anyone.
export default function NewPaymentModal({ open, onClose, onCreated, initialInvoiceId }: Props) {
  const { data: contacts = [] } = useContacts();
  const { data: companies = [] } = useCompanies();
  const { data: users = [] } = useUsers();
  const { data: pipelines = [] } = usePipelines();
  const { data: deals = [] } = useAllOpportunities(pipelines.map((p) => p.id));
  const { data: invoices = [] } = useInvoices();
  const createPayment = useCreatePayment();

  const [invoiceId, setInvoiceId] = useState('');
  const [opportunityId, setOpportunityId] = useState('');
  const [contactId, setContactId] = useState('');
  const [accountId, setAccountId] = useState('');
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState<PaymentMethod>('credit_card');
  const [status, setStatus] = useState<PaymentStatus>('paid');
  const [reference, setReference] = useState('');
  const [paymentDate, setPaymentDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [dueDate, setDueDate] = useState('');
  const [notes, setNotes] = useState('');
  const [ownerId, setOwnerId] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setInvoiceId('');
    setOpportunityId('');
    setContactId('');
    setAccountId('');
    setAmount('');
    setMethod('credit_card');
    setStatus('paid');
    setReference('');
    setPaymentDate(new Date().toISOString().slice(0, 10));
    setDueDate('');
    setNotes('');
    setOwnerId('');
    setError(null);
  }, [open]);

  useEffect(() => {
    if (!open || !initialInvoiceId || invoices.length === 0) return;
    handleInvoiceChange(String(initialInvoiceId));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, initialInvoiceId, invoices.length]);

  if (!open) return null;

  function handleInvoiceChange(value: string) {
    setInvoiceId(value);
    const inv = invoices.find((i) => String(i.id) === value);
    if (inv) {
      if (inv.opportunity_id) setOpportunityId(String(inv.opportunity_id));
      if (inv.contact_id) setContactId(String(inv.contact_id));
      if (inv.account_id) setAccountId(String(inv.account_id));
      const remaining = Number(inv.total) - Number(inv.amount_paid);
      if (remaining > 0) setAmount(String(remaining));
    }
  }

  function handleSave() {
    setError(null);
    const amountNum = Number(amount);
    if (!Number.isFinite(amountNum) || amountNum <= 0) return setError('Enter a valid amount.');
    createPayment.mutate(
      {
        invoice_id: invoiceId ? Number(invoiceId) : null,
        opportunity_id: opportunityId ? Number(opportunityId) : null,
        contact_id: contactId ? Number(contactId) : null,
        account_id: accountId ? Number(accountId) : null,
        amount: amountNum,
        method,
        status,
        reference: reference.trim() || undefined,
        payment_date: paymentDate || undefined,
        due_date: dueDate || null,
        notes: notes.trim() || undefined,
        owner_id: ownerId ? Number(ownerId) : null,
      },
      {
        onSuccess: (res) => onCreated(res.id),
        onError: (err) => setError(err instanceof Error ? err.message : 'Failed to record payment.'),
      }
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[85vh] flex flex-col">
        <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100">
          <h2 className="text-sm font-bold text-slate-800">Record Payment</h2>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <i className="fa-solid fa-xmark" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-3">
          {error && (
            <p className="text-xs text-rose-600 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2">{error}</p>
          )}

          <div>
            <label className="block text-[11px] font-medium text-slate-500 mb-1">Invoice (optional)</label>
            <select value={invoiceId} onChange={(e) => handleInvoiceChange(e.target.value)} className={inputClass}>
              <option value="">No invoice</option>
              {invoices.map((inv) => (
                <option key={inv.id} value={inv.id}>
                  {inv.invoice_number} — ${Number(inv.total).toLocaleString()}
                  {inv.contact_first_name ? ` (${toTitleCase(inv.contact_first_name)})` : ''}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-medium text-slate-500 mb-1">Customer</label>
              <select value={contactId} onChange={(e) => setContactId(e.target.value)} className={inputClass}>
                <option value="">None</option>
                {contacts.map((c) => (
                  <option key={c.id} value={c.id}>
                    {toTitleCase(`${c.first_name} ${c.last_name}`.trim())}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-medium text-slate-500 mb-1">Company</label>
              <select value={accountId} onChange={(e) => setAccountId(e.target.value)} className={inputClass}>
                <option value="">None</option>
                {companies.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-medium text-slate-500 mb-1">Deal</label>
            <select value={opportunityId} onChange={(e) => setOpportunityId(e.target.value)} className={inputClass}>
              <option value="">None</option>
              {deals.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name} (${Number(d.deal_value || 0).toLocaleString()})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-medium text-slate-500 mb-1">Amount</label>
              <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00" className={inputClass} />
            </div>
            <div>
              <label className="block text-[11px] font-medium text-slate-500 mb-1">Method</label>
              <select value={method} onChange={(e) => setMethod(e.target.value as PaymentMethod)} className={inputClass}>
                {PAYMENT_METHODS.map((m) => (
                  <option key={m} value={m}>
                    {toTitleCase(m.replace('_', ' '))}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-medium text-slate-500 mb-1">Status</label>
              <select value={status} onChange={(e) => setStatus(e.target.value as PaymentStatus)} className={inputClass}>
                {PAYMENT_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {toTitleCase(s.replace('_', ' '))}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-medium text-slate-500 mb-1">Reference / Transaction ID</label>
              <input type="text" value={reference} onChange={(e) => setReference(e.target.value)} placeholder="TXN-..." className={inputClass} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-medium text-slate-500 mb-1">Payment Date</label>
              <input type="date" value={paymentDate} onChange={(e) => setPaymentDate(e.target.value)} className={inputClass} />
            </div>
            <div>
              <label className="block text-[11px] font-medium text-slate-500 mb-1">Due Date</label>
              <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className={inputClass} />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-medium text-slate-500 mb-1">Owner</label>
            <select value={ownerId} onChange={(e) => setOwnerId(e.target.value)} className={inputClass}>
              <option value="">Me</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {toTitleCase(u.name)}
                </option>
              ))}
            </select>
          </div>

          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Notes"
            rows={2}
            className={inputClass}
          />
        </div>

        <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-slate-100">
          <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50 rounded-lg">
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={createPayment.isPending}
            className="px-4 py-2 text-sm font-semibold bg-[var(--theme-accent)] hover:bg-[var(--theme-accent-hover)] text-white rounded-lg disabled:opacity-50"
          >
            Record Payment
          </button>
        </div>
      </div>
    </div>
  );
}
