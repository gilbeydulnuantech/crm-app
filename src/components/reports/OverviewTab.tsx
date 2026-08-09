import { useOverviewReport } from '../../hooks/useReports';
import { ReportStatCard, TrendChart } from './ReportWidgets';

export default function OverviewTab({ days }: { days: number }) {
  const { data, isLoading } = useOverviewReport(days);

  if (isLoading) return <LoadingState />;
  if (!data) return <EmptyState />;

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-4">
      <div className="grid grid-cols-5 gap-3">
        <ReportStatCard label="Total Contacts" value={data.total_contacts} />
        <ReportStatCard label="Total Companies" value={data.total_companies} />
        <ReportStatCard label="Open Deals" value={data.open_deals} />
        <ReportStatCard label="Won This Month" value={data.won_this_month} tone="text-emerald-600" />
        <ReportStatCard label="Total Revenue" value={`$${data.total_revenue.toLocaleString()}`} />
      </div>
      <TrendChart data={data.revenue_trend} label="Revenue Trend" />
    </div>
  );
}

export function LoadingState() {
  return (
    <div className="flex-1 flex items-center justify-center text-sm text-slate-400">
      Loading report...
    </div>
  );
}

export function EmptyState() {
  return (
    <div className="flex-1 flex items-center justify-center text-sm text-slate-400">
      No data available.
    </div>
  );
}
