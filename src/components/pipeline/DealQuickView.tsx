import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Opportunity, Stage } from '../../types/opportunity';
import { useUpdateOpportunity } from '../../hooks/useOpportunities';
import { useTasks } from '../../hooks/useTasks';
import { useNotes } from '../../hooks/useNotes';
import { useCompanies } from '../../hooks/useCompanies';
import { toTitleCase } from '../../utils/text';
import DealTagsInline from './DealTagsInline';
import CompanyQuickView from '../companies/CompanyQuickView';

interface Props {
  deal: Opportunity | null;
  stages: Stage[];
  isAdmin: boolean;
  currentUserId?: number;
  onClose: () => void;
  onEdit: (deal: Opportunity) => void;
  onMarkWon: (deal: Opportunity) => void;
  onMarkLost: (deal: Opportunity) => void;
  onOpenFullDetails: (deal: Opportunity) => void;
}

function currency(val?: number | string | null) {
  if (val === undefined || val === null || val === '') return '--';
  const n = Number(val);
  if (isNaN(n)) return '--';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
  }).format(n);
}

function formatDate(value?: string | null) {
  if (!value) return null;
  return new Date(value).toLocaleDateString(undefined, { month: 'short', day: '2-digit', year: 'numeric' });
}

function RecordLine({ label, value, onClick }: { label: string; value?: string; onClick?: () => void }) {
  return (
    <div className="flex items-baseline gap-1.5 text-sm">
      <span className="text-slate-400 shrink-0">•</span>
      <span className="text-slate-500 shrink-0">{label}:</span>
      {value && onClick ? (
        <button
          type="button"
          onClick={onClick}
          className="font-medium text-indigo-600 hover:text-indigo-700 hover:underline truncate text-left"
        >
          {value}
        </button>
      ) : (
        <span className="font-medium text-slate-800 truncate">{value || '--'}</span>
      )}
    </div>
  );
}

export default function DealQuickView({
  deal,
  stages,
  isAdmin,
  currentUserId,
  onClose,
  onEdit,
  onMarkWon,
  onMarkLost,
  onOpenFullDetails,
}: Props) {
  const navigate = useNavigate();
  // pipeline_id drives which ['opportunities', id] cache entry gets
  // invalidated after a stage/status change — must match the mutation used
  // elsewhere for this same deal (PipelineBoard).
  const updateOpportunity = useUpdateOpportunity(deal?.pipeline_id ?? undefined);
  const { data: allTasks = [] } = useTasks();
  const { data: notes = [] } = useNotes('opportunity', deal?.id ?? null);
  const { data: companies = [] } = useCompanies();
  const [quickViewCompanyId, setQuickViewCompanyId] = useState<number | null>(null);
  const quickViewCompany = useMemo(
    () => companies.find((c) => c.id === quickViewCompanyId) ?? null,
    [companies, quickViewCompanyId]
  );

  const dealTasks = useMemo(
    () => (deal ? allTasks.filter((t) => t.opportunity_id === deal.id) : []),
    [allTasks, deal]
  );

  const nextActivity = useMemo(() => {
    const now = Date.now();
    return dealTasks
      .filter((t) => !t.is_completed && t.due_at && new Date(t.due_at).getTime() >= now)
      .sort((a, b) => new Date(a.due_at!).getTime() - new Date(b.due_at!).getTime())[0];
  }, [dealTasks]);

  const lastTouch = useMemo(() => {
    const completedTasks = dealTasks
      .filter((t) => t.is_completed && t.completed_at)
      .map((t) => ({ date: t.completed_at as string, label: t.subject }));
    const noteEntries = notes.map((n) => ({ date: n.created_at, label: 'Note added' }));
    return [...completedTasks, ...noteEntries].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    )[0];
  }, [dealTasks, notes]);

  if (!deal) return null;

  // View All, Edit Owned Only — standard users can view every deal but only
  // edit the ones assigned to them; admins can edit anything.
  const canEdit = isAdmin || deal.assigned_user === currentUserId;
  const sortedStages = stages.slice().sort((a, b) => a.display_order - b.display_order);
  const expectedClose = formatDate(deal.expected_close);

  function handleStageChange(stageId: string) {
    if (!deal) return;
    updateOpportunity.mutate({ id: deal.id, payload: { stage_id: Number(stageId) } });
  }

  return (
    <div className="fixed inset-0 bg-slate-900/40 z-[95] flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[85vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 pt-5">
          <h3 className="text-base font-bold text-slate-800">Deal Quick View</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 shrink-0">
            <i className="fa-solid fa-xmark" />
          </button>
        </div>

        <div className="px-5 pb-5">
          <div className="mt-3 flex items-start justify-between gap-2">
            <p className="text-base font-bold text-slate-800 truncate">{deal.name}</p>
            {canEdit && (
              <button
                onClick={() => onEdit(deal)}
                className="shrink-0 px-3 py-1 text-xs font-semibold border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-lg"
              >
                Edit Deal
              </button>
            )}
          </div>
          <div className="flex items-center flex-wrap gap-x-1.5 text-sm text-slate-500 mt-1">
            <span className="font-semibold text-emerald-600">{currency(deal.deal_value)}</span>
            <span className="text-slate-300">•</span>
            <span>{deal.probability != null ? `${deal.probability}% Probability` : '-- Probability'}</span>
            <span className="text-slate-300">•</span>
            <span>Expected Close: {expectedClose ?? '--'}</span>
          </div>

          <div className="mt-3">
            <label className="block text-xs font-medium text-slate-600 mb-1">Pipeline Stage</label>
            <select
              value={deal.stage_id}
              onChange={(e) => handleStageChange(e.target.value)}
              disabled={!canEdit}
              className="w-full px-3 py-1.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-slate-50 disabled:text-slate-400"
            >
              {sortedStages.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>

          <div className="mt-4 pt-4 border-t border-slate-100 space-y-1">
            <h4 className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
              Associated Records
            </h4>
            <RecordLine
              label="Company"
              value={deal.company_name}
              onClick={
                deal.account_id
                  ? () => setQuickViewCompanyId(deal.account_id!)
                  : undefined
              }
            />
            <RecordLine
              label="Contact"
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
            <RecordLine
              label="Owner"
              value={deal.assigned_user_name ? toTitleCase(deal.assigned_user_name) : 'Unassigned'}
            />
          </div>

          <div className="mt-4 pt-4 border-t border-slate-100 space-y-1.5">
            <h4 className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
              Execution & Next Steps
            </h4>
            <RecordLine
              label="Next Activity"
              value={nextActivity ? `${nextActivity.subject} — ${formatDate(nextActivity.due_at)}` : 'None scheduled'}
            />
            <RecordLine
              label="Last Touch"
              value={lastTouch ? `${lastTouch.label} — ${formatDate(lastTouch.date)}` : 'No activity yet'}
            />
            <div className="flex items-baseline gap-1.5 text-sm">
              <span className="text-slate-400 shrink-0">•</span>
              <span className="text-slate-500 shrink-0">Tags:</span>
              <div className="flex flex-wrap items-center gap-1.5">
                <DealTagsInline deal={deal} disabled={!canEdit} />
                {/* Read-only — the linked contact's own tags, shown for
                    context alongside the deal's editable tags (same
                    combined set DealCard shows on the board). */}
                {(deal.contact_tags ?? []).map((t) => (
                  <span
                    key={`contact-${t.id}`}
                    title="From the linked contact"
                    className="px-2 py-0.5 text-xs font-medium rounded-full bg-slate-100 text-slate-500"
                  >
                    {t.name}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>

        {canEdit ? (
          <div className="flex gap-2 px-5 pb-5 pt-1">
            {deal.status === 'Open' && (
              <>
                <button
                  onClick={() => onMarkWon(deal)}
                  className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold py-2 rounded-lg"
                >
                  Mark Closed Won
                </button>
                <button
                  onClick={() => onMarkLost(deal)}
                  className="flex-1 bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold py-2 rounded-lg"
                >
                  Mark Closed Lost
                </button>
              </>
            )}
            <button
              onClick={() => onOpenFullDetails(deal)}
              className="flex-1 border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold py-2 rounded-lg"
            >
              Open Full Details
            </button>
          </div>
        ) : (
          <div className="px-5 pb-5 pt-1">
            <button
              onClick={() => onOpenFullDetails(deal)}
              className="w-full border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold py-2 rounded-lg"
            >
              Open Full Details
            </button>
          </div>
        )}
      </div>

      <CompanyQuickView
        company={quickViewCompany}
        onClose={() => setQuickViewCompanyId(null)}
        onEdit={(company) => {
          setQuickViewCompanyId(null);
          onClose();
          navigate(`/companies?companyId=${company.id}`);
        }}
        onOpenFullRecord={(company) => {
          setQuickViewCompanyId(null);
          onClose();
          navigate(`/companies?companyId=${company.id}`);
        }}
        canEdit={isAdmin || quickViewCompany?.owner_id === currentUserId}
      />
    </div>
  );
}
