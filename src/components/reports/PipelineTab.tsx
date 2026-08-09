import { usePipelineReport } from '../../hooks/useReports';
import { ReportStatCard } from './ReportWidgets';
import { LoadingState, EmptyState } from './OverviewTab';

export default function PipelineTab() {
  const { data, isLoading } = usePipelineReport();

  if (isLoading) return <LoadingState />;
  if (!data) return <EmptyState />;

  const maxCount = Math.max(...data.by_stage.map((s) => s.count), 1);

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <ReportStatCard label="Avg Deal Value" value={`$${data.avg_deal_value.toLocaleString()}`} />
        <ReportStatCard
          label="Avg Days to Close"
          value={data.avg_days_to_close !== null ? data.avg_days_to_close.toFixed(0) : '--'}
        />
      </div>

      <div className="border border-slate-200 rounded-xl p-4">
        <h3 className="text-sm font-semibold text-slate-800 mb-3">Funnel by Stage</h3>
        <div className="space-y-2.5">
          {data.by_stage.map((s) => (
            <div key={s.stage_id} className="flex items-center gap-3">
              <span className="w-32 text-xs text-slate-500 shrink-0 truncate">{s.stage_name}</span>
              <div className="flex-1 h-6 bg-slate-100 rounded overflow-hidden">
                <div
                  className="h-full bg-indigo-500 rounded flex items-center px-2"
                  style={{ width: `${(s.count / maxCount) * 100}%` }}
                >
                  <span className="text-[10px] text-white font-semibold">{s.count}</span>
                </div>
              </div>
              <span className="w-20 text-right text-xs text-slate-500 shrink-0">
                ${s.value.toLocaleString()}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
