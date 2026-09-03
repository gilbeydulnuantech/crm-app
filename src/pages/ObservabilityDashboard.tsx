import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  CartesianGrid,
  Legend,
} from 'recharts';
import { fetchObservabilityDashboard, fetchAutomationErrorLog, ApiServiceStatus } from '../api/observability';
import { CHART_CHROME, CHART_STATUS, chartCategoryColor } from '../utils/chartTheme';

function formatBytes(bytes: number): string {
  if (bytes < 1024 ** 3) return `${(bytes / 1024 ** 2).toFixed(0)} MB`;
  return `${(bytes / 1024 ** 3).toFixed(1)} GB`;
}

function formatMs(ms: number | null): string {
  if (ms == null) return '--';
  if (ms < 1000) return `${ms} ms`;
  return `${(ms / 1000).toFixed(1)} s`;
}

function formatTime(ts: string | null): string {
  if (!ts) return '--';
  return new Date(ts.replace(' ', 'T') + 'Z').toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

// automation_error_log.created_at comes back already ISO (timestamptz), unlike
// the executions/errors timestamps above which are bare Postgres strings.
function formatIsoTime(ts: string): string {
  return new Date(ts).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function StatCard({ label, value, sub, tone }: { label: string; value: string; sub?: string; tone?: 'good' | 'warning' | 'critical' }) {
  const toneColor = tone ? CHART_STATUS[tone] : CHART_CHROME.ink;
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4">
      <div className="text-xs font-semibold text-slate-400 uppercase tracking-wide">{label}</div>
      <div className="text-2xl font-bold mt-1" style={{ color: toneColor }}>
        {value}
      </div>
      {sub && <div className="text-xs text-slate-400 mt-0.5">{sub}</div>}
    </div>
  );
}

function UsageBar({ label, usedPct, detail }: { label: string; usedPct: number | null; detail: string }) {
  const pct = usedPct ?? 0;
  const tone = pct >= 90 ? CHART_STATUS.critical : pct >= 75 ? CHART_STATUS.warning : CHART_STATUS.good;
  return (
    <div>
      <div className="flex items-center justify-between text-xs mb-1">
        <span className="font-semibold text-slate-600">{label}</span>
        <span className="text-slate-400">{usedPct != null ? `${usedPct}%` : '--'}</span>
      </div>
      <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
        <div className="h-full rounded-full" style={{ width: `${Math.min(pct, 100)}%`, backgroundColor: tone }} />
      </div>
      <div className="text-[11px] text-slate-400 mt-1">{detail}</div>
    </div>
  );
}

const API_STATUS_META: Record<ApiServiceStatus, { label: string; dot: string; text: string }> = {
  connected: { label: 'Connected', dot: CHART_STATUS.good, text: 'text-emerald-700' },
  degraded: { label: 'Errors detected', dot: CHART_STATUS.critical, text: 'text-rose-700' },
  not_configured: { label: 'Not configured', dot: CHART_STATUS.neutral, text: 'text-slate-500' },
};

const STATUS_BADGE: Record<string, string> = {
  success: 'bg-emerald-50 text-emerald-700',
  error: 'bg-rose-50 text-rose-700',
  crashed: 'bg-rose-50 text-rose-700',
  running: 'bg-blue-50 text-blue-700',
  waiting: 'bg-amber-50 text-amber-700',
  new: 'bg-slate-100 text-slate-600',
};

export default function ObservabilityDashboard() {
  const navigate = useNavigate();
  const { data, isLoading, error } = useQuery({
    queryKey: ['observability-dashboard'],
    queryFn: fetchObservabilityDashboard,
    refetchInterval: 30000,
  });
  const { data: errorLog } = useQuery({
    queryKey: ['automation-error-log'],
    queryFn: fetchAutomationErrorLog,
    refetchInterval: 30000,
  });

  return (
    <div className="flex-1 overflow-y-auto p-6">
      <div className="flex items-center gap-3 mb-1">
        <button
          type="button"
          onClick={() => navigate('/settings')}
          title="Back to Settings"
          className="text-slate-400 hover:text-slate-700"
        >
          <i className="fa-solid fa-arrow-left" />
        </button>
        <h1 className="text-lg font-bold text-slate-800">Observability Dashboard</h1>
      </div>
      <p className="text-xs text-slate-500 mb-6 ml-7">
        Live health of every n8n workflow — status, timing, errors, and server load. Refreshes every 30s.
      </p>

      {isLoading && <p className="text-sm text-slate-400 ml-7">Loading...</p>}
      {error && (
        <p className="text-sm text-rose-600 ml-7">{(error as Error).message || 'Failed to load dashboard.'}</p>
      )}

      {data && (
        <div className="space-y-6">
          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard label="Executions Today" value={String(data.summary.executionsToday)} />
            <StatCard
              label="Success Rate"
              value={data.summary.successRatePct != null ? `${data.summary.successRatePct}%` : '--'}
              tone={
                data.summary.successRatePct == null
                  ? undefined
                  : data.summary.successRatePct >= 98
                    ? 'good'
                    : data.summary.successRatePct >= 90
                      ? 'warning'
                      : 'critical'
              }
              sub={`${data.summary.successToday} success / ${data.summary.failedToday} failed`}
            />
            <StatCard
              label="Running Now"
              value={String(data.summary.runningCount)}
              tone={data.summary.runningCount > 0 ? 'warning' : undefined}
            />
            <StatCard
              label="Avg Execution Time"
              value={formatMs(data.summary.avgExecutionMs)}
              sub="last 7 days"
            />
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard label="Total Workflows" value={String(data.summary.totalWorkflows)} />
            <StatCard label="Active Workflows" value={String(data.summary.activeWorkflows)} />
            <StatCard label="Failed Today" value={String(data.summary.failedToday)} tone={data.summary.failedToday > 0 ? 'critical' : 'good'} />
            <StatCard label="Errors Logged (recent)" value={String(data.errors.length)} tone={data.errors.length > 0 ? 'warning' : 'good'} />
          </div>

          {/* Alerts banner */}
          {data.errors.length > 0 && (
            <div className="bg-rose-50 border border-rose-200 rounded-xl p-4 flex items-start gap-3">
              <i className="fa-solid fa-triangle-exclamation text-rose-500 mt-0.5" />
              <div className="min-w-0">
                <div className="text-sm font-semibold text-rose-700">
                  {data.errors.length} recent failure{data.errors.length === 1 ? '' : 's'} — most recent:{' '}
                  {data.errors[0].workflowName || data.errors[0].workflowId}
                </div>
                <div className="text-xs text-rose-600 mt-0.5 truncate">
                  {data.errors[0].nodeName ? `${data.errors[0].nodeName}: ` : ''}
                  {data.errors[0].message || 'No error detail available.'}
                </div>
                <div className="text-[11px] text-rose-400 mt-1">
                  Global Error Trigger is active and already emailing/Slacking on every failure — this panel mirrors it.
                </div>
              </div>
            </div>
          )}

          {/* Line + Pie charts */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="lg:col-span-2 bg-white border border-slate-200 rounded-xl p-4">
              <h2 className="text-sm font-semibold text-slate-700 mb-3">Executions Over Time (14 days)</h2>
              <ResponsiveContainer width="100%" height={260}>
                <LineChart data={data.timeseries}>
                  <CartesianGrid stroke={CHART_CHROME.grid} vertical={false} />
                  <XAxis
                    dataKey="day"
                    tick={{ fontSize: 11, fill: CHART_CHROME.axisText }}
                    tickFormatter={(d: string) => d.slice(5)}
                  />
                  <YAxis tick={{ fontSize: 11, fill: CHART_CHROME.axisText }} allowDecimals={false} />
                  <Tooltip />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Line type="monotone" dataKey="success" name="Success" stroke={CHART_STATUS.good} strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="error" name="Error" stroke={CHART_STATUS.critical} strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl p-4">
              <h2 className="text-sm font-semibold text-slate-700 mb-3">Executions by Workflow</h2>
              {data.workflowStats.length === 0 ? (
                <p className="text-xs text-slate-400">No executions in the last 30 days.</p>
              ) : (
                <ResponsiveContainer width="100%" height={260}>
                  <PieChart>
                    <Pie
                      data={data.workflowStats.slice(0, 8)}
                      dataKey="totalRuns"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={90}
                      label={false}
                    >
                      {data.workflowStats.slice(0, 8).map((_, i) => (
                        <Cell key={i} fill={chartCategoryColor(i)} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend wrapperStyle={{ fontSize: 10 }} layout="vertical" align="right" verticalAlign="middle" />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* Server resources + API status */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-4">
              <h2 className="text-sm font-semibold text-slate-700">Server Resources</h2>
              <UsageBar
                label="CPU"
                usedPct={data.serverResources.cpu.usagePct}
                detail={`${data.serverResources.cpu.cores} cores · load avg ${data.serverResources.cpu.loadAvg.map((n) => n.toFixed(1)).join(' / ')}`}
              />
              <UsageBar
                label="Memory"
                usedPct={data.serverResources.memory.usedPct}
                detail={`${formatBytes(data.serverResources.memory.usedBytes)} / ${formatBytes(data.serverResources.memory.totalBytes)}`}
              />
              {data.serverResources.disk && (
                <UsageBar
                  label="Disk"
                  usedPct={data.serverResources.disk.usedPct}
                  detail={`${formatBytes(data.serverResources.disk.usedBytes)} / ${formatBytes(data.serverResources.disk.totalBytes)}`}
                />
              )}
              <div className="text-[11px] text-slate-400">
                Uptime: {(data.serverResources.uptimeSeconds / 3600).toFixed(1)} hrs
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl p-4">
              <h2 className="text-sm font-semibold text-slate-700 mb-3">API / Integration Status</h2>
              <div className="space-y-2">
                {data.apiStatus.map((s) => {
                  const meta = API_STATUS_META[s.status];
                  return (
                    <div key={s.key} className="flex items-center justify-between text-xs">
                      <span className="text-slate-600 font-medium">{s.label}</span>
                      <span className={`flex items-center gap-1.5 font-semibold ${meta.text}`}>
                        <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: meta.dot }} />
                        {meta.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl p-4">
              <h2 className="text-sm font-semibold text-slate-700 mb-3">Recent Errors</h2>
              {data.errors.length === 0 ? (
                <p className="text-xs text-slate-400">No errors logged.</p>
              ) : (
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {data.errors.slice(0, 8).map((e) => (
                    <div key={e.id} className="text-xs border-b border-slate-100 pb-2 last:border-0">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-slate-700 truncate">{e.workflowName || e.workflowId}</span>
                        <span className="text-[10px] text-slate-400 shrink-0 ml-2">{formatTime(e.startedAt)}</span>
                      </div>
                      <div className="text-slate-500 truncate">
                        {e.nodeName ? `${e.nodeName}: ` : ''}
                        {e.message || 'No detail'}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Global Error Trigger alert log */}
          <div className="bg-white border border-slate-200 rounded-xl p-4">
            <h2 className="text-sm font-semibold text-slate-700 mb-1">Global Error Trigger Alerts</h2>
            <p className="text-[11px] text-slate-400 mb-3">
              Every failure the Global Error Trigger has actually fired on — the same alerts sent to Slack #urgent
              and DM'd to the admin, logged here as the authoritative record.
            </p>
            {!errorLog || errorLog.length === 0 ? (
              <p className="text-xs text-slate-400">No alerts logged yet.</p>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {errorLog.map((e) => (
                  <div key={e.id} className="text-xs border-b border-slate-100 pb-2 last:border-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-semibold text-slate-700 truncate">{e.workflowName || e.workflowId}</span>
                      <span className="text-[10px] text-slate-400 shrink-0">{formatIsoTime(e.createdAt)}</span>
                    </div>
                    <div className="text-slate-500 truncate">
                      {e.nodeName ? `${e.nodeName}: ` : ''}
                      {e.message || 'No detail'}
                    </div>
                    {e.executionUrl && (
                      <a
                        href={e.executionUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[11px] text-[var(--theme-accent)] hover:underline"
                      >
                        View execution
                      </a>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Workflow table */}
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
            <h2 className="text-sm font-semibold text-slate-700 px-4 pt-4 pb-2">Workflow Success Rates (30 days)</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-left text-slate-400 uppercase tracking-wide border-t border-b border-slate-100">
                    <th className="px-4 py-2 font-semibold">Workflow</th>
                    <th className="px-4 py-2 font-semibold">Status</th>
                    <th className="px-4 py-2 font-semibold text-right">Runs</th>
                    <th className="px-4 py-2 font-semibold text-right">Success</th>
                    <th className="px-4 py-2 font-semibold text-right">Errors</th>
                    <th className="px-4 py-2 font-semibold text-right">Success Rate</th>
                    <th className="px-4 py-2 font-semibold text-right">Avg Time</th>
                    <th className="px-4 py-2 font-semibold text-right">Last Run</th>
                  </tr>
                </thead>
                <tbody>
                  {data.workflowStats.map((w) => {
                    const rate = w.totalRuns > 0 ? Math.round((w.successCount / w.totalRuns) * 1000) / 10 : null;
                    return (
                      <tr key={w.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50">
                        <td className="px-4 py-2 font-medium text-slate-700">{w.name}</td>
                        <td className="px-4 py-2">
                          <span
                            className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${w.active ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}
                          >
                            {w.active ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td className="px-4 py-2 text-right">{w.totalRuns}</td>
                        <td className="px-4 py-2 text-right text-emerald-600">{w.successCount}</td>
                        <td className="px-4 py-2 text-right text-rose-600">{w.errorCount}</td>
                        <td className="px-4 py-2 text-right font-semibold">{rate != null ? `${rate}%` : '--'}</td>
                        <td className="px-4 py-2 text-right">{formatMs(w.avgMs)}</td>
                        <td className="px-4 py-2 text-right text-slate-400">{formatTime(w.lastRunAt)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Recent executions table */}
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
            <h2 className="text-sm font-semibold text-slate-700 px-4 pt-4 pb-2">Recent Executions</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-left text-slate-400 uppercase tracking-wide border-t border-b border-slate-100">
                    <th className="px-4 py-2 font-semibold">Workflow</th>
                    <th className="px-4 py-2 font-semibold">Status</th>
                    <th className="px-4 py-2 font-semibold">Mode</th>
                    <th className="px-4 py-2 font-semibold text-right">Duration</th>
                    <th className="px-4 py-2 font-semibold text-right">Started</th>
                  </tr>
                </thead>
                <tbody>
                  {data.executions.map((e) => (
                    <tr key={e.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50">
                      <td className="px-4 py-2 font-medium text-slate-700">{e.workflowName || e.workflowId}</td>
                      <td className="px-4 py-2">
                        <span
                          className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${STATUS_BADGE[e.status] || 'bg-slate-100 text-slate-500'}`}
                        >
                          {e.status}
                        </span>
                      </td>
                      <td className="px-4 py-2 text-slate-500">{e.mode}</td>
                      <td className="px-4 py-2 text-right">{formatMs(e.durationMs)}</td>
                      <td className="px-4 py-2 text-right text-slate-400">{formatTime(e.startedAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
