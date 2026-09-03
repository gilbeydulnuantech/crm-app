import { useEffect, useMemo, useRef, useState } from 'react';
import { useAddCompany, useCompanies } from '../../hooks/useCompanies';

interface Props {
  accountId: number | null;
  companyName: string; // display value — kept in sync by the parent form
  onChange: (accountId: number | null, companyName: string) => void;
}

export default function CompanyPicker({ accountId, companyName, onChange }: Props) {
  const [query, setQuery] = useState(companyName);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Reuses the same cached ['companies'] query the Companies page already
  // populates via get-companies — no separate search endpoint needed, and
  // typing just filters this list client-side.
  const { data: allCompanies = [], isFetching } = useCompanies();
  const addCompany = useAddCompany();

  useEffect(() => {
    setQuery(companyName);
  }, [companyName]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return allCompanies.slice(0, 10);
    return allCompanies.filter((c) => c.name.toLowerCase().includes(q)).slice(0, 10);
  }, [allCompanies, query]);

  const exactMatch = allCompanies.some((c) => c.name.toLowerCase() === query.trim().toLowerCase());

  function handleSelect(company: { id: number; name: string }) {
    onChange(company.id, company.name);
    setQuery(company.name);
    setOpen(false);
    setError(null);
  }

  function handleCreate() {
    const name = query.trim();
    if (!name) return;
    setError(null);
    addCompany.mutate(
      { name },
      {
        onSuccess: (result) => {
          if (!result?.id) {
            setError('Company was created but add-companies did not return an id — cannot link it.');
            return;
          }
          onChange(result.id, name);
          setQuery(name);
          setOpen(false);
        },
        onError: (err) =>
          setError(err instanceof Error ? err.message : 'Failed to create company.'),
      }
    );
  }

  function handleInputChange(value: string) {
    setQuery(value);
    setOpen(true);
    // Typing away from the previously-selected company clears the link
    // until they pick or create one again — prevents silently keeping a
    // stale account_id that no longer matches the visible text.
    if (accountId !== null) onChange(null, value);
  }

  return (
    <div ref={containerRef} className="relative">
      <label className="block text-xs font-medium text-slate-600 mb-1">Company</label>
      <input
        value={query}
        onChange={(e) => handleInputChange(e.target.value)}
        onFocus={() => setOpen(true)}
        placeholder="Search or create a company..."
        className="w-full px-3 py-1.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--theme-accent)]"
      />
      {accountId === null && query.trim() && (
        <p className="text-[11px] text-amber-600 mt-1">
          Not linked yet — pick a match below or create "{query.trim()}" as a new company.
        </p>
      )}
      {error && <p className="text-[11px] text-rose-600 mt-1">{error}</p>}

      {open && (
        <div className="absolute top-full mt-1 left-0 w-full bg-white border border-slate-200 rounded-lg shadow-lg z-30 py-1 max-h-48 overflow-y-auto">
          {isFetching && <p className="text-[11px] text-slate-400 px-3 py-1.5">Loading companies...</p>}
          {!isFetching && results.length === 0 && (
            <p className="text-[11px] text-slate-400 px-3 py-1.5">No matching companies.</p>
          )}
          {results.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => handleSelect(c)}
              className="w-full text-left px-3 py-1.5 text-sm hover:bg-slate-50 text-slate-700"
            >
              {c.name}
            </button>
          ))}
          {query.trim() && !exactMatch && (
            <button
              type="button"
              onClick={handleCreate}
              disabled={addCompany.isPending}
              className="w-full text-left px-3 py-1.5 text-sm hover:bg-[var(--theme-accent-tint)] text-[var(--theme-accent)] font-medium border-t border-slate-100"
            >
              {addCompany.isPending ? 'Creating...' : `+ Create "${query.trim()}"`}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
