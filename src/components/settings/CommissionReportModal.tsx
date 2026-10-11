import { Fragment, useMemo, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useCommissionReport } from '../../hooks/useBilling';
import { formatMoney } from '../../utils/eventPrice';
import { toTitleCase } from '../../utils/text';

interface Props {
  open: boolean;
  onClose: () => void;
}

const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const monthStart = () => {
  const d = new Date();
  return iso(new Date(d.getFullYear(), d.getMonth(), 1));
};

function csvCell(v: string | number | null | undefined) {
  const s = v == null ? '' : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

// Commission earned by each staff member for completed, confirmed visits in a date range. Admins see everyone; a rep
// sees the staff on their own list.
export default function CommissionReportModal({ open, onClose }: Props) {
  const { isAdmin } = useAuth();
  const [start, setStart] = useState(monthStart());
  const [end, setEnd] = useState(iso(new Date()));
  const [openStaff, setOpenStaff] = useState<number | null>(null);
  const { data, isLoading, isError } = useCommissionReport(start, end, open);

  const totals = useMemo(
    () => ({
      visits: (data?.summary ?? []).reduce((a, s) => a + s.visits, 0),
      paid: (data?.summary ?? []).reduce((a, s) => a + s.paid, 0),
      commission: (data?.summary ?? []).reduce((a, s) => a + s.commission, 0),
    }),
    [data]
  );

  if (!open) return null;

  function exportCsv() {
    const rows: (string | number)[][] = [['Date', 'Staff', 'Client', 'Service', 'List price', 'Discount', 'Amount paid', 'Commission %', 'Commission']];
    (data?.visits ?? []).forEach((v) =>
      rows.push([
        new Date(v.due_at).toLocaleDateString(),
        v.staff_name,
        v.client,
        v.subject,
        v.price ?? '',
        v.discount_name ? `${v.discount_name} (${v.discount_percent}%)` : '',
        v.amount_paid ?? '',
        v.commission_percent ?? '',
        v.commission_amount ?? '',
      ])
    );
    const blob = new Blob([rows.map((r) => r.map(csvCell).join(',')).join('\n')], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `commission-${start}-to-${end}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  return (
    <div className="fixed inset-0 bg-slate-900/70 z-[100] flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl p-6 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-1">
          <h3 className="text-lg font-bold text-slate-800">Commission report</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600" aria-label="Close">
            <i className="fa-solid fa-xmark" />
          </button>
        </div>
        <p className="text-xs text-slate-500 mb-3">
          Counts visits that were confirmed and then marked completed. Commission is the staff member's percentage of the amount actually paid, after any
          discount card. {isAdmin ? 'Showing everyone.' : 'Showing your own staff.'}
        </p>

        <div className="flex flex-wrap items-center gap-2 mb-4">
          <input type="date" value={start} onChange={(e) => setStart(e.target.value)} className="px-2 py-1 text-sm border border-slate-200 rounded-md" aria-label="From" />
          <span className="text-xs text-slate-400">to</span>
          <input type="date" value={end} onChange={(e) => setEnd(e.target.value)} className="px-2 py-1 text-sm border border-slate-200 rounded-md" aria-label="To" />
          <button
            type="button"
            onClick={exportCsv}
            disabled={!data?.visits?.length}
            className="ml-auto px-3 py-1.5 text-xs font-semibold border border-slate-200 rounded-md text-slate-600 hover:bg-slate-50 disabled:opacity-40"
          >
            <i className="fa-solid fa-file-csv mr-1.5" />
            Export CSV
          </button>
        </div>

        {isLoading && <p className="text-xs text-slate-400">Loading...</p>}
        {(isError || (data && !data.success)) && <p className="text-xs text-rose-600">{data?.error || 'Could not load the report.'}</p>}
        {data?.success && data.summary.length === 0 && <p className="text-sm text-slate-400 py-4">No completed, confirmed visits in this range.</p>}
        {data?.success && data.summary.length > 0 && (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[11px] uppercase tracking-wide text-slate-400 border-b border-slate-200">
                <th className="py-1.5 font-semibold">Staff</th>
                <th className="py-1.5 font-semibold text-right">Visits</th>
                <th className="py-1.5 font-semibold text-right">Amount paid</th>
                <th className="py-1.5 font-semibold text-right">Commission</th>
              </tr>
            </thead>
            <tbody>
              {data.summary.map((s) => (
                <Fragment key={s.staff_id}>
                  <tr onClick={() => setOpenStaff(openStaff === s.staff_id ? null : s.staff_id)} className="border-b border-slate-100 cursor-pointer hover:bg-slate-50">
                    <td className="py-2">
                      <i className={`fa-solid fa-chevron-${openStaff === s.staff_id ? 'down' : 'right'} text-[10px] text-slate-400 mr-2`} />
                      <span className="font-medium text-slate-800">{toTitleCase(s.staff_name)}</span>
                      {isAdmin && s.owner_name && <span className="ml-2 text-[11px] text-slate-400">{toTitleCase(s.owner_name)}'s list</span>}
                    </td>
                    <td className="py-2 text-right">{s.visits}</td>
                    <td className="py-2 text-right">{formatMoney(s.paid)}</td>
                    <td className="py-2 text-right font-semibold text-emerald-700">{formatMoney(s.commission)}</td>
                  </tr>
                  {openStaff === s.staff_id &&
                    data.visits
                      .filter((v) => v.staff_id === s.staff_id)
                      .map((v) => (
                        <tr key={`v${v.id}`} className="text-xs text-slate-500 bg-slate-50/60">
                          <td className="py-1 pl-6">
                            {new Date(v.due_at).toLocaleDateString()} · {v.subject}
                            {v.client ? ` · ${toTitleCase(v.client)}` : ''}
                          </td>
                          <td className="py-1 text-right">{v.discount_name ? `${v.discount_name} (-${v.discount_percent}%)` : ''}</td>
                          <td className="py-1 text-right">{formatMoney(v.amount_paid)}</td>
                          <td className="py-1 text-right">
                            {formatMoney(v.commission_amount)}
                            {v.commission_percent != null ? ` (${v.commission_percent}%)` : ''}
                          </td>
                        </tr>
                      ))}
                </Fragment>
              ))}
            </tbody>
            <tfoot>
              <tr className="font-semibold text-slate-800">
                <td className="py-2">Total</td>
                <td className="py-2 text-right">{totals.visits}</td>
                <td className="py-2 text-right">{formatMoney(totals.paid)}</td>
                <td className="py-2 text-right text-emerald-700">{formatMoney(totals.commission)}</td>
              </tr>
            </tfoot>
          </table>
        )}

        <div className="flex justify-end pt-4">
          <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 rounded-lg">
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
