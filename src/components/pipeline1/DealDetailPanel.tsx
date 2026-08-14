import { Opportunity, Stage } from '../../types/opportunity';
import { useDeleteOpportunities, useUpdateOpportunity } from '../../hooks/useOpportunities';
import { getTagColorClasses } from '../../utils/tagColors';

interface Props {
  opportunity: Opportunity | null;
  stages: Stage[];
  pipelineId: number;
  onClose: () => void;
  onEdit: (opportunity: Opportunity) => void;
}

function currency(n?: number | null) {
  if (n === undefined || n === null) return '--';
  return `$${n.toLocaleString()}`;
}

const STATUS_COLORS: Record<string, string> = {
  Open: 'bg-blue-100 text-blue-800',
  Won: 'bg-emerald-100 text-emerald-800',
  Lost: 'bg-rose-100 text-rose-700',
};

export default function DealDetailPanel({
  opportunity,
  stages,
  pipelineId,
  onClose,
  onEdit,
}: Props) {
  const updateOpportunity = useUpdateOpportunity(pipelineId);
  const deleteOpportunities = useDeleteOpportunities(pipelineId);

  if (!opportunity) return null;

  const sortedStages = [...stages].sort((a, b) => a.display_order - b.display_order);

  function handleMoveStage(stageId: number) {
    updateOpportunity.mutate({ id: opportunity!.id, payload: { stage_id: stageId } });
  }

  function handleMarkWon() {
    updateOpportunity.mutate({
      id: opportunity!.id,
      payload: { status: 'Won', closed_at: new Date().toISOString() },
    });
  }

  function handleMarkLost() {
    updateOpportunity.mutate({
      id: opportunity!.id,
      payload: { status: 'Lost', closed_at: new Date().toISOString() },
    });
  }

  function handleDelete() {
    if (!confirm(`Delete "${opportunity!.name}"? This cannot be undone.`)) return;
    deleteOpportunities.mutate([opportunity!.id], { onSuccess: onClose });
  }

  return (
    <>
      <div className="fixed inset-0 bg-slate-900/40 z-[90]" onClick={onClose} />
      <div className="fixed top-0 right-0 h-full w-full max-w-md bg-white shadow-2xl z-[100] flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 shrink-0">
          <div>
            <h2 className="text-base font-bold text-slate-800">{opportunity.name}</h2>
            <span
              className={`inline-block mt-1 px-2 py-0.5 text-xs font-medium rounded-full ${
                STATUS_COLORS[opportunity.status] ?? 'bg-slate-100 text-slate-800'
              }`}
            >
              {opportunity.status}
            </span>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <i className="fa-solid fa-xmark text-lg" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          <Field label="Company" value={opportunity.company_name} />
          <div>
            <Field label="Contact" value={opportunity.contact_name} />
            {/* Deal's own tags + the linked contact's tags, combined —
                read-only here (this panel has no inline tag editor
                elsewhere either), just for at-a-glance context. */}
            {(() => {
              const allTags = [...(opportunity.tags ?? []), ...(opportunity.contact_tags ?? [])];
              return allTags.length > 0 ? (
                <div className="flex flex-wrap gap-1 mt-1.5">
                  {allTags.map((t) => (
                    <span
                      key={t.id}
                      className={`px-1.5 py-0.5 text-[10px] font-medium rounded-full ${getTagColorClasses(t.name)}`}
                    >
                      {t.name}
                    </span>
                  ))}
                </div>
              ) : null;
            })()}
          </div>
          <Field label="Value" value={currency(opportunity.deal_value)} />
          <Field label="Assigned To" value={opportunity.assigned_user_name} />
          <Field
            label="Expected Close"
            value={
              opportunity.expected_close
                ? new Date(opportunity.expected_close).toLocaleDateString()
                : undefined
            }
          />

          <div>
            <label className="block text-[11px] font-medium text-slate-500 mb-1">Stage</label>
            <select
              value={opportunity.stage_id}
              onChange={(e) => handleMoveStage(Number(e.target.value))}
              className="w-full px-2.5 py-1.5 text-sm border border-slate-200 rounded-lg"
            >
              {sortedStages.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>

          <div className="pt-2 border-t border-slate-100">
            <label className="block text-[11px] font-medium text-slate-500 mb-2">
              Activity Timeline
            </label>
            <p className="text-xs text-slate-400 italic">
              No activity yet — pull from the `activities` table (filtered by
              `opportunity_id`) once wired to live data.
            </p>
          </div>
        </div>

        <div className="p-4 border-t border-slate-200 shrink-0 space-y-2">
          <div className="flex gap-2">
            <button
              onClick={() => onEdit(opportunity)}
              className="flex-1 border border-slate-200 hover:bg-slate-50 text-slate-700 text-sm font-medium py-2 rounded-lg"
            >
              Edit
            </button>
            <button
              onClick={handleDelete}
              className="flex-1 border border-rose-200 hover:bg-rose-50 text-rose-600 text-sm font-medium py-2 rounded-lg"
            >
              Delete
            </button>
          </div>
          {opportunity.status === 'Open' && (
            <div className="flex gap-2">
              <button
                onClick={handleMarkWon}
                className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold py-2 rounded-lg"
              >
                Mark Won
              </button>
              <button
                onClick={handleMarkLost}
                className="flex-1 bg-rose-600 hover:bg-rose-700 text-white text-sm font-semibold py-2 rounded-lg"
              >
                Mark Lost
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

function Field({ label, value }: { label: string; value?: string }) {
  return (
    <div>
      <label className="block text-[11px] font-medium text-slate-500 mb-1">{label}</label>
      <p className="text-sm text-slate-700">{value || '--'}</p>
    </div>
  );
}
