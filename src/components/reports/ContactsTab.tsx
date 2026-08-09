import { useContactsReport } from '../../hooks/useReports';
import { ReportStatCard, TrendChart } from './ReportWidgets';
import { LoadingState, EmptyState } from './OverviewTab';

export default function ContactsTab({ days }: { days: number }) {
  const { data, isLoading } = useContactsReport(days);

  if (isLoading) return <LoadingState />;
  if (!data) return <EmptyState />;

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-4">
      <ReportStatCard label="Total Contacts" value={data.total} />

      <TrendChart data={data.new_trend} label="New Contacts Over Time" />

      <div className="grid grid-cols-2 gap-4">
        <div className="border border-slate-200 rounded-xl p-4">
          <h3 className="text-sm font-semibold text-slate-800 mb-3">By Status</h3>
          <div className="space-y-2">
            {data.by_status.map((s) => (
              <div key={s.lead_status} className="flex items-center justify-between text-sm">
                <span className="text-slate-600">{s.lead_status}</span>
                <span className="font-semibold text-slate-800">{s.count}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="border border-slate-200 rounded-xl p-4">
          <h3 className="text-sm font-semibold text-slate-800 mb-3">By Lead Source</h3>
          <div className="space-y-2">
            {data.by_source.map((s) => (
              <div key={s.lead_source || '--'} className="flex items-center justify-between text-sm">
                <span className="text-slate-600">{s.lead_source || 'Unknown'}</span>
                <span className="font-semibold text-slate-800">{s.count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
