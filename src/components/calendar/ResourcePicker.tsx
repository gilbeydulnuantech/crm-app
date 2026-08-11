import { useMemo, useState } from 'react';
import { useAddResource, useResources } from '../../hooks/useResources';

interface Props {
  selectedIds: number[];
  onChange: (ids: number[]) => void;
}

export default function ResourcePicker({ selectedIds, onChange }: Props) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { data: resources = [] } = useResources();
  const addResource = useAddResource();

  const selected = resources.filter((r) => selectedIds.includes(r.id));

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return resources.filter((r) => !selectedIds.includes(r.id) && (!q || r.name.toLowerCase().includes(q)));
  }, [resources, selectedIds, query]);

  const exactMatch = resources.some((r) => r.name.toLowerCase() === query.trim().toLowerCase());

  function select(id: number) {
    onChange([...selectedIds, id]);
    setQuery('');
  }

  function remove(id: number) {
    onChange(selectedIds.filter((x) => x !== id));
  }

  function handleCreate() {
    const name = query.trim();
    if (!name) return;
    setError(null);
    addResource.mutate(
      { name, type: 'Equipment' },
      {
        onSuccess: (created) => {
          onChange([...selectedIds, created.id]);
          setQuery('');
        },
        onError: (err) => setError(err instanceof Error ? err.message : 'Failed to create resource.'),
      }
    );
  }

  return (
    <div className="relative">
      <label className="block text-xs font-medium text-slate-600 mb-1">Equipment/Resources</label>
      <div className="border border-slate-200 rounded-lg p-1.5 flex flex-wrap items-center gap-1.5 focus-within:ring-2 focus-within:ring-indigo-500">
        {selected.map((r) => (
          <span
            key={r.id}
            className="flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full bg-indigo-50 text-indigo-700"
          >
            {r.name}
            <button type="button" onClick={() => remove(r.id)} className="opacity-60 hover:opacity-100">
              <i className="fa-solid fa-xmark text-[9px]" />
            </button>
          </span>
        ))}
        <input
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          placeholder={selected.length === 0 ? 'Add Resources (Equipment, Vehicles, Rooms)' : ''}
          className="flex-1 min-w-[120px] text-sm px-1 py-0.5 focus:outline-none"
        />
      </div>
      {error && <p className="text-[11px] text-rose-600 mt-1">{error}</p>}

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute top-full mt-1 left-0 w-full bg-white border border-slate-200 rounded-lg shadow-lg z-20 py-1 max-h-40 overflow-y-auto">
            {filtered.map((r) => (
              <button
                key={r.id}
                type="button"
                onClick={() => select(r.id)}
                className="w-full text-left px-3 py-1.5 text-sm hover:bg-slate-50 text-slate-700"
              >
                {r.name}
              </button>
            ))}
            {filtered.length === 0 && !query.trim() && (
              <p className="text-[11px] text-slate-400 px-3 py-1.5">No more resources.</p>
            )}
            {query.trim() && !exactMatch && (
              <button
                type="button"
                onClick={handleCreate}
                disabled={addResource.isPending}
                className="w-full text-left px-3 py-1.5 text-sm hover:bg-indigo-50 text-indigo-600 font-medium border-t border-slate-100"
              >
                {addResource.isPending ? 'Creating...' : `+ Create "${query.trim()}" (as Equipment)`}
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
}
