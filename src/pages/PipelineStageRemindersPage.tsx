import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStageReminders, useSetStageReminderActive, useDeleteStageReminder } from '../hooks/usePipelineStageReminders';
import { StageReminderRule } from '../api/pipelineStageReminders';

function formatOffset(hours: number) {
  if (hours > 0) return `${hours}h before`;
  if (hours === 0) return 'at appointment time';
  return `${Math.abs(hours)}h after`;
}

export default function PipelineStageRemindersPage() {
  const navigate = useNavigate();
  const { data: rules = [], isLoading } = useStageReminders();
  const setActive = useSetStageReminderActive();
  const deleteRule = useDeleteStageReminder();

  const [confirmDelete, setConfirmDelete] = useState<StageReminderRule | null>(null);

  function handleDelete() {
    if (!confirmDelete) return;
    deleteRule.mutate(confirmDelete.id, { onSuccess: () => setConfirmDelete(null) });
  }

  return (
    <div className="flex-1 overflow-y-auto p-6">
      <div className="max-w-3xl mx-auto">
        <button
          type="button"
          onClick={() => navigate('/automations')}
          className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 mb-2"
        >
          <i className="fa-solid fa-chevron-left text-xs" />
          Back to Automations
        </button>

        <div className="flex items-center justify-between mb-1">
          <h1 className="text-lg font-bold text-slate-800">Pipeline Stage Reminders</h1>
          <button
            type="button"
            onClick={() => navigate('/automations/stage-reminders/new')}
            className="px-3 py-2 text-sm font-semibold text-white bg-[var(--theme-accent)] hover:opacity-90 rounded-lg shrink-0"
          >
            <i className="fa-solid fa-plus mr-1.5" />
            New Rule
          </button>
        </div>
        <p className="text-xs text-slate-500 mb-5">
          Automatically emails a deal's contact ahead of (or after) their scheduled appointment, based on which
          pipeline stage the deal is in. Runs every 30 minutes in the background.
        </p>

        {isLoading ? (
          <p className="text-sm text-slate-400">Loading...</p>
        ) : rules.length === 0 ? (
          <p className="text-sm text-slate-400 italic">No reminder rules yet — click "New Rule" to add one.</p>
        ) : (
          <div className="space-y-2">
            {rules.map((r) => (
              <div key={r.id} className="bg-white border border-slate-200 rounded-lg px-4 py-3">
                <div className="flex items-center gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-slate-800">{r.name}</p>
                    <p className="text-[11px] text-slate-400">
                      {r.pipeline_name} &rsaquo; {r.stage_name} &middot; {r.deals_in_stage} deal
                      {r.deals_in_stage === 1 ? '' : 's'} currently in stage
                    </p>
                  </div>
                  <label className="flex items-center gap-1.5 text-xs text-slate-500 shrink-0 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={r.is_active}
                      onChange={(e) => setActive.mutate({ id: r.id, is_active: e.target.checked })}
                      className="rounded border-slate-300"
                    />
                    {r.is_active ? 'Active' : 'Paused'}
                  </label>
                  <button
                    type="button"
                    onClick={() => navigate(`/automations/stage-reminders/${r.id}`)}
                    className="shrink-0 text-xs font-semibold text-[var(--theme-accent)] hover:underline"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmDelete(r)}
                    className="shrink-0 text-slate-300 hover:text-rose-500"
                    title="Delete rule"
                  >
                    <i className="fa-solid fa-trash text-xs" />
                  </button>
                </div>

                <div className="mt-2 pt-2 border-t border-slate-100 flex flex-wrap gap-1.5">
                  {r.steps.map((s) => (
                    <span
                      key={s.id}
                      className="text-[10px] font-medium text-slate-600 bg-slate-100 rounded-full px-2 py-0.5"
                      title={s.email_subject}
                    >
                      {formatOffset(s.offset_hours)}
                    </span>
                  ))}
                  {r.on_complete_email_subject && (
                    <span className="text-[10px] font-medium text-emerald-700 bg-emerald-50 rounded-full px-2 py-0.5">
                      + email on complete
                    </span>
                  )}
                  {r.on_complete_advance_stage_name && (
                    <span className="text-[10px] font-medium text-[var(--theme-accent-hover)] bg-[var(--theme-accent-tint)] rounded-full px-2 py-0.5">
                      + advance to {r.on_complete_advance_stage_name}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {confirmDelete && (
        <div className="fixed inset-0 bg-slate-900/70 z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
            <h3 className="text-base font-bold text-slate-800 mb-2">Delete "{confirmDelete.name}"?</h3>
            <p className="text-sm text-slate-500 mb-5">
              This stops all reminder and follow-up emails for this rule. Already-sent reminders aren't affected.
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setConfirmDelete(null)}
                className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={deleteRule.isPending}
                className="px-4 py-2 text-sm font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-lg disabled:opacity-50"
              >
                {deleteRule.isPending ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
