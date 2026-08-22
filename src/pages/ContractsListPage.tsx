import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useContractTemplates, useDeleteContractTemplate } from '../hooks/useContractTemplates';
import ConfirmDialog from '../components/ConfirmDialog';
import ContractPreviewOverlay from '../components/contracts/ContractPreviewOverlay';

export default function ContractsListPage() {
  const navigate = useNavigate();
  const { data: templates = [], isLoading, error } = useContractTemplates();
  const deleteTemplate = useDeleteContractTemplate();

  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [previewId, setPreviewId] = useState<number | null>(null);

  const previewTemplate = templates.find((t) => t.id === previewId);

  function handleDeleteConfirm() {
    if (confirmDeleteId == null) return;
    setDeleteError(null);
    deleteTemplate.mutate(confirmDeleteId, {
      onSuccess: () => setConfirmDeleteId(null),
      onError: (err) => setDeleteError(err instanceof Error ? err.message : 'Failed to delete.'),
    });
  }

  return (
    <div className="flex-1 overflow-y-auto p-6">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-lg font-bold text-slate-800">Contracts</h1>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => navigate('/documents/contracts/signed')}
              className="px-4 py-2 text-sm font-semibold text-slate-600 border border-slate-200 hover:bg-slate-50 rounded-lg"
            >
              Signed Contracts
            </button>
            <button
              type="button"
              onClick={() => navigate('/documents/contracts/new')}
              className="px-4 py-2 text-sm font-semibold text-white bg-[var(--theme-accent)] hover:opacity-90 rounded-lg"
            >
              + New Contract
            </button>
          </div>
        </div>
        <p className="text-xs text-slate-500 -mt-2 mb-4">
          Standalone templates — no deal attached. A real, signable contract gets created from one of these either
          automatically (when a lead approves a proposal linked to a Proposal &amp; Contract Flow) or via an
          Automation's Documents picker, at which point it's tied to that specific deal.
        </p>

        {isLoading ? (
          <p className="text-sm text-slate-400">Loading...</p>
        ) : error ? (
          <p className="text-sm text-rose-600 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2">
            {error instanceof Error ? error.message : 'Failed to load contract templates.'}
          </p>
        ) : templates.length === 0 ? (
          <p className="text-sm text-slate-400 italic">No contract templates yet.</p>
        ) : (
          <div className="space-y-2">
            {templates.map((t) => (
              <div key={t.id} className="bg-white px-4 py-3 border border-slate-200 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-slate-800 truncate">{t.title}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setPreviewId(t.id)}
                    title="View"
                    className="shrink-0 text-slate-400 hover:text-indigo-600"
                  >
                    <i className="fa-solid fa-eye text-xs" />
                  </button>
                  <button
                    type="button"
                    onClick={() => navigate(`/documents/contracts/${t.id}/edit`)}
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
          title="Delete Contract Template"
          body="This permanently removes the template. Real contracts already created from it are kept."
          confirmLabel="Delete"
          danger
          error={deleteError}
          isSubmitting={deleteTemplate.isPending}
          onCancel={() => {
            setConfirmDeleteId(null);
            setDeleteError(null);
          }}
          onConfirm={handleDeleteConfirm}
        />

        <ContractPreviewOverlay
          open={previewId != null}
          onClose={() => setPreviewId(null)}
          title={previewTemplate?.title || ''}
          contentHtml={previewTemplate?.content_html || ''}
        />
      </div>
    </div>
  );
}
