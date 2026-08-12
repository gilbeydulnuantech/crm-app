import { ReactNode, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Opportunity, Stage } from '../../types/opportunity';
import { useUpdateOpportunity } from '../../hooks/useOpportunities';
import { useAddNote } from '../../hooks/useNotes';
import { toTitleCase } from '../../utils/text';
import MarkLostModal from './MarkLostModal';

interface Props {
  deal: Opportunity | null;
  stagesById: Map<number, Stage>;
  isAdmin: boolean;
  currentUserId?: number;
  onClose: () => void;
  onEdit: (deal: Opportunity) => void;
}

const STATUS_DOT: Record<string, string> = {
  Open: 'bg-blue-500',
  Won: 'bg-emerald-500',
  Lost: 'bg-rose-500',
};

function currency(n?: number | null) {
  if (n === undefined || n === null) return '--';
  return `$${n.toLocaleString(undefined, { minimumFractionDigits: 2 })}`;
}

function Field({ label, value, onClick }: { label: string; value?: ReactNode; onClick?: () => void }) {
  return (
    <div>
      <label className="block text-[11px] font-medium text-slate-500 mb-0.5">{label}</label>
      {value && onClick ? (
        <button
          type="button"
          onClick={onClick}
          className="text-sm text-indigo-600 hover:text-indigo-700 hover:underline truncate block text-left"
        >
          {value}
        </button>
      ) : (
        <p className="text-sm text-slate-700 truncate">{value || '--'}</p>
      )}
    </div>
  );
}

export default function DealQuickView({
  deal,
  stagesById,
  isAdmin,
  currentUserId,
  onClose,
  onEdit,
}: Props) {
  // pipeline_id drives which ['opportunities', id] cache entry gets
  // invalidated after Mark Won/Lost — must match the mutation used
  // elsewhere for this same deal (DealDetailPanel, PipelineBoard).
  const navigate = useNavigate();
  const updateOpportunity = useUpdateOpportunity(deal?.pipeline_id ?? undefined);
  const addNote = useAddNote('opportunity', deal?.id ?? null);
  const [showMarkLost, setShowMarkLost] = useState(false);

  if (!deal) return null;

  // View All, Edit Owned Only — same policy as DealDetailPanel.
  const canEdit = isAdmin || deal.assigned_user === currentUserId;
  const stageName = stagesById.get(deal.stage_id)?.name ?? '--';

  function handleMarkWon() {
    updateOpportunity.mutate({ id: deal!.id, payload: { status: 'Won', closed_at: new Date().toISOString() } });
    onClose();
  }

  function handleConfirmMarkLost(reason: string, note: string) {
    updateOpportunity.mutate({
      id: deal!.id,
      payload: { status: 'Lost', closed_at: new Date().toISOString(), lost_reason: reason },
    });
    if (note) {
      addNote.mutate({ body: note, requesterId: currentUserId });
    }
    setShowMarkLost(false);
    onClose();
  }

  return (
    <div
      className="fixed inset-0 bg-slate-900/40 z-[95] flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-bold text-slate-800">Deal Details</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 shrink-0">
            <i className="fa-solid fa-xmark" />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <p className="text-sm font-bold text-slate-800 truncate">{deal.name}</p>
            <p className="text-lg font-bold text-emerald-600 mt-1">{currency(deal.deal_value)}</p>
            <div className="flex items-center gap-1.5 mt-1">
              <span className={`w-2 h-2 rounded-full shrink-0 ${STATUS_DOT[deal.status] ?? 'bg-slate-400'}`} />
              <span className="text-sm text-slate-600 truncate">{stageName}</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-x-4 gap-y-3">
            <Field
              label="Contact"
              value={toTitleCase(deal.contact_name)}
              onClick={
                deal.contact_id
                  ? () => {
                      onClose();
                      navigate(`/contacts?contactId=${deal.contact_id}`);
                    }
                  : undefined
              }
            />
            <Field
              label="Company"
              value={deal.company_name}
              onClick={
                deal.account_id
                  ? () => {
                      onClose();
                      navigate(`/companies?companyId=${deal.account_id}`);
                    }
                  : undefined
              }
            />
            <Field
              label="Owner"
              value={deal.assigned_user_name ? toTitleCase(deal.assigned_user_name) : undefined}
            />
          </div>

          <Field
            label="Created"
            value={
              deal.created_at
                ? new Date(deal.created_at).toLocaleDateString(undefined, {
                    month: 'short',
                    day: '2-digit',
                    year: 'numeric',
                  })
                : undefined
            }
          />
        </div>

        {canEdit ? (
          <div className="flex gap-2 mt-5 pt-4 border-t border-slate-100">
            {deal.status === 'Open' && (
              <>
                <button
                  onClick={handleMarkWon}
                  className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold py-2 rounded-lg"
                >
                  Mark Won
                </button>
                <button
                  onClick={() => setShowMarkLost(true)}
                  className="flex-1 bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold py-2 rounded-lg"
                >
                  Mark Lost
                </button>
              </>
            )}
            <button
              onClick={() => onEdit(deal)}
              className="flex-1 border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold py-2 rounded-lg"
            >
              Edit
            </button>
          </div>
        ) : (
          <p className="text-xs text-slate-400 text-center mt-5 pt-4 border-t border-slate-100">
            Assigned to someone else — view only.
          </p>
        )}
      </div>

      <MarkLostModal
        open={showMarkLost}
        dealName={deal.name}
        onConfirm={handleConfirmMarkLost}
        onCancel={() => setShowMarkLost(false)}
        isSubmitting={updateOpportunity.isPending}
      />
    </div>
  );
}
