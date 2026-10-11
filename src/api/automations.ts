import { apiFetch } from './client';

// Automations are evaluated by n8n-workflows/Automation Engine.json (a
// polling rule engine reading the automations/automation_actions tables)
// and created/edited through n8n-workflows/Automations.json's CRUD
// webhooks. 'ticket' is a real trigger_type the Engine's own candidate
// query supports, but Automations.json's save-automation validation does
// NOT currently allow it (VALID_TRIGGER_TYPES omits it) — kept in the type
// for reading any existing automation, but the creation form must not
// offer it until that backend gap is closed.
export type TriggerType = 'contact' | 'company' | 'task' | 'calendar' | 'pipeline' | 'ticket';

// Matches Automations.json's VALID_ACTION_TYPES allowlist (everything that
// CAN be saved) — but only 5 of these are actually executed by the
// Automation Engine today (see SUPPORTED_ACTION_TYPES in
// src/utils/automationFields.ts, what the creation form is allowed to
// OFFER). branch_if / assign_owner_round_robin / send_dm / enroll_nurture /
// send_sms all save successfully but silently log status='unsupported' and
// do nothing when the engine runs them — never expose those in a picker.
// 'condition' is structural, not something the Engine ever executes as a
// side-effecting action — it's how a condition can now be nested anywhere
// in the step sequence (not just once, right after the trigger). See
// n8n-workflows/automation_actions_tree_add.sql.
export type ActionType =
  | 'add_tag'
  | 'remove_tag'
  | 'send_email'
  | 'send_team_notification'
  | 'send_sms'
  | 'send_telegram'
  | 'wait'
  | 'update_field'
  | 'mark_closed_won'
  | 'mark_closed_lost'
  | 'condition'
  | 'branch_if'
  | 'assign_owner_round_robin'
  | 'send_dm'
  | 'ai_triage'
  | 'create_task'
  | 'enroll_nurture';

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
  // Plain client-assigned integers, not a DB foreign key — parent_step_key
  // points at another row's step_key (a 'condition' row) within the same
  // automation, letting a condition nest anywhere in the tree. Root-level
  // steps have parent_step_key null. See automation_actions_tree_add.sql.
  step_key: number;
  parent_step_key: number | null;
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
  // Legacy top-level condition slot — always null on anything saved since
  // the nested-condition-tree rework. A condition now lives in `actions`
  // as a row with action_type: 'condition', nestable anywhere via
  // parent_step_key, not as this one fixed property.
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
// executing any tag/notification action. If test_email is set and a
// "Send email" action is configured, one real email IS sent to that address.
export function testAutomation(payload: TestAutomationPayload) {
  return apiFetch<TestAutomationResult>('/webhook/test-automation', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}
