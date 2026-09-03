import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useProposals } from '../hooks/useProposals';
import ApprovedProposalViewModal from '../components/pipeline/ApprovedProposalViewModal';

function money(n: number) {
  return `$${Number(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatApprovedAt(iso: string) {
  return new Date(iso).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
}

// Every real, approved proposal the requester can see (admin: all, rep: own
// deals) — a cross-deal complement to the deal-less templates list this
// page sits next to.
export default function ApprovedProposalsListPage() {
  const navigate = useNavigate();
  const { data: proposals = [], isLoading, error } = useProposals();
  const approved = proposals.filter((p) => p.status === 'approved');
  const [viewId, setViewId] = useState<number | null>(null);

  return (
    <div className="flex-1 overflow-y-auto p-6">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center gap-3 mb-4">
          <button type="button" onClick={() => navigate('/documents/proposals')} className="text-slate-400 hover:text-slate-600">
            <i className="fa-solid fa-arrow-left" />
          </button>
          <h1 className="text-lg font-bold text-slate-800">Approved Proposals</h1>
        </div>

        {isLoading ? (
          <p className="text-sm text-slate-400">Loading...</p>
        ) : error ? (
          <p className="text-sm text-rose-600 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2">
            {error instanceof Error ? error.message : 'Failed to load proposals.'}
          </p>
        ) : approved.length === 0 ? (
          <p className="text-sm text-slate-400 italic">No approved proposals yet.</p>
        ) : (
          <div className="space-y-2">
            {approved.map((p) => (
              <div key={p.id} className="bg-white px-4 py-3 border border-slate-200 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-slate-800 truncate">{p.title}</p>
                    <p className="text-[11px] text-slate-400 truncate">
                      {p.opportunity_name} · {money(p.total_amount)}
                      {p.approved_at ? ` · Approved ${formatApprovedAt(p.approved_at)}` : ''}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setViewId(p.id)}
                    className="shrink-0 text-xs font-semibold text-[var(--theme-accent)] hover:underline"
                  >
                    View
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <ApprovedProposalViewModal proposalId={viewId} onClose={() => setViewId(null)} />
    </div>
  );
}
