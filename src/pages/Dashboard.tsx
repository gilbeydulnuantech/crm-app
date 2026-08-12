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
  FunnelChart,
  Funnel,
  LabelList,
} from 'recharts';
import { useAuth } from '../context/AuthContext';
import { useDashboard } from '../hooks/useDashboard';
import { toTitleCase } from '../utils/text';

// Color theme
const BG = '#F7F9FB';
const TEXT = '#334155';
const PRIMARY = '#7C9CBF';
const POSITIVE = '#86B89A';
const WARNING = '#D9B477';

const PIE_COLORS = [PRIMARY, POSITIVE, WARNING, '#9B8FB0', '#5F80A3', '#B0C3D6'];
const FUNNEL_COLORS = ['#C7D5E3', '#B0C3D6', '#99B1C9', PRIMARY, '#5F80A3'];

function formatMoney(n: number): string {
  const abs = Math.abs(n);
  if (abs >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`;
  if (abs >= 1_000) return `$${(n / 1_000).toFixed(0)}K`;
  return `$${n.toLocaleString()}`;
}

function Card({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`bg-white rounded-xl border border-slate-100 p-4 shadow-sm ${className}`}>
      {children}
    </div>
  );
}

function StatTile({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <Card>
      <div className="text-xs font-medium" style={{ color: `${TEXT}99` }}>
        {label}
      </div>
      <div className="text-2xl font-bold mt-1" style={{ color: TEXT }}>
        {value}
      </div>
      {sub && (
        <div className="text-xs font-medium mt-1" style={{ color: PRIMARY }}>
          {sub}
        </div>
      )}
    </Card>
  );
}

// Semi-circle gauge, hand-rolled in SVG rather than recharts' RadialBarChart
// so the two-tone fill/track split (e.g. win vs. loss) is exact and simple.
function Gauge({
  value,
  fillColor,
  trackColor = '#E2E8F0',
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
      <line x1={cx} y1={cy} x2={nx} y2={ny} stroke={TEXT} strokeWidth={3} strokeLinecap="round" />
      <circle cx={cx} cy={cy} r={6} fill={TEXT} />
    </svg>
  );
}

export default function Dashboard() {
  const { user, isAdmin } = useAuth();
  const { data, isLoading, isError } = useDashboard();

  const today = new Date().toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-4" style={{ backgroundColor: BG, color: TEXT }}>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold" style={{ color: TEXT }}>
            {isAdmin ? 'Business Dashboard' : `Welcome back, ${user?.name?.split(' ')[0] ?? 'there'}`}
          </h1>
          <p className="text-xs mt-0.5" style={{ color: `${TEXT}99` }}>
            {isAdmin ? 'All-time view · Every contact & deal' : 'Your contacts & deals only'}
          </p>
        </div>
        <span className="text-sm" style={{ color: `${TEXT}80` }}>
          Today: {today}
        </span>
      </div>

      {isError && (
        <div className="p-3 text-sm rounded-lg bg-rose-50 text-rose-700 border border-rose-200">
          Couldn't load dashboard data. Check that the `get-dashboard` webhook is active and reachable.
        </div>
      )}

      {isLoading ? (
        <div className="text-sm py-10 text-center" style={{ color: `${TEXT}80` }}>
          Loading dashboard...
        </div>
      ) : data ? (
        <>
          <div className="grid grid-cols-4 gap-4">
            <StatTile
              label="Total Revenue"
              value={formatMoney(data.total_revenue)}
              sub={`MTD ${formatMoney(data.revenue_mtd)}`}
            />
            <StatTile
              label="Open Pipeline"
              value={formatMoney(data.open_pipeline_value)}
              sub={`Weighted ${formatMoney(data.open_pipeline_weighted)}`}
            />
            <StatTile
              label="Active Deals"
              value={data.active_deals.toLocaleString()}
              sub={`Avg ${formatMoney(data.avg_deal_value)}`}
            />
            <StatTile
              label={isAdmin ? 'New Leads (30d)' : 'Your New Leads (30d)'}
              value={data.new_leads_30d.toLocaleString()}
              sub={`MTD ${data.new_leads_mtd}`}
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <Card className="col-span-2">
              <h2 className="text-sm font-semibold mb-3" style={{ color: TEXT }}>
                Revenue Breakdown ({new Date().getFullYear()})
              </h2>
              {data.monthly_revenue.every((m) => m.value === 0) ? (
                <p className="text-sm" style={{ color: `${TEXT}80` }}>
                  No closed-won revenue yet this year.
                </p>
              ) : (
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={data.monthly_revenue}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#EEF2F6" vertical={false} />
                    <XAxis
                      dataKey="month"
                      tick={{ fontSize: 11, fill: TEXT }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      tick={{ fontSize: 11, fill: TEXT }}
                      axisLine={false}
                      tickLine={false}
                      tickFormatter={(v) => formatMoney(v)}
                      width={56}
                    />
                    <Tooltip formatter={(v: number) => formatMoney(v)} />
                    <Bar dataKey="value" fill={PRIMARY} radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </Card>

            <Card>
              <h2 className="text-sm font-semibold mb-3" style={{ color: TEXT }}>
                Sales Pipeline Funnel
              </h2>
              {data.funnel.every((f) => f.count === 0) ? (
                <p className="text-sm" style={{ color: `${TEXT}80` }}>
                  No deals yet.
                </p>
              ) : (
                <ResponsiveContainer width="100%" height={240}>
                  <FunnelChart>
                    <Tooltip
                      formatter={(value: number, _name, entry) => [
                        `${value} deals · ${formatMoney((entry?.payload as { value: number } | undefined)?.value ?? 0)}`,
                        (entry?.payload as { stage_name: string } | undefined)?.stage_name,
                      ]}
                    />
                    <Funnel dataKey="count" data={data.funnel} isAnimationActive>
                      <LabelList position="right" dataKey="stage_name" fill={TEXT} stroke="none" fontSize={11} />
                      {data.funnel.map((_, i) => (
                        <Cell key={i} fill={FUNNEL_COLORS[i % FUNNEL_COLORS.length]} />
                      ))}
                    </Funnel>
                  </FunnelChart>
                </ResponsiveContainer>
              )}
            </Card>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <Card>
              <h2 className="text-sm font-semibold mb-2" style={{ color: TEXT }}>
                Lead Source Performance
              </h2>
              {data.lead_sources.length === 0 ? (
                <p className="text-sm" style={{ color: `${TEXT}80` }}>
                  No lead source data yet.
                </p>
              ) : (
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie
                      data={data.lead_sources}
                      dataKey="count"
                      nameKey="lead_source"
                      cx="50%"
                      cy="50%"
                      innerRadius={36}
                      outerRadius={68}
                      paddingAngle={2}
                    >
                      {data.lead_sources.map((_, i) => (
                        <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v: number, n: string) => [v, n || 'Unknown']} />
                    <Legend
                      layout="vertical"
                      align="right"
                      verticalAlign="middle"
                      wrapperStyle={{ fontSize: 11 }}
                      formatter={(value) => value || 'Unknown'}
                    />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </Card>

            <Card className="flex flex-col items-center">
              <h2 className="text-sm font-semibold mb-2 self-start" style={{ color: TEXT }}>
                Win/Loss Rate
              </h2>
              <Gauge value={data.win_loss.win_rate} fillColor={POSITIVE} trackColor={WARNING} />
              <p className="text-sm font-semibold -mt-1" style={{ color: TEXT }}>
                {data.win_loss.win_rate}% Win
              </p>
              <p className="text-xs" style={{ color: `${TEXT}80` }}>
                {data.win_loss.won_count} Won · {data.win_loss.lost_count} Lost
              </p>
            </Card>

            <Card className="flex flex-col items-center">
              <h2 className="text-sm font-semibold mb-2 self-start" style={{ color: TEXT }}>
                Task Completion (30d)
              </h2>
              <Gauge value={data.task_completion.rate} fillColor={PRIMARY} />
              <p className="text-sm font-semibold -mt-1" style={{ color: TEXT }}>
                {data.task_completion.rate}%
              </p>
              <p className="text-xs" style={{ color: `${TEXT}80` }}>
                {data.task_completion.completed} / {data.task_completion.total} tasks
              </p>
            </Card>
          </div>

          <div className={`grid gap-4 ${isAdmin ? 'grid-cols-3' : 'grid-cols-1'}`}>
            {isAdmin && (
              <Card>
                <h2 className="text-sm font-semibold mb-3" style={{ color: TEXT }}>
                  Team Performance Leaderboard
                </h2>
                {data.team_leaderboard.length === 0 ? (
                  <p className="text-sm" style={{ color: `${TEXT}80` }}>
                    No team activity yet.
                  </p>
                ) : (
                  <div className="space-y-2.5">
                    {data.team_leaderboard.map((row, i) => (
                      <div key={row.user_id} className="flex items-center gap-3">
                        <div
                          className="w-6 h-6 rounded-full text-xs font-bold flex items-center justify-center shrink-0"
                          style={{ backgroundColor: `${PRIMARY}26`, color: PRIMARY }}
                        >
                          {i + 1}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium truncate" style={{ color: TEXT }}>
                            {row.name}
                          </p>
                          <p className="text-xs" style={{ color: `${TEXT}80` }}>
                            {row.won_deals} won · {row.open_deals} open
                          </p>
                        </div>
                        <span className="text-sm font-semibold shrink-0" style={{ color: TEXT }}>
                          {formatMoney(row.revenue)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            )}

            <Card className={isAdmin ? 'col-span-2' : ''}>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-semibold" style={{ color: TEXT }}>
                  Stalled Deals
                </h2>
                {data.stalled_deals.length > 0 && (
                  <i className="fa-solid fa-triangle-exclamation" style={{ color: WARNING }} />
                )}
              </div>
              {data.stalled_deals.length === 0 ? (
                <p className="text-sm" style={{ color: `${TEXT}80` }}>
                  Nothing stalled — every open deal has recent activity.
                </p>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs" style={{ color: `${TEXT}80` }}>
                      <th className="font-medium pb-2">Deal Name</th>
                      <th className="font-medium pb-2">Value</th>
                      <th className="font-medium pb-2">Owner</th>
                      <th className="font-medium pb-2 text-right">Days Stalled</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {data.stalled_deals.map((d) => (
                      <tr key={d.id}>
                        <td className="py-1.5 truncate max-w-[160px]" style={{ color: TEXT }}>
                          {d.name}
                        </td>
                        <td className="py-1.5" style={{ color: TEXT }}>
                          {formatMoney(d.value)}
                        </td>
                        <td className="py-1.5" style={{ color: `${TEXT}B3` }}>
                          {toTitleCase(d.owner_name) || '--'}
                        </td>
                        <td className="py-1.5 text-right font-semibold" style={{ color: WARNING }}>
                          {d.days_stalled}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </Card>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Card>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-semibold" style={{ color: TEXT }}>
                  Upcoming Tasks
                </h2>
                {data.tasks_overdue > 0 && (
                  <span className="text-xs font-medium" style={{ color: WARNING }}>
                    {data.tasks_overdue} Late
                  </span>
                )}
              </div>
              {data.upcoming_tasks.length === 0 ? (
                <p className="text-sm" style={{ color: `${TEXT}80` }}>
                  Nothing due soon.
                </p>
              ) : (
                <div className="space-y-2">
                  {data.upcoming_tasks.map((t) => (
                    <div key={t.id} className="flex items-center gap-2 text-sm" style={{ color: TEXT }}>
                      <i className="fa-regular fa-circle-dot w-4" style={{ color: `${TEXT}66` }} />
                      <span className="flex-1 truncate">{t.subject}</span>
                      {t.due_at && (
                        <span className="text-xs shrink-0" style={{ color: `${TEXT}80` }}>
                          {new Date(t.due_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </Card>

            <Card>
              <h2 className="text-sm font-semibold mb-3" style={{ color: TEXT }}>
                Recent Activity
              </h2>
              {data.recent_activities.length === 0 ? (
                <p className="text-sm" style={{ color: `${TEXT}80` }}>
                  No recent activity.
                </p>
              ) : (
                <div className="space-y-2">
                  {data.recent_activities.map((a) => (
                    <div key={a.id} className="text-sm truncate" style={{ color: TEXT }}>
                      {a.description}
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>

          <Card>
            <h2 className="text-sm font-semibold mb-3" style={{ color: TEXT }}>
              Recent Contacts
            </h2>
            {data.recent_contacts.length === 0 ? (
              <p className="text-sm" style={{ color: `${TEXT}80` }}>
                No contacts yet.
              </p>
            ) : (
              <div className="divide-y divide-slate-50">
                {data.recent_contacts.map((c) => (
                  <div key={c.id} className="flex items-center justify-between py-2 text-sm">
                    <span className="font-medium" style={{ color: TEXT }}>
                      {c.name}
                    </span>
                    <span style={{ color: `${TEXT}B3` }}>{c.lead_status}</span>
                    <span style={{ color: `${TEXT}B3` }}>{toTitleCase(c.owner_name) || '--'}</span>
                    <span className="text-xs" style={{ color: `${TEXT}80` }}>
                      {new Date(c.created_at).toLocaleDateString()}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </>
      ) : null}
    </div>
  );
}
