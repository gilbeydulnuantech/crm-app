import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAutomations } from '../hooks/useAutomations';
import { useAutomationRuns, useAutomationRunStats } from '../hooks/useAutomationLogs';
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

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
}

// Execution log/audit trail for the Automation Engine — the underlying
// data (automation_runs) already existed for dedup purposes; this is the
// first UI that actually surfaces it, so "did this automation run, and
// what happened" doesn't require a live DB query to answer anymore.
export default function AutomationLogsPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { data: automations = [] } = useAutomations();

  const automationIdParam = searchParams.get('automation_id');
  const automationId = automationIdParam ? Number(automationIdParam) : undefined;
  const [status, setStatus] = useState<AutomationRun['status'] | ''>('');
  const [offset, setOffset] = useState(0);

  const { data: statsData } = useAutomationRunStats(automationId);
  const { data, isLoading, isError } = useAutomationRuns({
    automation_id: automationId,
    status: status || undefined,
    limit: PAGE_SIZE,
    offset,
  });

  const runs = data?.runs ?? [];
  const totalCount = data?.total_count ?? 0;
  const stats = statsData?.stats ?? [];

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
          Every action an automation has actually attempted — what ran, what failed, and why.
        </p>

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
      </div>
    </div>
  );
}
