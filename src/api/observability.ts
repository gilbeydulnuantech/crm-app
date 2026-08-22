import { apiFetch } from './client';

export interface ObservabilitySummary {
  executionsToday: number;
  successToday: number;
  failedToday: number;
  runningCount: number;
  successRatePct: number | null;
  avgExecutionMs: number | null;
  totalWorkflows: number;
  activeWorkflows: number;
}

export interface ObservabilityExecution {
  id: number;
  workflowId: string;
  workflowName: string | null;
  status: string;
  mode: string;
  startedAt: string;
  stoppedAt: string | null;
  durationMs: number | null;
}

export interface ObservabilityWorkflowStat {
  id: string;
  name: string;
  active: boolean;
  totalRuns: number;
  successCount: number;
  errorCount: number;
  avgMs: number | null;
  lastRunAt: string | null;
}

export interface ObservabilityTimeseriesPoint {
  day: string;
  success: number;
  error: number;
  total: number;
}

export interface ObservabilityError {
  id: number;
  workflowId: string;
  workflowName: string | null;
  startedAt: string;
  nodeName: string | null;
  nodeType: string | null;
  message: string | null;
}

export interface ObservabilityServerResources {
  cpu: { usagePct: number; cores: number; loadAvg: number[] };
  memory: { totalBytes: number; usedBytes: number; freeBytes: number; usedPct: number };
  disk: { totalBytes: number; usedBytes: number; freeBytes: number; usedPct: number | null } | null;
  uptimeSeconds: number;
}

export type ApiServiceStatus = 'connected' | 'degraded' | 'not_configured';

export interface ObservabilityApiStatus {
  key: string;
  label: string;
  status: ApiServiceStatus;
}

export interface ObservabilityDashboard {
  summary: ObservabilitySummary;
  executions: ObservabilityExecution[];
  workflowStats: ObservabilityWorkflowStat[];
  timeseries: ObservabilityTimeseriesPoint[];
  errors: ObservabilityError[];
  serverResources: ObservabilityServerResources;
  apiStatus: ObservabilityApiStatus[];
}

export function fetchObservabilityDashboard() {
  return apiFetch<ObservabilityDashboard>('/webhook/observability-dashboard');
}
