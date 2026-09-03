import { useEffect, useMemo, useRef, useState } from 'react';
import { Company } from '../../types/company';
import { useContacts } from '../../hooks/useContacts';
import { useAllOpportunities, useAllStages, usePipelines } from '../../hooks/useOpportunities';
import { useEntityActivity } from '../../hooks/useActivity';
import { toTitleCase } from '../../utils/text';
import DealFormModal from '../pipeline/DealFormModal';
import AddContactModal from '../contacts/AddContactModal';
import LogCallModal from '../LogCallModal';
import ComposeEmailPopover from '../contacts/ComposeEmailPopover';
import { Contact } from '../../types/contact';
import { COMPANY_HEALTH_DISPLAY } from '../../utils/companyHealth';

const TIER_BADGE_COLORS: Record<string, string> = {
  'Tier 1 (Enterprise)': 'bg-[var(--theme-accent-tint)] text-[var(--theme-accent-hover)]',
  'Tier 2': 'bg-blue-100 text-blue-700',
  'Tier 3': 'bg-slate-100 text-slate-600',
};

interface Props {
  company: Company | null;
  onClose: () => void;
  onOpenFullRecord: (company: Company) => void;
  onEdit: (company: Company) => void;
  canEdit: boolean;
}

export default function CompanyQuickView({ company, onClose, onOpenFullRecord, onEdit, canEdit }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dealFormOpen, setDealFormOpen] = useState(false);
  const [addContactOpen, setAddContactOpen] = useState(false);
  const [logCallOpen, setLogCallOpen] = useState(false);
  const [emailContact, setEmailContact] = useState<Contact | null>(null);

  const { data: pipelines = [] } = usePipelines();
  const defaultPipelineId = pipelines.find((p) => p.is_default)?.id ?? pipelines[0]?.id;
  const pipelineIds = useMemo(() => pipelines.map((p) => p.id), [pipelines]);
  const { data: allOpportunities = [] } = useAllOpportunities(pipelineIds);
  const { data: allStages = [] } = useAllStages(pipelineIds);
  const { data: allContacts = [] } = useContacts();
  const { data: activity = [] } = useEntityActivity('company', company?.id ?? null);

  // Closes on outside click, per the mockup ("close when clicking outside modal").
  useEffect(() => {
    if (!company) return;
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        onClose();
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [company, onClose]);

  if (!company) return null;

  const companyContacts = allContacts.filter((c) => c.account_id === company.id);
  const companyOpportunities = allOpportunities.filter((o) => o.account_id === company.id);
  const openDeals = companyOpportunities.filter((d) => d.status === 'Open');
  const openPipelineValue = openDeals.reduce((sum, d) => sum + Number(d.deal_value ?? 0), 0);
  // No dedicated ARR/contract-value field exists yet — Closed Won deal value
  // is the closest proxy available from the data already in this app.
  const totalArr = companyOpportunities
    .filter((d) => d.status === 'Won')
    .reduce((sum, d) => sum + Number(d.deal_value ?? 0), 0);
  const health = company.account_health ? COMPANY_HEALTH_DISPLAY[company.account_health] : undefined;
  const recentActivity = activity.slice(0, 3);
  const stageName = (stageId: number) => allStages.find((s) => s.id === stageId)?.name ?? '--';

  return (
    <div className="fixed inset-0 bg-slate-900/40 z-[100] flex items-center justify-center p-4">
      <div
        ref={containerRef}
        className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[85vh] overflow-y-auto"
      >
        <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Company Quick View</span>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <i className="fa-solid fa-xmark" />
          </button>
        </div>

        <div className="px-5 py-4 border-b border-slate-100 space-y-1.5">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-base font-bold text-slate-800 truncate">{toTitleCase(company.name)}</h3>
            {company.tier && (
              <span
                className={`shrink-0 px-2 py-0.5 text-[10px] font-semibold rounded-full ${
                  TIER_BADGE_COLORS[company.tier] ?? 'bg-slate-100 text-slate-600'
                }`}
              >
                {company.tier}
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 truncate">
            {[
              company.parent_company_name ? `Parent: ${toTitleCase(company.parent_company_name)}` : null,
              company.industry ? `Industry: ${toTitleCase(company.industry)}` : null,
            ]
              .filter(Boolean)
              .join(' | ') || '--'}
          </p>
          <p className="text-xs text-slate-500">Owner: {company.owner_name ? toTitleCase(company.owner_name) : 'Unassigned'}</p>
        </div>

        <div className="px-5 py-3 border-b border-slate-100">
          <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide mb-2">Quick Actions</p>
          <div className="grid grid-cols-4 gap-1.5">
            <QuickActionButton icon="fa-plus" label="New Deal" onClick={() => setDealFormOpen(true)} disabled={!canEdit} />
            <QuickActionButton icon="fa-user-plus" label="Add Contact" onClick={() => setAddContactOpen(true)} disabled={!canEdit} />
            <QuickActionButton icon="fa-phone" label="Log Activity" onClick={() => setLogCallOpen(true)} />
            <QuickActionButton icon="fa-pen" label="Edit" onClick={() => onEdit(company)} disabled={!canEdit} />
          </div>
        </div>

        <div className="px-5 py-3 border-b border-slate-100 space-y-1.5">
          <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide mb-1">Key Metrics</p>
          <MetricRow label="Open Pipeline" value={`$${openPipelineValue.toLocaleString()} (${openDeals.length} Deal${openDeals.length === 1 ? '' : 's'})`} />
          <MetricRow label="Total ARR" value={`$${totalArr.toLocaleString()} / yr`} />
          <MetricRow label="Account Health" value={health ? `${health.emoji} ${health.label}` : 'Not set'} />
        </div>

        <div className="px-5 py-3 border-b border-slate-100">
          <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide mb-2">
            Key Contacts ({companyContacts.length})
          </p>
          {companyContacts.length === 0 ? (
            <p className="text-xs text-slate-400">No contacts linked yet.</p>
          ) : (
            <div className="space-y-1.5">
              {companyContacts.slice(0, 2).map((c) => {
                const fullName = toTitleCase(`${c.first_name} ${c.last_name}`.trim()) || 'No Name';
                return (
                  <div key={c.id} className="flex items-center justify-between gap-2">
                    <p className="text-sm text-slate-700 truncate">
                      {fullName}
                      {(c.job_title || c.company_role) && (
                        <span className="text-slate-400"> ({toTitleCase(c.job_title || c.company_role || '')})</span>
                      )}
                    </p>
                    <div className="flex items-center gap-1 shrink-0">
                      <IconButton icon="fa-phone" title="Log a call" onClick={() => setLogCallOpen(true)} />
                      <IconButton icon="fa-envelope" title="Email" disabled={!c.email} onClick={() => setEmailContact(c)} />
                    </div>
                  </div>
                );
              })}
              {companyContacts.length > 2 && (
                <button
                  onClick={() => onOpenFullRecord(company)}
                  className="text-xs font-semibold text-[var(--theme-accent)] hover:underline"
                >
                  + View All Contacts
                </button>
              )}
            </div>
          )}
        </div>

        <div className="px-5 py-3 border-b border-slate-100">
          <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide mb-2">
            Active Opportunities ({openDeals.length})
          </p>
          {openDeals.length === 0 ? (
            <p className="text-xs text-slate-400">No active opportunities.</p>
          ) : (
            <div className="space-y-1.5">
              {openDeals.slice(0, 3).map((d) => (
                <p key={d.id} className="text-sm text-slate-700 truncate">
                  {toTitleCase(d.name)} —{' '}
                  <span className="font-medium text-emerald-600">
                    {d.deal_value != null ? `$${Number(d.deal_value).toLocaleString()}` : '--'}
                  </span>{' '}
                  <span className="text-slate-400">(Stage: {stageName(d.stage_id)})</span>
                </p>
              ))}
            </div>
          )}
          {canEdit && (
            <button
              onClick={() => setDealFormOpen(true)}
              className="mt-1.5 text-xs font-semibold text-[var(--theme-accent)] hover:underline"
            >
              + Create New Opportunity
            </button>
          )}
        </div>

        <div className="px-5 py-3 border-b border-slate-100">
          <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide mb-2">Recent Activity</p>
          {recentActivity.length === 0 ? (
            <p className="text-xs text-slate-400">No activity recorded yet.</p>
          ) : (
            <div className="space-y-2">
              {recentActivity.map((entry) => (
                <div key={entry.id}>
                  <p className="text-xs text-slate-700 truncate">
                    {entry.category === 'call' ? '📞' : entry.category === 'meeting' ? '📅' : '📝'} {entry.summary} —{' '}
                    <span className="text-slate-400">
                      {new Date(entry.created_at).toLocaleDateString(undefined, { month: 'short', day: '2-digit', year: 'numeric' })}
                    </span>
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="px-5 py-3">
          <button
            onClick={() => onOpenFullRecord(company)}
            className="w-full text-center text-sm font-semibold text-[var(--theme-accent)] hover:underline"
          >
            Open Full Company Record &rarr;
          </button>
        </div>
      </div>

      {defaultPipelineId && (
        <DealFormModal
          open={dealFormOpen}
          opportunity={null}
          pipelineId={defaultPipelineId}
          defaultAccountId={company.id}
          defaultCompanyName={company.name}
          onClose={() => setDealFormOpen(false)}
        />
      )}
      <AddContactModal
        open={addContactOpen}
        defaultAccountId={company.id}
        defaultCompanyName={company.name}
        onClose={() => setAddContactOpen(false)}
      />
      <LogCallModal
        open={logCallOpen}
        entityType="company"
        entityId={company.id}
        entityLabel={company.name}
        onClose={() => setLogCallOpen(false)}
      />
      {emailContact && (
        <ComposeEmailPopover contact={emailContact} open onClose={() => setEmailContact(null)} />
      )}
    </div>
  );
}

function QuickActionButton({
  icon,
  label,
  onClick,
  disabled,
}: {
  icon: string;
  label: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="flex flex-col items-center gap-1 py-2 rounded-lg text-slate-600 bg-slate-50 hover:bg-slate-100 disabled:opacity-40 disabled:hover:bg-slate-50 transition-colors"
    >
      <i className={`fa-solid ${icon} text-xs`} />
      <span className="text-[10px] font-medium">{label}</span>
    </button>
  );
}

function IconButton({
  icon,
  title,
  onClick,
  disabled,
}: {
  icon: string;
  title: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      disabled={disabled}
      className="w-6 h-6 flex items-center justify-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-[var(--theme-accent)] disabled:opacity-30 disabled:hover:bg-transparent"
    >
      <i className={`fa-solid ${icon} text-[10px]`} />
    </button>
  );
}

function MetricRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-slate-500">{label}</span>
      <span className="font-medium text-slate-800">{value}</span>
    </div>
  );
}
