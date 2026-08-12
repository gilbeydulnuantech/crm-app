export interface DashboardFunnelStage {
  stage_name: string;
  count: number;
  value: number;
}

export interface DashboardLeadSource {
  lead_source: string;
  count: number;
}

export interface DashboardWinLoss {
  won_count: number;
  lost_count: number;
  win_rate: number;
}

export interface DashboardLeaderboardRow {
  user_id: number;
  name: string;
  revenue: number;
  won_deals: number;
  open_deals: number;
}

export interface DashboardStalledDeal {
  id: number;
  name: string;
  value: number;
  owner_name: string | null;
  stage_name: string | null;
  expected_close: string | null;
  days_stalled: number;
}

export interface DashboardTaskCompletion {
  completed: number;
  total: number;
  rate: number;
}

export interface DashboardMonthlyRevenue {
  month: string;
  value: number;
}

export interface DashboardUpcomingTask {
  id: number;
  subject: string;
  due_at: string | null;
}

export type ActivityVerb = 'moved' | 'created' | 'completed' | 'archived' | 'noted';

export interface DashboardActivity {
  id: number;
  actor_name: string;
  verb: ActivityVerb;
  entity_type: 'opportunity' | 'contact' | 'task';
  entity_name: string | null;
  detail: string | null; // e.g. "Proposal Sent → Contract Signed", only set for 'moved'
  created_at: string;
}

export interface DashboardData {
  total_contacts: number;
  total_revenue: number;
  revenue_mtd: number;
  open_pipeline_value: number;
  open_pipeline_weighted: number;
  active_deals: number;
  avg_deal_value: number;
  new_leads_30d: number;
  new_leads_mtd: number;
  tasks_due_today: number;
  tasks_overdue: number;
  funnel: DashboardFunnelStage[];
  lead_sources: DashboardLeadSource[];
  win_loss: DashboardWinLoss;
  // Cross-team comparison — always company-wide regardless of viewer, so the
  // UI only renders it for admins.
  team_leaderboard: DashboardLeaderboardRow[];
  stalled_deals: DashboardStalledDeal[];
  task_completion: DashboardTaskCompletion;
  monthly_revenue: DashboardMonthlyRevenue[];
  upcoming_tasks: DashboardUpcomingTask[];
  upcoming_events: DashboardUpcomingTask[];
  recent_activities: DashboardActivity[];
}
