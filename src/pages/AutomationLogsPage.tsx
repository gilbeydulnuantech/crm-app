import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAutomations } from '../hooks/useAutomations';
import { useAutomationRuns, useAutomationRunStats } from '../hooks/useAutomationLogs';
import { useWorkflowRunLogs } from '../hooks/useWorkflowRunLogs';
import { AutomationRun } from '../api/automationLogs';

const PAGE_SIZE = 50;

const STATUS_BADGE: Record<AutomationRun['status'], string> = {
  success: 'bg-emerald-100 text-emerald-700',
  error: 'bg-rose-100 text-rose-700',
  unsupported: 'bg-amber-100 text-amber-700',
};

const ENTITY_TYPE_LABEL: Record<string, string> = {
  contact: 'Contact',
  company: 'Company',
  pipeline: 'Deal',
  task: 'Task',
  calendar: 'Event',
  ticket: 'Ticket',
};

// entity_type on workflow_run_log is a comma-joined list of the DB tables a
// trigger's branch actually writes to (e.g. "activities,contacts") — this
// filter list matches those raw table names, not the automation-engine's
// singular entity_type vocabulary above.
const WORKFLOW_ENTITY_FILTERS = [
  { value: '', label: 'All entities' },
  { value: 'contacts', label: 'Contacts' },
  { value: 'companies', label: 'Companies' },
  { value: 'opportunities', label: 'Deals' },
  { value: 'activities', label: 'Activities' },
  { value: 'pipelines', label: 'Pipelines' },
  { value: 'stages', label: 'Stages' },
];

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
}

function formatEntityTypes(entityType: string | null) {
  if (!entityType) return '—';
  return entityType
    .split(',')
    .map((t) => t.trim())
    .filter(Boolean)
    .map((t) => t.charAt(0).toUpperCase() + t.slice(1))
    .join(', ');
}

type Tab = 'automation' | 'workflow';

// Execution log/audit trail. Two tabs, two different things being logged:
// "Automation Runs" is the rule-based Automation Engine (trigger → condition
// → action rows you build under Settings); "Workflow Runs" is every n8n
// workflow that touches contacts/companies/deals/pipeline stages/activities,
// logged the instant its trigger fires — regardless of whether it's driven
// by the Automation Engine, a schedule, a webhook, or an inbound email.
export default function AutomationLogsPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { data: automations = [] } = useAutomations();

  const tab: Tab = searchParams.get('tab') === 'workflow' ? 'workflow' : 'automation';

  const automationIdParam = searchParams.get('automation_id');
  const automationId = automationIdParam ? Number(automationIdParam) : undefined;
  const [status, setStatus] = useState<AutomationRun['status'] | ''>('');
  const [offset, setOffset] = useState(0);

  const [workflowEntityType, setWorkflowEntityType] = useState('');
  const [workflowOffset, setWorkflowOffset] = useState(0);

  const { data: statsData } = useAutomationRunStats(automationId);
  const { data, isLoading, isError } = useAutomationRuns({
    automation_id: automationId,
    status: status || undefined,
    limit: PAGE_SIZE,
    offset,
  });

  const {
    data: workflowData,
    isLoading: workflowIsLoading,
    isError: workflowIsError,
  } = useWorkflowRunLogs({
    entity_type: workflowEntityType || undefined,
    limit: PAGE_SIZE,
    offset: workflowOffset,
  });

  const runs = data?.runs ?? [];
  const totalCount = data?.total_count ?? 0;
  const stats = statsData?.stats ?? [];

  const workflowRuns = workflowData?.runs ?? [];
  const workflowTotalCount = workflowData?.total_count ?? 0;

  function handleTabChange(next: Tab) {
    const params: Record<string, string> = {};
    if (next === 'workflow') params.tab = 'workflow';
    setSearchParams(params);
  }

  function handleAutomationChange(value: string) {
    setOffset(0);
    if (value) {
      setSearchParams({ automation_id: value });
    } else {
      setSearchParams({});
    }
  }

  return (
    <div className="flex-1 overflow-y-auto p-6">
      <div className="max-w-5xl mx-auto">
        <button
          type="button"
          onClick={() => navigate('/automations')}
          className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 mb-2"
        >
          <i className="fa-solid fa-chevron-left text-xs" />
          Back to Automations
        </button>
        <h1 className="text-lg font-bold text-slate-800 mb-1">Automation Logs</h1>
        <p className="text-xs text-slate-500 mb-4">
          {tab === 'automation'
            ? 'Every action an automation has actually attempted — what ran, what failed, and why.'
            : 'Every workflow run touching contacts, companies, deals, pipeline stages, or activities — regardless of what triggered it.'}
        </p>

        <div className="flex items-center gap-1 border-b border-slate-200 mb-4">
          <button
            type="button"
            onClick={() => handleTabChange('automation')}
            className={`px-3 py-2 text-sm font-medium border-b-2 -mb-px ${
              tab === 'automation'
                ? 'border-[var(--theme-accent)] text-[var(--theme-accent)]'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            Automation Runs
          </button>
          <button
            type="button"
            onClick={() => handleTabChange('workflow')}
            className={`px-3 py-2 text-sm font-medium border-b-2 -mb-px ${
              tab === 'workflow'
                ? 'border-[var(--theme-accent)] text-[var(--theme-accent)]'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            Workflow Runs
          </button>
        </div>

        {tab === 'automation' ? (
          <>
            {stats.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-5">
                {stats.map((s) => (
                  <button
                    key={s.automation_id}
                    type="button"
                    onClick={() => handleAutomationChange(String(s.automation_id))}
                    className={`text-left bg-white border rounded-xl p-3 hover:border-slate-300 ${
                      automationId === s.automation_id ? 'border-[var(--theme-accent)] ring-2 ring-[var(--theme-accent-tint)]' : 'border-slate-200'
                    }`}
                  >
                    <p className="text-sm font-semibold text-slate-800 truncate">{s.automation_name}</p>
                    <p className="text-[11px] text-slate-400 mb-1.5">Last ran {formatDateTime(s.last_ran_at)}</p>
                    <div className="flex items-center gap-2 text-[11px]">
                      <span className="text-emerald-600 font-semibold">{s.success_count} success</span>
                      {s.error_count > 0 && <span className="text-rose-600 font-semibold">{s.error_count} error</span>}
                      {s.unsupported_count > 0 && <span className="text-amber-600 font-semibold">{s.unsupported_count} unsupported</span>}
                    </div>
                  </button>
                ))}
              </div>
            )}

            <div className="flex items-center gap-2 mb-3">
              <select
                value={automationId ?? ''}
                onChange={(e) => handleAutomationChange(e.target.value)}
                className="text-sm px-3 py-1.5 rounded-lg border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-[var(--theme-accent)]"
              >
                <option value="">All automations</option>
                {automations.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </select>
              <select
                value={status}
                onChange={(e) => {
                  setStatus(e.target.value as AutomationRun['status'] | '');
                  setOffset(0);
                }}
                className="text-sm px-3 py-1.5 rounded-lg border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-[var(--theme-accent)]"
              >
                <option value="">All statuses</option>
                <option value="success">Success</option>
                <option value="error">Error</option>
                <option value="unsupported">Unsupported</option>
              </select>
            </div>

            {isError ? (
              <p className="text-sm text-rose-600 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2">Failed to load run history.</p>
            ) : isLoading ? (
              <p className="text-sm text-slate-400">Loading...</p>
            ) : runs.length === 0 ? (
              <p className="text-sm text-slate-400 italic">No runs match these filters yet.</p>
            ) : (
              <div className="bg-white border border-slate-200 rounded-xl overflow-hidden overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="text-left text-slate-400 uppercase tracking-wide border-b border-slate-100">
                      <th className="px-4 py-2 font-semibold">Ran At</th>
                      <th className="px-4 py-2 font-semibold">Automation</th>
                      <th className="px-4 py-2 font-semibold">Action</th>
                      <th className="px-4 py-2 font-semibold">Branch</th>
                      <th className="px-4 py-2 font-semibold">Record</th>
                      <th className="px-4 py-2 font-semibold">Status</th>
                      <th className="px-4 py-2 font-semibold">Detail</th>
                    </tr>
                  </thead>
                  <tbody>
                    {runs.map((r) => (
                      <tr key={r.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50">
                        <td className="px-4 py-2.5 text-slate-500 whitespace-nowrap">{formatDateTime(r.ran_at)}</td>
                        <td className="px-4 py-2.5 text-slate-700 font-medium">
                          <button type="button" onClick={() => handleAutomationChange(String(r.automation_id))} className="hover:text-[var(--theme-accent)] hover:underline text-left">
                            {r.automation_name}
                          </button>
                        </td>
                        <td className="px-4 py-2.5 text-slate-600">{r.action_type ? r.action_type.replace('_', ' ') : '—'}</td>
                        <td className="px-4 py-2.5 text-slate-400 capitalize">{r.branch}</td>
                        <td className="px-4 py-2.5 text-slate-600">
                          {ENTITY_TYPE_LABEL[r.entity_type] || r.entity_type} · {r.entity_label || `#${r.entity_id}`}
                        </td>
                        <td className="px-4 py-2.5">
                          <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${STATUS_BADGE[r.status]}`}>{r.status}</span>
                        </td>
                        <td className="px-4 py-2.5 text-slate-400 max-w-xs truncate" title={r.detail || undefined}>
                          {r.detail || '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {totalCount > PAGE_SIZE && (
              <div className="flex items-center justify-between mt-3 text-xs text-slate-500">
                <span>
                  {offset + 1}–{Math.min(offset + PAGE_SIZE, totalCount)} of {totalCount}
                </span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    disabled={offset === 0}
                    onClick={() => setOffset((o) => Math.max(0, o - PAGE_SIZE))}
                    className="px-3 py-1.5 border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-40"
                  >
                    Previous
                  </button>
                  <button
                    type="button"
                    disabled={offset + PAGE_SIZE >= totalCount}
                    onClick={() => setOffset((o) => o + PAGE_SIZE)}
                    className="px-3 py-1.5 border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-40"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </>
        ) : (
          <>
            <div className="flex items-center gap-2 mb-3">
              <select
                value={workflowEntityType}
                onChange={(e) => {
                  setWorkflowEntityType(e.target.value);
                  setWorkflowOffset(0);
                }}
                className="text-sm px-3 py-1.5 rounded-lg border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-[var(--theme-accent)]"
              >
                {WORKFLOW_ENTITY_FILTERS.map((f) => (
                  <option key={f.value} value={f.value}>
                    {f.label}
                  </option>
                ))}
              </select>
            </div>

            {workflowIsError ? (
              <p className="text-sm text-rose-600 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2">Failed to load workflow run history.</p>
            ) : workflowIsLoading ? (
              <p className="text-sm text-slate-400">Loading...</p>
            ) : workflowRuns.length === 0 ? (
              <p className="text-sm text-slate-400 italic">No workflow runs match these filters yet.</p>
            ) : (
              <div className="bg-white border border-slate-200 rounded-xl overflow-hidden overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="text-left text-slate-400 uppercase tracking-wide border-b border-slate-100">
                      <th className="px-4 py-2 font-semibold">Ran At</th>
                      <th className="px-4 py-2 font-semibold">Workflow</th>
                      <th className="px-4 py-2 font-semibold">Entities Touched</th>
                      <th className="px-4 py-2 font-semibold">Open</th>
                    </tr>
                  </thead>
                  <tbody>
                    {workflowRuns.map((r) => (
                      <tr key={r.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50">
                        <td className="px-4 py-2.5 text-slate-500 whitespace-nowrap">{formatDateTime(r.run_at)}</td>
                        <td className="px-4 py-2.5 text-slate-700 font-medium">{r.workflow_name}</td>
                        <td className="px-4 py-2.5 text-slate-600">{formatEntityTypes(r.entity_type)}</td>
                        <td className="px-4 py-2.5">
                          <a
                            href={r.workflow_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[var(--theme-accent)] hover:underline inline-flex items-center gap-1"
                          >
                            n8n
                            <i className="fa-solid fa-arrow-up-right-from-square text-[10px]" />
                          </a>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {workflowTotalCount > PAGE_SIZE && (
              <div className="flex items-center justify-between mt-3 text-xs text-slate-500">
                <span>
                  {workflowOffset + 1}–{Math.min(workflowOffset + PAGE_SIZE, workflowTotalCount)} of {workflowTotalCount}
                </span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    disabled={workflowOffset === 0}
                    onClick={() => setWorkflowOffset((o) => Math.max(0, o - PAGE_SIZE))}
                    className="px-3 py-1.5 border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-40"
                  >
                    Previous
                  </button>
                  <button
                    type="button"
                    disabled={workflowOffset + PAGE_SIZE >= workflowTotalCount}
                    onClick={() => setWorkflowOffset((o) => o + PAGE_SIZE)}
                    className="px-3 py-1.5 border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-40"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
