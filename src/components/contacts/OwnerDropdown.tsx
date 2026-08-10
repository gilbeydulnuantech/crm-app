import { useState } from 'react';
import { Contact } from '../../types/contact';
import { useAssignOwner, useUsers } from '../../hooks/useContacts';
import { toTitleCase } from '../../utils/text';

interface Props {
  contact: Contact;
  disabled?: boolean;
}

export default function OwnerDropdown({ contact, disabled }: Props) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { data: users = [] } = useUsers();
  const assignOwner = useAssignOwner();

  function handleSelect(ownerId: number | null) {
    setError(null);
    assignOwner.mutate(
      { contactId: contact.id, ownerId },
      { onError: (err) => setError(err instanceof Error ? err.message : 'Failed to assign owner.') }
    );
    setOpen(false);
  }

  return (
    <div>
      <label className="block text-[11px] font-medium text-slate-500 mb-1 text-right">Owner</label>
      <div className="relative">
        <button
          onClick={() => !disabled && setOpen((v) => !v)}
          disabled={disabled}
          className={`w-full flex items-center justify-between px-2 py-1 text-xs border border-slate-200 rounded-lg ${
            disabled ? 'bg-slate-50 cursor-not-allowed' : 'hover:border-slate-300'
          }`}
        >
          <span className={contact.owner_name ? 'text-slate-700' : 'text-slate-400'}>
            {contact.owner_name ? toTitleCase(contact.owner_name) : 'Unassigned'}
          </span>
          {!disabled && <i className="fa-solid fa-chevron-down text-[10px] text-slate-400" />}
        </button>

        {open && !disabled && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
            <div className="absolute top-full mt-1 left-0 w-full min-w-[180px] bg-white border border-slate-200 rounded-lg shadow-lg z-20 py-1 max-h-52 overflow-y-auto">
              <label className="flex items-center gap-2 px-2.5 py-1.5 text-xs hover:bg-slate-50 cursor-pointer">
                <input
                  type="checkbox"
                  checked={!contact.owner_id}
                  onChange={() => handleSelect(null)}
                  className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                />
                <span className="text-slate-500">Unassigned</span>
              </label>
              {users.map((u) => (
                <label
                  key={u.id}
                  className="flex items-center gap-2 px-2.5 py-1.5 text-xs hover:bg-slate-50 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={contact.owner_id === u.id}
                    onChange={() => handleSelect(u.id)}
                    className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  <span className="text-slate-700">{toTitleCase(u.name)}</span>
                </label>
              ))}
            </div>
          </>
        )}
      </div>
      {error && <p className="text-[11px] text-rose-600 mt-1">{error}</p>}
    </div>
  );
}
