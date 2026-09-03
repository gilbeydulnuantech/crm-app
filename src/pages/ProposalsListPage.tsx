import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useProposalTemplates, useDeleteProposalTemplate } from '../hooks/useProposalTemplates';
import ConfirmDialog from '../components/ConfirmDialog';
import ProposalPreviewOverlay from '../components/proposals/ProposalPreviewOverlay';

export default function ProposalsListPage() {
  const navigate = useNavigate();
  const { data: templates = [], isLoading, error } = useProposalTemplates();
  const deleteTemplate = useDeleteProposalTemplate();

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
          <h1 className="text-lg font-bold text-slate-800">Proposals</h1>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => navigate('/documents/proposals/approved')}
              className="px-4 py-2 text-sm font-semibold text-slate-600 border border-slate-200 hover:bg-slate-50 rounded-lg"
            >
              Approved Proposals
            </button>
            <button
              type="button"
              onClick={() => navigate('/documents/proposals/new')}
              className="px-4 py-2 text-sm font-semibold text-white bg-[var(--theme-accent)] hover:opacity-90 rounded-lg"
            >
              + New Proposal
            </button>
          </div>
        </div>
        <p className="text-xs text-slate-500 -mt-2 mb-4">
          Standalone templates — no deal attached. A real, sendable proposal gets created from one of these either
          automatically (via a Proposal &amp; Contract Flow when a deal enters its trigger stage) or via an
          Automation's Documents picker, at which point it's tied to that specific deal. To create or manage a
          proposal for one specific deal directly, use that deal's Detail view instead.
        </p>

        {isLoading ? (
          <p className="text-sm text-slate-400">Loading...</p>
        ) : error ? (
          <p className="text-sm text-rose-600 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2">
            {error instanceof Error ? error.message : 'Failed to load proposal templates.'}
          </p>
        ) : templates.length === 0 ? (
          <p className="text-sm text-slate-400 italic">No proposal templates yet.</p>
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
                    className="shrink-0 text-slate-400 hover:text-[var(--theme-accent)]"
                  >
                    <i className="fa-solid fa-eye text-xs" />
                  </button>
                  <button
                    type="button"
                    onClick={() => navigate(`/documents/proposals/${t.id}/edit`)}
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
          title="Delete Proposal Template"
          body="This permanently removes the template. Real proposals already created from it are kept."
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

        <ProposalPreviewOverlay
          open={previewId != null}
          onClose={() => setPreviewId(null)}
          title={previewTemplate?.title || ''}
          contentHtml={previewTemplate?.content_html || ''}
        />
      </div>
    </div>
  );
}
