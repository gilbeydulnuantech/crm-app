import { FormEvent, useEffect, useState } from 'react';
import { Contact, LEAD_STATUS_OPTIONS } from '../../types/contact';
import { useAddContact, useUpdateContact } from '../../hooks/useContacts';
import CompanyPicker from './CompanyPicker';

interface Props {
  open: boolean;
  contact?: Contact | null; // present = edit mode
  onClose: () => void;
}

const EMPTY = {
  first_name: '',
  last_name: '',
  email: '',
  secondary_email: '',
  phone: '',
  secondary_phone: '',
  linkedin_url: '',
  job_title: '',
  account_id: null as number | null,
  company_name: '',
  city: '',
  state: '',
  zip_code: '',
  country: '',
  lead_status: 'New',
  lead_source: '',
  do_not_contact: false,
};

const inputClass =
  'w-full px-3 py-1.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500';

export default function AddContactModal({ open, contact, onClose }: Props) {
  const [form, setForm] = useState(EMPTY);
  const [error, setError] = useState<string | null>(null);
  const addContact = useAddContact();
  const updateContact = useUpdateContact();

  const isEdit = !!contact;
  const isSaving = addContact.isPending || updateContact.isPending;

  useEffect(() => {
    if (contact) {
      setForm({
        first_name: contact.first_name ?? '',
        last_name: contact.last_name ?? '',
        email: contact.email ?? '',
        secondary_email: contact.secondary_email ?? '',
        phone: contact.phone ?? '',
        secondary_phone: contact.secondary_phone ?? '',
        linkedin_url: contact.linkedin_url ?? '',
        job_title: contact.job_title ?? '',
        account_id: contact.account_id ?? null,
        company_name: contact.company_name ?? '',
        city: contact.city ?? '',
        state: contact.state ?? '',
        zip_code: contact.zip_code ?? '',
        country: contact.country ?? '',
        lead_status: contact.lead_status ?? 'New',
        lead_source: contact.lead_source ?? '',
        do_not_contact: contact.do_not_contact ?? false,
      });
    } else {
      setForm(EMPTY);
    }
    setError(null);
  }, [contact, open]);

  if (!open) return null;

  function update<K extends keyof typeof EMPTY>(key: K, value: (typeof EMPTY)[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    // account_id is the real link to the companies table; company_name is
    // sent too only so a backend that hasn't been updated to join it can
    // still display something — the source of truth is account_id.
    const payload = {
      first_name: form.first_name,
      last_name: form.last_name,
      email: form.email,
      secondary_email: form.secondary_email,
      phone: form.phone,
      secondary_phone: form.secondary_phone,
      linkedin_url: form.linkedin_url,
      job_title: form.job_title,
      account_id: form.account_id,
      city: form.city,
      state: form.state,
      zip_code: form.zip_code,
      country: form.country,
      lead_status: form.lead_status,
      lead_source: form.lead_source,
      do_not_contact: form.do_not_contact,
    };

    if (isEdit && contact) {
      updateContact.mutate(
        { id: contact.id, payload },
        {
          onSuccess: () => onClose(),
          onError: (err) => setError(err instanceof Error ? err.message : 'Failed to update contact.'),
        }
      );
    } else {
      addContact.mutate(payload, {
        onSuccess: () => {
          setForm(EMPTY);
          onClose();
        },
        onError: (err) => setError(err instanceof Error ? err.message : 'Failed to add contact.'),
      });
    }
  }

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl p-6 max-h-[85vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-slate-800">{isEdit ? 'Edit Contact' : 'Add Contact'}</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <i className="fa-solid fa-xmark" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">First Name</label>
              <input
                required
                value={form.first_name}
                onChange={(e) => update('first_name', e.target.value)}
                className={inputClass}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Last Name</label>
              <input
                value={form.last_name}
                onChange={(e) => update('last_name', e.target.value)}
                className={inputClass}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Email</label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => update('email', e.target.value)}
                className={inputClass}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Secondary Email</label>
              <input
                type="email"
                value={form.secondary_email}
                onChange={(e) => update('secondary_email', e.target.value)}
                className={inputClass}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Phone</label>
              <input
                value={form.phone}
                onChange={(e) => update('phone', e.target.value)}
                className={inputClass}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Secondary Phone</label>
              <input
                value={form.secondary_phone}
                onChange={(e) => update('secondary_phone', e.target.value)}
                className={inputClass}
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">LinkedIn URL</label>
            <input
              type="url"
              value={form.linkedin_url}
              onChange={(e) => update('linkedin_url', e.target.value)}
              placeholder="https://linkedin.com/in/..."
              className={inputClass}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Job Title</label>
              <input
                value={form.job_title}
                onChange={(e) => update('job_title', e.target.value)}
                className={inputClass}
              />
            </div>
            <CompanyPicker
              accountId={form.account_id}
              companyName={form.company_name}
              onChange={(accountId, name) => {
                update('account_id', accountId);
                update('company_name', name);
              }}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">City</label>
              <input value={form.city} onChange={(e) => update('city', e.target.value)} className={inputClass} />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">State</label>
              <input value={form.state} onChange={(e) => update('state', e.target.value)} className={inputClass} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Zip Code</label>
              <input
                value={form.zip_code}
                onChange={(e) => update('zip_code', e.target.value)}
                className={inputClass}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Country</label>
              <input
                value={form.country}
                onChange={(e) => update('country', e.target.value)}
                className={inputClass}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Status</label>
              <select
                value={form.lead_status}
                onChange={(e) => update('lead_status', e.target.value)}
                className={inputClass}
              >
                {LEAD_STATUS_OPTIONS.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Lead Source</label>
              <input
                value={form.lead_source}
                onChange={(e) => update('lead_source', e.target.value)}
                placeholder="e.g. Referral, Website"
                className={inputClass}
              />
            </div>
          </div>

          <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer pt-1">
            <input
              type="checkbox"
              checked={form.do_not_contact}
              onChange={(e) => update('do_not_contact', e.target.checked)}
              className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
            />
            Do Not Contact
          </label>

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
              {isSaving ? 'Saving...' : isEdit ? 'Save Changes' : 'Add Contact'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
