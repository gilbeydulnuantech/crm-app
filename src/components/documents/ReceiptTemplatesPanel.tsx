import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  useReceiptTemplates,
  useSetReceiptTemplateActive,
  useDeleteReceiptTemplate,
} from '../../hooks/useReceiptTemplates';
import ConfirmDialog from '../ConfirmDialog';

export default function ReceiptTemplatesPanel() {
  const navigate = useNavigate();
  const { data: templates = [], isLoading, error } = useReceiptTemplates();
  const setActive = useSetReceiptTemplateActive();
  const deleteTemplate = useDeleteReceiptTemplate();

  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold text-slate-800">Receipt Templates</h2>
        <button
          type="button"
          onClick={() => navigate('/documents/templates/receipt/new')}
          className="px-4 py-2 text-sm font-semibold text-white bg-[var(--theme-accent)] hover:opacity-90 rounded-lg"
        >
          + New Template
        </button>
      </div>
      <p className="text-xs text-slate-500 -mt-2 mb-4">
        Whichever template is marked <strong>Active</strong> is what "Send Receipt" (on a Payment page) actually
        emails — only one can be active at a time. With none active, a plain built-in receipt is sent instead.
      </p>

      {isLoading ? (
        <p className="text-sm text-slate-400">Loading...</p>
      ) : error ? (
        <p className="text-sm text-rose-600 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2">
          {error instanceof Error ? error.message : 'Failed to load receipt templates.'}
        </p>
      ) : templates.length === 0 ? (
        <p className="text-sm text-slate-400 italic">No receipt templates yet.</p>
      ) : (
        <div className="space-y-2">
          {templates.map((t) => (
            <div key={t.id} className="bg-white px-4 py-3 border border-slate-200 rounded-lg">
              <div className="flex items-center gap-3">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-slate-800 truncate">{t.name}</p>
                  <p className="text-[11px] text-slate-400 truncate">{t.subject}</p>
                </div>
                <span
                  className={`shrink-0 px-1.5 py-0.5 text-[10px] font-semibold rounded-full ${
                    t.is_active ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-500'
                  }`}
                >
                  {t.is_active ? 'Active' : 'Inactive'}
                </span>
                <button
                  type="button"
                  onClick={() => setActive.mutate({ id: t.id, isActive: !t.is_active })}
                  disabled={setActive.isPending}
                  title={t.is_active ? 'Deactivate' : 'Activate'}
                  className="shrink-0 text-slate-400 hover:text-indigo-600 disabled:opacity-30"
                >
                  <i className={`fa-solid ${t.is_active ? 'fa-toggle-on' : 'fa-toggle-off'} text-sm`} />
                </button>
                <button
                  type="button"
                  onClick={() => navigate(`/documents/templates/receipt/${t.id}/edit`)}
                  title="Edit"
                  className="shrink-0 text-slate-400 hover:text-indigo-600"
                >
                  <i className="fa-solid fa-pen text-xs" />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setDeleteError(null);
                    setConfirmDeleteId(t.id);
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
        title="Delete Receipt Template"
        body="This permanently removes the template."
        confirmLabel="Delete"
        danger
        error={deleteError}
        isSubmitting={deleteTemplate.isPending}
        onCancel={() => {
          setConfirmDeleteId(null);
          setDeleteError(null);
        }}
        onConfirm={() => {
          if (confirmDeleteId == null) return;
          setDeleteError(null);
          deleteTemplate.mutate(confirmDeleteId, {
            onSuccess: () => setConfirmDeleteId(null),
            onError: (err) => setDeleteError(err instanceof Error ? err.message : 'Failed to delete.'),
          });
        }}
      />
    </div>
  );
}
