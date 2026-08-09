import { BarChart, Bar, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { useSalesReport } from '../../hooks/useReports';
import { ReportStatCard } from './ReportWidgets';
import { LoadingState, EmptyState } from './OverviewTab';

export default function SalesTab({ days }: { days: number }) {
  const { data, isLoading } = useSalesReport(days);

  if (isLoading) return <LoadingState />;
  if (!data) return <EmptyState />;

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-4">
      <div className="grid grid-cols-4 gap-3">
        <ReportStatCard label="Deals Won" value={data.won_count} tone="text-emerald-600" />
        <ReportStatCard label="Deals Lost" value={data.lost_count} tone="text-rose-600" />
        <ReportStatCard label="Win Rate" value={`${data.win_rate.toFixed(0)}%`} />
        <ReportStatCard label="Won Value" value={`$${data.won_value.toLocaleString()}`} />
      </div>

      <div className="border border-slate-200 rounded-xl p-4">
        <h3 className="text-sm font-semibold text-slate-800 mb-3">Revenue by Rep</h3>
        {data.revenue_by_rep.length === 0 ? (
          <p className="text-sm text-slate-400">No won deals in this range yet.</p>
        ) : (
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={data.revenue_by_rep}>
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} width={50} />
              <Tooltip formatter={(v: number) => `$${v.toLocaleString()}`} />
              <Bar dataKey="revenue" fill="#4f46e5" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
