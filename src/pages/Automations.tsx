import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useN8nWorkflows, useTestAutomation } from '../hooks/useN8nWorkflows';
import { useAutomations, useDeleteAutomationRule, useUpdateAutomationRuleActive } from '../hooks/useAutomations';
import { useAuth } from '../context/AuthContext';
import AutomationTestResultModal from '../components/automations/AutomationTestResultModal';
import { TRIGGER_TYPE_LABELS } from '../utils/automationFields';

// Two separate systems live on this page, and they're easy to conflate:
//
// "Automation Rules" (top section) are rows in the automations/
// automation_actions tables, created via the form at /automations/new and
// evaluated every 30 min by the polling n8n-workflows/Automation Engine.json.
// This is the self-service, no-code-editing path.
//
// "n8n Workflows" (bottom section) is a live, read-only mirror of whichever
// deployed n8n workflows are tagged "automation" in n8n itself (name,
// active/paused, node count) — hand-built flows like Public Booking or
// Deal Won Engine that do things (calendar sync, deal creation) the rule
// engine structurally can't express. Clicking a row opens the one thing
// reps DO edit from here — each step's email copy (see
// AutomationEmailStepsPage) — not the workflow itself.
//
// The "Test" button on an n8n Workflow (admin-only) actually runs it for
// real against live data — it's not a sandboxed dry run. A schedule-based
// workflow that finds real due contacts/deals will act on them exactly
// like its normal scheduled run would (real emails, real stage moves).
// Only schedule-triggered ones support this; event-triggered ones (inbound
// email, calendar booking) report back that they can't be manually
// test-run.
export default function Automations() {
  const navigate = useNavigate();
  const { isAdmin } = useAuth();
  const { data: workflows = [], isLoading, isError } = useN8nWorkflows();
  const testAutomation = useTestAutomation();
  const [confirmTarget, setConfirmTarget] = useState<{ id: string; name: string } | null>(null);
  const [resultTarget, setResultTarget] = useState<{ id: string; name: string } | null>(null);

  const { data: rules = [], isLoading: rulesLoading } = useAutomations();
  const updateRuleActive = useUpdateAutomationRuleActive();
  const deleteRule = useDeleteAutomationRule();
  const [deleteTarget, setDeleteTarget] = useState<{ id: number; name: string } | null>(null);

  function formatDateTime(iso: string) {
    return new Date(iso).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
  }

  function runTest(id: string, name: string) {
    setConfirmTarget(null);
    setResultTarget({ id, name });
    testAutomation.mutate(id);
  }

  return (
    <div className="flex-1 overflow-y-auto p-6">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-lg font-bold text-slate-800">Automations</h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Built and run in n8n — this is a live read-only list, not an editor.
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => navigate('/automations/new')}
              className="px-3 py-2 text-sm font-semibold text-white rounded-lg bg-[var(--theme-accent)] hover:opacity-90"
            >
              <i className="fa-solid fa-plus mr-1.5" />
              New Automation
            </button>
            <button
              type="button"
              onClick={() => navigate('/automations/stage-reminders')}
              className="px-3 py-2 text-sm font-semibold border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-lg"
            >
              <i className="fa-solid fa-bell mr-1.5" />
              Stage Reminders
            </button>
            <button
              type="button"
              onClick={() => navigate('/automations/logs')}
              className="px-3 py-2 text-sm font-semibold border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-lg"
            >
              <i className="fa-solid fa-clock-rotate-left mr-1.5" />
              View Logs
            </button>
          </div>
        </div>

        <div className="mb-6">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Automation Rules</p>
          {rulesLoading ? (
            <p className="text-sm text-slate-400">Loading...</p>
          ) : rules.length === 0 ? (
            <p className="text-sm text-slate-400 italic">
              No automation rules yet — click "New Automation" to build one.
            </p>
          ) : (
            <div className="space-y-2">
              {rules.map((r) => (
                <div
                  key={r.id}
                  className="w-full bg-white px-4 py-3 border border-slate-200 hover:border-slate-300 rounded-lg flex items-center gap-3"
                >
                  <button
                    type="button"
                    onClick={() => navigate(`/automations/${r.id}/edit`)}
                    className="min-w-0 flex-1 text-left"
                    title="Click to edit"
                  >
                    <p className="text-sm font-medium text-slate-800 truncate">{r.name}</p>
                    <p className="text-[11px] text-slate-400 truncate">
                      {TRIGGER_TYPE_LABELS[r.trigger_type as keyof typeof TRIGGER_TYPE_LABELS] ?? r.trigger_type}
                      {' · '}
                      {r.run_count ?? 0} run{r.run_count === 1 ? '' : 's'}
                      {r.last_run_at ? ` · last ran ${formatDateTime(r.last_run_at)}` : ''}
                    </p>
                  </button>
                  <button
                    type="button"
                    onClick={() => updateRuleActive.mutate({ id: r.id, isActive: !r.is_active })}
                    className={`shrink-0 px-1.5 py-0.5 text-[10px] font-semibold rounded-full ${
                      r.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'
                    }`}
                    title={r.is_active ? 'Click to pause' : 'Click to activate'}
                  >
                    {r.is_active ? 'Active' : 'Paused'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeleteTarget({ id: r.id, name: r.name })}
                    className="shrink-0 w-7 h-7 flex items-center justify-center text-slate-300 hover:text-rose-600 hover:bg-rose-50 rounded-md"
                    title="Delete automation"
                  >
                    <i className="fa-solid fa-trash text-xs" />
                  </button>
                  <button
                    type="button"
                    onClick={() => navigate(`/automations/${r.id}/edit`)}
                    className="shrink-0 text-slate-300 hover:text-slate-400"
                  >
                    <i className="fa-solid fa-chevron-right text-xs" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">n8n Workflows</p>
        {isLoading ? (
          <p className="text-sm text-slate-400">Loading...</p>
        ) : isError ? (
          <p className="text-sm text-rose-600 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2">
            Failed to load workflows from n8n.
          </p>
        ) : workflows.length === 0 ? (
          <p className="text-sm text-slate-400 italic">No workflows found.</p>
        ) : (
          <div className="space-y-2">
            {workflows.map((w) => (
              <div
                key={w.id}
                className="w-full bg-white px-4 py-3 border border-slate-200 hover:border-slate-300 rounded-lg flex items-center gap-3"
              >
                <button
                  type="button"
                  onClick={() => navigate(`/automations/${w.id}?name=${encodeURIComponent(w.name)}`)}
                  className="min-w-0 flex-1 text-left flex items-center gap-3"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-slate-800 truncate">{w.name}</p>
                    <p className="text-[11px] text-slate-400 truncate">
                      {w.node_count} node{w.node_count === 1 ? '' : 's'} · updated {formatDateTime(w.updated_at)}
                    </p>
                  </div>
                  <span
                    className={`shrink-0 px-1.5 py-0.5 text-[10px] font-semibold rounded-full ${
                      w.active ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'
                    }`}
                  >
                    {w.active ? 'Active' : 'Inactive'}
                  </span>
                </button>
                {isAdmin && (
                  <button
                    type="button"
                    onClick={() => setConfirmTarget({ id: w.id, name: w.name })}
                    className="shrink-0 px-2.5 py-1.5 text-xs font-semibold border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-lg"
                    title="Run this automation now against live data"
                  >
                    <i className="fa-solid fa-flask mr-1" />
                    Test
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => navigate(`/automations/${w.id}?name=${encodeURIComponent(w.name)}`)}
                  className="shrink-0 text-slate-300 hover:text-slate-400"
                >
                  <i className="fa-solid fa-chevron-right text-xs" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {confirmTarget && (
        <div className="fixed inset-0 bg-slate-900/70 z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
            <h3 className="text-base font-bold text-slate-800 mb-2">Run "{confirmTarget.name}" now?</h3>
            <p className="text-sm text-slate-500 mb-5">
              This runs for real against live data — if real contacts or deals are currently due, this automation
              will act on them exactly like its normal scheduled run would (real emails sent, real stage moves,
              real tags applied). This is not a sandboxed test.
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setConfirmTarget(null)}
                className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={() => runTest(confirmTarget.id, confirmTarget.name)}
                className="px-4 py-2 text-sm font-semibold text-white bg-amber-600 hover:bg-amber-700 rounded-lg"
              >
                Run it now
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteTarget && (
        <div className="fixed inset-0 bg-slate-900/70 z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
            <h3 className="text-base font-bold text-slate-800 mb-2">Delete "{deleteTarget.name}"?</h3>
            <p className="text-sm text-slate-500 mb-5">This automation rule will stop running immediately. This can't be undone.</p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setDeleteTarget(null)}
                className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  deleteRule.mutate(deleteTarget.id);
                  setDeleteTarget(null);
                }}
                className="px-4 py-2 text-sm font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-lg"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {resultTarget && (
        <AutomationTestResultModal
          workflowName={resultTarget.name}
          result={testAutomation.data ?? null}
          isRunning={testAutomation.isPending}
          error={testAutomation.error instanceof Error ? testAutomation.error.message : null}
          onClose={() => {
            setResultTarget(null);
            testAutomation.reset();
          }}
        />
      )}
    </div>
  );
}
