import { Opportunity } from '../../types/opportunity';
import { useRestoreOpportunities } from '../../hooks/useOpportunities';
import { toTitleCase } from '../../utils/text';

interface Props {
  deals: Opportunity[];
  isLoading: boolean;
  pipelineId?: number;
}

function currency(n?: number | null) {
  if (n === undefined || n === null) return '--';
  return `$${n.toLocaleString(undefined, { minimumFractionDigits: 2 })}`;
}

function formatDate(value?: string | null) {
  if (!value) return '--';
  return new Date(value).toLocaleDateString(undefined, { month: 'short', day: '2-digit', year: 'numeric' });
}

// Inline counterpart to the Kanban board / list view for the Archived tab —
// archived deals are terminal (Won/Lost) so grouping them into pipeline
// stage columns doesn't make sense; a flat list with a Restore action does.
export default function ArchivedDealsList({ deals, isLoading, pipelineId }: Props) {
  const restoreOpportunities = useRestoreOpportunities(pipelineId);

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center text-sm text-slate-400">
        Loading archived deals...
      </div>
    );
  }

  if (deals.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center text-sm text-slate-400">
        No archived deals found.
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto px-4">
      <div className="divide-y divide-slate-100">
        {deals.map((deal) => (
          <div key={deal.id} className="flex items-center justify-between gap-3 py-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <p className="text-sm font-semibold text-slate-800 truncate">{toTitleCase(deal.name)}</p>
                <span
                  className={`shrink-0 text-[9px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded ${
                    deal.status === 'Won' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
                  }`}
                >
                  {deal.status === 'Won' ? 'Closed Won' : 'Closed Lost'}
                </span>
              </div>
              <p className="text-xs text-slate-400 truncate mt-0.5">
                {toTitleCase(deal.company_name) || 'No Company'} · {currency(deal.deal_value)} · Archived{' '}
                {formatDate(deal.archived_at)}
              </p>
            </div>
            <button
              onClick={() => restoreOpportunities.mutate([deal.id])}
              disabled={restoreOpportunities.isPending}
              className="shrink-0 text-xs font-semibold text-[var(--theme-accent)] hover:text-[var(--theme-accent-hover)] disabled:opacity-50 border border-slate-200 rounded-lg px-3 py-1.5 hover:bg-slate-50"
            >
              Restore
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
