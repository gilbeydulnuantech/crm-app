import { useEffect, useMemo, useRef, useState } from 'react';
import { Contact, LEAD_STATUS_OPTIONS } from '../../types/contact';
import { useAddContact, useContacts, useUpdateContact, useUsers } from '../../hooks/useContacts';
import { useAuth } from '../../context/AuthContext';
import { toTitleCase } from '../../utils/text';
import CompanyPicker from './CompanyPicker';

interface Props {
  open: boolean;
  contact?: Contact | null; // present = edit mode
  defaultAccountId?: number | null; // prefill company link, e.g. from Company Quick View's "+ Add Contact"
  defaultCompanyName?: string;
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
  timezone: '',
  birthdate: '',
  do_not_contact: false,
  owner_id: null as number | null,
};

const inputClass =
  'w-full px-3 py-1.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--theme-accent)]';

// Real IANA list from the browser instead of a hand-maintained array — every
// evergreen browser supports this (Intl.supportedValuesOf shipped in all of
// them years ago); the try/catch just protects an unusually old runtime.
function getTimezoneOptions(): string[] {
  try {
    return (Intl as any).supportedValuesOf('timeZone');
  } catch {
    return [];
  }
}
const TIMEZONE_OPTIONS = getTimezoneOptions();

export default function AddContactModal({
  open,
  contact,
  defaultAccountId,
  defaultCompanyName,
  onClose,
}: Props) {
  const formRef = useRef<HTMLFormElement>(null);
  const [form, setForm] = useState(EMPTY);
  const [error, setError] = useState<string | null>(null);
  const [justAdded, setJustAdded] = useState(false);
  const addContact = useAddContact();
  const updateContact = useUpdateContact();
  const { user, isAdmin } = useAuth();
  const { data: users = [] } = useUsers();
  // Reuses the ['contacts'] cache Contacts.tsx already populated — no extra
  // request — just to check for an existing contact with the same email.
  const { data: allContacts = [] } = useContacts();

  const isEdit = !!contact;
  const isSaving = addContact.isPending || updateContact.isPending;

  // Hard block — mirrors the backend's Check Duplicate Contact rule
  // (contact_ add.json): a matching email on either side (primary or
  // secondary), name irrelevant. An email address belongs to one inbox —
  // a second contact record under a different name but the same address
  // means outbound email/SMS would go to that person under the wrong
  // identity, so this blocks regardless of whether the name matches.
  // Blocking here on the same rule the server already enforces means Save
  // never fails with a duplicate error the rep couldn't have seen coming.
  const duplicateMatch = useMemo(() => {
    const candidateEmails = [form.email.trim().toLowerCase(), form.secondary_email.trim().toLowerCase()].filter(
      Boolean
    );
    if (candidateEmails.length === 0) return null;
    return (
      allContacts.find((c) => {
        if (c.id === contact?.id) return false;
        const existingEmails = [(c.email ?? '').trim().toLowerCase(), (c.secondary_email ?? '').trim().toLowerCase()];
        return candidateEmails.some((e) => existingEmails.includes(e));
      }) ?? null
    );
  }, [form.email, form.secondary_email, allContacts, contact]);

  function resetForNew(keepCompany: boolean) {
    setForm({
      ...EMPTY,
      account_id: keepCompany ? form.account_id : (defaultAccountId ?? null),
      company_name: keepCompany ? form.company_name : (defaultCompanyName ?? ''),
      owner_id: form.owner_id,
    });
  }

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
        timezone: contact.timezone ?? '',
        birthdate: contact.birthdate ?? '',
        do_not_contact: contact.do_not_contact ?? false,
        owner_id: contact.owner_id ?? null,
      });
    } else {
      setForm({
        ...EMPTY,
        account_id: defaultAccountId ?? null,
        company_name: defaultCompanyName ?? '',
        owner_id: user?.id ?? null,
      });
    }
    setError(null);
    setJustAdded(false);
  }, [contact, open, defaultAccountId, defaultCompanyName, user]);

  if (!open) return null;

  function update<K extends keyof typeof EMPTY>(key: K, value: (typeof EMPTY)[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function handleSubmit(e: { preventDefault: () => void }, keepOpen = false) {
    e.preventDefault();
    setError(null);
    setJustAdded(false);

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
      timezone: form.timezone,
      birthdate: form.birthdate,
      do_not_contact: form.do_not_contact,
      // The backend only honors this for admins — anyone else's new
      // contacts stay self-owned regardless of what's sent here.
      ...(isEdit ? {} : { owner_id: form.owner_id }),
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
          if (keepOpen) {
            resetForNew(true);
            setJustAdded(true);
          } else {
            setForm(EMPTY);
            onClose();
          }
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

        <form ref={formRef} onSubmit={handleSubmit} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">
                First Name <span className="text-rose-500">*</span>
              </label>
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
              {duplicateMatch && (
                <p className="mt-1 text-[11px] text-rose-600 flex items-center gap-1">
                  <i className="fa-solid fa-circle-exclamation" />
                  Already used by{' '}
                  {toTitleCase(`${duplicateMatch.first_name} ${duplicateMatch.last_name}`.trim()) || 'another contact'}{' '}
                  — edit that contact instead, or use a different email for this one.
                </p>
              )}
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

          {!isEdit && (
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Owner</label>
              {isAdmin ? (
                <select
                  value={form.owner_id ?? ''}
                  onChange={(e) => update('owner_id', e.target.value ? Number(e.target.value) : null)}
                  className={inputClass}
                >
                  {users.map((u) => (
                    <option key={u.id} value={u.id}>
                      {toTitleCase(u.name)}
                      {u.id === user?.id ? ' (You)' : ''}
                    </option>
                  ))}
                </select>
              ) : (
                <div className={`${inputClass} bg-slate-50 text-slate-500`}>
                  {toTitleCase(user?.name) || 'You'}
                </div>
              )}
            </div>
          )}

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

          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Timezone</label>
            {TIMEZONE_OPTIONS.length > 0 ? (
              <select value={form.timezone} onChange={(e) => update('timezone', e.target.value)} className={inputClass}>
                <option value="">--</option>
                {TIMEZONE_OPTIONS.map((tz) => (
                  <option key={tz} value={tz}>
                    {tz.replace(/_/g, ' ')}
                  </option>
                ))}
              </select>
            ) : (
              <input
                value={form.timezone}
                onChange={(e) => update('timezone', e.target.value)}
                placeholder="e.g. America/New_York"
                className={inputClass}
              />
            )}
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Birthdate</label>
            <input
              type="date"
              value={form.birthdate}
              onChange={(e) => update('birthdate', e.target.value)}
              className={inputClass}
            />
          </div>

          <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer pt-1">
            <input
              type="checkbox"
              checked={form.do_not_contact}
              onChange={(e) => update('do_not_contact', e.target.checked)}
              className="rounded border-slate-300 text-indigo-600 focus:ring-[var(--theme-accent)]"
            />
            Do Not Contact
          </label>

          {error && (
            <div className="p-2.5 text-xs rounded-lg text-center bg-rose-50 text-rose-700 border border-rose-200">
              {error}
            </div>
          )}

          {justAdded && (
            <div className="p-2.5 text-xs rounded-lg text-center bg-emerald-50 text-emerald-700 border border-emerald-200">
              <i className="fa-solid fa-check mr-1" />
              Contact added — form cleared for the next one.
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
                disabled={isSaving || !!duplicateMatch}
                onClick={(e) => {
                  if (!formRef.current?.reportValidity()) return;
                  handleSubmit(e, true);
                }}
                className="px-4 py-2 text-sm font-semibold border border-slate-200 hover:bg-slate-50 disabled:opacity-60 text-slate-700 rounded-lg"
              >
                Save &amp; New
              </button>
            )}
            <button
              type="submit"
              disabled={isSaving || !!duplicateMatch}
              className="px-4 py-2 text-sm font-semibold bg-[var(--theme-accent)] hover:bg-[var(--theme-accent-hover)] disabled:opacity-60 text-white rounded-lg"
            >
              {isSaving ? 'Saving...' : isEdit ? 'Save Changes' : 'Add Contact'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
