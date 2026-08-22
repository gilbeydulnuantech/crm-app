import { usePipelines, useOpportunities } from '../hooks/useOpportunities';

const inputClass =
  'w-full px-3 py-1.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--theme-accent)]';

export default function DealPicker({
  pipelineId,
  opportunityId,
  onChangePipeline,
  onChangeOpportunity,
}: {
  pipelineId: string;
  opportunityId: string;
  onChangePipeline: (v: string) => void;
  onChangeOpportunity: (v: string) => void;
}) {
  const { data: pipelines = [] } = usePipelines();
  const { data: opportunities = [] } = useOpportunities(pipelineId ? Number(pipelineId) : undefined);

  return (
    <div className="flex gap-2">
      <div className="flex-1">
        <label className="block text-xs font-medium text-slate-600 mb-1">Pipeline</label>
        <select value={pipelineId} onChange={(e) => onChangePipeline(e.target.value)} className={inputClass}>
          <option value="">Choose a pipeline...</option>
          {pipelines.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      </div>
      <div className="flex-1">
        <label className="block text-xs font-medium text-slate-600 mb-1">Deal</label>
        <select value={opportunityId} onChange={(e) => onChangeOpportunity(e.target.value)} disabled={!pipelineId} className={inputClass}>
          <option value="">Choose a deal...</option>
          {opportunities.map((o) => (
            <option key={o.id} value={o.id}>
              {o.name}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
