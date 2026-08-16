import { useEffect, useMemo, useRef, useState } from 'react';
import { useContacts } from '../../hooks/useContacts';
import { toTitleCase } from '../../utils/text';

interface Props {
  contactId: number | null;
  contactName: string; // display value — kept in sync by the parent form
  onChange: (contactId: number | null, contactName: string) => void;
  // When set, only contacts linked to this company are offered — e.g.
  // creating a task/deal/event from inside CompanyDetailModal shouldn't let
  // you attach an unrelated person from across the whole database. Also
  // relaxes `required` below: a company can legitimately have zero tracked
  // contacts yet, and forcing a selection from an empty list would be a
  // dead end.
  accountId?: number | null;
  // Defaults to true (existing behavior everywhere else). Explicitly pass
  // false where a contact genuinely isn't mandatory.
  required?: boolean;
}

export default function ContactPicker({ contactId, contactName, onChange, accountId, required = true }: Props) {
  const [query, setQuery] = useState(contactName);
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Reuses the same cached ['contacts'] query the Contacts page already
  // populates via get-contacts — no separate search endpoint needed.
  const { data: allContacts = [], isFetching } = useContacts();

  useEffect(() => {
    setQuery(contactName);
  }, [contactName]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const scopedContacts = useMemo(
    () => (accountId != null ? allContacts.filter((c) => c.account_id === accountId) : allContacts),
    [allContacts, accountId]
  );

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    const named = scopedContacts.map((c) => ({ ...c, fullName: `${c.first_name} ${c.last_name}`.trim() }));
    if (!q) return named.slice(0, 10);
    return named
      .filter((c) => c.fullName.toLowerCase().includes(q) || c.email?.toLowerCase().includes(q))
      .slice(0, 10);
  }, [scopedContacts, query]);

  const isScopedEmpty = accountId != null && scopedContacts.length === 0;

  function handleSelect(contact: { id: number; fullName: string }) {
    onChange(contact.id, contact.fullName);
    setQuery(contact.fullName);
    setOpen(false);
  }

  function handleInputChange(value: string) {
    setQuery(value);
    setOpen(true);
    // Typing away from the previously-selected contact clears the link
    // until they pick one again — prevents silently keeping a stale
    // contact_id that no longer matches the visible text.
    if (contactId !== null) onChange(null, value);
  }

  return (
    <div ref={containerRef} className="relative">
      <label className="block text-xs font-medium text-slate-600 mb-1">Contact</label>
      <input
        required={required && !isScopedEmpty}
        disabled={isScopedEmpty}
        value={query}
        onChange={(e) => handleInputChange(e.target.value)}
        onFocus={() => setOpen(true)}
        placeholder={isScopedEmpty ? 'No contacts linked to this company yet' : 'Search contacts...'}
        className="w-full px-3 py-1.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--theme-accent)] disabled:bg-slate-50 disabled:text-slate-400"
      />
      {isScopedEmpty && (
        <p className="text-[11px] text-slate-400 mt-1">
          This company has no linked contacts yet — you can still save without one.
        </p>
      )}

      {open && !isScopedEmpty && (
        <div className="absolute top-full mt-1 left-0 w-full bg-white border border-slate-200 rounded-lg shadow-lg z-30 py-1 max-h-48 overflow-y-auto">
          {isFetching && <p className="text-[11px] text-slate-400 px-3 py-1.5">Loading contacts...</p>}
          {!isFetching && results.length === 0 && (
            <p className="text-[11px] text-slate-400 px-3 py-1.5">
              {accountId != null ? 'No matching contacts at this company.' : 'No matching contacts.'}
            </p>
          )}
          {results.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => handleSelect(c)}
              className="w-full text-left px-3 py-1.5 text-sm hover:bg-slate-50 text-slate-700"
            >
              {toTitleCase(c.fullName) || 'No Name'}
              {c.company_name && <span className="text-slate-400"> — {toTitleCase(c.company_name)}</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
