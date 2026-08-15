import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useDeleteSavedView, useSavedViews } from '../hooks/useSavedViews';
import { SavedView } from '../types/savedView';

interface Props<TFilters> {
  entityType: string;
  onApply: (filters: TFilters) => void;
}

// Saved filter combinations — "My overdue follow-ups", "VIP leads this
// week", etc. Personal by default (saved_views_schema.sql); a view can also
// be marked shared at creation time (SaveViewButton), which makes it visible
// to every user for this entity_type — see saved_views_add_shared.sql.
// Delete stays creator-only regardless of is_shared (enforced server-side).
// New views are created via SaveViewButton (next to the search box); this
// bar only lists, applies, and deletes them.
export default function SavedViewsBar<TFilters>({ entityType, onApply }: Props<TFilters>) {
  const { user } = useAuth();
  const { data: views = [] } = useSavedViews<TFilters>(entityType);
  const deleteView = useDeleteSavedView(entityType);
  const [activeViewId, setActiveViewId] = useState<number | null>(null);

  function handleApply(view: SavedView<TFilters>) {
    setActiveViewId(view.id);
    onApply(view.filters);
  }

  function handleDelete(id: number) {
    if (!confirm('Delete this saved view?')) return;
    // Drop it from the list immediately rather than waiting on the
    // invalidate+refetch round trip — otherwise the chip visibly lingers
    // after clicking the x until the next background refetch lands.
    deleteView.mutate(id, {
      onSuccess: () => setActiveViewId((prev) => (prev === id ? null : prev)),
    });
  }

  if (views.length === 0) return null;

  return (
    <div className="flex items-center gap-1.5 flex-wrap">
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
          {v.is_shared && (
            <i
              className="fa-solid fa-users text-[9px] text-slate-400"
              title={v.user_id === user?.id ? 'Shared with your team' : `Shared by ${v.owner_name ?? 'a teammate'}`}
            />
          )}
          {v.name}
          {v.user_id === user?.id && (
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
          )}
        </span>
      ))}
    </div>
  );
}
