import { useState } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { useAuth } from '../context/AuthContext';
import { useDashboard } from '../hooks/useDashboard';
import StatCard from '../components/StatCard';
import AddContactModal from '../components/contacts/AddContactModal';
import DealFormModal from '../components/pipeline/DealFormModal';
import TaskFormModal from '../components/tasks/TaskFormModal';
import { usePipelines, useStages } from '../hooks/useOpportunities';

const PIE_COLORS = ['#4f46e5', '#0ea5e9', '#f59e0b', '#10b981', '#ef4444', '#8b5cf6', '#ec4899', '#64748b'];

export default function Dashboard() {
  const { user } = useAuth();
  const { data, isLoading, isError } = useDashboard();

  const [addContactOpen, setAddContactOpen] = useState(false);
  const [addDealOpen, setAddDealOpen] = useState(false);
  const [addTaskOpen, setAddTaskOpen] = useState(false);

  const { data: pipelines = [] } = usePipelines();
  const defaultPipelineId = pipelines.find((p) => p.is_default)?.id ?? pipelines[0]?.id;
  const { data: stages = [] } = useStages(defaultPipelineId);

  const today = new Date().toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const maxStageCount = data ? Math.max(...data.pipeline_by_stage.map((s) => s.count), 1) : 1;

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-bold text-slate-800">
          Welcome back, {user?.name?.split(' ')[0] ?? 'there'} 👋
        </h1>
        <span className="text-sm text-slate-400">Today: {today}</span>
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={() => setAddContactOpen(true)}
          className="bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium px-3 py-1.5 rounded-lg"
        >
          + Add Contact
        </button>
        <button
          onClick={() => setAddDealOpen(true)}
          className="border border-slate-200 hover:bg-slate-50 text-slate-700 text-sm font-medium px-3 py-1.5 rounded-lg"
        >
          + Create Deal
        </button>
        <button
          onClick={() => setAddTaskOpen(true)}
          className="border border-slate-200 hover:bg-slate-50 text-slate-700 text-sm font-medium px-3 py-1.5 rounded-lg"
        >
          + Task
        </button>
      </div>

      {isError && (
        <div className="p-3 text-sm rounded-lg bg-rose-50 text-rose-700 border border-rose-200">
          Couldn't load dashboard data. Check that the `get-dashboard` webhook is active and reachable.
        </div>
      )}

      {isLoading ? (
        <div className="text-sm text-slate-400 py-10 text-center">Loading dashboard...</div>
      ) : data ? (
        <>
          <div className="grid grid-cols-5 gap-4">
            <StatCard label="Contacts" value={data.total_contacts.toLocaleString()} />
            <StatCard label="Open Deals" value={data.open_deals.toLocaleString()} />
            <StatCard label="Revenue" value={`$${data.total_revenue.toLocaleString()}`} />
            <StatCard
              label="Tasks Due Today"
              value={data.tasks_due_today}
              delta={data.tasks_overdue > 0 ? `${data.tasks_overdue} Late` : undefined}
              deltaTone={data.tasks_overdue > 0 ? 'down' : 'neutral'}
            />
            <StatCard label="Team Members" value={data.team_members} deltaTone="neutral" />
          </div>

          {/* Pipeline funnel + Lead Source pie, side by side */}
          <div className="grid grid-cols-3 gap-4">
            <div className="col-span-2 border border-slate-200 rounded-xl p-4">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-semibold text-slate-800">Sales Pipeline</h2>
                <span className="text-xs text-slate-400">By Stage</span>
              </div>
              {data.pipeline_by_stage.length === 0 ? (
                <p className="text-sm text-slate-400">No open deals yet.</p>
              ) : (
                <div className="space-y-2.5">
                  {data.pipeline_by_stage.map((stage) => (
                    <div key={stage.stage_name} className="flex items-center gap-3">
                      <span className="w-32 text-xs text-slate-500 shrink-0 truncate">{stage.stage_name}</span>
                      <div className="flex-1 h-2.5 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-indigo-500 rounded-full"
                          style={{ width: `${(stage.count / maxStageCount) * 100}%` }}
                        />
                      </div>
                      <span className="w-8 text-right text-xs font-semibold text-slate-700">
                        {stage.count}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="border border-slate-200 rounded-xl p-4">
              <h2 className="text-sm font-semibold text-slate-800 mb-2">Lead Source</h2>
              {data.lead_sources.length === 0 ? (
                <p className="text-sm text-slate-400">No lead source data yet.</p>
              ) : (
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie
                      data={data.lead_sources}
                      dataKey="count"
                      nameKey="lead_source"
                      cx="50%"
                      cy="50%"
                      innerRadius={40}
                      outerRadius={75}
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
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="border border-slate-200 rounded-xl p-4">
              <h2 className="text-sm font-semibold text-slate-800 mb-3">Upcoming Tasks</h2>
              {data.upcoming_tasks.length === 0 ? (
                <p className="text-sm text-slate-400">Nothing due soon.</p>
              ) : (
                <div className="space-y-2">
                  {data.upcoming_tasks.map((t) => (
                    <div key={t.id} className="flex items-center gap-2 text-sm text-slate-600">
                      <i className="fa-regular fa-circle-dot text-slate-400 w-4" />
                      <span className="flex-1 truncate">{t.subject}</span>
                      {t.due_at && (
                        <span className="text-xs text-slate-400 shrink-0">
                          {new Date(t.due_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="border border-slate-200 rounded-xl p-4">
              <h2 className="text-sm font-semibold text-slate-800 mb-3">Recent Activities</h2>
              {data.recent_activities.length === 0 ? (
                <p className="text-sm text-slate-400">No recent activity.</p>
              ) : (
                <div className="space-y-2">
                  {data.recent_activities.map((a) => (
                    <div key={a.id} className="text-sm text-slate-600 truncate">
                      {a.description}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="border border-slate-200 rounded-xl p-4">
            <h2 className="text-sm font-semibold text-slate-800 mb-3">Recent Contacts</h2>
            {data.recent_contacts.length === 0 ? (
              <p className="text-sm text-slate-400">No contacts yet.</p>
            ) : (
              <div className="divide-y divide-slate-100">
                {data.recent_contacts.map((c) => (
                  <div key={c.id} className="flex items-center justify-between py-2 text-sm">
                    <span className="font-medium text-slate-700">{c.name}</span>
                    <span className="text-slate-500">{c.lead_status}</span>
                    <span className="text-slate-500">{c.owner_name ?? '--'}</span>
                    <span className="text-slate-400 text-xs">
                      {new Date(c.created_at).toLocaleDateString()}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      ) : null}

      <AddContactModal open={addContactOpen} onClose={() => setAddContactOpen(false)} />
      {defaultPipelineId && (
        <DealFormModal
          open={addDealOpen}
          opportunity={null}
          stages={stages}
          pipelineId={defaultPipelineId}
          onClose={() => setAddDealOpen(false)}
        />
      )}
      <TaskFormModal open={addTaskOpen} task={null} onClose={() => setAddTaskOpen(false)} />
    </div>
  );
}
