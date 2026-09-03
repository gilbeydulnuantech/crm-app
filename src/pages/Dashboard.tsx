import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
  BarChart,
  Bar,
  CartesianGrid,
  XAxis,
  YAxis,
} from 'recharts';
import { useAuth } from '../context/AuthContext';
import { useDashboard } from '../hooks/useDashboard';
import { usePipelines, useStages } from '../hooks/useOpportunities';
import { toTitleCase } from '../utils/text';
import { DashboardActivity } from '../types/dashboard';
import { CHART_BRAND, CHART_CHROME, CHART_STATUS, chartCategoryColor } from '../utils/chartTheme';
import { loadHiddenStageIds } from '../utils/pipelineStageVisibility';

function formatMoney(n: number): string {
  const abs = Math.abs(n);
  if (abs >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`;
  if (abs >= 1_000) return `$${(n / 1_000).toFixed(0)}K`;
  return `$${n.toLocaleString()}`;
}

function formatRelativeTime(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

// Templates the activity_log's structured verb/entity/detail fields into the
// two-line copy shown in the Recent Activity feed.
const ENTITY_LABELS: Record<DashboardActivity['entity_type'], string> = {
  contact: 'contact',
  opportunity: 'deal',
  task: 'task',
  company: 'company',
  event: 'event',
};

function activityLine(a: DashboardActivity): { main: string; detail?: string } {
  const actor = toTitleCase(a.actor_name);
  const name = a.entity_name ?? '';
  const kind = ENTITY_LABELS[a.entity_type] ?? a.entity_type;
  switch (a.verb) {
    case 'moved':
      return { main: `${actor} moved ${name}`, detail: a.detail ?? undefined };
    case 'created':
      return { main: `${actor} created new ${kind} "${name}"` };
    case 'completed':
      return { main: `${actor} completed task "${name}"` };
    case 'archived':
      return { main: `${actor} archived ${kind} ${name}` };
    case 'restored':
      return { main: `${actor} restored ${kind} ${name}` };
    case 'noted':
      return { main: `${actor} added note to ${name}` };
    default:
      return { main: `${actor} updated ${name}` };
  }
}

function Card({
  children,
  className = '',
  id,
}: {
  children: React.ReactNode;
  className?: string;
  id?: string;
}) {
  return (
    <div id={id} className={`bg-white rounded-xl border border-slate-200 p-4 shadow-sm ${className}`}>
      {children}
    </div>
  );
}

function CardTitle({ children }: { children: React.ReactNode }) {
  return <h2 className="text-sm font-semibold text-slate-800 mb-3">{children}</h2>;
}

function EmptyState({ children }: { children: React.ReactNode }) {
  return <p className="text-sm text-slate-400">{children}</p>;
}

function StatTile({
  icon,
  label,
  value,
  sub,
}: {
  icon: string;
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <Card className="relative overflow-hidden">
      <div className="absolute top-0 left-0 right-0 h-0.5 bg-[var(--theme-accent)]" />
      <div className="flex items-start justify-between">
        <span className="text-xs font-medium text-slate-500">{label}</span>
        <i className={`fa-solid ${icon} text-[var(--theme-accent)] text-xs`} />
      </div>
      <div className="text-2xl font-bold text-slate-800 mt-1 tabular-nums">{value}</div>
      {sub && <div className="text-xs font-medium text-[var(--theme-accent)] mt-1">{sub}</div>}
    </Card>
  );
}

// Semi-circle gauge, hand-rolled in SVG rather than recharts' RadialBarChart
// so the two-tone fill/track split (e.g. win vs. loss) is exact and simple.
function Gauge({
  value,
  fillColor,
  trackColor = CHART_CHROME.track,
}: {
  value: number;
  fillColor: string;
  trackColor?: string;
}) {
  const clamped = Math.max(0, Math.min(100, value));
  const angle = 180 - (clamped / 100) * 180;
  const rad = (angle * Math.PI) / 180;
  const cx = 100;
  const cy = 100;
  const needleR = 68;
  const nx = cx + needleR * Math.cos(rad);
  const ny = cy - needleR * Math.sin(rad);
  const arcPath = 'M 20 100 A 80 80 0 0 1 180 100';

  return (
    <svg viewBox="0 0 200 112" width={160} height={90}>
      <path d={arcPath} fill="none" stroke={trackColor} strokeWidth={16} strokeLinecap="round" />
      <path
        d={arcPath}
        fill="none"
        stroke={fillColor}
        strokeWidth={16}
        strokeLinecap="round"
        pathLength={100}
        strokeDasharray={`${clamped} 100`}
      />
      <line x1={cx} y1={cy} x2={nx} y2={ny} stroke={CHART_CHROME.ink} strokeWidth={3} strokeLinecap="round" />
      <circle cx={cx} cy={cy} r={6} fill={CHART_CHROME.ink} />
    </svg>
  );
}

const axisTick = { fontSize: 11, fill: CHART_CHROME.axisText };

export default function Dashboard() {
  const { user, isAdmin } = useAuth();
  const navigate = useNavigate();
  const { data: pipelines = [] } = usePipelines();
  const [pipelineId, setPipelineId] = useState<number | null>(null);
  // Defaults to whichever pipeline is flagged is_default (Roofing
  // Restoration, currently) the first time pipelines load — `initialized`
  // makes this a one-shot so it never overrides a rep explicitly picking
  // "All Pipelines" afterward.
  const [initialized, setInitialized] = useState(false);
  useEffect(() => {
    if (initialized || pipelines.length === 0) return;
    const defaultPipeline = pipelines.find((p) => p.is_default);
    if (defaultPipeline) setPipelineId(defaultPipeline.id);
    setInitialized(true);
  }, [pipelines, initialized]);
  const { data, isLoading, isError } = useDashboard(pipelineId);

  // "Deals by Stage" should match what the rep actually sees on the
  // Pipeline board — stage visibility is a per-rep localStorage
  // preference (see utils/pipelineStageVisibility), not a backend field,
  // so it can only be applied here client-side. Only meaningful with one
  // pipeline selected — "All Pipelines" has no single hidden-stage set to
  // apply, so nothing gets filtered out in that view.
  const { data: dashboardStages = [] } = useStages(pipelineId ?? undefined);
  const hiddenStageIds = pipelineId ? loadHiddenStageIds(user?.id, pipelineId) : new Set<number>();
  const hiddenStageNames = new Set(dashboardStages.filter((s) => hiddenStageIds.has(s.id)).map((s) => s.name));
  const visibleFunnel = data?.funnel.filter((f) => !hiddenStageNames.has(f.stage_name)) ?? [];

  const today = new Date().toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  function goToDeal(pipelineIdForDeal: number | null, dealId: number) {
    if (pipelineIdForDeal) {
      navigate(`/pipeline?pipeline=${pipelineIdForDeal}&highlight=${dealId}`);
    } else {
      navigate('/pipeline');
    }
  }

  return (
    <div
      className="flex-1 overflow-y-auto p-6 space-y-4 text-slate-800"
      style={{ backgroundColor: 'var(--theme-main)' }}
    >
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-slate-800">
            {isAdmin ? 'Business Dashboard' : `Welcome back, ${user?.name?.split(' ')[0] ?? 'there'}`}
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            {isAdmin ? 'All-time view · Every contact & deal' : 'Your contacts & deals only'}
          </p>
        </div>
        <span className="text-sm text-slate-400">Today: {today}</span>
      </div>

      <select
        value={pipelineId ?? ''}
        onChange={(e) => setPipelineId(e.target.value ? Number(e.target.value) : null)}
        className="text-sm font-medium px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-[var(--theme-accent)]"
      >
        <option value="">All Pipelines</option>
        {pipelines.map((p) => (
          <option key={p.id} value={p.id}>
            {p.name}
          </option>
        ))}
      </select>

      {isError && (
        <div className="p-3 text-sm rounded-lg bg-rose-50 text-rose-700 border border-rose-200">
          Couldn't load dashboard data. Check that the `get-dashboard` webhook is active and reachable.
        </div>
      )}

      {isLoading ? (
        <div className="text-sm py-10 text-center text-slate-400">Loading dashboard...</div>
      ) : data ? (
        <>
          <div className="grid grid-cols-4 gap-4">
            <StatTile
              icon="fa-sack-dollar"
              label="Total Revenue"
              value={formatMoney(data.total_revenue)}
              sub={`MTD ${formatMoney(data.revenue_mtd)}`}
            />
            <StatTile
              icon="fa-chart-line"
              label="Open Pipeline"
              value={formatMoney(data.open_pipeline_value)}
              sub={`Weighted ${formatMoney(data.open_pipeline_weighted)}`}
            />
            <StatTile
              icon="fa-handshake"
              label="Active Deals"
              value={data.active_deals.toLocaleString()}
              sub={`Avg ${formatMoney(data.avg_deal_value)}`}
            />
            <StatTile
              icon="fa-user-plus"
              label={isAdmin ? 'New Leads (30d)' : 'Your New Leads (30d)'}
              value={data.new_leads_30d.toLocaleString()}
              sub={`MTD ${data.new_leads_mtd}`}
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <Card className="col-span-2">
              <CardTitle>Revenue Breakdown ({new Date().getFullYear()})</CardTitle>
              {data.monthly_revenue.every((m) => m.value === 0) ? (
                <EmptyState>No closed-won revenue yet this year.</EmptyState>
              ) : (
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={data.monthly_revenue}>
                    <CartesianGrid strokeDasharray="3 3" stroke={CHART_CHROME.grid} vertical={false} />
                    <XAxis dataKey="month" tick={axisTick} axisLine={false} tickLine={false} />
                    <YAxis
                      tick={axisTick}
                      axisLine={false}
                      tickLine={false}
                      tickFormatter={(v) => formatMoney(v)}
                      width={56}
                    />
                    <Tooltip formatter={(v: number) => formatMoney(v)} />
                    <Bar dataKey="value" fill={CHART_BRAND} radius={[4, 4, 0, 0]} maxBarSize={40} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </Card>

            <Card>
              <CardTitle>Deals by Stage</CardTitle>
              {visibleFunnel.every((f) => f.count === 0) ? (
                <EmptyState>No deals yet.</EmptyState>
              ) : (
                // Contained height + internal scroll instead of letting the
                // whole page balloon when a pipeline has many rarely-used
                // stages (e.g. "Canceled / No Show") — every visible stage
                // still shows (a 0-count row is real funnel information),
                // it just doesn't push everything below it down the page.
                <div className="max-h-[280px] overflow-y-auto">
                  <ResponsiveContainer width="100%" height={Math.max(240, visibleFunnel.length * 26)}>
                    <BarChart data={visibleFunnel} layout="vertical" margin={{ left: 8, right: 24 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke={CHART_CHROME.grid} horizontal={false} />
                      <XAxis type="number" allowDecimals={false} tick={axisTick} axisLine={false} tickLine={false} />
                      <YAxis
                        type="category"
                        dataKey="stage_name"
                        width={110}
                        tick={axisTick}
                        axisLine={false}
                        tickLine={false}
                      />
                      <Tooltip
                        formatter={(value: number, _name, entry) => [
                          `${value} deals · ${formatMoney((entry?.payload as { value: number } | undefined)?.value ?? 0)}`,
                          'Deals',
                        ]}
                      />
                      <Bar dataKey="count" fill={CHART_BRAND} radius={[0, 4, 4, 0]} barSize={14} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </Card>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <Card>
              <CardTitle>Lead Source Performance</CardTitle>
              {data.lead_sources.length === 0 ? (
                <EmptyState>No lead source data yet.</EmptyState>
              ) : (
                <div className="relative">
                  <ResponsiveContainer width="100%" height={200}>
                    <PieChart>
                      <Pie
                        data={data.lead_sources}
                        dataKey="count"
                        nameKey="lead_source"
                        cx="38%"
                        cy="50%"
                        innerRadius={36}
                        outerRadius={68}
                        paddingAngle={2}
                        strokeWidth={2}
                        stroke="#ffffff"
                      >
                        {data.lead_sources.map((_, i) => (
                          <Cell key={i} fill={chartCategoryColor(i)} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(v: number, n: string) => [v, n || 'Unknown']} />
                      <Legend
                        layout="vertical"
                        align="right"
                        verticalAlign="middle"
                        wrapperStyle={{ fontSize: 11 }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                  {/* Center total — the donut's hole is otherwise empty
                      real estate, and "how many leads total" is the first
                      thing this widget should answer. */}
                  <div
                    className="absolute top-1/2 -translate-y-1/2 text-center pointer-events-none"
                    style={{ left: '38%', transform: 'translate(-50%, -50%)' }}
                  >
                    <div className="text-lg font-bold text-slate-800 tabular-nums">
                      {data.lead_sources.reduce((sum, s) => sum + s.count, 0)}
                    </div>
                    <div className="text-[10px] text-slate-400 uppercase tracking-wide">Leads</div>
                  </div>
                </div>
              )}
            </Card>

            <Card className="flex flex-col items-center">
              <div className="self-start">
                <CardTitle>Win/Loss Rate</CardTitle>
              </div>
              <Gauge value={data.win_loss.win_rate} fillColor={CHART_STATUS.good} trackColor="#fecdd3" />
              <p className="text-sm font-semibold -mt-1 text-slate-800">{data.win_loss.win_rate}% Win</p>
              <p className="text-xs text-slate-500">
                {data.win_loss.won_count} Won · {data.win_loss.lost_count} Lost
              </p>
            </Card>

            <Card className="flex flex-col items-center">
              <div className="self-start">
                <CardTitle>Task Completion (30d)</CardTitle>
              </div>
              <Gauge value={data.task_completion.rate} fillColor={CHART_BRAND} />
              <p className="text-sm font-semibold -mt-1 text-slate-800">{data.task_completion.rate}%</p>
              <p className="text-xs text-slate-500">
                {data.task_completion.completed} / {data.task_completion.total} tasks
              </p>
            </Card>
          </div>

          <div className={`grid gap-4 ${isAdmin ? 'grid-cols-3' : 'grid-cols-1'}`}>
            {isAdmin && (
              <Card>
                <CardTitle>Team Performance</CardTitle>
                {data.team_leaderboard.length === 0 ? (
                  <EmptyState>No team activity yet.</EmptyState>
                ) : (
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-xs text-slate-400">
                        <th className="font-medium pb-2 w-5"></th>
                        <th className="font-medium pb-2">Rep</th>
                        <th className="font-medium pb-2 text-right">Won</th>
                        <th className="font-medium pb-2 text-right">Open</th>
                        <th className="font-medium pb-2 text-right">Revenue</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {data.team_leaderboard.map((row, i) => (
                        <tr key={row.user_id}>
                          <td className="py-1.5 text-xs text-slate-400">{i + 1}</td>
                          <td className="py-1.5 truncate text-slate-800">{row.name}</td>
                          <td className="py-1.5 text-right text-slate-800 tabular-nums">{row.won_deals}</td>
                          <td className="py-1.5 text-right text-slate-800 tabular-nums">{row.open_deals}</td>
                          <td className="py-1.5 text-right font-semibold text-slate-800 tabular-nums">
                            {formatMoney(row.revenue)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </Card>
            )}

            {/* Pipeline health — a single status line, not a duplicate list.
                Full stalled-deal detail lives once, in the "Deals Requiring
                Attention" table below. */}
            <Card className={isAdmin ? 'col-span-2' : ''}>
              <div className="flex items-center gap-2.5">
                {data.stalled_deals.length === 0 ? (
                  <>
                    <i className="fa-solid fa-circle-check mt-0.5" style={{ color: CHART_STATUS.good }} />
                    <div>
                      <p className="text-sm font-semibold text-slate-800">All open deals are progressing normally.</p>
                      <p className="text-xs text-slate-500 mt-0.5">No deals have been inactive for more than 7 days.</p>
                    </div>
                  </>
                ) : (
                  <>
                    <i
                      className="fa-solid fa-triangle-exclamation mt-0.5"
                      style={{ color: CHART_STATUS.warning }}
                    />
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-slate-800">
                        {data.stalled_deals.length} deal{data.stalled_deals.length === 1 ? '' : 's'} need attention
                      </p>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Inactive for more than 7 days — see the full list below.
                      </p>
                    </div>
                    <button
                      onClick={() => document.getElementById('deals-requiring-attention')?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
                      className="text-xs font-semibold text-[var(--theme-accent)] hover:underline shrink-0"
                    >
                      Jump to list →
                    </button>
                  </>
                )}
              </div>
            </Card>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Card>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-semibold text-slate-800">Upcoming Tasks</h2>
                {data.tasks_overdue > 0 && (
                  <span className="text-xs font-medium" style={{ color: CHART_STATUS.warning }}>
                    {data.tasks_overdue} Late
                  </span>
                )}
              </div>
              {data.upcoming_tasks.length === 0 ? (
                <EmptyState>Nothing due soon.</EmptyState>
              ) : (
                <div className="space-y-1">
                  {data.upcoming_tasks.map((t) => (
                    <button
                      key={t.id}
                      onClick={() => navigate(`/tasks?highlight=${t.id}`)}
                      className="w-full flex items-center gap-2 text-sm text-slate-800 py-1 -mx-1 px-1 rounded hover:bg-slate-50 text-left"
                    >
                      <i className="fa-regular fa-circle w-4 text-slate-300" />
                      <span className="flex-1 truncate">{t.subject}</span>
                      {t.due_at && (
                        <span className="text-xs shrink-0 text-slate-400">
                          {new Date(t.due_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              )}
              <button onClick={() => navigate('/tasks')} className="text-xs font-semibold mt-3 text-[var(--theme-accent)] hover:underline">
                View all tasks →
              </button>
            </Card>

            <Card>
              <h2 className="text-sm font-semibold text-slate-800 mb-3">Upcoming Events</h2>
              {data.upcoming_events.length === 0 ? (
                <EmptyState>Nothing on the calendar soon.</EmptyState>
              ) : (
                <div className="space-y-1">
                  {data.upcoming_events.map((e) => (
                    <div key={e.id} className="flex items-center gap-2 text-sm text-slate-800 py-1">
                      <i className="fa-solid fa-circle w-4 text-[6px] text-[var(--theme-accent)]" />
                      <span className="flex-1 truncate">{e.subject}</span>
                      {e.due_at && (
                        <span className="text-xs shrink-0 text-slate-400">
                          {new Date(e.due_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              )}
              <button onClick={() => navigate('/calendar')} className="text-xs font-semibold mt-3 text-[var(--theme-accent)] hover:underline">
                View calendar →
              </button>
            </Card>
          </div>

          <Card>
            <CardTitle>Recent Activity</CardTitle>
            {data.recent_activities.length === 0 ? (
              <EmptyState>No recent activity.</EmptyState>
            ) : (
              <div className="space-y-3">
                {data.recent_activities.map((a) => {
                  const { main, detail } = activityLine(a);
                  return (
                    <div key={a.id} className="flex items-start justify-between gap-3 text-sm">
                      <div className="min-w-0">
                        <p className="truncate text-slate-800">{main}</p>
                        {detail && <p className="text-xs mt-0.5 text-[var(--theme-accent)]">{detail}</p>}
                      </div>
                      <span className="text-xs shrink-0 text-slate-400">{formatRelativeTime(a.created_at)}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>

          <Card id="deals-requiring-attention">
            <CardTitle>Deals Requiring Attention</CardTitle>
            {data.stalled_deals.length === 0 ? (
              <EmptyState>Nothing needs attention right now.</EmptyState>
            ) : (
              <>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs text-slate-400">
                      <th className="font-medium pb-2">Deal Name</th>
                      <th className="font-medium pb-2">Stage</th>
                      <th className="font-medium pb-2 text-right">Value</th>
                      <th className="font-medium pb-2 text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {data.stalled_deals.map((d) => {
                      const dueToday =
                        !!d.expected_close && new Date(d.expected_close).toDateString() === new Date().toDateString();
                      return (
                        <tr
                          key={d.id}
                          onClick={() => goToDeal(d.pipeline_id, d.id)}
                          className="cursor-pointer hover:bg-slate-50"
                        >
                          <td className="py-1.5 truncate max-w-[200px] text-slate-800">{d.name}</td>
                          <td className="py-1.5 text-slate-500">{d.stage_name || '--'}</td>
                          <td className="py-1.5 text-right text-slate-800 tabular-nums">{formatMoney(d.value)}</td>
                          <td
                            className="py-1.5 text-right font-semibold tabular-nums"
                            style={{ color: dueToday ? CHART_BRAND : CHART_STATUS.warning }}
                          >
                            {dueToday ? 'Due today' : `${d.days_stalled} days idle`}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                <div className="text-right mt-2">
                  <button onClick={() => navigate('/pipeline')} className="text-xs font-semibold text-[var(--theme-accent)] hover:underline">
                    View Pipeline →
                  </button>
                </div>
              </>
            )}
          </Card>
        </>
      ) : null}
    </div>
  );
}
