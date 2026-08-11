import { useEffect, useMemo, useRef, useState } from 'react';
import { useAllOpportunities, usePipelines } from '../../hooks/useOpportunities';

interface Props {
  opportunityId: number | null;
  opportunityName: string;
  onChange: (opportunityId: number | null, name: string) => void;
}

export default function OpportunityPicker({ opportunityId, opportunityName, onChange }: Props) {
  const [query, setQuery] = useState(opportunityName);
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // get-opportunities is per-pipeline — fan out so this searches every deal
  // regardless of which pipeline it's in, same as the Calendar's deals mode.
  const { data: pipelines = [] } = usePipelines();
  const pipelineIds = useMemo(() => pipelines.map((p) => p.id), [pipelines]);
  const { data: allDeals = [], isLoading } = useAllOpportunities(pipelineIds);

  useEffect(() => {
    setQuery(opportunityName);
  }, [opportunityName]);

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
    if (!q) return allDeals.slice(0, 10);
    return allDeals.filter((d) => d.name.toLowerCase().includes(q)).slice(0, 10);
  }, [allDeals, query]);

  function handleSelect(deal: { id: number; name: string }) {
    onChange(deal.id, deal.name);
    setQuery(deal.name);
    setOpen(false);
  }

  function handleInputChange(value: string) {
    setQuery(value);
    setOpen(true);
    if (opportunityId !== null) onChange(null, value);
  }

  return (
    <div ref={containerRef} className="relative">
      <label className="block text-xs font-medium text-slate-600 mb-1">Link to Opportunity/Deal</label>
      <input
        value={query}
        onChange={(e) => handleInputChange(e.target.value)}
        onFocus={() => setOpen(true)}
        placeholder="Search for Deal (e.g., Acme Roof)"
        className="w-full px-3 py-1.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
      />
      {open && (
        <div className="absolute top-full mt-1 left-0 w-full bg-white border border-slate-200 rounded-lg shadow-lg z-30 py-1 max-h-48 overflow-y-auto">
          {isLoading && <p className="text-[11px] text-slate-400 px-3 py-1.5">Loading deals...</p>}
          {!isLoading && results.length === 0 && (
            <p className="text-[11px] text-slate-400 px-3 py-1.5">No matching deals.</p>
          )}
          {results.map((d) => (
            <button
              key={d.id}
              type="button"
              onClick={() => handleSelect(d)}
              className="w-full text-left px-3 py-1.5 text-sm hover:bg-slate-50 text-slate-700"
            >
              {d.name}
              {d.company_name && <span className="text-slate-400"> — {d.company_name}</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
