import { useQuery } from '@tanstack/react-query';
import { fetchDashboard } from '../api/dashboard';
import { DashboardData } from '../types/dashboard';

const EMPTY_DASHBOARD: DashboardData = {
  total_contacts: 0,
  total_revenue: 0,
  revenue_mtd: 0,
  open_pipeline_value: 0,
  open_pipeline_weighted: 0,
  active_deals: 0,
  avg_deal_value: 0,
  new_leads_30d: 0,
  new_leads_mtd: 0,
  tasks_due_today: 0,
  tasks_overdue: 0,
  funnel: [],
  lead_sources: [],
  win_loss: { won_count: 0, lost_count: 0, win_rate: 0 },
  team_leaderboard: [],
  stalled_deals: [],
  task_completion: { completed: 0, total: 0, rate: 0 },
  monthly_revenue: [],
  upcoming_tasks: [],
  recent_activities: [],
  recent_contacts: [],
};

export function useDashboard() {
  return useQuery({
    queryKey: ['dashboard'],
    queryFn: fetchDashboard,
    // Dashboard is a "what's happening right now" view — refresh a bit more
    // eagerly than the app-wide default.
    refetchInterval: 30000,
    // Backfills any field missing from the response with an empty default.
    // Needed because the n8n workflow JSON in the repo and the live,
    // imported workflow can drift out of sync (repo edits don't push to
    // n8n automatically) — this keeps an out-of-date backend from crashing
    // the page instead of just showing empty-state widgets.
    select: (data: Partial<DashboardData>): DashboardData => ({ ...EMPTY_DASHBOARD, ...data }),
  });
}
