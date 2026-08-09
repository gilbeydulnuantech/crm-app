export type ReportTab = 'overview' | 'sales' | 'pipeline' | 'contacts' | 'team' | 'activities';

export interface TrendPoint {
  snapshot_date: string;
  value: number;
}

export interface OverviewReport {
  total_contacts: number;
  total_companies: number;
  open_deals: number;
  won_this_month: number;
  total_revenue: number;
  revenue_trend: TrendPoint[];
}

export interface SalesReport {
  won_count: number;
  lost_count: number;
  win_rate: number;
  won_value: number;
  lost_value: number;
  revenue_by_rep: { user_id: number; name: string; revenue: number }[];
}

export interface PipelineReport {
  by_stage: { stage_id: number; stage_name: string; count: number; value: number }[];
  avg_deal_value: number;
  avg_days_to_close: number | null;
}

export interface ContactsReport {
  total: number;
  new_trend: TrendPoint[];
  by_status: { lead_status: string; count: number }[];
  by_source: { lead_source: string; count: number }[];
}

export interface TeamReportRow {
  user_id: number;
  name: string;
  open_deals: number;
  won_deals: number;
  revenue: number;
  tasks_completed: number;
  contacts_owned: number;
}

export interface ActivitiesReport {
  by_type: { type: string; count: number }[];
  completed_vs_open: { completed: number; open: number };
  trend: TrendPoint[];
}
