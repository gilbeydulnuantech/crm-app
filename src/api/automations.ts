import { apiFetch } from './client';

// Automations themselves are now built and run entirely in n8n — this file
// only keeps what the Automation Logs page needs to label run history
// (automation_runs.automation_id -> a readable name), not to build or edit
// automation logic.
export type TriggerType = 'contact' | 'company' | 'task' | 'calendar' | 'pipeline' | 'ticket';

export interface Automation {
  id: number;
  name: string;
  trigger_type: TriggerType;
  is_active: boolean;
  created_at: string;
  last_run_at?: string | null;
  run_count?: number;
}

export function fetchAutomations() {
  return apiFetch<Automation[]>('/webhook/get-automations');
}
