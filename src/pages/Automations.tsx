import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAutomations, useSetAutomationActive, useDeleteAutomation } from '../hooks/useAutomations';
import { TriggerType } from '../api/automations';
import ConfirmDialog from '../components/ConfirmDialog';

const TRIGGER_LABELS: Record<TriggerType, string> = {
  contact: 'Contact',
  company: 'Company',
  task: 'Task',
  calendar: 'Calendar',
  pipeline: 'Deal',
  ticket: 'Ticket',
};

const TRIGGER_BADGE_CLASS: Record<TriggerType, string> = {
  contact: 'bg-indigo-100 text-indigo-700',
  company: 'bg-purple-100 text-purple-700',
  task: 'bg-amber-100 text-amber-700',
  calendar: 'bg-emerald-100 text-emerald-700',
  pipeline: 'bg-blue-100 text-blue-700',
  ticket: 'bg-rose-100 text-rose-700',
};

export default function Automations() {
  const navigate = useNavigate();
  const { data: automations = [], isLoading } = useAutomations();
  const setActive = useSetAutomationActive();
  const deleteAutomation = useDeleteAutomation();

  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  function handleDelete() {
    if (confirmDeleteId == null) return;
    setDeleteError(null);
    deleteAutomation.mutate(confirmDeleteId, {
      onSuccess: () => setConfirmDeleteId(null),
      onError: (err) => setDeleteError(err instanceof Error ? err.message : 'Failed to delete.'),
    });
  }

  return (
    <div className="flex-1 overflow-y-auto p-6">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-lg font-bold text-slate-800">Automations</h1>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => navigate('/automations/logs')}
              className="px-3 py-2 text-sm font-semibold border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-lg"
            >
              <i className="fa-solid fa-clock-rotate-left mr-1.5" />
              View Logs
            </button>
            <button
              type="button"
              onClick={() => navigate('/automations/new')}
              className="px-4 py-2 text-sm font-semibold text-white bg-[var(--theme-accent)] hover:opacity-90 rounded-lg"
            >
              + Create
            </button>
          </div>
        </div>

        {isLoading ? (
          <p className="text-sm text-slate-400">Loading...</p>
        ) : automations.length === 0 ? (
          <p className="text-sm text-slate-400 italic">No automations yet.</p>
        ) : (
          <div className="space-y-2">
            {automations.map((a) => (
              <div key={a.id} className="bg-white px-4 py-3 border border-slate-200 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-slate-800 truncate">{a.name}</p>
                    <p className="text-[11px] text-slate-400 truncate">
                      {a.actions.length} action{a.actions.length === 1 ? '' : 's'}
                      {a.condition_tree ? ' · If/Else' : ''}
                    </p>
                  </div>
                  <span
                    className={`shrink-0 px-1.5 py-0.5 text-[10px] font-semibold rounded-full ${TRIGGER_BADGE_CLASS[a.trigger_type]}`}
                  >
                    {TRIGGER_LABELS[a.trigger_type]}
                  </span>
                  <button
                    type="button"
                    onClick={() => setActive.mutate({ id: a.id, isActive: !a.is_active })}
                    className={`shrink-0 px-1.5 py-0.5 text-[10px] font-semibold rounded-full ${
                      a.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'
                    }`}
                  >
                    {a.is_active ? 'Active' : 'Paused'}
                  </button>
                  <button
                    type="button"
                    onClick={() => navigate(`/automations/${a.id}/edit`)}
                    title="Edit"
                    className="shrink-0 text-slate-400 hover:text-[var(--theme-accent)]"
                  >
                    <i className="fa-solid fa-pen text-xs" />
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setDeleteError(null);
                      setConfirmDeleteId(a.id);
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
      </div>

      <ConfirmDialog
        open={confirmDeleteId != null}
        title="Delete this automation?"
        body="This can't be undone. Its run history will be deleted too."
        confirmLabel="Delete"
        danger
        isSubmitting={deleteAutomation.isPending}
        error={deleteError}
        onConfirm={handleDelete}
        onCancel={() => setConfirmDeleteId(null)}
      />
    </div>
  );
}
