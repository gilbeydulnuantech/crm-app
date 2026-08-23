import { apiFetch } from './client';

export type TriggerType = 'contact' | 'company' | 'task' | 'calendar' | 'pipeline' | 'ticket';
export type ActionType = 'add_tag' | 'send_email' | 'send_team_notification' | 'send_sms' | 'wait' | 'update_field';
export type WaitUnit = 'minutes' | 'hours' | 'days' | 'months';
export type Branch = 'true' | 'false' | 'default';

export type ConditionOperator =
  | 'equals'
  | 'not_equals'
  | 'contains'
  | 'greater_than'
  | 'less_than'
  | 'is_true'
  | 'is_false';

export interface ConditionNode {
  field: string;
  operator: ConditionOperator;
  value: string | number | boolean;
}

export interface AutomationAction {
  id?: number;
  branch: Branch;
  action_type: ActionType;
  action_config: Record<string, unknown>;
  sort_order: number;
}

export interface Automation {
  id: number;
  name: string;
  trigger_type: TriggerType;
  trigger_config: ConditionNode;
  condition_tree: ConditionNode | null;
  is_active: boolean;
  actions: AutomationAction[];
  created_at: string;
  last_run_at?: string | null;
  run_count?: number;
}

export function fetchAutomations() {
  return apiFetch<Automation[]>('/webhook/get-automations');
}

export interface SaveAutomationPayload {
  id?: number;
  name: string;
  trigger_type: TriggerType;
  trigger_config: ConditionNode;
  condition_tree: ConditionNode | null;
  actions: Omit<AutomationAction, 'id'>[];
}

export function saveAutomation(payload: SaveAutomationPayload) {
  return apiFetch<{ success: boolean; id?: number; error?: string }>('/webhook/save-automation', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function updateAutomationActive(id: number, isActive: boolean) {
  return apiFetch<{ success: boolean; error?: string }>('/webhook/update-automation-active', {
    method: 'POST',
    body: JSON.stringify({ id, is_active: isActive }),
  });
}

export function deleteAutomation(id: number) {
  return apiFetch<{ success: boolean; error?: string }>('/webhook/delete-automation', {
    method: 'POST',
    body: JSON.stringify({ id }),
  });
}

export interface TestAutomationPayload extends SaveAutomationPayload {
  // If set and a "Send email" action would run, the engine sends one real
  // email to this address (personalized off the matched sample record, or
  // generic placeholders if nothing matched) instead of only simulating it.
  test_email?: string;
}

export interface TestAutomationResult {
  matched: boolean;
  branch: Branch | null;
  sample_entity?: { id: number; label: string } | null;
  actions_would_run: { action_type: ActionType; status: 'would_run' | 'unsupported' }[];
  test_email_sent?: boolean;
  error?: string;
}

// Dry run: evaluates trigger_config/condition_tree against a live sample of
// the matching entity table without writing to automation_runs or
// executing any tag/SMS/notification action. If test_email is set and a
// "Send email" action is configured, one real email IS sent to that address.
export function testAutomation(payload: TestAutomationPayload) {
  return apiFetch<TestAutomationResult>('/webhook/test-automation', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}
