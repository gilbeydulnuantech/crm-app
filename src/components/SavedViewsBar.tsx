import { useState } from 'react';
import { useAddSavedView, useDeleteSavedView, useSavedViews } from '../hooks/useSavedViews';
import { SavedView } from '../types/savedView';

interface Props<TFilters> {
  entityType: string;
  currentFilters: TFilters;
  onApply: (filters: TFilters) => void;
}

// Personal saved filter combinations — "My overdue follow-ups", "VIP leads
// this week", etc. Self-owned only (see saved_views_schema.sql), so this
// bar only ever shows the signed-in user's own views, never a shared list.
export default function SavedViewsBar<TFilters>({ entityType, currentFilters, onApply }: Props<TFilters>) {
  const { data: views = [] } = useSavedViews<TFilters>(entityType);
  const addView = useAddSavedView<TFilters>(entityType);
  const deleteView = useDeleteSavedView(entityType);
  const [naming, setNaming] = useState(false);
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [activeViewId, setActiveViewId] = useState<number | null>(null);

  function handleApply(view: SavedView<TFilters>) {
    setActiveViewId(view.id);
    onApply(view.filters);
  }

  function handleSave() {
    const trimmed = name.trim();
    if (!trimmed) return;
    setError(null);
    addView.mutate(
      { name: trimmed, filters: currentFilters },
      {
        onSuccess: (result) => {
          setNaming(false);
          setName('');
          if (result.view) setActiveViewId(result.view.id);
        },
        onError: (err) => setError(err instanceof Error ? err.message : 'Failed to save view.'),
      }
    );
  }

  function handleDelete(id: number) {
    if (!confirm('Delete this saved view?')) return;
    deleteView.mutate(id, {
      onSuccess: () => setActiveViewId((prev) => (prev === id ? null : prev)),
    });
  }

  return (
    <div className="px-4 py-2 flex items-center gap-1.5 border-b border-slate-200 flex-wrap">
      {views.map((v) => (
        <span
          key={v.id}
          className={`group flex items-center gap-1.5 pl-3 pr-1.5 py-1 text-xs font-medium rounded-full border cursor-pointer ${
            activeViewId === v.id
              ? 'bg-[var(--theme-accent-tint)] border-[var(--theme-accent)] text-[var(--theme-accent)]'
              : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
          }`}
          onClick={() => handleApply(v)}
        >
          {v.name}
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleDelete(v.id);
            }}
            className="opacity-0 group-hover:opacity-60 hover:!opacity-100 rounded-full w-4 h-4 flex items-center justify-center"
            title="Delete this view"
          >
            <i className="fa-solid fa-xmark text-[9px]" />
          </button>
        </span>
      ))}

      {naming ? (
        <div className="flex items-center gap-1.5">
          <input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSave();
              if (e.key === 'Escape') {
                setNaming(false);
                setName('');
                setError(null);
              }
            }}
            placeholder="View name..."
            className="px-2 py-1 text-xs border border-slate-200 rounded-full w-40 focus:outline-none focus:ring-2 focus:ring-[var(--theme-accent)]"
          />
          <button
            onClick={handleSave}
            disabled={!name.trim() || addView.isPending}
            className="px-2.5 py-1 text-xs font-semibold rounded-full bg-[var(--theme-accent)] hover:bg-[var(--theme-accent-hover)] text-white disabled:opacity-50"
          >
            {addView.isPending ? 'Saving...' : 'Save'}
          </button>
          <button
            onClick={() => {
              setNaming(false);
              setName('');
              setError(null);
            }}
            className="text-xs font-medium text-slate-400 hover:text-slate-600"
          >
            Cancel
          </button>
        </div>
      ) : (
        <button
          onClick={() => setNaming(true)}
          className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-slate-500 border border-dashed border-slate-300 rounded-full hover:border-[var(--theme-accent)] hover:text-[var(--theme-accent)]"
        >
          <i className="fa-solid fa-plus text-[9px]" />
          Save Current View
        </button>
      )}
      {error && <span className="text-[11px] text-rose-600">{error}</span>}
    </div>
  );
}
