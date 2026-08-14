import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Opportunity, Stage } from '../../types/opportunity';
import { usePipelines } from '../../hooks/useOpportunities';
import { useContacts } from '../../hooks/useContacts';
import { useNotes } from '../../hooks/useNotes';
import { useTasks } from '../../hooks/useTasks';
import { toTitleCase } from '../../utils/text';
import { getTagColorClasses } from '../../utils/tagColors';
import DealTagsInline from './DealTagsInline';

interface Props {
  deal: Opportunity | null;
  stagesById: Map<number, Stage>;
  isAdmin: boolean;
  currentUserId?: number;
  onClose: () => void;
  onEdit: (deal: Opportunity) => void;
  onMarkWon: (deal: Opportunity) => void;
  onMarkLost: (deal: Opportunity) => void;
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
      className="text-sm font-semibold text-indigo-600 hover:text-indigo-700 hover:underline text-left"
    >
      {value}
    </button>
  );
}

export default function DealDetailModal({
  deal,
  stagesById,
  isAdmin,
  currentUserId,
  onClose,
  onEdit,
  onMarkWon,
  onMarkLost,
}: Props) {
  const navigate = useNavigate();
  const { data: pipelines = [] } = usePipelines();
  const { data: contacts = [] } = useContacts();
  const { data: notes = [] } = useNotes('opportunity', deal?.id ?? null);
  const { data: allTasks = [] } = useTasks();

  const activity = useMemo(() => {
    if (!deal) return [];
    const noteEntries = notes.map((n) => ({
      date: n.created_at,
      label: `Note: ${n.body}`,
    }));
    const taskEntries = allTasks
      .filter((t) => t.opportunity_id === deal.id)
      .map((t) => ({
        date: t.completed_at ?? t.created_at ?? t.due_at ?? '',
        label: t.is_completed ? `Completed: ${t.subject}` : `Task created: ${t.subject}`,
      }));
    return [...noteEntries, ...taskEntries]
      .filter((e) => e.date)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 6);
  }, [deal, notes, allTasks]);

  if (!deal) return null;

  const canEdit = isAdmin || deal.assigned_user === currentUserId;
  const stageName = stagesById.get(deal.stage_id)?.name ?? '--';
  const pipelineName = pipelines.find((p) => p.id === deal.pipeline_id)?.name ?? '--';
  const contact = deal.contact_id ? contacts.find((c) => c.id === deal.contact_id) : undefined;

  return (
    <div
      className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[110] flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 pt-5">
          <h3 className="text-lg font-bold text-slate-800">Deal Details</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <i className="fa-solid fa-xmark" />
          </button>
        </div>

        <div className="px-6 pb-6">
          <div className="mt-3">
            <p className="text-lg font-bold text-slate-800 truncate">{deal.name}</p>
            {deal.company_name && <p className="text-sm text-slate-500 truncate">{deal.company_name}</p>}
            <div className="flex items-center gap-1.5 mt-2">
              <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${STATUS_DOT[deal.status] ?? 'bg-slate-400'}`} />
              <span className="text-sm text-slate-600">{stageName}</span>
            </div>
            <p className="text-xl font-bold text-emerald-600 mt-1">{currency(deal.deal_value)}</p>
          </div>

          <div className="mt-4 pt-4 border-t border-slate-100">
            <h4 className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
              Deal Information
            </h4>
            <InfoRow label="Pipeline" value={pipelineName} />
            <InfoRow label="Stage" value={stageName} />
            <InfoRow label="Deal Value" value={currency(deal.deal_value)} />
            <InfoRow label="Owner" value={deal.assigned_user_name ? toTitleCase(deal.assigned_user_name) : 'Unassigned'} />
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

            <div className="flex flex-wrap items-center gap-1.5 mt-2">
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
            {activity.length > 0 ? (
              <ul className="space-y-1.5">
                {activity.map((a, i) => (
                  <li key={i} className="flex gap-2 text-xs">
                    <span className="text-slate-400 shrink-0 w-14">{formatDate(a.date)}</span>
                    <span className="text-slate-600 truncate">{a.label}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="bg-slate-50 rounded-lg p-3 border border-dashed border-slate-200">
                <p className="text-xs text-slate-400 italic text-center">No activity recorded yet.</p>
              </div>
            )}
          </div>
        </div>

        {canEdit ? (
          <div className="flex gap-2 px-6 pb-6">
            {deal.status === 'Open' && (
              <>
                <button
                  onClick={() => onMarkWon(deal)}
                  className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold py-2 rounded-lg"
                >
                  Mark as Won
                </button>
                <button
                  onClick={() => onMarkLost(deal)}
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
          <p className="text-xs text-slate-400 text-center px-6 pb-6">Assigned to someone else — view only.</p>
        )}
      </div>
    </div>
  );
}
