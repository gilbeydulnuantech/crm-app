import { useEffect, useMemo, useRef, useState } from 'react';
import { useCompanies } from '../../hooks/useCompanies';

interface Props {
  excludeCompanyId?: number | null; // don't let a company be its own parent
  parentCompanyId: number | null;
  parentCompanyName: string;
  onChange: (parentCompanyId: number | null, parentCompanyName: string) => void;
}

// Reuses CompanyPicker.tsx's typeahead pattern, minus the "create new"
// action — a parent company must already exist, it's never fabricated from
// this field.
export default function ParentCompanyPicker({
  excludeCompanyId,
  parentCompanyId,
  parentCompanyName,
  onChange,
}: Props) {
  const [query, setQuery] = useState(parentCompanyName);
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const { data: allCompanies = [], isFetching } = useCompanies();

  useEffect(() => {
    setQuery(parentCompanyName);
  }, [parentCompanyName]);

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
    const candidates = allCompanies.filter((c) => c.id !== excludeCompanyId);
    if (!q) return candidates.slice(0, 10);
    return candidates.filter((c) => c.name.toLowerCase().includes(q)).slice(0, 10);
  }, [allCompanies, query, excludeCompanyId]);

  function handleSelect(company: { id: number; name: string }) {
    onChange(company.id, company.name);
    setQuery(company.name);
    setOpen(false);
  }

  function handleInputChange(value: string) {
    setQuery(value);
    setOpen(true);
    if (parentCompanyId !== null) onChange(null, value);
  }

  return (
    <div ref={containerRef} className="relative">
      <label className="block text-xs font-medium text-slate-600 mb-1">Parent Company</label>
      <input
        value={query}
        onChange={(e) => handleInputChange(e.target.value)}
        onFocus={() => setOpen(true)}
        placeholder="Search for a parent company..."
        className="w-full px-3 py-1.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
      />
      {parentCompanyId === null && query.trim() && (
        <p className="text-[11px] text-amber-600 mt-1">Not linked — pick a match below, or clear to leave unset.</p>
      )}

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
        </div>
      )}
    </div>
  );
}
