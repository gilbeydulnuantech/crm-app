import { apiFetch } from './client';

export interface N8nWorkflow {
  id: string;
  name: string;
  active: boolean;
  updated_at: string;
  node_count: number;
}

export function fetchN8nWorkflows() {
  return apiFetch<N8nWorkflow[]>('/webhook/get-n8n-workflows');
}

export interface AutomationTestNodeResult {
  name: string;
  status: 'success' | 'error';
  error: string | null;
  itemCount: number | null;
}

export interface AutomationTestResult {
  success: boolean;
  error?: string;
  executionId?: string;
  overallStatus?: string;
  startedAt?: string;
  stoppedAt?: string;
  nodes?: AutomationTestNodeResult[];
}

// Admin-only — actually runs the automation against live data (see the
// warning shown before firing in AutomationsPage). Not a sandboxed dry run:
// a schedule-based engine that finds real due contacts/deals will act on
// them for real (emails sent, stages moved, tags applied) exactly like its
// normal scheduled run would.
export function testAutomation(workflowId: string) {
  return apiFetch<AutomationTestResult>('/webhook/run-automation-test', {
    method: 'POST',
    body: JSON.stringify({ workflow_id: workflowId }),
  });
}
