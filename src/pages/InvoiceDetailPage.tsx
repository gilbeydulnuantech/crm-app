import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useInvoice, useUpdateInvoice, useVoidInvoice, useSendInvoice } from '../hooks/usePayments';
import { useInvoiceTemplates } from '../hooks/useInvoiceTemplates';
import { useCompanyProfile } from '../hooks/useCompanyProfile';
import { useAuth } from '../context/AuthContext';
import { INVOICE_STATUS_BADGE, InvoiceStatus } from '../types/payment';
import { InvoiceLineItemInput } from '../api/payments';
import InvoiceLineItemsEditor from '../components/payments/InvoiceLineItemsEditor';
import InvoiceDocumentPreview from '../components/payments/InvoiceDocumentPreview';
import NewPaymentModal from '../components/payments/NewPaymentModal';
import { toTitleCase } from '../utils/text';

function money(n: number) {
  return `$${Number(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
function formatDate(iso: string | null | undefined) {
  if (!iso) return '--';
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}
function formatDateTime(iso: string | null | undefined) {
  if (!iso) return '--';
  return new Date(iso).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
}

const TIMELINE_STEPS = ['Invoice Created', 'Invoice Sent', 'Viewed by Customer', 'Partial Payment', 'Payment Completed'];

export default function InvoiceDetailPage() {
  const { id } = useParams();
  const invoiceId = id ? Number(id) : null;
  const navigate = useNavigate();
  const { isAdmin } = useAuth();

  const { data: invoice, isLoading } = useInvoice(invoiceId);
  const updateInvoice = useUpdateInvoice();
  const voidInvoice = useVoidInvoice();
  const sendInvoice = useSendInvoice();
  const { data: invoiceTemplates = [] } = useInvoiceTemplates();
  const { data: company } = useCompanyProfile();
  const activeTemplate = invoiceTemplates.find((t) => t.is_active);

  const [editing, setEditing] = useState(false);
  const [editItems, setEditItems] = useState<InvoiceLineItemInput[]>([]);
  const [editDueDate, setEditDueDate] = useState('');
  const [editInternalNotes, setEditInternalNotes] = useState('');
  const [editCustomerNotes, setEditCustomerNotes] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [sendMsg, setSendMsg] = useState<string | null>(null);
  const [recordPaymentOpen, setRecordPaymentOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);

  useEffect(() => {
    if (!invoice) return;
    setEditItems(invoice.line_items.map((it) => ({ ...it })));
    setEditDueDate(invoice.due_date || '');
    setEditInternalNotes(invoice.internal_notes || '');
    setEditCustomerNotes(invoice.customer_notes || '');
  }, [invoice]);

  if (isLoading || !invoice) {
    return <div className="flex-1 flex items-center justify-center text-sm text-slate-400">Loading...</div>;
  }

  const customerName = invoice.contact_first_name
    ? toTitleCase(`${invoice.contact_first_name} ${invoice.contact_last_name || ''}`.trim())
    : invoice.account_name || 'Unknown';
  const billingAddress = [invoice.street_address, invoice.city, invoice.state, invoice.zip_code, invoice.country]
    .filter(Boolean)
    .join(', ');
  const canEdit = isAdmin;

  function handleSaveEdit() {
    if (!invoiceId) return;
    setError(null);
    const validItems = editItems.filter((it) => it.product.trim());
    if (validItems.length === 0) return setError('At least one line item is required.');
    updateInvoice.mutate(
      {
        id: invoiceId,
        line_items: validItems,
        due_date: editDueDate || null,
        internal_notes: editInternalNotes,
        customer_notes: editCustomerNotes,
      },
      {
        onSuccess: () => setEditing(false),
        onError: (err) => setError(err instanceof Error ? err.message : 'Failed to save.'),
      }
    );
  }

  function handleVoid() {
    if (!invoiceId) return;
    if (!window.confirm('Void this invoice? This cannot be undone.')) return;
    voidInvoice.mutate(invoiceId, { onError: (err) => setError(err instanceof Error ? err.message : 'Failed to void.') });
  }

  function handleSend() {
    if (!invoiceId) return;
    setSendMsg(null);
    sendInvoice.mutate(invoiceId, {
      onSuccess: (res) => setSendMsg(res.success ? 'Invoice sent.' : res.error || 'Could not send.'),
      onError: (err) => setSendMsg(err instanceof Error ? err.message : 'Could not send.'),
    });
  }

  const status: InvoiceStatus = invoice.status;
  const receiptStepIndex = invoice.timeline.some((t) => t.subtype === 'sent')
    ? invoice.status === 'paid'
      ? 4
      : invoice.amount_paid > 0
        ? 3
        : 1
    : 0;

  return (
    <div className="flex-1 overflow-y-auto bg-slate-50">
      <div className="bg-white border-b border-slate-200 px-6 py-4">
        <button
          type="button"
          onClick={() => navigate('/payments/invoices')}
          className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 mb-2"
        >
          <i className="fa-solid fa-chevron-left text-xs" />
          Back
        </button>
        <div className="flex items-center gap-3">
          <h1 className="text-lg font-bold text-slate-800">{invoice.invoice_number}</h1>
          <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${INVOICE_STATUS_BADGE[status]}`}>
            {status.replace('_', ' ')}
          </span>
        </div>
        <p className="text-xs text-slate-500">
          {invoice.account_name || customerName} · Due: {formatDate(invoice.due_date)}
        </p>

        <div className="flex items-center gap-2 mt-3 flex-wrap">
          {canEdit && status !== 'voided' && (
            <button
              type="button"
              onClick={() => setEditing((v) => !v)}
              className="px-3 py-1.5 text-xs font-semibold border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-lg"
            >
              <i className="fa-solid fa-pen mr-1" /> Edit
            </button>
          )}
          <button
            type="button"
            onClick={() => setPreviewOpen(true)}
            className="px-3 py-1.5 text-xs font-semibold border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-lg"
          >
            <i className="fa-solid fa-eye mr-1" /> Preview
          </button>
          <button
            type="button"
            onClick={handleSend}
            disabled={sendInvoice.isPending}
            className="px-3 py-1.5 text-xs font-semibold border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-lg disabled:opacity-50"
          >
            <i className="fa-solid fa-paper-plane mr-1" /> Send
          </button>
          {status !== 'voided' && status !== 'paid' && (
            <button
              type="button"
              onClick={() => setRecordPaymentOpen(true)}
              className="px-3 py-1.5 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg"
            >
              Record Payment
            </button>
          )}
          {canEdit && status !== 'voided' && (
            <button
              type="button"
              onClick={handleVoid}
              className="px-3 py-1.5 text-xs font-semibold border border-rose-200 hover:bg-rose-50 text-rose-600 rounded-lg"
            >
              Void
            </button>
          )}
          {!canEdit && (
            <span className="text-[11px] text-slate-400 italic">Editing, voiding, and refunds are admin-only.</span>
          )}
        </div>
        {sendMsg && <p className="text-xs text-slate-500 mt-2">{sendMsg}</p>}
        {error && <p className="text-xs text-rose-600 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2 mt-2">{error}</p>}
      </div>

      <div className="p-6 grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Customer */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 text-xs space-y-1">
          <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">Customer</h2>
          <p className="text-sm font-semibold text-slate-800">{customerName}</p>
          {invoice.account_name && <p className="text-slate-500">{invoice.account_name}</p>}
          {invoice.contact_email && <p className="text-slate-500">{invoice.contact_email}</p>}
          {invoice.contact_phone && <p className="text-slate-500">{invoice.contact_phone}</p>}
          {billingAddress && <p className="text-slate-400 mt-1">{billingAddress}</p>}
        </div>

        {/* Related records */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 text-xs space-y-1.5">
          <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">Related</h2>
          <div className="flex justify-between"><span className="text-slate-400">Deal</span><span>{invoice.deal_name || '--'}</span></div>
          <div className="flex justify-between"><span className="text-slate-400">Owner</span><span>{invoice.owner_name ? toTitleCase(invoice.owner_name) : '--'}</span></div>
          {invoice.related_tickets.length > 0 && (
            <div className="pt-1.5 border-t border-slate-100 mt-1.5">
              <span className="text-slate-400 block mb-1">Related Tickets</span>
              {invoice.related_tickets.slice(0, 4).map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => navigate(`/tickets/${t.id}`)}
                  className="block text-[var(--theme-accent)] hover:underline truncate w-full text-left"
                >
                  {t.subject}
                </button>
              ))}
            </div>
          )}
          {invoice.contact_id && (
            <button
              type="button"
              onClick={() => navigate(`/contacts?contactId=${invoice.contact_id}`)}
              className="block text-[var(--theme-accent)] hover:underline pt-1"
            >
              View Customer
            </button>
          )}
        </div>

        {/* Invoice summary */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 text-xs space-y-1">
          <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">Invoice Summary</h2>
          <div className="flex justify-between"><span className="text-slate-400">Subtotal</span><span>{money(invoice.amount)}</span></div>
          <div className="flex justify-between"><span className="text-slate-400">Discount</span><span>{money(invoice.discount)}</span></div>
          <div className="flex justify-between"><span className="text-slate-400">Tax</span><span>{money(invoice.tax)}</span></div>
          <div className="flex justify-between font-bold text-slate-800 pt-1 border-t border-slate-100">
            <span>Invoice Total</span><span>{money(invoice.total)}</span>
          </div>
          <div className="flex justify-between text-emerald-600 pt-1"><span>Paid</span><span>{money(invoice.amount_paid)}</span></div>
          <div className="flex justify-between font-semibold"><span className="text-slate-500">Outstanding</span><span>{money(invoice.outstanding)}</span></div>
        </div>
      </div>

      <div className="px-6 pb-6 space-y-4">
        {/* Invoice items */}
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-3">Invoice Items</h2>
          {editing ? (
            <>
              <InvoiceLineItemsEditor items={editItems} onChange={setEditItems} />
              <div className="grid grid-cols-2 gap-3 mt-3">
                <div>
                  <label className="block text-[11px] font-medium text-slate-500 mb-1">Due Date</label>
                  <input
                    type="date"
                    value={editDueDate}
                    onChange={(e) => setEditDueDate(e.target.value)}
                    className="px-2.5 py-1.5 text-sm border border-slate-200 rounded-lg w-full"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 mt-3">
                <div>
                  <label className="block text-[11px] font-medium text-slate-500 mb-1">Internal Notes</label>
                  <textarea value={editInternalNotes} onChange={(e) => setEditInternalNotes(e.target.value)} rows={2} className="px-2.5 py-1.5 text-sm border border-slate-200 rounded-lg w-full" />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-slate-500 mb-1">Customer Notes</label>
                  <textarea value={editCustomerNotes} onChange={(e) => setEditCustomerNotes(e.target.value)} rows={2} className="px-2.5 py-1.5 text-sm border border-slate-200 rounded-lg w-full" />
                </div>
              </div>
              <div className="flex justify-end gap-2 mt-3">
                <button type="button" onClick={() => setEditing(false)} className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 rounded-lg">
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveEdit}
                  disabled={updateInvoice.isPending}
                  className="px-3 py-1.5 text-xs font-semibold bg-[var(--theme-accent)] hover:bg-[var(--theme-accent-hover)] text-white rounded-lg disabled:opacity-50"
                >
                  Save
                </button>
              </div>
            </>
          ) : (
            <table className="w-full text-xs">
              <thead>
                <tr className="text-left text-slate-400 uppercase tracking-wide border-b border-slate-100">
                  <th className="py-1.5 pr-2 font-semibold">Product / Service</th>
                  <th className="py-1.5 px-2 font-semibold text-right">Qty</th>
                  <th className="py-1.5 px-2 font-semibold text-right">Unit Price</th>
                  <th className="py-1.5 px-2 font-semibold text-right">Discount</th>
                  <th className="py-1.5 px-2 font-semibold text-right">Tax</th>
                  <th className="py-1.5 pl-2 font-semibold text-right">Total</th>
                </tr>
              </thead>
              <tbody>
                {invoice.line_items.map((it, i) => (
                  <tr key={i} className="border-b border-slate-50 last:border-0">
                    <td className="py-1.5 pr-2 font-medium text-slate-700">{it.product}</td>
                    <td className="py-1.5 px-2 text-right">{it.qty}</td>
                    <td className="py-1.5 px-2 text-right">{money(it.unit_price)}</td>
                    <td className="py-1.5 px-2 text-right">{money(it.discount)}</td>
                    <td className="py-1.5 px-2 text-right">{money(it.tax)}</td>
                    <td className="py-1.5 pl-2 text-right font-semibold">{money(it.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Payment history */}
          <div className="bg-white border border-slate-200 rounded-xl p-4">
            <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-3">Payment History</h2>
            {invoice.payments.length === 0 ? (
              <p className="text-xs text-slate-400 italic">No payments recorded yet.</p>
            ) : (
              <div className="space-y-2">
                {invoice.payments.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => navigate(`/payments/${p.id}`)}
                    className="w-full flex items-center justify-between text-xs px-2 py-1.5 rounded-lg hover:bg-slate-50 text-left"
                  >
                    <span className="font-medium text-[var(--theme-accent)]">{p.payment_number}</span>
                    <span className="text-slate-500">{p.method ? toTitleCase(p.method.replace('_', ' ')) : '--'}</span>
                    <span className="font-semibold">{money(p.amount_received)}</span>
                    <span className="text-slate-400">{formatDate(p.payment_date)}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Timeline */}
          <div className="bg-white border border-slate-200 rounded-xl p-4">
            <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-3">Invoice Timeline</h2>
            <div className="flex items-center mb-3">
              {TIMELINE_STEPS.map((step, i) => (
                <div key={step} className="flex items-center flex-1 last:flex-none">
                  <div
                    className={`w-2 h-2 rounded-full shrink-0 ${i <= receiptStepIndex ? 'bg-emerald-500' : 'bg-slate-200'}`}
                    title={step}
                  />
                  {i < TIMELINE_STEPS.length - 1 && (
                    <div className={`flex-1 h-0.5 ${i < receiptStepIndex ? 'bg-emerald-500' : 'bg-slate-100'}`} />
                  )}
                </div>
              ))}
            </div>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {invoice.timeline.length === 0 ? (
                <p className="text-xs text-slate-400 italic">No activity yet.</p>
              ) : (
                invoice.timeline.map((event) => (
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
          </div>
        </div>

        {/* Notes */}
        {(invoice.internal_notes || invoice.customer_notes) && (
          <div className="bg-white border border-slate-200 rounded-xl p-4 grid grid-cols-2 gap-4 text-xs">
            <div>
              <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">Internal Notes</h2>
              <p className="text-slate-600 whitespace-pre-wrap">{invoice.internal_notes || '--'}</p>
            </div>
            <div>
              <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">Customer Notes</h2>
              <p className="text-slate-600 whitespace-pre-wrap">{invoice.customer_notes || '--'}</p>
            </div>
          </div>
        )}
      </div>

      <NewPaymentModal
        open={recordPaymentOpen}
        onClose={() => setRecordPaymentOpen(false)}
        onCreated={(paymentId) => {
          setRecordPaymentOpen(false);
          navigate(`/payments/${paymentId}`);
        }}
        initialInvoiceId={invoice.id}
      />

      {previewOpen && (
        <div className="fixed inset-0 z-[120] bg-black/40 flex items-center justify-center p-6" onClick={() => setPreviewOpen(false)}>
          <div className="bg-white rounded-xl max-h-full overflow-hidden flex flex-col shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 shrink-0">
              <p className="text-sm font-semibold text-slate-800">
                Invoice Preview
                {!activeTemplate && <span className="text-slate-400 font-normal"> — using default appearance</span>}
              </p>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-3 py-1.5 text-xs font-semibold border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-lg"
                >
                  <i className="fa-solid fa-print mr-1" /> Print / Save PDF
                </button>
                <button type="button" onClick={() => setPreviewOpen(false)} className="text-slate-400 hover:text-slate-600 px-1">
                  <i className="fa-solid fa-xmark" />
                </button>
              </div>
            </div>
            <div className="overflow-y-auto p-6 bg-slate-100" id="invoice-print-area">
              <InvoiceDocumentPreview
                settings={activeTemplate?.settings || {}}
                company={company}
                lineItems={invoice.line_items}
                data={{
                  invoiceNumber: invoice.invoice_number,
                  issueDate: formatDate(invoice.issue_date),
                  dueDate: formatDate(invoice.due_date),
                  customerName,
                  customerAddress: billingAddress || undefined,
                  customerEmail: invoice.contact_email || undefined,
                  customerPhone: invoice.contact_phone || undefined,
                  paymentInstructions: undefined,
                  notes: invoice.customer_notes || undefined,
                  amountPaid: invoice.amount_paid,
                }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
