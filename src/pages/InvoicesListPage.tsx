import { useNavigate } from 'react-router-dom';
import { useInvoices } from '../hooks/usePayments';
import { Invoice, INVOICE_STATUS_BADGE, InvoiceStatus } from '../types/payment';
import { toTitleCase } from '../utils/text';

function money(n: number) {
  return `$${Number(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatDate(iso: string | null | undefined) {
  if (!iso) return '--';
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

function invoiceStatus(inv: Invoice): InvoiceStatus {
  if (inv.is_voided) return 'voided';
  if (inv.amount_paid >= inv.total && inv.total > 0) return 'paid';
  if (inv.amount_paid > 0) return 'partially_paid';
  if (inv.due_date && new Date(inv.due_date) < new Date()) return 'overdue';
  return 'pending';
}

export default function InvoicesListPage() {
  const navigate = useNavigate();
  const { data: invoices = [], isLoading, error } = useInvoices();

  return (
    <div className="flex-1 overflow-y-auto p-6">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-lg font-bold text-slate-800">Invoices</h1>
        <button
          type="button"
          onClick={() => navigate('/payments/invoices/new')}
          className="px-4 py-2 text-sm font-semibold bg-[var(--theme-accent)] hover:bg-[var(--theme-accent-hover)] text-white rounded-lg flex items-center gap-2"
        >
          <i className="fa-solid fa-plus" />
          New Invoice
        </button>
      </div>

      {isLoading ? (
        <p className="text-sm text-slate-400">Loading...</p>
      ) : error ? (
        <p className="text-sm text-rose-600 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2">
          {error instanceof Error ? error.message : 'Failed to load invoices.'}
        </p>
      ) : invoices.length === 0 ? (
        <p className="text-sm text-slate-400 italic">No invoices yet.</p>
      ) : (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-left text-slate-400 uppercase tracking-wide border-b border-slate-100">
                <th className="px-4 py-2 font-semibold">Invoice #</th>
                <th className="px-4 py-2 font-semibold">Customer</th>
                <th className="px-4 py-2 font-semibold">Deal</th>
                <th className="px-4 py-2 font-semibold text-right">Total</th>
                <th className="px-4 py-2 font-semibold text-right">Paid</th>
                <th className="px-4 py-2 font-semibold">Status</th>
                <th className="px-4 py-2 font-semibold">Issue Date</th>
                <th className="px-4 py-2 font-semibold">Due Date</th>
              </tr>
            </thead>
            <tbody>
              {invoices.map((inv) => {
                const status = invoiceStatus(inv);
                return (
                  <tr
                    key={inv.id}
                    onClick={() => navigate(`/payments/invoices/${inv.id}`)}
                    className="border-b border-slate-50 last:border-0 hover:bg-slate-50 cursor-pointer"
                  >
                    <td className="px-4 py-2.5 font-medium text-[var(--theme-accent)]">{inv.invoice_number}</td>
                    <td className="px-4 py-2.5 text-slate-600">
                      {inv.contact_first_name ? toTitleCase(`${inv.contact_first_name} ${inv.contact_last_name || ''}`.trim()) : inv.account_name || '--'}
                    </td>
                    <td className="px-4 py-2.5 text-slate-500">{inv.deal_name || '--'}</td>
                    <td className="px-4 py-2.5 text-right font-semibold text-slate-700">{money(inv.total)}</td>
                    <td className="px-4 py-2.5 text-right text-emerald-600">{money(inv.amount_paid)}</td>
                    <td className="px-4 py-2.5">
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${INVOICE_STATUS_BADGE[status]}`}>
                        {toTitleCase(status.replace('_', ' '))}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-slate-400">{formatDate(inv.issue_date)}</td>
                    <td className="px-4 py-2.5 text-slate-400">{formatDate(inv.due_date)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
