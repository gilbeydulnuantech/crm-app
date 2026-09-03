import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Opportunity, Stage } from '../../types/opportunity';
import { usePipelines } from '../../hooks/useOpportunities';
import { useContacts } from '../../hooks/useContacts';
import { useNotes, useAddNote } from '../../hooks/useNotes';
import { useTasks } from '../../hooks/useTasks';
import { toTitleCase } from '../../utils/text';
import { getTagColorClasses } from '../../utils/tagColors';
import DealTagsInline from './DealTagsInline';
import ProposalsSection from './ProposalsSection';
import ContractsSection from './ContractsSection';
import CreateContractModal from './CreateContractModal';

interface Props {
  deal: Opportunity | null;
  stages: Stage[];
  stagesById: Map<number, Stage>;
  isAdmin: boolean;
  currentUserId?: number;
  onClose: () => void;
  onEdit: (deal: Opportunity) => void;
  onMarkWon: (deal: Opportunity) => void;
  onMarkLost: (deal: Opportunity) => void;
  // Optional — callers that only need a read-mostly popup (e.g. Calendar's
  // deal detail view) can omit these and the corresponding stage-click/
  // Archive/Delete affordances just don't render.
  onMoveStage?: (dealId: number, stageId: number) => void;
  onArchive?: (deal: Opportunity) => void;
  onDelete?: (deal: Opportunity) => void;
}

function currency(n?: number | null) {
  if (n === undefined || n === null) return '--';
  return `$${n.toLocaleString(undefined, { minimumFractionDigits: 2 })}`;
}

function formatDate(value?: string | null) {
  if (!value) return '--';
  return new Date(value).toLocaleDateString(undefined, { month: 'short', day: '2-digit', year: 'numeric' });
}

function InfoRow({ label, value }: { label: string; value?: string }) {
  return (
    <div className="flex items-center justify-between py-1 text-sm">
      <span className="text-slate-500">{label}</span>
      <span className="text-slate-800 font-medium truncate max-w-[60%] text-right">{value || '--'}</span>
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
      className="text-sm font-semibold text-[var(--theme-accent)] hover:text-[var(--theme-accent-hover)] hover:underline text-left"
    >
      {value}
    </button>
  );
}

export default function DealDetailModal({
  deal,
  stages,
  stagesById,
  isAdmin,
  currentUserId,
  onClose,
  onEdit,
  onMarkWon,
  onMarkLost,
  onMoveStage,
  onArchive,
  onDelete,
}: Props) {
  const navigate = useNavigate();
  const { data: pipelines = [] } = usePipelines();
  const { data: contacts = [] } = useContacts();
  const { data: notes = [] } = useNotes('opportunity', deal?.id ?? null);
  const addNote = useAddNote('opportunity', deal?.id ?? null);
  const { data: allTasks = [] } = useTasks();
  const [comment, setComment] = useState('');
  const [createContractOpen, setCreateContractOpen] = useState(false);

  const activity = useMemo(() => {
    if (!deal) return [];
    const noteEntries = notes.map((n) => ({
      date: n.created_at,
      label: `${n.created_by_name ? toTitleCase(n.created_by_name) : 'Unknown'}: ${n.body}`,
    }));
    const taskEntries = allTasks
      .filter((t) => t.opportunity_id === deal.id)
      .map((t) => ({
        date: t.completed_at ?? t.created_at ?? t.due_at ?? '',
        label: t.is_completed ? `Completed: ${t.subject}` : `Task created: ${t.subject}`,
      }));
    return [...noteEntries, ...taskEntries]
      .filter((e) => e.date)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [deal, notes, allTasks]);

  if (!deal) return null;

  const canEdit = isAdmin || deal.assigned_user === currentUserId;
  const canDelete = isAdmin;
  const stageName = stagesById.get(deal.stage_id)?.name ?? '--';
  const pipelineName = pipelines.find((p) => p.id === deal.pipeline_id)?.name ?? '--';
  const contact = deal.contact_id ? contacts.find((c) => c.id === deal.contact_id) : undefined;
  // Filtered by the deal's own pipeline_id — callers like Calendar.tsx pass
  // stages merged across every pipeline (see useAllStages), so this can't
  // assume the array is already scoped to just this deal's pipeline.
  const sortedStages = stages
    .filter((s) => s.pipeline_id === deal.pipeline_id)
    .sort((a, b) => a.display_order - b.display_order);
  const currentStageIndex = sortedStages.findIndex((s) => s.id === deal.stage_id);

  function handleAddComment() {
    if (!comment.trim()) return;
    addNote.mutate({ body: comment.trim(), requesterId: currentUserId }, { onSuccess: () => setComment('') });
  }

  function handleDelete() {
    onDelete?.(deal!);
  }

  return (
    <>
    <div
      className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[110] flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-6 py-4 border-b border-slate-200 shrink-0">
          <div className="flex items-start justify-between">
            <div className="min-w-0">
              <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide">
                Pipeline / DEAL-{deal.id}
              </p>
              <h2 className="text-lg font-bold text-slate-800 truncate">{toTitleCase(deal.name)}</h2>
            </div>
            <button onClick={onClose} className="text-slate-400 hover:text-slate-600 shrink-0">
              <i className="fa-solid fa-xmark text-lg" />
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-2 mt-3">
            {canEdit && deal.status === 'Open' && (
              <>
                <button
                  onClick={() => onMarkWon(deal)}
                  className="px-3 py-1.5 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg"
                >
                  Mark as Won
                </button>
                <button
                  onClick={() => onMarkLost(deal)}
                  className="px-3 py-1.5 text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white rounded-lg"
                >
                  Mark as Lost
                </button>
              </>
            )}
            {canEdit && (
              <button
                onClick={() => onEdit(deal)}
                className="px-3 py-1.5 text-xs font-semibold border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-lg"
              >
                Edit
              </button>
            )}
            {canEdit && onArchive && deal.status !== 'Open' && (
              <button
                onClick={() => onArchive(deal)}
                className="px-3 py-1.5 text-xs font-semibold border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-lg"
              >
                Archive
              </button>
            )}
            {canDelete && onDelete && (
              <button
                onClick={handleDelete}
                className="px-3 py-1.5 text-xs font-semibold border border-rose-100 hover:bg-rose-50 text-rose-600 rounded-lg"
              >
                Delete
              </button>
            )}
            {!canEdit && (
              <span className="text-xs text-slate-400 italic">Assigned to someone else — view only.</span>
            )}
          </div>

          {sortedStages.length > 0 && (
            <div className="flex items-center gap-1 mt-4 overflow-x-auto">
              {sortedStages.map((s, i) => (
                <div key={s.id} className="flex items-center">
                  <button
                    onClick={() => canEdit && deal.status === 'Open' && onMoveStage?.(deal.id, s.id)}
                    disabled={!canEdit || !onMoveStage || deal.status !== 'Open'}
                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold whitespace-nowrap ${
                      i === currentStageIndex
                        ? 'bg-[var(--theme-accent)] text-white'
                        : i < currentStageIndex
                          ? 'bg-emerald-100 text-emerald-700'
                          : 'bg-slate-100 text-slate-500'
                    } ${canEdit && onMoveStage && deal.status === 'Open' ? 'cursor-pointer' : 'cursor-default'}`}
                  >
                    <i className={`fa-solid ${i <= currentStageIndex ? 'fa-circle-check' : 'fa-circle'} text-[9px]`} />
                    {s.name}
                  </button>
                  {i < sortedStages.length - 1 && (
                    <i className="fa-solid fa-chevron-right text-[9px] text-slate-300 mx-1.5" />
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex-1 overflow-y-auto grid grid-cols-1 md:grid-cols-[65%_35%]">
          {/* Left column */}
          <div className="p-6 space-y-6 md:border-r border-slate-100">
            <div>
              <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">Description</h3>
              <p className="text-sm text-slate-700 whitespace-pre-wrap">{deal.description || '--'}</p>
            </div>

            <ProposalsSection opportunityId={deal.id} canEdit={canEdit} onCreateNew={() => navigate('/documents/proposals/new')} />

            <ContractsSection opportunityId={deal.id} canEdit={canEdit} onCreateNew={() => setCreateContractOpen(true)} />

            <div>
              <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">Activity Feed &amp; Audit Trail</h3>
              <div className="flex gap-1.5 mb-3">
                <input
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddComment()}
                  placeholder="Add a comment or update..."
                  className="flex-1 px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[var(--theme-accent)]"
                />
                <button onClick={handleAddComment} className="text-xs font-semibold text-[var(--theme-accent)] hover:underline px-1 shrink-0">
                  Post
                </button>
              </div>
              <div className="space-y-3">
                {activity.map((a, i) => (
                  <div key={i} className="text-xs">
                    <span className="text-slate-400">
                      {formatDate(a.date)}
                    </span>
                    <p className="text-slate-700 mt-0.5">{a.label}</p>
                  </div>
                ))}
                {activity.length === 0 && <p className="text-xs text-slate-400 italic">No activity recorded yet.</p>}
              </div>
            </div>
          </div>

          {/* Right column */}
          <div className="p-6 space-y-6 bg-slate-50/50">
            <div>
              <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">Associated Records</h3>
              <div className="space-y-1.5 text-sm">
                <p>
                  <span className="text-slate-500">Contact: </span>
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
                </p>
                {contact?.job_title && <p className="text-xs text-slate-500 ml-1">{toTitleCase(contact.job_title)}</p>}
                {contact?.email && <p className="text-xs text-slate-500 ml-1">{contact.email}</p>}
                {contact?.phone && <p className="text-xs text-slate-500 ml-1">{contact.phone}</p>}

                {deal.company_name && (
                  <p className="pt-1">
                    <span className="text-slate-500">Company: </span>
                    <LinkedName
                      value={toTitleCase(deal.company_name)}
                      onClick={
                        deal.account_id
                          ? () => {
                              onClose();
                              navigate(`/companies?companyId=${deal.account_id}`);
                            }
                          : undefined
                      }
                    />
                  </p>
                )}
              </div>
            </div>

            <div>
              <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">Deal Metadata</h3>
              <InfoRow label="Pipeline" value={pipelineName} />
              <InfoRow label="Stage" value={stageName} />
              <InfoRow label="Deal Value" value={currency(deal.deal_value)} />
              <InfoRow label="Probability" value={deal.probability != null ? `${deal.probability}%` : undefined} />
              <InfoRow label="Owner" value={deal.assigned_user_name ? toTitleCase(deal.assigned_user_name) : 'Unassigned'} />
              <InfoRow label="Created" value={formatDate(deal.created_at)} />
              <InfoRow label="Expected Close" value={formatDate(deal.expected_close)} />
              {deal.status === 'Lost' && deal.lost_reason && (
                <InfoRow label="Lost Reason" value={deal.lost_reason} />
              )}
            </div>

            <div>
              <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">Tags</h3>
              <div className="flex flex-wrap items-center gap-1.5">
                <DealTagsInline deal={deal} disabled={!canEdit} />
                {/* Read-only — the linked contact's own tags, shown for
                    context alongside the deal's editable tags (same combined
                    set DealCard/DealQuickView show elsewhere). */}
                {(deal.contact_tags ?? []).map((t) => (
                  <span
                    key={`contact-${t.id}`}
                    title="From the linked contact"
                    className={`px-1.5 py-0.5 text-[10px] font-medium rounded-full opacity-70 ${getTagColorClasses(t.name)}`}
                  >
                    {t.name}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <CreateContractModal opportunity={createContractOpen ? deal : null} onClose={() => setCreateContractOpen(false)} />
    </>
  );
}
