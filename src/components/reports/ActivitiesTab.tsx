import { useActivitiesReport } from '../../hooks/useReports';
import { ReportStatCard, TrendChart } from './ReportWidgets';
import { LoadingState, EmptyState } from './OverviewTab';

export default function ActivitiesTab({ days }: { days: number }) {
  const { data, isLoading } = useActivitiesReport(days);

  if (isLoading) return <LoadingState />;
  if (!data) return <EmptyState />;

  const total = data.completed_vs_open.completed + data.completed_vs_open.open;
  const completionRate = total > 0 ? (data.completed_vs_open.completed / total) * 100 : 0;

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-4">
      <div className="grid grid-cols-3 gap-3">
        <ReportStatCard label="Completed" value={data.completed_vs_open.completed} tone="text-emerald-600" />
        <ReportStatCard label="Open" value={data.completed_vs_open.open} />
        <ReportStatCard label="Completion Rate" value={`${completionRate.toFixed(0)}%`} />
      </div>

      <TrendChart data={data.trend} label="Activity Volume Over Time" />

      <div className="border border-slate-200 rounded-xl p-4">
        <h3 className="text-sm font-semibold text-slate-800 mb-3">By Type</h3>
        <div className="space-y-2">
          {data.by_type.map((t) => (
            <div key={t.type} className="flex items-center justify-between text-sm">
              <span className="text-slate-600 capitalize">{t.type.replace('_', ' ')}</span>
              <span className="font-semibold text-slate-800">{t.count}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
