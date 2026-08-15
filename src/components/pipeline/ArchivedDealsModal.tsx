import { useArchivedOpportunities, useRestoreOpportunities } from '../../hooks/useOpportunities';
import { toTitleCase } from '../../utils/text';

interface Props {
  open: boolean;
  pipelineId?: number;
  onClose: () => void;
}

function currency(n?: number | null) {
  if (n === undefined || n === null) return '--';
  return `$${n.toLocaleString(undefined, { minimumFractionDigits: 2 })}`;
}

function formatDate(value?: string | null) {
  if (!value) return '--';
  return new Date(value).toLocaleDateString(undefined, { month: 'short', day: '2-digit', year: 'numeric' });
}

export default function ArchivedDealsModal({ open, pipelineId, onClose }: Props) {
  const { data: archivedDeals = [], isLoading } = useArchivedOpportunities(pipelineId, open);
  const restoreOpportunities = useRestoreOpportunities(pipelineId);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[110] flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 shrink-0">
          <div>
            <h3 className="text-lg font-bold text-slate-800">Archived Deals</h3>
            <p className="text-xs text-slate-400 mt-0.5">Closed deals archived off the active board.</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <i className="fa-solid fa-xmark text-lg" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <p className="text-sm text-slate-400 text-center py-10">Loading archived deals...</p>
          ) : archivedDeals.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-10">No archived deals yet.</p>
          ) : (
            <div className="divide-y divide-slate-100">
              {archivedDeals.map((deal) => (
                <div key={deal.id} className="flex items-center justify-between gap-3 px-6 py-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-slate-800 truncate">{toTitleCase(deal.name)}</p>
                      <span
                        className={`shrink-0 text-[9px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded ${
                          deal.status === 'Won'
                            ? 'bg-emerald-100 text-emerald-700'
                            : 'bg-rose-100 text-rose-700'
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
          )}
        </div>
      </div>
    </div>
  );
}
