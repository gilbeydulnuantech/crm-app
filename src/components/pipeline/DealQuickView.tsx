import { ReactNode, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Opportunity, Stage } from '../../types/opportunity';
import { useUpdateOpportunity, usePipelines } from '../../hooks/useOpportunities';
import { useAddNote } from '../../hooks/useNotes';
import { useContacts } from '../../hooks/useContacts';
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

function formatDate(value?: string | null) {
  if (!value) return '--';
  return new Date(value).toLocaleDateString(undefined, { month: 'short', day: '2-digit', year: 'numeric' });
}

function InfoRow({ label, value }: { label: string; value?: ReactNode }) {
  return (
    <div className="flex items-center justify-between py-1 text-sm">
      <span className="text-slate-500">{label}</span>
      <span className="text-slate-800 font-medium truncate max-w-[60%] text-right">{value ?? '--'}</span>
    </div>
  );
}

function LinkedName({ value, onClick }: { value?: string; onClick?: () => void }) {
  if (!value) return <p className="text-sm text-slate-400 italic">--</p>;
  if (!onClick) return <p className="text-sm font-semibold text-slate-800">{value}</p>;
  return (
    <button
      type="button"
      onClick={onClick}
      className="text-sm font-semibold text-indigo-600 hover:text-indigo-700 hover:underline text-left"
    >
      {value}
    </button>
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
  // elsewhere for this same deal (PipelineBoard).
  const navigate = useNavigate();
  const updateOpportunity = useUpdateOpportunity(deal?.pipeline_id ?? undefined);
  const addNote = useAddNote('opportunity', deal?.id ?? null);
  const { data: pipelines = [] } = usePipelines();
  const { data: contacts = [] } = useContacts();
  const [showMarkLost, setShowMarkLost] = useState(false);

  if (!deal) return null;

  // View All, Edit Owned Only — standard users can view every deal but only
  // edit the ones assigned to them; admins can edit anything.
  const canEdit = isAdmin || deal.assigned_user === currentUserId;
  const stageName = stagesById.get(deal.stage_id)?.name ?? '--';
  const pipelineName = pipelines.find((p) => p.id === deal.pipeline_id)?.name ?? '--';
  const contact = deal.contact_id ? contacts.find((c) => c.id === deal.contact_id) : undefined;

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
        className="bg-white rounded-2xl shadow-2xl w-full max-w-sm max-h-[85vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 pt-5">
          <h3 className="text-base font-bold text-slate-800">Deal Details</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 shrink-0">
            <i className="fa-solid fa-xmark" />
          </button>
        </div>

        <div className="px-5 pb-5">
          <div className="mt-3">
            <p className="text-base font-bold text-slate-800 truncate">{deal.name}</p>
            {deal.company_name && <p className="text-sm text-slate-500 truncate">{deal.company_name}</p>}
            <div className="flex items-center gap-1.5 mt-2">
              <span className={`w-2 h-2 rounded-full shrink-0 ${STATUS_DOT[deal.status] ?? 'bg-slate-400'}`} />
              <span className="text-sm text-slate-600 truncate">{stageName}</span>
            </div>
            <p className="text-lg font-bold text-emerald-600 mt-1">{currency(deal.deal_value)}</p>
          </div>

          <div className="mt-4 pt-4 border-t border-slate-100">
            <h4 className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
              Deal Information
            </h4>
            <InfoRow label="Pipeline" value={pipelineName} />
            <InfoRow label="Stage" value={stageName} />
            <InfoRow label="Deal Value" value={currency(deal.deal_value)} />
            <InfoRow
              label="Owner"
              value={deal.assigned_user_name ? toTitleCase(deal.assigned_user_name) : 'Unassigned'}
            />
            <InfoRow label="Created" value={formatDate(deal.created_at)} />
            <InfoRow label="Expected Close" value={formatDate(deal.expected_close)} />
          </div>

          <div className="mt-4 pt-4 border-t border-slate-100">
            <h4 className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Contact</h4>
            <LinkedName
              value={toTitleCase(deal.contact_name) || undefined}
              onClick={
                deal.contact_id
                  ? () => {
                      onClose();
                      navigate(`/contacts?contactId=${deal.contact_id}`);
                    }
                  : undefined
              }
            />
            {contact?.job_title && <p className="text-xs text-slate-500 mt-0.5">{contact.job_title}</p>}
            {contact?.email && <p className="text-xs text-slate-500 mt-0.5">{contact.email}</p>}
            {contact?.phone && <p className="text-xs text-slate-500 mt-0.5">{contact.phone}</p>}
          </div>

          {deal.company_name && (
            <div className="mt-4 pt-4 border-t border-slate-100">
              <h4 className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Company</h4>
              <LinkedName
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
            </div>
          )}

          <div className="mt-4 pt-4 border-t border-slate-100">
            <h4 className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Activity</h4>
            <div className="bg-slate-50 rounded-lg p-3 border border-dashed border-slate-200">
              <p className="text-xs text-slate-400 italic text-center">No activity recorded yet.</p>
            </div>
          </div>
        </div>

        {canEdit ? (
          <div className="flex gap-2 px-5 pb-5 pt-1">
            {deal.status === 'Open' && (
              <>
                <button
                  onClick={handleMarkWon}
                  className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold py-2 rounded-lg"
                >
                  Mark as Won
                </button>
                <button
                  onClick={() => setShowMarkLost(true)}
                  className="flex-1 bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold py-2 rounded-lg"
                >
                  Mark as Lost
                </button>
              </>
            )}
            <button
              onClick={() => onEdit(deal)}
              className="flex-1 border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold py-2 rounded-lg"
            >
              Edit Deal
            </button>
          </div>
        ) : (
          <p className="text-xs text-slate-400 text-center px-5 pb-5 pt-1">
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
