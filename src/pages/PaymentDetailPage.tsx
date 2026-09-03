import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { usePayment, useUpdatePayment, useAddPaymentNote, useSendReceipt } from '../hooks/usePayments';
import { PAYMENT_STATUS_BADGE } from '../types/payment';
import { toTitleCase } from '../utils/text';

const inputClass =
  'px-2.5 py-1.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--theme-accent)]';

function money(n: number) {
  return `$${Number(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatDateTime(iso: string | null | undefined) {
  if (!iso) return '--';
  return new Date(iso).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
}

const STEPS = ['Invoice Created', 'Payment Requested', 'Payment Attempted', 'Payment Successful', 'Receipt Sent'];

export default function PaymentDetailPage() {
  const { id } = useParams();
  const paymentId = id ? Number(id) : null;
  const navigate = useNavigate();

  const { data: payment, isLoading } = usePayment(paymentId);
  const updatePayment = useUpdatePayment();
  const addNote = useAddPaymentNote();
  const sendReceipt = useSendReceipt();

  const [noteText, setNoteText] = useState('');
  const [refunding, setRefunding] = useState(false);
  const [refundAmount, setRefundAmount] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [receiptMsg, setReceiptMsg] = useState<string | null>(null);

  if (isLoading || !payment) {
    return <div className="flex-1 flex items-center justify-center text-sm text-slate-400">Loading...</div>;
  }

  const customerName = payment.contact_first_name
    ? toTitleCase(`${payment.contact_first_name} ${payment.contact_last_name || ''}`.trim())
    : payment.account_name || 'Unknown';

  function patch(fields: Parameters<typeof updatePayment.mutate>[0]) {
    setError(null);
    updatePayment.mutate(fields, { onError: (err) => setError(err instanceof Error ? err.message : 'Update failed.') });
  }

  function handleAddNote() {
    if (!noteText.trim() || !paymentId) return;
    addNote.mutate({ paymentId, note: noteText.trim() }, { onSuccess: () => setNoteText('') });
  }

  function handleRefund() {
    if (!paymentId || !payment) return;
    const amt = Number(refundAmount);
    if (!Number.isFinite(amt) || amt <= 0) return setError('Enter a valid refund amount.');
    const full = amt >= Number(payment.amount_received);
    patch({ id: paymentId, status: full ? 'refunded' : 'partially_refunded', refunded_amount: amt });
    setRefunding(false);
    setRefundAmount('');
  }

  function handleSendReceipt() {
    if (!paymentId) return;
    setReceiptMsg(null);
    sendReceipt.mutate(paymentId, {
      onSuccess: (res) => setReceiptMsg(res.success ? 'Receipt sent.' : res.error || 'Could not send receipt.'),
      onError: (err) => setReceiptMsg(err instanceof Error ? err.message : 'Could not send receipt.'),
    });
  }

  const receiptSent = payment.timeline.some((t) => t.subtype === 'receipt_sent');
  const currentStepIndex = payment.status === 'cancelled' || payment.status === 'failed'
    ? 2
    : receiptSent
      ? 4
      : payment.status === 'paid' || payment.status === 'partially_paid'
        ? 3
        : payment.invoice_id
          ? 1
          : 0;

  return (
    <div className="flex-1 overflow-y-auto bg-slate-50">
      <div className="bg-white border-b border-slate-200 px-6 py-4">
        <button
          type="button"
          onClick={() => navigate('/payments')}
          className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 mb-2"
        >
          <i className="fa-solid fa-chevron-left text-xs" />
          Back
        </button>
        <div className="flex items-center gap-3">
          <h1 className="text-lg font-bold text-slate-800">{payment.payment_number}</h1>
          <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${payment.is_overdue ? 'bg-rose-50 text-rose-700' : PAYMENT_STATUS_BADGE[payment.status]}`}>
            {payment.is_overdue ? 'Overdue' : payment.status.replace('_', ' ')}
          </span>
        </div>
        <p className="text-xs text-slate-500">
          {customerName} · {money(payment.amount)}
          {payment.invoice_number ? ` · ${payment.invoice_number}` : ''}
        </p>

        <div className="flex items-center gap-2 mt-3 flex-wrap">
          {payment.status !== 'paid' && payment.status !== 'cancelled' && payment.status !== 'refunded' && (
            <button
              type="button"
              onClick={() => payment && patch({ id: payment.id, status: 'paid', amount_received: payment.amount })}
              className="px-3 py-1.5 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg"
            >
              Mark Paid
            </button>
          )}
          {payment.status !== 'failed' && payment.status !== 'paid' && payment.status !== 'cancelled' && (
            <button
              type="button"
              onClick={() => patch({ id: payment.id, status: 'failed' })}
              className="px-3 py-1.5 text-xs font-semibold border border-rose-200 hover:bg-rose-50 text-rose-600 rounded-lg"
            >
              Mark Failed
            </button>
          )}
          {(payment.status === 'paid' || payment.status === 'partially_paid') && (
            <button
              type="button"
              onClick={() => setRefunding((v) => !v)}
              className="px-3 py-1.5 text-xs font-semibold border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-lg"
            >
              Refund
            </button>
          )}
          {payment.status !== 'cancelled' && payment.status !== 'paid' && payment.status !== 'refunded' && (
            <button
              type="button"
              onClick={() => patch({ id: payment.id, status: 'cancelled' })}
              className="px-3 py-1.5 text-xs font-semibold border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-lg"
            >
              Cancel Payment
            </button>
          )}
          <button
            type="button"
            onClick={handleSendReceipt}
            disabled={sendReceipt.isPending}
            className="px-3 py-1.5 text-xs font-semibold border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-lg disabled:opacity-50"
          >
            <i className="fa-solid fa-envelope mr-1" /> Send Receipt
          </button>
          {payment.contact_id && (
            <button
              type="button"
              onClick={() => navigate(`/contacts?contactId=${payment.contact_id}`)}
              className="px-3 py-1.5 text-xs font-semibold text-[var(--theme-accent)] hover:underline"
            >
              View Customer
            </button>
          )}
        </div>
        {receiptMsg && <p className="text-xs text-slate-500 mt-2">{receiptMsg}</p>}
        {refunding && (
          <div className="flex items-center gap-2 mt-3">
            <input
              type="number"
              value={refundAmount}
              onChange={(e) => setRefundAmount(e.target.value)}
              placeholder={`Up to ${money(payment.amount_received)}`}
              className={`${inputClass} w-40`}
            />
            <button type="button" onClick={handleRefund} className="px-3 py-1.5 text-xs font-semibold bg-slate-800 text-white rounded-lg">
              Confirm Refund
            </button>
          </div>
        )}
      </div>

      {error && (
        <div className="px-6 pt-3">
          <p className="text-xs text-rose-600 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2">{error}</p>
        </div>
      )}

      <div className="p-6 flex gap-6 items-start">
        {/* Left column */}
        <div className="flex-1 min-w-0 space-y-4">
          {/* Payment Timeline (progress) */}
          <div className="bg-white border border-slate-200 rounded-xl p-4">
            <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-3">Payment Timeline</h2>
            <div className="flex items-center">
              {STEPS.map((step, i) => (
                <div key={step} className="flex items-center flex-1 last:flex-none">
                  <div className="flex flex-col items-center gap-1">
                    <div
                      className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ${
                        i <= currentStepIndex ? 'bg-emerald-500 text-white' : 'bg-slate-100 text-slate-400'
                      }`}
                    >
                      {i <= currentStepIndex ? <i className="fa-solid fa-check" /> : i + 1}
                    </div>
                    <span className="text-[10px] text-slate-500 text-center w-20">{step}</span>
                  </div>
                  {i < STEPS.length - 1 && (
                    <div className={`flex-1 h-0.5 mx-1 mb-4 ${i < currentStepIndex ? 'bg-emerald-500' : 'bg-slate-100'}`} />
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Activity log */}
          <div className="bg-white border border-slate-200 rounded-xl p-4">
            <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-3">Activity</h2>
            <div className="space-y-3 max-h-72 overflow-y-auto">
              {payment.timeline.length === 0 ? (
                <p className="text-xs text-slate-400 italic">No activity yet.</p>
              ) : (
                payment.timeline.map((event) => (
                  <div key={event.id} className="flex items-start gap-2.5">
                    <i className="fa-solid fa-circle-dot text-slate-300 text-[8px] mt-1.5 shrink-0" />
                    <div className="min-w-0">
                      <p className="text-xs text-slate-600">{event.summary}</p>
                      <span className="text-[10px] text-slate-400">{formatDateTime(event.created_at)}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
            <div className="flex gap-2 mt-3 pt-3 border-t border-slate-100">
              <input
                type="text"
                value={noteText}
                onChange={(e) => setNoteText(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddNote()}
                placeholder="Add a note..."
                className={`${inputClass} flex-1`}
              />
              <button
                type="button"
                onClick={handleAddNote}
                className="px-3 py-1.5 text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg"
              >
                Add Note
              </button>
            </div>
          </div>
        </div>

        {/* Right sidebar */}
        <div className="w-80 shrink-0 space-y-4">
          {/* Payment details */}
          <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-1.5 text-xs">
            <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">Payment Details</h2>
            <div className="flex justify-between"><span className="text-slate-400">Amount</span><span className="font-semibold">{money(payment.amount)}</span></div>
            <div className="flex justify-between"><span className="text-slate-400">Received</span><span className="font-semibold text-emerald-600">{money(payment.amount_received)}</span></div>
            {payment.refunded_amount > 0 && (
              <div className="flex justify-between"><span className="text-slate-400">Refunded</span><span className="font-semibold text-rose-600">{money(payment.refunded_amount)}</span></div>
            )}
            <div className="flex justify-between"><span className="text-slate-400">Method</span><span>{payment.method ? toTitleCase(payment.method.replace('_', ' ')) : '--'}</span></div>
            <div className="flex justify-between"><span className="text-slate-400">Reference</span><span>{payment.reference || '--'}</span></div>
            <div className="flex justify-between"><span className="text-slate-400">Payment Date</span><span>{payment.payment_date || '--'}</span></div>
            <div className="flex justify-between"><span className="text-slate-400">Due Date</span><span>{payment.due_date || '--'}</span></div>
            <div className="flex justify-between"><span className="text-slate-400">Invoice</span><span>{payment.invoice_number || '--'}</span></div>
            <div className="flex justify-between"><span className="text-slate-400">Deal</span><span className="truncate ml-2">{payment.deal_name || '--'}</span></div>
            <div className="flex justify-between"><span className="text-slate-400">Owner</span><span>{payment.owner_name ? toTitleCase(payment.owner_name) : '--'}</span></div>
            {payment.notes && (
              <div className="pt-1.5 border-t border-slate-100 mt-1.5">
                <span className="text-slate-400 block mb-0.5">Notes</span>
                <p className="text-slate-600 whitespace-pre-wrap">{payment.notes}</p>
              </div>
            )}
          </div>

          {/* Customer */}
          <div className="bg-white border border-slate-200 rounded-xl p-4 text-xs">
            <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">Customer</h2>
            <p className="text-sm font-semibold text-slate-800">{customerName}</p>
            {payment.account_name && <p className="text-slate-500">{payment.account_name}</p>}
            {payment.contact_email && <p className="text-slate-500">{payment.contact_email}</p>}
            {payment.contact_phone && <p className="text-slate-500">{payment.contact_phone}</p>}
            {payment.account_owner_name && <p className="text-slate-400 mt-1">Owner: {toTitleCase(payment.account_owner_name)}</p>}
          </div>

          {/* Customer payment history */}
          <div className="bg-white border border-slate-200 rounded-xl p-4 text-xs space-y-1.5">
            <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">Customer Payment History</h2>
            <div className="flex justify-between"><span className="text-slate-400">Total Spent</span><span className="font-semibold text-emerald-600">{money(payment.customer_total_spent)}</span></div>
            <div className="flex justify-between"><span className="text-slate-400">Total Refunded</span><span className="font-semibold text-rose-600">{money(payment.customer_total_refunded)}</span></div>
            <div className="flex justify-between"><span className="text-slate-400">Outstanding</span><span className="font-semibold">{payment.customer_outstanding_count}</span></div>
            <div className="flex justify-between"><span className="text-slate-400">Failed Payments</span><span className="font-semibold">{payment.customer_failed_count}</span></div>
            <div className="flex justify-between"><span className="text-slate-400">Total Payments</span><span className="font-semibold">{payment.customer_total_payments}</span></div>
          </div>
        </div>
      </div>
    </div>
  );
}
