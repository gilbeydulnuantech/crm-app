import { Company } from '../../types/company';
import { useContacts } from '../../hooks/useContacts';

interface Props {
  company: Company | null;
  onClose: () => void;
  onEdit: (company: Company) => void;
  onContactClick?: (contactId: number) => void;
}

export default function CompanyDetailModal({ company, onClose, onEdit, onContactClick }: Props) {
  const { data: allContacts = [], isLoading } = useContacts();

  if (!company) return null;

  const companyContacts = allContacts.filter((c) => c.account_id === company.id);

  return (
    <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-indigo-100 text-indigo-700 font-bold flex items-center justify-center text-sm">
              <i className="fa-solid fa-building" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-800">{company.name}</h2>
              <p className="text-xs text-slate-500">{company.industry || 'No industry set'}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
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

        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <Field label="Website" value={company.website} />
            <Field label="Phone" value={company.phone} />
            <Field
              label="Location"
              value={[company.city, company.state, company.country].filter(Boolean).join(', ')}
            />
            <Field label="Owner" value={company.owner_name} />
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wide">
                Contacts at this company
              </h3>
              <span className="text-xs text-slate-400">{companyContacts.length}</span>
            </div>

            {isLoading ? (
              <p className="text-sm text-slate-400">Loading contacts...</p>
            ) : companyContacts.length === 0 ? (
              <p className="text-sm text-slate-400">
                No contacts linked to this company yet. Add or edit a contact and pick this company
                to link them here.
              </p>
            ) : (
              <div className="divide-y divide-slate-100 border border-slate-200 rounded-lg">
                {companyContacts.map((c) => {
                  const fullName = `${c.first_name} ${c.last_name}`.trim() || 'No Name';
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
                      <span className="text-xs text-slate-400 shrink-0 ml-3">{c.lead_status ?? 'New'}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
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
