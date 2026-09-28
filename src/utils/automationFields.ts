import { ActionType, AutomationAction, Branch, ConditionNode, ConditionOperator, TriggerType } from '../api/automations';
import { LEAD_STATUS_OPTIONS } from '../types/contact';
import {
  COMPANY_STATUSES,
  COMPANY_HEALTH_STATUSES,
  COMPANY_TIERS,
} from '../types/company';
import { EVENT_TYPES } from '../types/event';

// 'ticket' is deliberately excluded everywhere below — see the comment on
// TriggerType in src/api/automations.ts for why (the Engine can evaluate
// it, but the save-automation endpoint currently rejects it).
export type CreatableTriggerType = Exclude<TriggerType, 'ticket'>;

export const TRIGGER_TYPE_LABELS: Record<CreatableTriggerType, string> = {
  contact: 'Contact',
  company: 'Company',
  task: 'Task',
  calendar: 'Calendar',
  pipeline: 'Deal',
};

export type FieldKind = 'select' | 'text' | 'date' | 'number' | 'boolean';

const DEAL_STATUS_OPTIONS = ['Open', 'Won', 'Lost'] as const;
const PROPOSAL_STATUS_OPTIONS = ['draft', 'emailed', 'viewed', 'approved'] as const;
const CONTRACT_STATUS_OPTIONS = ['draft', 'sent', 'signed'] as const;

export interface FieldDef {
  key: string;
  label: string;
  kind: FieldKind;
  options?: readonly string[];
  group?: string;
}

// What a trigger/condition can READ. Mirrors getFieldValue() in
// n8n-workflows/Automation Engine.json's "Evaluate & Expand Actions" node
// (computed fields like days_since_stage_entered) plus the raw columns
// Build Candidate Query selects per trigger_type.
export const TRIGGER_FIELDS: Record<CreatableTriggerType, FieldDef[]> = {
  contact: [
    { key: 'lead_status', label: 'Status', kind: 'select', options: LEAD_STATUS_OPTIONS },
    { key: 'tags', label: 'Tags', kind: 'select' },
    { key: 'job_title', label: 'Job Title', kind: 'text' },
    { key: 'birthdate', label: 'Birthdate', kind: 'date' },
    { key: 'age', label: 'Age', kind: 'number' },
    { key: 'location', label: 'Location', kind: 'text' },
    { key: 'days_since_last_activity', label: 'Days Since Last Contact', kind: 'number' },
    { key: 'days_since_created', label: 'Lead Age (days)', kind: 'number' },
    { key: 'lead_source', label: 'Lead Source', kind: 'text' },
    { key: 'do_not_contact', label: 'Do Not Contact', kind: 'boolean' },
    { key: 'email_replied', label: 'Email Replied', kind: 'boolean', group: 'Email' },
    { key: 'email_opened', label: 'Email Opened', kind: 'boolean', group: 'Email' },
  ],
  company: [
    { key: 'account_status', label: 'Status', kind: 'select', options: COMPANY_STATUSES },
    { key: 'tags', label: 'Tags', kind: 'select' },
    { key: 'industry', label: 'Industry', kind: 'text' },
    { key: 'website', label: 'Website', kind: 'text' },
    { key: 'location', label: 'Location', kind: 'text' },
    { key: 'account_health', label: 'Account Health', kind: 'select', options: COMPANY_HEALTH_STATUSES },
    { key: 'tier', label: 'Tier', kind: 'select', options: COMPANY_TIERS },
    { key: 'days_since_created', label: 'Account Age (days)', kind: 'number' },
  ],
  task: [
    { key: 'is_completed', label: 'Complete', kind: 'boolean' },
    { key: 'overdue', label: 'Overdue', kind: 'boolean' },
  ],
  calendar: [
    { key: 'type', label: 'Type', kind: 'select', options: EVENT_TYPES },
    { key: 'due_at', label: 'Due Date', kind: 'date' },
    { key: 'is_completed', label: 'Complete', kind: 'boolean' },
    // Set true only when a new booking supersedes a prior open meeting on
    // the same deal (see Public Booking.json's Insert Inspection Activity
    // (Generic)) — lets a rule fire specifically on a rescheduled
    // appointment, distinct from the original booking.
    { key: 'is_reschedule', label: 'Is Reschedule', kind: 'boolean' },
  ],
  pipeline: [
    { key: 'pipeline_id', label: 'Pipeline', kind: 'select' },
    { key: 'stage_id', label: 'Stage', kind: 'select' },
    { key: 'tags', label: 'Tags', kind: 'select' },
    { key: 'status', label: 'Deal Status', kind: 'select', options: DEAL_STATUS_OPTIONS },
    { key: 'deal_value', label: 'Deal Value', kind: 'number' },
    { key: 'probability', label: 'Probability (%)', kind: 'number' },
    { key: 'expected_close', label: 'Expected Close', kind: 'date' },
    { key: 'source', label: 'Source', kind: 'text' },
    { key: 'priority', label: 'Priority', kind: 'text' },
    { key: 'lost_reason', label: 'Lost Reason', kind: 'text' },
    { key: 'days_since_stage_entered', label: 'Days in Current Stage', kind: 'number' },
    { key: 'days_since_created', label: 'Deal Age (days)', kind: 'number' },
    { key: 'days_inactive', label: 'Days Inactive (no updates/activity)', kind: 'number' },
    { key: 'proposal_status', label: 'Proposal Status', kind: 'select', options: PROPOSAL_STATUS_OPTIONS },
    { key: 'days_since_proposal_sent', label: 'Days Since Proposal Sent', kind: 'number' },
    { key: 'days_since_proposal_viewed', label: 'Days Since Proposal Viewed', kind: 'number' },
    { key: 'contract_status', label: 'Contract Status', kind: 'select', options: CONTRACT_STATUS_OPTIONS },
    { key: 'days_since_contract_sent', label: 'Days Since Contract Sent', kind: 'number' },
    { key: 'days_since_contract_signed', label: 'Days Since Contract Signed', kind: 'number' },
  ],
};

export const OPERATORS_BY_KIND: Record<FieldKind, { value: ConditionOperator; label: string }[]> = {
  select: [
    { value: 'equals', label: 'is' },
    { value: 'not_equals', label: 'is not' },
  ],
  text: [
    { value: 'equals', label: 'is' },
    { value: 'contains', label: 'contains' },
  ],
  date: [
    { value: 'equals', label: 'on' },
    { value: 'greater_than', label: 'after' },
    { value: 'less_than', label: 'before' },
  ],
  number: [
    { value: 'equals', label: 'is' },
    { value: 'greater_than', label: 'more than' },
    { value: 'less_than', label: 'less than' },
  ],
  boolean: [
    { value: 'is_true', label: 'is true' },
    { value: 'is_false', label: 'is false' },
  ],
};

// The action types the Automation Engine actually executes (traced
// node-by-node in its IF-chain: Is Add Tag? -> Is Remove Tag? -> Is Wait?
// -> Is Team Notification? -> Is Update Field? -> Is Send Email? -> Log
// Unsupported). Deliberately narrower than the full ActionType union so
// the creation form can never build a rule that silently does nothing.
export const SUPPORTED_ACTION_TYPES = ['add_tag', 'remove_tag', 'send_email', 'send_team_notification', 'update_field', 'wait', 'mark_closed_won', 'mark_closed_lost', 'create_task', 'send_dm', 'send_sms'] as const satisfies readonly ActionType[];

export type SupportedActionType = (typeof SUPPORTED_ACTION_TYPES)[number];

export const ACTION_TYPE_META: Record<SupportedActionType, { label: string; icon: string }> = {
  add_tag: { label: 'Add tag', icon: 'fa-tag' },
  remove_tag: { label: 'Remove tag', icon: 'fa-tag' },
  send_email: { label: 'Send email', icon: 'fa-envelope' },
  send_team_notification: { label: 'Send team notification', icon: 'fa-bell' },
  update_field: { label: 'Update field', icon: 'fa-pen-to-square' },
  wait: { label: 'Wait', icon: 'fa-clock' },
  mark_closed_won: { label: 'Mark as Closed Won', icon: 'fa-trophy' },
  mark_closed_lost: { label: 'Mark as Closed Lost', icon: 'fa-circle-xmark' },
  create_task: { label: 'Create task', icon: 'fa-list-check' },
  send_dm: { label: 'Message owner (DM)', icon: 'fa-comment' },
  send_sms: { label: 'Send SMS', icon: 'fa-comment-sms' },
};

// mark_closed_won/lost only make sense for a deal — the Engine's
// "Is Mark Closed?" node requires entityType === 'pipeline' and is a no-op
// otherwise, so keep them out of the picker for every other trigger type.
//
// add_tag/remove_tag now redirect to the linked contact for task/calendar
// too (same pattern pipeline already used), so they're available for every
// trigger type — nothing else needs excluding here.
const NO_CLOSE_ACTIONS = SUPPORTED_ACTION_TYPES.filter((t) => t !== 'mark_closed_won' && t !== 'mark_closed_lost');

export const ACTION_TYPES_BY_TRIGGER: Record<CreatableTriggerType, readonly SupportedActionType[]> = {
  contact: NO_CLOSE_ACTIONS,
  company: NO_CLOSE_ACTIONS,
  task: NO_CLOSE_ACTIONS,
  calendar: NO_CLOSE_ACTIONS,
  pipeline: SUPPORTED_ACTION_TYPES,
};

// Fields an automation is allowed to WRITE, per trigger type — a much
// smaller allowlist than TRIGGER_FIELDS (which only ever reads). Keep this
// in lockstep with the FIELD_MAP allowlist in the "Prepare Update Field"
// node in n8n-workflows/Automation Engine.json — the engine independently
// enforces the same allowlist server-side, so a mismatch here just means a
// value silently fails server-side, not a security hole.
export type UpdateFieldValueKind = 'select' | 'user' | 'boolean' | 'text' | 'stage';

export interface UpdateFieldDef {
  key: string;
  label: string;
  valueKind: UpdateFieldValueKind;
  options?: readonly string[];
}

export const UPDATE_FIELD_OPTIONS: Record<CreatableTriggerType, UpdateFieldDef[]> = {
  contact: [
    { key: 'lead_status', label: 'Status', valueKind: 'select', options: LEAD_STATUS_OPTIONS },
    { key: 'owner_id', label: 'Owner', valueKind: 'user' },
  ],
  company: [
    { key: 'account_status', label: 'Status', valueKind: 'select', options: COMPANY_STATUSES },
    { key: 'account_health', label: 'Account Health', valueKind: 'select', options: COMPANY_HEALTH_STATUSES },
    { key: 'tier', label: 'Tier', valueKind: 'select', options: COMPANY_TIERS },
    { key: 'owner_id', label: 'Owner', valueKind: 'user' },
  ],
  pipeline: [
    { key: 'status', label: 'Deal Status', valueKind: 'select', options: DEAL_STATUS_OPTIONS },
    { key: 'stage_id', label: 'Stage', valueKind: 'stage' },
    { key: 'priority', label: 'Priority', valueKind: 'text' },
    { key: 'assigned_user', label: 'Owner', valueKind: 'user' },
    // Lead status lives on the linked CONTACT, not the deal — the Engine's
    // Prepare Update Field node redirects this write there, same pattern
    // as add_tag/remove_tag for pipeline-triggered automations.
    { key: 'lead_status', label: "Contact's Lead Status", valueKind: 'select', options: LEAD_STATUS_OPTIONS },
  ],
  task: [
    { key: 'is_completed', label: 'Complete', valueKind: 'boolean' },
    { key: 'user_id', label: 'Assigned To', valueKind: 'user' },
  ],
  calendar: [
    { key: 'is_completed', label: 'Complete', valueKind: 'boolean' },
    { key: 'user_id', label: 'Assigned To', valueKind: 'user' },
  ],
};

export const WAIT_UNIT_OPTIONS: { value: 'minutes' | 'hours' | 'days' | 'months'; label: string }[] = [
  { value: 'minutes', label: 'Minutes' },
  { value: 'hours', label: 'Hours' },
  { value: 'days', label: 'Days' },
  { value: 'months', label: 'Months' },
];

export function fieldDef(triggerType: CreatableTriggerType, key: string): FieldDef | undefined {
  return TRIGGER_FIELDS[triggerType].find((f) => f.key === key);
}

export function defaultOperatorFor(kind: FieldKind): ConditionOperator {
  return OPERATORS_BY_KIND[kind][0].value;
}

export interface ActionStepDraft {
  kind: 'action';
  stepKey: number;
  actionType: SupportedActionType;
  actionConfig: Record<string, unknown>;
}

// A condition can now nest anywhere in the sequence, at any depth — its
// two branches are themselves full step sequences (which can each contain
// further conditions). This is the tree the old flat
// {hasCondition, condition, trueActions, falseActions} model couldn't
// express: a condition placed after other actions, or nested inside
// another condition's branch.
export interface ConditionStepDraft {
  kind: 'condition';
  stepKey: number;
  condition: ConditionNode;
  trueSteps: StepDraft[];
  falseSteps: StepDraft[];
}

export type StepDraft = ActionStepDraft | ConditionStepDraft;

export function actionSubtitle(a: ActionStepDraft): string {
  switch (a.actionType) {
    case 'add_tag':
    case 'remove_tag':
      return a.actionConfig.tag_name ? String(a.actionConfig.tag_name) : 'No tag set';
    case 'send_email':
      return a.actionConfig.subject ? String(a.actionConfig.subject) : 'No subject set';
    case 'send_team_notification':
      return a.actionConfig.message ? String(a.actionConfig.message) : 'No message set';
    case 'wait':
      return a.actionConfig.amount ? `${a.actionConfig.amount} ${String(a.actionConfig.unit || 'days')}` : 'No duration set';
    case 'update_field':
      return a.actionConfig.field ? String(a.actionConfig.field) : 'No field chosen';
    case 'mark_closed_won':
      return 'Deal moves to its pipeline\'s Closed Won stage';
    case 'mark_closed_lost':
      return a.actionConfig.lost_reason ? `Lost reason: ${a.actionConfig.lost_reason}` : "Deal moves to its pipeline's Closed Lost stage";
    case 'create_task':
      return a.actionConfig.subject ? String(a.actionConfig.subject) : 'No subject set';
    case 'send_dm':
      return a.actionConfig.message ? String(a.actionConfig.message) : 'No message set';
    case 'send_sms':
      return a.actionConfig.message ? String(a.actionConfig.message) : 'No message set';
    default:
      return '';
  }
}

// Flattens the step tree into the array shape the backend expects
// (automation_actions rows) — a plain pre-order walk. sort_order is
// assigned once over the WHOLE flattened array at the end (not per level),
// since siblings across different branches just need to sort correctly
// within their own (parent_step_key, branch) group, not globally
// contiguous — the backend re-derives sort_order from array position
// anyway (see Automations.json's "Validate & Payload (Save)"), this just
// keeps the shape consistent.
function flattenStepsInto(
  steps: StepDraft[],
  parentStepKey: number | null,
  branch: Branch,
  out: Omit<AutomationAction, 'id' | 'sort_order'>[]
) {
  steps.forEach((step) => {
    if (step.kind === 'condition') {
      out.push({ step_key: step.stepKey, parent_step_key: parentStepKey, branch, action_type: 'condition', action_config: step.condition as unknown as Record<string, unknown> });
      flattenStepsInto(step.trueSteps, step.stepKey, 'true', out);
      flattenStepsInto(step.falseSteps, step.stepKey, 'false', out);
    } else {
      out.push({ step_key: step.stepKey, parent_step_key: parentStepKey, branch, action_type: step.actionType, action_config: step.actionConfig });
    }
  });
}

export function flattenSteps(steps: StepDraft[]): Omit<AutomationAction, 'id'>[] {
  const out: Omit<AutomationAction, 'id' | 'sort_order'>[] = [];
  flattenStepsInto(steps, null, 'default', out);
  return out.map((a, i) => ({ ...a, sort_order: i }));
}

// Reconstructs the step tree from a flat automation_actions array (as
// returned by get-automations) — the inverse of flattenSteps. Filters out
// any action_type outside SUPPORTED_ACTION_TYPES (shouldn't exist today
// since the form never produces them, but defends against a row saved
// some other way).
export function buildStepTree(actions: AutomationAction[]): { steps: StepDraft[]; maxStepKey: number } {
  let maxStepKey = 0;
  const byGroup = new Map<string, AutomationAction[]>();
  actions.forEach((a) => {
    maxStepKey = Math.max(maxStepKey, a.step_key || 0);
    const key = `${a.parent_step_key ?? 'root'}|${a.branch}`;
    const arr = byGroup.get(key);
    if (arr) arr.push(a);
    else byGroup.set(key, [a]);
  });

  function build(parentStepKey: number | null, branch: Branch): StepDraft[] {
    const key = `${parentStepKey ?? 'root'}|${branch}`;
    const rows = (byGroup.get(key) || []).slice().sort((a, b) => a.sort_order - b.sort_order);
    const steps: StepDraft[] = [];
    for (const a of rows) {
      if (a.action_type === 'condition') {
        steps.push({
          kind: 'condition',
          stepKey: a.step_key,
          condition: a.action_config as unknown as ConditionNode,
          trueSteps: build(a.step_key, 'true'),
          falseSteps: build(a.step_key, 'false'),
        });
      } else if ((SUPPORTED_ACTION_TYPES as readonly string[]).includes(a.action_type)) {
        steps.push({ kind: 'action', stepKey: a.step_key, actionType: a.action_type as SupportedActionType, actionConfig: a.action_config });
      }
    }
    return steps;
  }

  return { steps: build(null, 'default'), maxStepKey };
}
