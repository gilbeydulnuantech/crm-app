import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useInvoiceTemplates, useDeleteInvoiceTemplate, useSetInvoiceTemplateActive } from '../../hooks/useInvoiceTemplates';
import ConfirmDialog from '../ConfirmDialog';

export default function InvoiceTemplatesPanel() {
  const navigate = useNavigate();
  const { data: templates = [], isLoading, error } = useInvoiceTemplates();
  const deleteTemplate = useDeleteInvoiceTemplate();
  const setActive = useSetInvoiceTemplateActive();

  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold text-slate-800">Invoice Templates</h2>
        <button
          type="button"
          onClick={() => navigate('/documents/templates/invoice/new')}
          className="px-4 py-2 text-sm font-semibold text-white bg-[var(--theme-accent)] hover:opacity-90 rounded-lg"
        >
          + New Template
        </button>
      </div>
      <p className="text-xs text-slate-500 -mt-2 mb-4">
        A saved set of line items — pick one from the "Insert template" option when creating an invoice to pre-fill
        its items instead of typing them from scratch. Whichever template is marked <strong>Active</strong> also
        controls the invoice document's appearance (colors, fonts, layout) — only one can be active at a time.
      </p>

      {isLoading ? (
        <p className="text-sm text-slate-400">Loading...</p>
      ) : error ? (
        <p className="text-sm text-rose-600 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2">
          {error instanceof Error ? error.message : 'Failed to load invoice templates.'}
        </p>
      ) : templates.length === 0 ? (
        <p className="text-sm text-slate-400 italic">No invoice templates yet.</p>
      ) : (
        <div className="space-y-2">
          {templates.map((t) => (
            <div key={t.id} className="bg-white px-4 py-3 border border-slate-200 rounded-lg">
              <div className="flex items-center gap-3">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-slate-800 truncate">{t.name}</p>
                  <p className="text-[11px] text-slate-400 truncate">
                    {t.line_items.length} item{t.line_items.length === 1 ? '' : 's'}
                  </p>
                </div>
                <span
                  className={`shrink-0 px-1.5 py-0.5 text-[10px] font-semibold rounded-full ${
                    t.is_active ? 'bg-[var(--theme-accent-tint)] text-[var(--theme-accent-hover)]' : 'bg-slate-100 text-slate-500'
                  }`}
                >
                  {t.is_active ? 'Active' : 'Inactive'}
                </span>
                <button
                  type="button"
                  onClick={() => setActive.mutate({ id: t.id, isActive: !t.is_active })}
                  disabled={setActive.isPending}
                  title={t.is_active ? 'Deactivate' : 'Activate'}
                  className="shrink-0 text-slate-400 hover:text-[var(--theme-accent)] disabled:opacity-30"
                >
                  <i className={`fa-solid ${t.is_active ? 'fa-toggle-on' : 'fa-toggle-off'} text-sm`} />
                </button>
                <button
                  type="button"
                  onClick={() => navigate(`/documents/templates/invoice/${t.id}/edit`)}
                  title="Edit"
                  className="shrink-0 text-slate-400 hover:text-[var(--theme-accent)]"
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
        title="Delete Invoice Template"
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
