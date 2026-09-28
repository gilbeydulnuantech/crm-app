import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useDeleteSavedView, useSavedViews, useUpdateSavedView } from '../hooks/useSavedViews';
import { SavedView } from '../types/savedView';
import ConfirmDialog from './ConfirmDialog';

interface Props<TFilters> {
  entityType: string;
  currentFilters: TFilters;
  onApply: (filters: TFilters) => void;
}

// Edit-in-place popover — rename, re-point at the current filters, or
// toggle sharing on an existing view instead of forcing delete+recreate.
function EditPopover<TFilters>({
  view,
  entityType,
  currentFilters,
  onClose,
}: {
  view: SavedView<TFilters>;
  entityType: string;
  currentFilters: TFilters;
  onClose: () => void;
}) {
  const updateView = useUpdateSavedView<TFilters>(entityType);
  const [name, setName] = useState(view.name);
  const [shared, setShared] = useState(view.is_shared);
  const [updateFilters, setUpdateFilters] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleSave() {
    const trimmed = name.trim();
    if (!trimmed) return;
    setError(null);
    updateView.mutate(
      {
        id: view.id,
        updates: {
          name: trimmed,
          isShared: shared,
          ...(updateFilters ? { filters: currentFilters } : {}),
        },
      },
      {
        onSuccess: onClose,
        onError: (err) => setError(err instanceof Error ? err.message : 'Failed to update view.'),
      }
    );
  }

  return (
    <>
      <div className="fixed inset-0 z-10" onClick={(e) => { e.stopPropagation(); onClose(); }} />
      <div
        className="absolute left-0 top-full mt-1 w-64 bg-white border border-slate-200 rounded-lg shadow-lg z-20 p-3 space-y-2"
        onClick={(e) => e.stopPropagation()}
      >
        <input
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSave()}
          placeholder="View name..."
          className="w-full px-2 py-1 text-xs border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-[var(--theme-accent)]"
        />
        <label className="flex items-center gap-1.5 text-[11px] text-slate-600 cursor-pointer">
          <input
            type="checkbox"
            checked={updateFilters}
            onChange={(e) => setUpdateFilters(e.target.checked)}
            className="rounded border-slate-300 text-[var(--theme-accent)] focus:ring-[var(--theme-accent)]"
          />
          Also update to your current filters
        </label>
        <label className="flex items-center gap-1.5 text-[11px] text-slate-600 cursor-pointer">
          <input
            type="checkbox"
            checked={shared}
            onChange={(e) => setShared(e.target.checked)}
            className="rounded border-slate-300 text-[var(--theme-accent)] focus:ring-[var(--theme-accent)]"
          />
          Share with team
        </label>
        {error && <p className="text-[11px] text-rose-600">{error}</p>}
        <div className="flex justify-end gap-2 pt-1">
          <button onClick={onClose} className="text-[11px] font-medium text-slate-400 hover:text-slate-600">
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!name.trim() || updateView.isPending}
            className="px-2.5 py-1 text-[11px] font-semibold rounded-md bg-[var(--theme-accent)] hover:bg-[var(--theme-accent-hover)] text-white disabled:opacity-50"
          >
            {updateView.isPending ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>
    </>
  );
}

// Saved filter combinations — "My overdue follow-ups", "VIP leads this
// week", etc. Personal by default (saved_views_schema.sql); a view can also
// be marked shared at creation time (SaveViewButton), which makes it visible
// to every user for this entity_type — see saved_views_add_shared.sql.
// Edit and delete are available to the creator or any admin (enforced
// server-side via a users.role check — see the update/delete queries in
// n8n-workflows/Saved Views.json) so a shared view doesn't get orphaned if
// its creator leaves. New views are created via SaveViewButton (next to the
// search box); this bar lists, applies, edits, and deletes them.
export default function SavedViewsBar<TFilters>({ entityType, currentFilters, onApply }: Props<TFilters>) {
  const { user, isAdmin } = useAuth();
  const { data: views = [] } = useSavedViews<TFilters>(entityType);
  const deleteView = useDeleteSavedView(entityType);
  const [activeViewId, setActiveViewId] = useState<number | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [deleteTargetId, setDeleteTargetId] = useState<number | null>(null);

  function handleApply(view: SavedView<TFilters>) {
    setActiveViewId(view.id);
    onApply(view.filters);
  }

  function handleDelete(id: number) {
    setDeleteTargetId(id);
  }

  function confirmDelete() {
    if (deleteTargetId == null) return;
    const id = deleteTargetId;
    // Drop it from the list immediately rather than waiting on the
    // invalidate+refetch round trip — otherwise the chip visibly lingers
    // after clicking the x until the next background refetch lands.
    deleteView.mutate(id, {
      onSuccess: () => {
        setActiveViewId((prev) => (prev === id ? null : prev));
        setDeleteTargetId(null);
      },
    });
  }

  if (views.length === 0) {
    return (
      <ConfirmDialog
        open={deleteTargetId !== null}
        title="Delete this saved view?"
        confirmLabel="Delete"
        isSubmitting={deleteView.isPending}
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTargetId(null)}
      />
    );
  }

  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      {views.map((v) => {
        const canManage = isAdmin || v.user_id === user?.id;
        return (
          <span
            key={v.id}
            className={`group relative flex items-center gap-1.5 pl-3 pr-1.5 py-1 text-xs font-medium rounded-full border cursor-pointer ${
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
            {canManage && (
              <>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setEditingId(v.id);
                  }}
                  className="opacity-0 group-hover:opacity-60 hover:!opacity-100 rounded-full w-4 h-4 flex items-center justify-center"
                  title={v.user_id === user?.id ? 'Edit this view' : 'Edit this view (admin)'}
                >
                  <i className="fa-solid fa-pen text-[9px]" />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDelete(v.id);
                  }}
                  className="opacity-0 group-hover:opacity-60 hover:!opacity-100 rounded-full w-4 h-4 flex items-center justify-center"
                  title={v.user_id === user?.id ? 'Delete this view' : 'Delete this view (admin)'}
                >
                  <i className="fa-solid fa-xmark text-[9px]" />
                </button>
              </>
            )}
            {editingId === v.id && (
              <EditPopover
                view={v}
                entityType={entityType}
                currentFilters={currentFilters}
                onClose={() => setEditingId(null)}
              />
            )}
          </span>
        );
      })}
      <ConfirmDialog
        open={deleteTargetId !== null}
        title="Delete this saved view?"
        confirmLabel="Delete"
        isSubmitting={deleteView.isPending}
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTargetId(null)}
      />
    </div>
  );
}
