import { FormEvent, useEffect, useState } from 'react';
import { Company } from '../../types/company';
import { useAddCompany, useUpdateCompany } from '../../hooks/useCompanies';
import { useUsers } from '../../hooks/useContacts';
import { useAuth } from '../../context/AuthContext';

interface Props {
  open: boolean;
  company: Company | null; // null = add mode, otherwise edit mode
  onClose: () => void;
}

interface FormState {
  name: string;
  industry: string;
  website: string;
  phone: string;
  city: string;
  state: string;
  country: string;
  owner_id: number | null;
}

const EMPTY: FormState = {
  name: '',
  industry: '',
  website: '',
  phone: '',
  city: '',
  state: '',
  country: '',
  owner_id: null,
};

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
        name: company.name ?? '',
        industry: company.industry ?? '',
        website: company.website ?? '',
        phone: company.phone ?? '',
        city: company.city ?? '',
        state: company.state ?? '',
        country: company.country ?? '',
        owner_id: company.owner_id ?? null,
      });
    } else {
      // Non-admins auto-own whatever they create; admins pick explicitly.
      setForm({ ...EMPTY, owner_id: isAdmin ? null : user?.id ?? null });
    }
    setError(null);
  }, [company, open, isAdmin, user]);

  if (!open) return null;

  function update<K extends keyof Omit<FormState, 'owner_id'>>(key: K, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (isEdit && company) {
      updateCompany.mutate(
        { id: company.id, payload: form },
        {
          onSuccess: () => onClose(),
          onError: (err) =>
            setError(err instanceof Error ? err.message : 'Failed to update company.'),
        }
      );
    } else {
      addCompany.mutate(
        { ...form, requester_id: user?.id ?? null },
        {
          onSuccess: () => {
            setForm(EMPTY);
            onClose();
          },
          onError: (err) =>
            setError(err instanceof Error ? err.message : 'Failed to add company.'),
        }
      );
    }
  }

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-slate-800">
            {isEdit ? 'Edit Company' : 'Add Company'}
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <i className="fa-solid fa-xmark" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Company Name</label>
            <input
              required
              value={form.name}
              onChange={(e) => update('name', e.target.value)}
              className="w-full px-3 py-1.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Industry</label>
              <input
                value={form.industry}
                onChange={(e) => update('industry', e.target.value)}
                className="w-full px-3 py-1.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Phone</label>
              <input
                value={form.phone}
                onChange={(e) => update('phone', e.target.value)}
                className="w-full px-3 py-1.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Website</label>
            <input
              value={form.website}
              onChange={(e) => update('website', e.target.value)}
              className="w-full px-3 py-1.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {isAdmin ? (
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Owner</label>
              <select
                value={form.owner_id ?? ''}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    owner_id: e.target.value ? Number(e.target.value) : null,
                  }))
                }
                className="w-full px-3 py-1.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">Unassigned</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name}
                  </option>
                ))}
              </select>
            </div>
          ) : (
            !isEdit && (
              <p className="text-xs text-slate-400">You'll be set as the owner of this company.</p>
            )
          )}

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">City</label>
              <input
                value={form.city}
                onChange={(e) => update('city', e.target.value)}
                className="w-full px-3 py-1.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">State</label>
              <input
                value={form.state}
                onChange={(e) => update('state', e.target.value)}
                className="w-full px-3 py-1.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Country</label>
              <input
                value={form.country}
                onChange={(e) => update('country', e.target.value)}
                className="w-full px-3 py-1.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

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
            <button
              type="submit"
              disabled={isSaving}
              className="px-4 py-2 text-sm font-semibold bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white rounded-lg"
            >
              {isSaving ? 'Saving...' : isEdit ? 'Save Changes' : 'Add Company'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
