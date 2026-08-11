import { Opportunity, Stage } from '../../types/opportunity';
import { useDeleteOpportunities, useUpdateOpportunity } from '../../hooks/useOpportunities';
import { toTitleCase } from '../../utils/text';

interface Props {
  opportunity: Opportunity | null;
  stages: Stage[];
  pipelineId: number;
  onClose: () => void;
  onEdit: (opportunity: Opportunity) => void;
  isAdmin: boolean;
  currentUserId?: number;
}

/**
 * Formats values to USD currency.
 * Fixes the "0800" bug by casting to Number and using Intl.NumberFormat.
 */
function currency(val?: number | string | null) {
  if (val === undefined || val === null || val === '') return '--';
  
  const n = Number(val);
  if (isNaN(n)) return '--';

  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
  }).format(n);
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
  isAdmin,
  currentUserId,
}: Props) {
  const updateOpportunity = useUpdateOpportunity(pipelineId);
  const deleteOpportunities = useDeleteOpportunities(pipelineId);

  if (!opportunity) return null;

  // View All, Edit Owned Only: standard users can see every deal but only
  // edit/delete/move-stage the ones assigned to them. Admins can act on
  // anything. Backend enforces this too (Pipeline.json).
  const canEdit = isAdmin || opportunity.assigned_user === currentUserId;

  // Sort stages by display order for the dropdown
  const sortedStages = [...stages].sort((a, b) => a.display_order - b.display_order);

  // --- Handlers ---

  function handleMoveStage(stageId: number) {
    updateOpportunity.mutate({ 
      id: opportunity!.id, 
      payload: { stage_id: stageId } 
    });
  }

  function handleMarkWon() {
    updateOpportunity.mutate({
      id: opportunity!.id,
      payload: { 
        status: 'Won', 
        closed_at: new Date().toISOString() 
      },
    });
  }

  function handleMarkLost() {
    updateOpportunity.mutate({
      id: opportunity!.id,
      payload: { 
        status: 'Lost', 
        closed_at: new Date().toISOString() 
      },
    });
  }

  function handleDelete() {
    if (!confirm(`Delete "${opportunity!.name}"? This cannot be undone.`)) return;
    deleteOpportunities.mutate([opportunity!.id], { 
      onSuccess: onClose 
    });
  }

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-slate-900/40 z-[90] animate-in fade-in duration-200" 
        onClick={onClose} 
      />

      {/* Side Panel */}
      <div className="fixed top-0 right-0 h-full w-full max-w-md bg-white shadow-2xl z-[100] flex flex-col animate-in slide-in-from-right duration-300">
        
        {/* Header */}
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
          <button 
            onClick={onClose} 
            className="p-2 -mr-2 text-slate-400 hover:text-slate-600 transition-colors"
          >
            <i className="fa-solid fa-xmark text-lg" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <Field label="Company" value={opportunity.company_name} />
            <Field label="Contact" value={toTitleCase(opportunity.contact_name)} />
            <Field label="Value" value={currency(opportunity.deal_value)} />
            <Field label="Assigned To" value={opportunity.assigned_user_name} />
          </div>

          <Field
            label="Expected Close"
            value={
              opportunity.expected_close
                ? new Date(opportunity.expected_close).toLocaleDateString()
                : undefined
            }
          />

          {/* Stage Selector */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
              Current Stage
            </label>
            <select
              value={opportunity.stage_id}
              onChange={(e) => handleMoveStage(Number(e.target.value))}
              disabled={!canEdit}
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all bg-slate-50 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {sortedStages.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>

          {/* Timeline Placeholder */}
          <div className="pt-4 border-t border-slate-100">
            <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-2">
              Activity Timeline
            </label>
            <div className="bg-slate-50 rounded-lg p-4 border border-dashed border-slate-200">
              <p className="text-xs text-slate-400 italic text-center">
                No recent activity recorded.
              </p>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        {canEdit ? (
          <div className="p-4 border-t border-slate-200 shrink-0 space-y-2 bg-slate-50/50">
            <div className="flex gap-2">
              <button
                onClick={() => onEdit(opportunity)}
                className="flex-1 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-sm font-medium py-2 rounded-lg transition-colors shadow-sm"
              >
                Edit Details
              </button>
              <button
                onClick={handleDelete}
                className="flex-1 bg-white border border-rose-100 hover:bg-rose-50 text-rose-600 text-sm font-medium py-2 rounded-lg transition-colors"
              >
                Delete
              </button>
            </div>

            {opportunity.status === 'Open' && (
              <div className="flex gap-2">
                <button
                  onClick={handleMarkWon}
                  className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold py-2.5 rounded-lg transition-colors shadow-sm"
                >
                  Mark Won
                </button>
                <button
                  onClick={handleMarkLost}
                  className="flex-1 bg-rose-600 hover:bg-rose-700 text-white text-sm font-semibold py-2.5 rounded-lg transition-colors shadow-sm"
                >
                  Mark Lost
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="p-4 border-t border-slate-200 shrink-0 bg-slate-50/50">
            <p className="text-xs text-slate-400 text-center">
              This deal is assigned to someone else — you can view it but not edit it.
            </p>
          </div>
        )}
      </div>
    </>
  );
}

/**
 * Reusable Field component for the detail layout
 */
function Field({ label, value }: { label: string; value?: string }) {
  return (
    <div className="space-y-1">
      <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
        {label}
      </label>
      <p className="text-sm text-slate-800 font-medium">{value || '--'}</p>
    </div>
  );
}