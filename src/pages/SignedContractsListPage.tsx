import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useContracts } from '../hooks/useContracts';
import SignedContractViewModal from '../components/pipeline/SignedContractViewModal';

function money(n: number) {
  return `$${Number(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatSignedAt(iso: string) {
  return new Date(iso).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
}

// Every real, signed contract the requester can see (admin: all, rep: own
// deals) — a cross-deal complement to the deal-scoped Contracts section in
// each Deal Detail Modal, and to the deal-less templates list this page
// sits next to.
export default function SignedContractsListPage() {
  const navigate = useNavigate();
  const { data: contracts = [], isLoading, error } = useContracts();
  const signed = contracts.filter((c) => c.status === 'signed');
  const [viewSignedId, setViewSignedId] = useState<number | null>(null);

  return (
    <div className="flex-1 overflow-y-auto p-6">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center gap-3 mb-4">
          <button type="button" onClick={() => navigate('/documents/contracts')} className="text-slate-400 hover:text-slate-600">
            <i className="fa-solid fa-arrow-left" />
          </button>
          <h1 className="text-lg font-bold text-slate-800">Signed Contracts</h1>
        </div>

        {isLoading ? (
          <p className="text-sm text-slate-400">Loading...</p>
        ) : error ? (
          <p className="text-sm text-rose-600 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2">
            {error instanceof Error ? error.message : 'Failed to load contracts.'}
          </p>
        ) : signed.length === 0 ? (
          <p className="text-sm text-slate-400 italic">No signed contracts yet.</p>
        ) : (
          <div className="space-y-2">
            {signed.map((c) => (
              <div key={c.id} className="bg-white px-4 py-3 border border-slate-200 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-slate-800 truncate">{c.title}</p>
                    <p className="text-[11px] text-slate-400 truncate">
                      {c.opportunity_name} · {money(c.total_amount)}
                      {c.signed_at ? ` · Signed ${formatSignedAt(c.signed_at)}` : ''}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setViewSignedId(c.id)}
                    className="shrink-0 text-xs font-semibold text-indigo-600 hover:underline"
                  >
                    View
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <SignedContractViewModal contractId={viewSignedId} onClose={() => setViewSignedId(null)} />
    </div>
  );
}
