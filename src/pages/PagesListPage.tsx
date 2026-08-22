import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePages, useDeletePage } from '../hooks/usePages';
import ConfirmDialog from '../components/ConfirmDialog';

export default function PagesListPage() {
  const navigate = useNavigate();
  const { data: pages = [], isLoading, error } = usePages();
  const deletePage = useDeletePage();

  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  function handleDeleteConfirm() {
    if (confirmDeleteId == null) return;
    setDeleteError(null);
    deletePage.mutate(confirmDeleteId, {
      onSuccess: () => setConfirmDeleteId(null),
      onError: (err) => setDeleteError(err instanceof Error ? err.message : 'Failed to delete.'),
    });
  }

  return (
    <div className="flex-1 overflow-y-auto p-6">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-lg font-bold text-slate-800">Pages</h1>
          <button
            type="button"
            onClick={() => navigate('/documents/pages/new')}
            className="px-4 py-2 text-sm font-semibold text-white bg-[var(--theme-accent)] hover:opacity-90 rounded-lg"
          >
            + New Page
          </button>
        </div>
        <p className="text-xs text-slate-500 -mt-2 mb-4">
          Standalone web pages (like a Thank You screen) — no deal or pipeline attached. Reference one from a
          Contract's "Thank You page" setting or an Automation's Documents picker.
        </p>

        {isLoading ? (
          <p className="text-sm text-slate-400">Loading...</p>
        ) : error ? (
          <p className="text-sm text-rose-600 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2">
            {error instanceof Error ? error.message : 'Failed to load pages.'}
          </p>
        ) : pages.length === 0 ? (
          <p className="text-sm text-slate-400 italic">No pages yet.</p>
        ) : (
          <div className="space-y-2">
            {pages.map((p) => (
              <div key={p.id} className="bg-white px-4 py-3 border border-slate-200 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-slate-800 truncate">{p.name}</p>
                    <p className="text-[11px] text-slate-400 truncate">
                      {p.created_by_name ? `By ${p.created_by_name} · ` : ''}
                      Updated {new Date(p.updated_at).toLocaleDateString()}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => navigate(`/documents/pages/${p.id}/edit`)}
                    title="Edit"
                    className="shrink-0 text-slate-400 hover:text-indigo-600"
                  >
                    <i className="fa-solid fa-pen text-xs" />
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setDeleteError(null);
                      setConfirmDeleteId(p.id);
                    }}
                    title="Delete"
                    className="shrink-0 text-slate-400 hover:text-rose-600"
                  >
                    <i className="fa-solid fa-trash text-xs" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        <ConfirmDialog
          open={confirmDeleteId != null}
          title="Delete Page"
          body="This permanently removes the page. Anything still referencing it (a contract's Thank You page, an automation) will fall back to the default."
          confirmLabel="Delete"
          danger
          error={deleteError}
          isSubmitting={deletePage.isPending}
          onCancel={() => {
            setConfirmDeleteId(null);
            setDeleteError(null);
          }}
          onConfirm={handleDeleteConfirm}
        />
      </div>
    </div>
  );
}
