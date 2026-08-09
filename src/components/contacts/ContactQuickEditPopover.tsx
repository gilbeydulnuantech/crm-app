import { FormEvent, useEffect, useState } from 'react';
import { Contact } from '../../types/contact';
import { useUpdateContact } from '../../hooks/useContacts';
import CompanyPicker from './CompanyPicker';

interface Props {
  contact: Contact;
  open: boolean;
  onClose: () => void;
}

const inputClass =
  'w-full px-2.5 py-1.5 text-sm border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500';

export default function ContactQuickEditPopover({ contact, open, onClose }: Props) {
  const [form, setForm] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    job_title: '',
    account_id: null as number | null,
    company_name: '',
  });
  const [error, setError] = useState<string | null>(null);
  const updateContact = useUpdateContact();

  useEffect(() => {
    if (open) {
      setForm({
        first_name: contact.first_name ?? '',
        last_name: contact.last_name ?? '',
        email: contact.email ?? '',
        phone: contact.phone ?? '',
        job_title: contact.job_title ?? '',
        account_id: contact.account_id ?? null,
        company_name: contact.company_name ?? '',
      });
      setError(null);
    }
  }, [open, contact]);

  if (!open) return null;

  function update<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    updateContact.mutate(
      {
        id: contact.id,
        payload: {
          first_name: form.first_name,
          last_name: form.last_name,
          email: form.email,
          phone: form.phone,
          job_title: form.job_title,
          account_id: form.account_id,
        },
      },
      {
        onSuccess: () => onClose(),
        onError: (err) => setError(err instanceof Error ? err.message : 'Failed to save contact.'),
      }
    );
  }

  return (
    <div className="fixed inset-0 z-[110] flex items-start justify-center pt-24 px-4">
      <div className="fixed inset-0 bg-slate-900/40" onClick={onClose} />
      <div className="relative bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-md p-4">
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-sm font-semibold text-slate-700">Quick Edit</h4>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <i className="fa-solid fa-xmark text-sm" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-2.5">
          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <label className="block text-[11px] font-medium text-slate-500 mb-1">First Name</label>
              <input
                required
                value={form.first_name}
                onChange={(e) => update('first_name', e.target.value)}
                className={inputClass}
              />
            </div>
            <div>
              <label className="block text-[11px] font-medium text-slate-500 mb-1">Last Name</label>
              <input
                value={form.last_name}
                onChange={(e) => update('last_name', e.target.value)}
                className={inputClass}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <label className="block text-[11px] font-medium text-slate-500 mb-1">Email</label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => update('email', e.target.value)}
                className={inputClass}
              />
            </div>
            <div>
              <label className="block text-[11px] font-medium text-slate-500 mb-1">Phone</label>
              <input
                value={form.phone}
                onChange={(e) => update('phone', e.target.value)}
                className={inputClass}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <label className="block text-[11px] font-medium text-slate-500 mb-1">Position</label>
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

          {error && (
            <div className="p-2 text-xs rounded-md text-center bg-rose-50 text-rose-700 border border-rose-200">
              {error}
            </div>
          )}

          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 rounded-md"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={updateContact.isPending}
              className="px-3 py-1.5 text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white rounded-md"
            >
              {updateContact.isPending ? 'Saving...' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
