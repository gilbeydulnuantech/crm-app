import { useState } from 'react';
import { useAddSavedView } from '../hooks/useSavedViews';

interface Props<TFilters> {
  entityType: string;
  currentFilters: TFilters;
}

// Trigger for saving the current filter/search/tab combination as a named
// view — lives next to Bulk Actions. The resulting chips are listed and
// applied from SavedViewsBar up in the toolbar.
export default function SaveViewButton<TFilters>({ entityType, currentFilters }: Props<TFilters>) {
  const addView = useAddSavedView<TFilters>(entityType);
  const [naming, setNaming] = useState(false);
  const [name, setName] = useState('');
  const [shared, setShared] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleSave() {
    const trimmed = name.trim();
    if (!trimmed) return;
    setError(null);
    addView.mutate(
      { name: trimmed, filters: currentFilters, isShared: shared },
      {
        onSuccess: () => {
          setNaming(false);
          setName('');
          setShared(false);
        },
        onError: (err) => setError(err instanceof Error ? err.message : 'Failed to save view.'),
      }
    );
  }

  function cancel() {
    setNaming(false);
    setName('');
    setShared(false);
    setError(null);
  }

  if (naming) {
    return (
      <div className="flex items-center gap-1.5">
        <input
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleSave();
            if (e.key === 'Escape') cancel();
          }}
          placeholder="View name..."
          className="px-2 py-1 text-xs border border-slate-200 rounded-md w-36 focus:outline-none focus:ring-2 focus:ring-[var(--theme-accent)]"
        />
        <label className="flex items-center gap-1 text-[11px] text-slate-500 cursor-pointer" title="Visible to your whole team, not just you">
          <input
            type="checkbox"
            checked={shared}
            onChange={(e) => setShared(e.target.checked)}
            className="rounded border-slate-300 text-indigo-600 focus:ring-[var(--theme-accent)]"
          />
          Share with team
        </label>
        <button
          onClick={handleSave}
          disabled={!name.trim() || addView.isPending}
          className="px-2.5 py-1.5 text-xs font-semibold rounded-md bg-[var(--theme-accent)] hover:bg-[var(--theme-accent-hover)] text-white disabled:opacity-50"
        >
          {addView.isPending ? 'Saving...' : 'Save'}
        </button>
        <button onClick={cancel} className="text-xs font-medium text-slate-400 hover:text-slate-600">
          Cancel
        </button>
        {error && <span className="text-[11px] text-rose-600">{error}</span>}
      </div>
    );
  }

  return (
    <button
      onClick={() => setNaming(true)}
      className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-indigo-600 py-1.5 px-2.5 border border-slate-200 rounded-md bg-white transition-colors"
    >
      <i className="fa-solid fa-plus text-[10px]" />
      <span>Save Current View</span>
    </button>
  );
}
