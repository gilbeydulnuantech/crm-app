export interface DashboardStage {
  stage_name: string;
  count: number;
}

export interface DashboardLeadSource {
  lead_source: string;
  count: number;
}

export interface DashboardUpcomingTask {
  id: number;
  subject: string;
  due_at: string | null;
}

export interface DashboardActivity {
  id: number;
  description: string;
  created_at: string;
}

export interface DashboardRecentContact {
  id: number;
  name: string;
  lead_status: string;
  owner_name: string | null;
  created_at: string;
}

export interface DashboardData {
  total_contacts: number;
  open_deals: number;
  total_revenue: number;
  tasks_due_today: number;
  tasks_overdue: number;
  team_members: number;
  new_contacts_today: number;
  pipeline_by_stage: DashboardStage[];
  lead_sources: DashboardLeadSource[];
  upcoming_tasks: DashboardUpcomingTask[];
  recent_activities: DashboardActivity[];
  recent_contacts: DashboardRecentContact[];
}
