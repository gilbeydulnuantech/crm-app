import { FormEvent, useEffect, useState } from 'react';
import {
  COMPANY_EMPLOYEE_BANDS,
  COMPANY_HEALTH_STATUSES,
  COMPANY_REVENUE_BANDS,
  COMPANY_STATUSES,
  COMPANY_TIERS,
  Company,
} from '../../types/company';
import { useAddCompany, useUpdateCompany } from '../../hooks/useCompanies';
import { useUsers } from '../../hooks/useContacts';
import { useAuth } from '../../context/AuthContext';
import ParentCompanyPicker from './ParentCompanyPicker';
import ContactPicker from '../pipeline/ContactPicker';

interface Props {
  open: boolean;
  company: Company | null; // null = add mode, otherwise edit mode
  onClose: () => void;
}

interface FormState {
  name: string;
  website: string;
  industry: string;
  phone: string;
  street_address: string;
  city: string;
  state: string;
  zip_code: string;
  country: string;
  owner_id: number | null;
  parent_company_id: number | null;
  parent_company_name: string;
  tier: string;
  account_status: string;
  account_health: string;
  annual_revenue: string;
  employee_count: string;
  territory: string;
  se_user_id: number | null;
  csm_user_id: number | null;
  // Create-only
  contact_id: number | null;
  contact_name: string;
  contact_role: string;
  // Edit-only
  edit_reason: string;
}

const EMPTY: FormState = {
  name: '',
  website: '',
  industry: '',
  phone: '',
  street_address: '',
  city: '',
  state: '',
  zip_code: '',
  country: '',
  owner_id: null,
  parent_company_id: null,
  parent_company_name: '',
  tier: '',
  account_status: '',
  account_health: '',
  annual_revenue: '',
  employee_count: '',
  territory: '',
  se_user_id: null,
  csm_user_id: null,
  contact_id: null,
  contact_name: '',
  contact_role: '',
  edit_reason: '',
};

const inputClass =
  'w-full px-3 py-1.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--theme-accent)]';
const sectionHeadingClass = 'text-[11px] font-semibold text-slate-400 uppercase tracking-wider';

function SectionHeading({ children }: { children: string }) {
  return <h4 className={sectionHeadingClass}>{children}</h4>;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-medium text-slate-600 mb-1">{label}</label>
      {children}
    </div>
  );
}

export default function CompanyFormModal({ open, company, onClose }: Props) {
  const { user, isAdmin } = useAuth();
  const { data: users = [] } = useUsers();
  const [form, setForm] = useState<FormState>(EMPTY);
  const [error, setError] = useState<string | null>(null);
  const addCompany = useAddCompany();
  const updateCompany = useUpdateCompany();

  const isEdit = !!company;
  const isSaving = addCompany.isPending || updateCompany.isPending;

  useEffect(() => {
    if (company) {
      setForm({
        ...EMPTY,
        name: company.name ?? '',
        website: company.website ?? '',
        industry: company.industry ?? '',
        phone: company.phone ?? '',
        street_address: company.street_address ?? '',
        city: company.city ?? '',
        state: company.state ?? '',
        zip_code: company.zip_code ?? '',
        country: company.country ?? '',
        owner_id: company.owner_id ?? null,
        parent_company_id: company.parent_company_id ?? null,
        parent_company_name: company.parent_company_name ?? '',
        tier: company.tier ?? '',
        account_status: company.account_status ?? '',
        account_health: company.account_health ?? '',
        annual_revenue: company.annual_revenue ?? '',
        employee_count: company.employee_count ?? '',
        territory: company.territory ?? '',
        se_user_id: company.se_user_id ?? null,
        csm_user_id: company.csm_user_id ?? null,
      });
    } else {
      // Non-admins auto-own whatever they create; admins pick explicitly.
      setForm({ ...EMPTY, owner_id: isAdmin ? null : user?.id ?? null });
    }
    setError(null);
  }, [company, open, isAdmin, user]);

  if (!open) return null;

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function handleSubmit(e: FormEvent, createAnother = false) {
    e.preventDefault();
    setError(null);

    const shared = {
      name: form.name,
      website: form.website || undefined,
      industry: form.industry || undefined,
      phone: form.phone || undefined,
      street_address: form.street_address || undefined,
      city: form.city || undefined,
      state: form.state || undefined,
      zip_code: form.zip_code || undefined,
      country: form.country || undefined,
      owner_id: form.owner_id,
      parent_company_id: form.parent_company_id,
      tier: form.tier || undefined,
      annual_revenue: form.annual_revenue || undefined,
      employee_count: form.employee_count || undefined,
      territory: form.territory || undefined,
    };

    if (isEdit && company) {
      updateCompany.mutate(
        {
          id: company.id,
          payload: {
            ...shared,
            account_status: form.account_status || undefined,
            account_health: form.account_health || undefined,
            se_user_id: form.se_user_id,
            csm_user_id: form.csm_user_id,
            edit_reason: form.edit_reason.trim(),
          },
        },
        {
          onSuccess: () => onClose(),
          onError: (err) =>
            setError(err instanceof Error ? err.message : 'Failed to update company.'),
        }
      );
    } else {
      addCompany.mutate(
        {
          ...shared,
          requester_id: user?.id ?? null,
          contact_id: form.contact_id,
          contact_role: form.contact_role || undefined,
        },
        {
          onSuccess: () => {
            if (createAnother) {
              setForm({ ...EMPTY, owner_id: isAdmin ? null : user?.id ?? null });
            } else {
              setForm(EMPTY);
              onClose();
            }
          },
          onError: (err) =>
            setError(err instanceof Error ? err.message : 'Failed to add company.'),
        }
      );
    }
  }

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-slate-800">
            {isEdit ? `Edit Company: ${company!.name}` : 'Create Company / Account'}
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <i className="fa-solid fa-xmark" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-3">
            <SectionHeading>{isEdit ? 'Basic Information' : 'Company Identification'}</SectionHeading>
            <div>
              <Field label="Company Name *">
                <input
                  required
                  autoFocus
                  value={form.name}
                  onChange={(e) => update('name', e.target.value)}
                  className={inputClass}
                />
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Domain / Website">
                <input
                  value={form.website}
                  onChange={(e) => update('website', e.target.value)}
                  placeholder="https://..."
                  className={inputClass}
                />
              </Field>
              <Field label="Industry">
                <input
                  value={form.industry}
                  onChange={(e) => update('industry', e.target.value)}
                  className={inputClass}
                />
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {isEdit ? (
                <Field label="Status">
                  <select
                    value={form.account_status}
                    onChange={(e) => update('account_status', e.target.value)}
                    className={inputClass}
                  >
                    <option value="">--</option>
                    {COMPANY_STATUSES.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </Field>
              ) : (
                <Field label="Account Tier / Segment">
                  <select value={form.tier} onChange={(e) => update('tier', e.target.value)} className={inputClass}>
                    <option value="">--</option>
                    {COMPANY_TIERS.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </Field>
              )}
              <Field label="Phone Number">
                <input
                  value={form.phone}
                  onChange={(e) => update('phone', e.target.value)}
                  className={inputClass}
                />
              </Field>
            </div>
          </div>

          <div className="space-y-3">
            <SectionHeading>{isEdit ? 'Ownership & Account Team' : 'Hierarchy & Relationships'}</SectionHeading>
            <div className="grid grid-cols-2 gap-3">
              <ParentCompanyPicker
                excludeCompanyId={company?.id ?? null}
                parentCompanyId={form.parent_company_id}
                parentCompanyName={form.parent_company_name}
                onChange={(id, name) => setForm((f) => ({ ...f, parent_company_id: id, parent_company_name: name }))}
              />
              {isAdmin ? (
                <Field label="Account Owner">
                  <select
                    value={form.owner_id ?? ''}
                    onChange={(e) => update('owner_id', e.target.value ? Number(e.target.value) : null)}
                    className={inputClass}
                  >
                    <option value="">Unassigned</option>
                    {users.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.name}
                      </option>
                    ))}
                  </select>
                </Field>
              ) : (
                <div className="flex items-end">
                  {!isEdit && <p className="text-xs text-slate-400 pb-1.5">You'll be set as the owner.</p>}
                </div>
              )}
            </div>

            {isEdit && (
              <div className="grid grid-cols-2 gap-3">
                <Field label="Sales Engineer (SE)">
                  <select
                    value={form.se_user_id ?? ''}
                    onChange={(e) => update('se_user_id', e.target.value ? Number(e.target.value) : null)}
                    className={inputClass}
                  >
                    <option value="">Unassigned</option>
                    {users.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.name}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Customer Success Manager (CSM)">
                  <select
                    value={form.csm_user_id ?? ''}
                    onChange={(e) => update('csm_user_id', e.target.value ? Number(e.target.value) : null)}
                    className={inputClass}
                  >
                    <option value="">Unassigned</option>
                    {users.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.name}
                      </option>
                    ))}
                  </select>
                </Field>
              </div>
            )}

            {isEdit && (
              <Field label="Account Health Status">
                <select
                  value={form.account_health}
                  onChange={(e) => update('account_health', e.target.value)}
                  className={inputClass}
                >
                  <option value="">--</option>
                  {COMPANY_HEALTH_STATUSES.map((h) => (
                    <option key={h} value={h}>
                      {h}
                    </option>
                  ))}
                </select>
              </Field>
            )}
          </div>

          <div className="space-y-3">
            <SectionHeading>{isEdit ? 'Firmographics & Hierarchy' : 'Firmographics & Territory'}</SectionHeading>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Annual Revenue">
                <select
                  value={form.annual_revenue}
                  onChange={(e) => update('annual_revenue', e.target.value)}
                  className={inputClass}
                >
                  <option value="">--</option>
                  {COMPANY_REVENUE_BANDS.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Employee Count">
                <select
                  value={form.employee_count}
                  onChange={(e) => update('employee_count', e.target.value)}
                  className={inputClass}
                >
                  <option value="">--</option>
                  {COMPANY_EMPLOYEE_BANDS.map((b) => (
                    <option key={b} value={b}>
                      {b}
                    </option>
                  ))}
                </select>
              </Field>
            </div>
            {isEdit ? (
              <Field label="Account Tier">
                <select value={form.tier} onChange={(e) => update('tier', e.target.value)} className={inputClass}>
                  <option value="">--</option>
                  {COMPANY_TIERS.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </Field>
            ) : (
              <Field label="Territory / Region">
                <input
                  value={form.territory}
                  onChange={(e) => update('territory', e.target.value)}
                  placeholder="e.g. North America - South"
                  className={inputClass}
                />
              </Field>
            )}
          </div>

          {!isEdit && (
            <div className="space-y-3">
              <SectionHeading>Primary Address</SectionHeading>
              <Field label="Street Address">
                <input
                  value={form.street_address}
                  onChange={(e) => update('street_address', e.target.value)}
                  className={inputClass}
                />
              </Field>
              <div className="grid grid-cols-3 gap-3">
                <Field label="City">
                  <input value={form.city} onChange={(e) => update('city', e.target.value)} className={inputClass} />
                </Field>
                <Field label="State">
                  <input value={form.state} onChange={(e) => update('state', e.target.value)} className={inputClass} />
                </Field>
                <Field label="Zip">
                  <input
                    value={form.zip_code}
                    onChange={(e) => update('zip_code', e.target.value)}
                    className={inputClass}
                  />
                </Field>
              </div>
              <Field label="Country">
                <input value={form.country} onChange={(e) => update('country', e.target.value)} className={inputClass} />
              </Field>
            </div>
          )}

          {!isEdit && (
            <div className="space-y-3">
              <SectionHeading>Initial Contact Link (Optional)</SectionHeading>
              <div className="grid grid-cols-2 gap-3">
                <ContactPicker
                  contactId={form.contact_id}
                  contactName={form.contact_name}
                  onChange={(id, name) => setForm((f) => ({ ...f, contact_id: id, contact_name: name }))}
                />
                <Field label="Contact Role">
                  <input
                    value={form.contact_role}
                    onChange={(e) => update('contact_role', e.target.value)}
                    placeholder="e.g. Decision Maker / Champion"
                    disabled={!form.contact_id}
                    className={`${inputClass} disabled:bg-slate-50 disabled:text-slate-400`}
                  />
                </Field>
              </div>
            </div>
          )}

          {isEdit && (
            <div className="space-y-3">
              <SectionHeading>Reason for Edit (Required for Audit Logging)</SectionHeading>
              <textarea
                required
                value={form.edit_reason}
                onChange={(e) => update('edit_reason', e.target.value)}
                rows={2}
                placeholder="e.g. Reassigned Customer Success Manager following Q3 team restructuring"
                className={`${inputClass} resize-none`}
              />
            </div>
          )}

          {error && (
            <div className="p-2.5 text-xs rounded-lg text-center bg-rose-50 text-rose-700 border border-rose-200">
              {error}
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 rounded-lg"
            >
              Cancel
            </button>
            {!isEdit && (
              <button
                type="button"
                disabled={isSaving}
                onClick={(e) => handleSubmit(e, true)}
                className="px-4 py-2 text-sm font-semibold border border-slate-200 hover:bg-slate-50 text-slate-700 disabled:opacity-60 rounded-lg"
              >
                Save &amp; Add Another
              </button>
            )}
            <button
              type="submit"
              disabled={isSaving}
              className="px-4 py-2 text-sm font-semibold bg-[var(--theme-accent)] hover:bg-[var(--theme-accent-hover)] disabled:opacity-60 text-white rounded-lg"
            >
              {isSaving ? 'Saving...' : isEdit ? 'Save Changes' : 'Save Company'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
