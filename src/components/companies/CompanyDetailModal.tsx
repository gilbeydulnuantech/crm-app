import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Company } from '../../types/company';
import { useContacts } from '../../hooks/useContacts';
import { usePipelines, useAllOpportunities, useAllStages } from '../../hooks/useOpportunities';
import { toTitleCase } from '../../utils/text';
import { DEFAULT_USER_COLOR, hexToRgba } from '../../utils/userColor';
import DealFormModal from '../pipeline/DealFormModal';

const STATUS_COLORS: Record<string, string> = {
  New: 'bg-slate-100 text-slate-800',
  Active: 'bg-blue-100 text-blue-800',
  Customer: 'bg-emerald-100 text-emerald-800',
  Inactive: 'bg-slate-200 text-slate-600',
  Unqualified: 'bg-rose-100 text-rose-700',
  'Do Not Contact': 'bg-red-100 text-red-800',
};

interface Props {
  company: Company | null;
  onClose: () => void;
  onEdit: (company: Company) => void;
  onContactClick?: (contactId: number) => void;
  isAdmin: boolean;
  currentUserId?: number;
}

export default function CompanyDetailModal({
  company,
  onClose,
  onEdit,
  onContactClick,
  isAdmin,
  currentUserId,
}: Props) {
  const navigate = useNavigate();
  const [dealFormOpen, setDealFormOpen] = useState(false);

  const { data: allContacts = [], isLoading: contactsLoading } = useContacts();
  const { data: pipelines = [] } = usePipelines();
  const defaultPipelineId = pipelines.find((p) => p.is_default)?.id ?? pipelines[0]?.id;
  // Fan out across every pipeline (not just the default one) so a deal
  // living in any pipeline still shows up here — matches ContactDetailModal.
  const pipelineIds = useMemo(() => pipelines.map((p) => p.id), [pipelines]);
  const { data: opportunities = [], isLoading: oppsLoading } = useAllOpportunities(pipelineIds);
  const { data: stages = [] } = useAllStages(pipelineIds);

  if (!company) return null;

  // View All, Edit Owned Only: matches Contacts/Companies table policy.
  const canEdit = isAdmin || company.owner_id === currentUserId;

  const companyContacts = allContacts.filter((c) => c.account_id === company.id);
  const companyOpportunities = opportunities.filter((o) => o.account_id === company.id);
  const stageName = (stageId: number) => stages.find((s) => s.id === stageId)?.name ?? '--';

  function openAddDeal() {
    setDealFormOpen(true);
  }

  // Takes over the deal's real pipeline (it may not be the default one) and
  // deep-links to it — mirrors ContactDetailModal's openPipelineView.
  function openPipelineView(dealId: number, dealPipelineId?: number | null) {
    onClose();
    const pid = dealPipelineId ?? defaultPipelineId;
    navigate(`/pipeline?pipeline=${pid}&deal=${dealId}`);
  }

  return (
    <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl h-[85vh] flex flex-col overflow-hidden">
        {/* Header — "Company Details" label aligned with edit/close, matching ContactDetailModal */}
        <div className="flex items-center justify-between px-6 py-3 border-b border-slate-200 shrink-0">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wide">
            Company Details
          </span>
          <div className="flex items-center gap-4">
            {canEdit && (
              <button
                onClick={() => onEdit(company)}
                className="text-xs font-semibold text-indigo-600 hover:underline"
              >
                Edit
              </button>
            )}
            <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
              <i className="fa-solid fa-xmark text-lg" />
            </button>
          </div>
        </div>

        {/* 3-column body */}
        <div className="flex-1 grid grid-cols-3 min-h-0">
          {/* Column 1: Details + Contacts + Opportunities */}
          <div className="border-r border-slate-200 overflow-y-auto p-5 space-y-5">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-indigo-100 text-indigo-700 font-bold flex items-center justify-center text-base shrink-0">
                <i className="fa-solid fa-building" />
              </div>
              <div className="min-w-0">
                <h2 className="text-base font-bold text-slate-800 truncate">{toTitleCase(company.name)}</h2>
                <p className="text-xs text-slate-500 truncate">{toTitleCase(company.industry) || 'No industry set'}</p>
              </div>
            </div>

            <div className="space-y-4">
              <DetailField label="Phone" value={company.phone} />
              <DetailField label="Website" value={company.website} />
              <DetailField
                label="Location"
                value={toTitleCase(
                  [company.city, company.state, company.country].filter(Boolean).join(', ')
                )}
              />
              <div>
                <label className="block text-[11px] font-medium text-slate-500 mb-1">Owner</label>
                {company.owner_name ? (
                  <span
                    className="inline-flex items-center gap-1.5 px-2 py-0.5 text-xs font-medium rounded-full"
                    style={{
                      backgroundColor: hexToRgba(company.owner_color || DEFAULT_USER_COLOR, 0.14),
                      color: company.owner_color || DEFAULT_USER_COLOR,
                    }}
                  >
                    <span
                      className="w-1.5 h-1.5 rounded-full"
                      style={{ backgroundColor: company.owner_color || DEFAULT_USER_COLOR }}
                    />
                    {toTitleCase(company.owner_name)}
                  </span>
                ) : (
                  <p className="text-sm text-slate-700">--</p>
                )}
              </div>
              <div>
                <label className="block text-[11px] font-medium text-slate-500 mb-1">Status</label>
                <span
                  className={`inline-flex items-center gap-1.5 px-2 py-0.5 text-xs font-medium rounded-full ${
                    company.is_archived
                      ? 'bg-slate-100 text-slate-500'
                      : 'bg-emerald-100 text-emerald-800'
                  }`}
                >
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      company.is_archived ? 'bg-slate-400' : 'bg-emerald-500'
                    }`}
                  />
                  {company.is_archived ? 'Archived' : 'Active'}
                </span>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-100">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wide">
                  Contacts ({companyContacts.length})
                </h3>
              </div>

              {contactsLoading ? (
                <p className="text-sm text-slate-400">Loading contacts...</p>
              ) : companyContacts.length === 0 ? (
                <p className="text-xs text-slate-400">
                  No contacts linked to this company yet. Add or edit a contact and pick this
                  company to link them here.
                </p>
              ) : (
                <div className="divide-y divide-slate-100 border border-slate-200 rounded-lg">
                  {companyContacts.map((c) => {
                    const fullName = toTitleCase(`${c.first_name} ${c.last_name}`.trim()) || 'No Name';
                    const status = c.lead_status || 'New';
                    return (
                      <button
                        key={c.id}
                        onClick={() => onContactClick?.(c.id)}
                        className="w-full flex items-center justify-between px-3 py-2.5 text-left hover:bg-slate-50"
                      >
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-slate-800 truncate">{fullName}</p>
                          <p className="text-xs text-slate-400 truncate">
                            {toTitleCase(c.job_title) || c.email || '--'}
                          </p>
                        </div>
                        <span
                          className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full shrink-0 ml-3 ${
                            STATUS_COLORS[status] ?? 'bg-slate-100 text-slate-800'
                          }`}
                        >
                          {status}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="pt-2 border-t border-slate-100">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wide">
                  Opportunities ({companyOpportunities.length})
                </h3>
                {canEdit && (
                  <button
                    onClick={openAddDeal}
                    className="text-xs font-semibold text-indigo-600 hover:underline"
                  >
                    + New Opportunity
                  </button>
                )}
              </div>

              {oppsLoading ? (
                <p className="text-sm text-slate-400">Loading opportunities...</p>
              ) : companyOpportunities.length === 0 ? (
                <p className="text-xs text-slate-400">No opportunities for this company yet.</p>
              ) : (
                <div className="divide-y divide-slate-100 border border-slate-200 rounded-lg">
                  {companyOpportunities.map((d) => {
                    const pipelineName = pipelines.find((p) => p.id === d.pipeline_id)?.name;
                    return (
                      <div key={d.id} className="px-3 py-2.5 space-y-1.5">
                        <p className="text-sm font-medium text-slate-800 truncate">{toTitleCase(d.name)}</p>
                        <p className="text-xs text-slate-400 truncate">
                          {toTitleCase([pipelineName, stageName(d.stage_id)].filter(Boolean).join(' · '))}
                        </p>
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-semibold text-emerald-600">
                            {d.deal_value != null
                              ? `$${d.deal_value.toLocaleString(undefined, { minimumFractionDigits: 2 })}`
                              : '--'}
                          </span>
                          <span className="text-xs text-slate-500">
                            {d.assigned_user_name ? `Owner: ${toTitleCase(d.assigned_user_name)}` : 'Unassigned'}
                          </span>
                        </div>
                        {d.created_at && (
                          <p className="text-[11px] text-slate-400">
                            Created{' '}
                            {new Date(d.created_at).toLocaleDateString(undefined, {
                              month: 'short',
                              day: '2-digit',
                              year: 'numeric',
                            })}
                          </p>
                        )}
                        <button
                          onClick={() => openPipelineView(d.id, d.pipeline_id)}
                          className="w-full mt-1.5 text-xs font-semibold text-indigo-600 border border-indigo-200 rounded-lg py-1.5 hover:bg-indigo-50"
                        >
                          View Opportunity
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Column 2: Activity Log */}
          <div className="border-r border-slate-200 overflow-y-auto p-5 space-y-3">
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wide">
              Activity Log
            </h3>
            <p className="text-xs text-slate-400 italic">No activity recorded yet.</p>
          </div>

          {/* Column 3: Notes */}
          <div className="overflow-y-auto p-5 space-y-3">
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Notes</h3>
            <textarea
              placeholder="Write a note about this company..."
              rows={6}
              disabled
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-slate-50 disabled:text-slate-400"
            />
            <button
              disabled
              className="w-full bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-semibold py-2 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              + Add Note
            </button>
            <p className="text-xs text-slate-400 italic pt-2">
              No notes yet — this needs a backend endpoint (e.g. a `notes` table + `get-notes` /
              `add-note` webhooks) since the old app didn't have a notes feature.
            </p>
          </div>
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
    </div>
  );
}

function DetailField({ label, value }: { label: string; value?: string }) {
  return (
    <div>
      <label className="block text-[11px] font-medium text-slate-500 mb-1">{label}</label>
      <p className="text-sm text-slate-700">{value || '--'}</p>
    </div>
  );
}
