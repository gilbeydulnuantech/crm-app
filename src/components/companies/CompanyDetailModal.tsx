import { Company } from '../../types/company';
import { useContacts } from '../../hooks/useContacts';
import { usePipelines, useStages, useOpportunities } from '../../hooks/useOpportunities';

const STATUS_COLORS: Record<string, string> = {
  New: 'bg-slate-100 text-slate-800',
  Contacted: 'bg-blue-100 text-blue-800',
  Qualified: 'bg-amber-100 text-amber-800',
  Unqualified: 'bg-rose-100 text-rose-700',
  Customer: 'bg-emerald-100 text-emerald-800',
};

interface Props {
  company: Company | null;
  onClose: () => void;
  onEdit: (company: Company) => void;
  onContactClick?: (contactId: number) => void;
}

export default function CompanyDetailModal({ company, onClose, onEdit, onContactClick }: Props) {
  const { data: allContacts = [], isLoading: contactsLoading } = useContacts();
  const { data: pipelines = [] } = usePipelines();
  const defaultPipelineId = pipelines.find((p) => p.is_default)?.id ?? pipelines[0]?.id;
  const { data: stages = [] } = useStages(defaultPipelineId);
  const { data: opportunities = [], isLoading: oppsLoading } = useOpportunities(defaultPipelineId);

  if (!company) return null;

  const companyContacts = allContacts.filter((c) => c.account_id === company.id);
  const companyOpportunities = opportunities.filter((o) => o.account_id === company.id);
  const stageName = (stageId: number) => stages.find((s) => s.id === stageId)?.name ?? '--';

  return (
    <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl h-[85vh] flex flex-col overflow-hidden">
        {/* Header — "Company Details" label aligned with edit/close, matching ContactDetailModal */}
        <div className="flex items-center justify-between px-6 py-3 border-b border-slate-200 shrink-0">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wide">
            Company Details
          </span>
          <div className="flex items-center gap-4">
            <button
              onClick={() => onEdit(company)}
              className="text-xs font-semibold text-indigo-600 hover:underline"
            >
              Edit
            </button>
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
                <h2 className="text-base font-bold text-slate-800 truncate">{company.name}</h2>
                <p className="text-xs text-slate-500 truncate">{company.industry || 'No industry set'}</p>
              </div>
            </div>

            <div className="space-y-4">
              <DetailField label="Phone" value={company.phone} />
              <DetailField label="Website" value={company.website} />
              <DetailField
                label="Location"
                value={[company.city, company.state, company.country].filter(Boolean).join(', ')}
              />
              <DetailField label="Owner" value={company.owner_name} />
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
                    const fullName = `${c.first_name} ${c.last_name}`.trim() || 'No Name';
                    const status = c.lead_status || 'New';
                    return (
                      <button
                        key={c.id}
                        onClick={() => onContactClick?.(c.id)}
                        className="w-full flex items-center justify-between px-3 py-2.5 text-left hover:bg-slate-50"
                      >
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-slate-800 truncate">{fullName}</p>
                          <p className="text-xs text-slate-400 truncate">{c.job_title || c.email || '--'}</p>
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
              </div>

              {oppsLoading ? (
                <p className="text-sm text-slate-400">Loading opportunities...</p>
              ) : companyOpportunities.length === 0 ? (
                <p className="text-xs text-slate-400">No open opportunities for this company.</p>
              ) : (
                <div className="divide-y divide-slate-100 border border-slate-200 rounded-lg">
                  {companyOpportunities.map((o) => (
                    <div key={o.id} className="flex items-center justify-between px-3 py-2.5">
                      <p className="text-sm font-medium text-slate-800 truncate min-w-0">{o.name}</p>
                      <div className="flex items-center gap-3 shrink-0 ml-3">
                        <span className="text-xs text-slate-500">
                          {o.deal_value != null ? `$${o.deal_value.toLocaleString()}` : '--'}
                        </span>
                        <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700">
                          {stageName(o.stage_id)}
                        </span>
                      </div>
                    </div>
                  ))}
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
