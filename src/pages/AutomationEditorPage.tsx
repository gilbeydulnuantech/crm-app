import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ReactFlow, Background, Controls, Handle, Position, MarkerType, BaseEdge, EdgeLabelRenderer, getSmoothStepPath } from '@xyflow/react';
import type { Node, Edge, NodeProps, EdgeProps, OnNodeDrag } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import {
  Automation,
  ActionType,
  Branch,
  ConditionNode,
  ConditionOperator,
  TriggerType,
  WaitUnit,
  SaveAutomationPayload,
  TestAutomationPayload,
  TestAutomationResult,
} from '../api/automations';
import { useAutomations, useSaveAutomation, useTestAutomation } from '../hooks/useAutomations';
import { useTags, useUsers } from '../hooks/useContacts';
import { usePipelines, useStages, useAllStages } from '../hooks/useOpportunities';
import { useProposalTemplates } from '../hooks/useProposalTemplates';
import { useContractTemplates } from '../hooks/useContractTemplates';
import { useEmailTemplates } from '../hooks/useEmailTemplates';
import { useConversations } from '../hooks/useChat';
import { ProposalTemplate } from '../api/proposalTemplates';
import { ContractTemplate } from '../api/contractTemplates';
import { EmailTemplate } from '../api/emailTemplates';
import { LEAD_STATUS_OPTIONS } from '../types/contact';
import {
  COMPANY_STATUSES,
  COMPANY_REVENUE_BANDS,
  COMPANY_EMPLOYEE_BANDS,
  COMPANY_HEALTH_STATUSES,
  COMPANY_TIERS,
} from '../types/company';
import { EVENT_TYPES, EVENT_TYPE_META } from '../types/event';
import { TICKET_STATUSES, TICKET_PRIORITIES } from '../types/ticket';
import { AUTOMATION_DYNAMIC_FIELDS } from '../components/DynamicFieldDropdown';

const inputClass =
  'w-full px-2.5 py-1.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--theme-accent)]';

type FieldKind = 'select' | 'text' | 'date' | 'number' | 'boolean';

const DEAL_STATUS_OPTIONS = ['Open', 'Won', 'Lost'] as const;
const PROPOSAL_STATUS_OPTIONS = ['draft', 'emailed', 'viewed', 'approved'] as const;
const CONTRACT_STATUS_OPTIONS = ['draft', 'sent', 'signed'] as const;

interface FieldDef {
  key: string;
  label: string;
  kind: FieldKind;
  options?: readonly string[];
  group?: string;
}

const TRIGGER_FIELDS: Record<TriggerType, FieldDef[]> = {
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
    // Backed by contacts.email_logs — Replied comes from a live Gmail-inbox
    // poller so it's accurate regardless of how the original email was
    // sent; Opened depends on the tracking pixel embedded in outbound HTML
    // emails actually loading, which many email clients block by default,
    // so treat it as a best-effort signal rather than a guarantee.
    { key: 'email_replied', label: 'Email Replied', kind: 'boolean', group: 'Email' },
    { key: 'email_opened', label: 'Email Opened', kind: 'boolean', group: 'Email' },
  ],
  company: [
    { key: 'account_status', label: 'Status', kind: 'select', options: COMPANY_STATUSES },
    { key: 'tags', label: 'Tags', kind: 'select' },
    { key: 'industry', label: 'Industry', kind: 'text' },
    { key: 'website', label: 'Website', kind: 'text' },
    { key: 'location', label: 'Location', kind: 'text' },
    { key: 'annual_revenue', label: 'Annual Revenue', kind: 'select', options: COMPANY_REVENUE_BANDS },
    { key: 'employee_count', label: 'Employee Number', kind: 'select', options: COMPANY_EMPLOYEE_BANDS },
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
  ],
  pipeline: [
    { key: 'pipeline_id', label: 'Pipeline', kind: 'select' },
    { key: 'stage_id', label: 'Stage', kind: 'select' },
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
  ticket: [
    { key: 'status', label: 'Status', kind: 'select', options: TICKET_STATUSES },
    { key: 'priority', label: 'Priority', kind: 'select', options: TICKET_PRIORITIES },
    { key: 'sla_overdue', label: 'SLA Overdue', kind: 'boolean' },
    { key: 'days_since_created', label: 'Days Open', kind: 'number' },
  ],
};

const TRIGGER_TYPE_LABELS: Record<TriggerType, string> = {
  contact: 'Contact',
  company: 'Company',
  task: 'Task',
  calendar: 'Calendar',
  pipeline: 'Deal',
  ticket: 'Ticket',
};

const OPERATORS_BY_KIND: Record<FieldKind, { value: ConditionOperator; label: string }[]> = {
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

const ACTION_TYPE_META: Record<ActionType, { label: string; icon: string; comingSoon?: boolean }> = {
  add_tag: { label: 'Add tag', icon: 'fa-tag' },
  send_email: { label: 'Send email', icon: 'fa-envelope' },
  send_team_notification: { label: 'Send team notification', icon: 'fa-bell' },
  send_sms: { label: 'Send SMS', icon: 'fa-comment-sms', comingSoon: true },
  wait: { label: 'Wait', icon: 'fa-clock' },
  update_field: { label: 'Update field', icon: 'fa-pen-to-square' },
};

// Fields an automation is allowed to WRITE, per trigger type — deliberately
// a much smaller allowlist than TRIGGER_FIELDS (which only ever READS).
// Keep this in lockstep with the FIELD_MAP allowlist in the "Prepare
// Update Field" node in n8n-workflows/Automation Engine.json.
type UpdateFieldValueKind = 'select' | 'user' | 'boolean' | 'text' | 'stage';

interface UpdateFieldDef {
  key: string;
  label: string;
  valueKind: UpdateFieldValueKind;
  options?: readonly string[];
}

const UPDATE_FIELD_OPTIONS: Record<TriggerType, UpdateFieldDef[]> = {
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
  ],
  task: [
    { key: 'is_completed', label: 'Complete', valueKind: 'boolean' },
    { key: 'user_id', label: 'Assigned To', valueKind: 'user' },
  ],
  calendar: [
    { key: 'is_completed', label: 'Complete', valueKind: 'boolean' },
    { key: 'user_id', label: 'Assigned To', valueKind: 'user' },
  ],
  ticket: [
    { key: 'status', label: 'Status', valueKind: 'select', options: TICKET_STATUSES },
    { key: 'priority', label: 'Priority', valueKind: 'select', options: TICKET_PRIORITIES },
    { key: 'assigned_user', label: 'Assigned To', valueKind: 'user' },
  ],
};

const WAIT_UNIT_OPTIONS: { value: WaitUnit; label: string }[] = [
  { value: 'minutes', label: 'Minutes' },
  { value: 'hours', label: 'Hours' },
  { value: 'days', label: 'Days' },
  { value: 'months', label: 'Months' },
];

const EMPTY_CONDITION: ConditionNode = { field: '', operator: 'equals', value: '' };

interface ActionDraft {
  branch: Branch;
  action_type: ActionType;
  action_config: Record<string, unknown>;
  sort_order: number;
}

function fieldDef(triggerType: TriggerType, key: string): FieldDef | undefined {
  return TRIGGER_FIELDS[triggerType].find((f) => f.key === key);
}

// Ungrouped fields render as plain top-level options; grouped ones (e.g.
// Email Replied/Opened under "Email") render inside an <optgroup> —
// matches the same group-rendering convention already used for the
// Dynamic Fields picker and the Add Step dropdown.
function renderFieldOptions(fields: FieldDef[]) {
  const ungrouped = fields.filter((f) => !f.group);
  const grouped = fields.reduce<Record<string, FieldDef[]>>((acc, f) => {
    if (f.group) (acc[f.group] ||= []).push(f);
    return acc;
  }, {});
  return (
    <>
      {ungrouped.map((f) => (
        <option key={f.key} value={f.key}>
          {f.label}
        </option>
      ))}
      {Object.entries(grouped).map(([group, groupFields]) => (
        <optgroup key={group} label={group}>
          {groupFields.map((f) => (
            <option key={f.key} value={f.key}>
              {f.label}
            </option>
          ))}
        </optgroup>
      ))}
    </>
  );
}

function defaultOperatorFor(kind: FieldKind): ConditionOperator {
  return OPERATORS_BY_KIND[kind][0].value;
}

// A text field is only eligible for the dynamic-field/document picker on
// actions that actually have a free-text body — add_tag/wait/update_field
// are all structured pickers, not merge-token-eligible copy.
function actionHasTextFields(t: ActionType): boolean {
  return t === 'send_email' || t === 'send_team_notification' || t === 'send_sms';
}

function actionSubtitle(a: ActionDraft): string {
  switch (a.action_type) {
    case 'add_tag':
      return a.action_config.tag_name ? String(a.action_config.tag_name) : 'No tag set';
    case 'send_email':
      return a.action_config.subject ? String(a.action_config.subject) : 'No subject set';
    case 'send_team_notification':
    case 'send_sms':
      return a.action_config.message ? String(a.action_config.message) : 'No message set';
    case 'wait':
      return a.action_config.amount ? `${a.action_config.amount} ${String(a.action_config.unit || 'days')}` : 'No duration set';
    case 'update_field':
      return a.action_config.field ? String(a.action_config.field) : 'No field chosen';
    default:
      return '';
  }
}

type SelectedNodeId = 'trigger' | 'condition' | `action-${number}` | `branch-${Branch}` | null;

function branchOfSelection(selectedNodeId: SelectedNodeId, actions: ActionDraft[]): Branch {
  if (selectedNodeId?.startsWith('action-')) {
    const index = Number(selectedNodeId.slice('action-'.length));
    return actions[index]?.branch ?? 'default';
  }
  if (selectedNodeId?.startsWith('branch-')) {
    return selectedNodeId.slice('branch-'.length) as Branch;
  }
  return 'default';
}

// Full-page automation builder — a real React Flow canvas (center) with a
// Node Library (left, click to add a step) and a Config Panel (right, shows
// the selected node's settings) — the GHL/HubSpot/Zoho "when this happens →
// do this" shape, laid out as three columns instead of one big scrolling
// form. AppLayout hides the main nav on this route for maximum width, see
// NO_SIDEBAR_PATTERN.
export default function AutomationEditorPage() {
  const { id } = useParams();
  const isEdit = id != null && id !== 'new';
  const navigate = useNavigate();

  const { data: automations = [] } = useAutomations();
  const saveAutomation = useSaveAutomation();
  const testAutomation = useTestAutomation();
  const { data: tags = [] } = useTags();
  const { data: users = [] } = useUsers();
  const { data: pipelines = [] } = usePipelines();
  const { data: proposalTemplates = [] } = useProposalTemplates();
  const { data: contractTemplates = [] } = useContractTemplates();
  const { data: emailTemplates = [] } = useEmailTemplates();
  const { data: conversations = [] } = useConversations();
  const channels = conversations.filter((c) => c.type === 'channel');

  const automation: Automation | 'new' | null = !isEdit
    ? 'new'
    : automations.find((a) => String(a.id) === id) ?? null;

  const [name, setName] = useState('');
  const [triggerType, setTriggerType] = useState<TriggerType>('contact');
  const [trigger, setTrigger] = useState<ConditionNode>(EMPTY_CONDITION);
  const [stagePipelineId, setStagePipelineId] = useState<string>(''); // scopes the Stage dropdown only, not saved
  const [hasIfElse, setHasIfElse] = useState(false);
  const [condition, setCondition] = useState<ConditionNode>(EMPTY_CONDITION);
  const [actions, setActions] = useState<ActionDraft[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<TestAutomationResult | null>(null);
  const [testEmail, setTestEmail] = useState('');
  const [loadedExisting, setLoadedExisting] = useState(false);
  // Which node is clicked on the canvas — drives what the Config Panel
  // shows, and (for `branch-*` / `action-*` selections) which branch a new
  // step from the Node Library gets appended to.
  const [selectedNodeId, setSelectedNodeId] = useState<SelectedNodeId>(null);
  // Which text field (subject/body/message) on the CURRENTLY SELECTED
  // action was last focused — only one action's fields are ever visible at
  // once now (in the Config Panel), so this no longer needs to track index.
  const [activeFieldKey, setActiveFieldKey] = useState<'subject' | 'body' | 'message' | null>(null);
  const [fieldPickerOpen, setFieldPickerOpen] = useState(false);
  const [libraryOpen, setLibraryOpen] = useState(true);
  const [configOpen, setConfigOpen] = useState(true);
  // Set by clicking the "+" button on an edge between two real nodes —
  // the NEXT type picked from the Node Library gets spliced in at this
  // exact position instead of appended to the end of a branch. Cleared
  // after the insert (or on Cancel).
  const [insertionPoint, setInsertionPoint] = useState<{ branch: Branch; afterIndexInBranch: number } | null>(null);

  useEffect(() => {
    setActiveFieldKey(null);
    setFieldPickerOpen(false);
  }, [selectedNodeId]);

  // A failed Save/Test leaves its error (or stale Test result) banner up —
  // the Config Panel's own "Save" button only closes the panel, it doesn't
  // re-validate. Without this, fixing the actual problem (e.g. typing a
  // missing message) leaves a now-stale banner on screen that looks like
  // it's still failing.
  useEffect(() => {
    setError(null);
    setTestResult(null);
  }, [name, triggerType, trigger, hasIfElse, condition, actions]);

  const { data: stages = [] } = useStages(stagePipelineId ? Number(stagePipelineId) : undefined);

  // Editing a saved Pipeline/Stage trigger only stores the stage_id (the
  // Pipeline dropdown is a local UI filter, not part of the saved
  // trigger_config) — resolve which pipeline that stage belongs to across
  // ALL pipelines so the Stage dropdown shows the saved value instead of
  // forcing the admin to reselect Pipeline before it'll appear.
  const { data: allStages = [] } = useAllStages(pipelines.map((p) => p.id));
  useEffect(() => {
    if (triggerType !== 'pipeline' || stagePipelineId) return;
    const stageId = trigger.field === 'stage_id' ? trigger.value : condition.field === 'stage_id' ? condition.value : null;
    if (stageId === null || stageId === undefined || stageId === '') return;
    const found = allStages.find((s) => s.id === Number(stageId));
    if (found) setStagePipelineId(String(found.pipeline_id));
  }, [triggerType, trigger.field, trigger.value, condition.field, condition.value, allStages, stagePipelineId]);

  useEffect(() => {
    if (!isEdit || loadedExisting) return;
    const a = automations.find((x) => String(x.id) === id);
    if (!a) return;
    setName(a.name);
    setTriggerType(a.trigger_type);
    setTrigger(a.trigger_config);
    setStagePipelineId('');
    setHasIfElse(!!a.condition_tree);
    setCondition(a.condition_tree ?? EMPTY_CONDITION);
    setActions(
      a.actions
        .slice()
        .sort((x, y) => x.sort_order - y.sort_order)
        .map((x) => ({ branch: x.branch, action_type: x.action_type, action_config: x.action_config, sort_order: x.sort_order }))
    );
    setLoadedExisting(true);
  }, [isEdit, loadedExisting, automations, id]);

  if (automation == null) {
    return <div className="flex-1 flex items-center justify-center text-sm text-slate-400">Loading...</div>;
  }
  const editingId = automation !== 'new' ? automation.id : undefined;

  const triggerConfigured = Boolean(
    trigger.field && trigger.operator && trigger.value !== '' && trigger.value !== undefined
  );
  const availableActionTypes = (Object.keys(ACTION_TYPE_META) as ActionType[]).filter(
    (t) => !(t === 'add_tag' && (triggerType === 'task' || triggerType === 'calendar'))
  );

  function handleTriggerTypeChange(next: TriggerType) {
    setTriggerType(next);
    setTrigger(EMPTY_CONDITION);
    setStagePipelineId('');
    setHasIfElse(false);
    setCondition(EMPTY_CONDITION);
  }

  function updateConditionField(node: ConditionNode, set: (n: ConditionNode) => void, key: string) {
    const def = fieldDef(triggerType, key);
    const kind = def?.kind ?? 'text';
    set({ field: key, operator: defaultOperatorFor(kind), value: kind === 'boolean' ? true : '' });
  }

  function addAction(branch: Branch, actionType: ActionType) {
    setActions((prev) => [...prev, { branch, action_type: actionType, action_config: {}, sort_order: prev.length }]);
  }

  // Splices a new action into the middle of a branch, right after the
  // Nth existing action in that branch's current order (-1 = before the
  // branch's first action). Re-derived from `afterIndexInBranch` at
  // insert time rather than a stored array index, so it stays correct
  // even if actions were added/removed elsewhere since the "+" was clicked.
  function insertActionAt(branch: Branch, afterIndexInBranch: number, actionType: ActionType) {
    setActions((prev) => {
      const branchEntries = prev
        .map((a, i) => ({ a, i }))
        .filter(({ a }) => a.branch === branch)
        .sort((x, y) => x.a.sort_order - y.a.sort_order);
      const spliceAfterArrayIndex = afterIndexInBranch < 0 ? -1 : (branchEntries[afterIndexInBranch]?.i ?? prev.length - 1);
      const next = [...prev];
      next.splice(spliceAfterArrayIndex + 1, 0, { branch, action_type: actionType, action_config: {}, sort_order: 0 });
      return next.map((a, i) => ({ ...a, sort_order: i }));
    });
  }

  // A 'default'-branch action becomes permanently unreachable (and
  // invisible on the canvas) the instant a condition exists — the engine
  // only ever resolves branch to 'true'/'false' once conditionTree is set,
  // never 'default'. Rather than silently orphaning whatever the admin
  // already built (which reads as "my step got deleted"), move any
  // existing default-branch steps onto the True branch — "if the
  // condition passes, do what I already had" is the closest match to
  // their original intent, and nothing gets lost.
  function handleLibraryAddCondition() {
    if (hasIfElse || !triggerConfigured) return;
    setHasIfElse(true);
    setCondition(EMPTY_CONDITION);
    setActions((prev) => prev.map((a) => (a.branch === 'default' ? { ...a, branch: 'true' } : a)));
    setSelectedNodeId('condition');
  }

  function handleLibraryAddAction(actionType: ActionType) {
    if (!triggerConfigured) return;
    if (insertionPoint) {
      insertActionAt(insertionPoint.branch, insertionPoint.afterIndexInBranch, actionType);
      setInsertionPoint(null);
      return;
    }
    const branch = branchOfSelection(selectedNodeId, actions);
    addAction(branch, actionType);
  }

  // Reorders one branch's actions to match a drag-and-drop result —
  // reassigns the SAME set of sort_order values this branch already used
  // (just in the new order), leaving every other branch's actions and
  // sort_order completely untouched.
  function reorderBranch(branch: Branch, draggedActionIndex: number, newRank: number) {
    setActions((prev) => {
      const branchEntries = prev.map((a, i) => ({ a, i })).filter(({ a }) => a.branch === branch).sort((x, y) => x.a.sort_order - y.a.sort_order);
      const order = branchEntries.map((e) => e.i);
      const fromPos = order.indexOf(draggedActionIndex);
      if (fromPos === -1) return prev;
      const clampedRank = Math.max(0, Math.min(newRank, order.length - 1));
      if (fromPos === clampedRank) return prev;
      const [moved] = order.splice(fromPos, 1);
      order.splice(clampedRank, 0, moved);
      const branchSortOrders = branchEntries.map((e) => e.a.sort_order).sort((x, y) => x - y);
      const next = prev.map((a) => ({ ...a }));
      order.forEach((idx, rank) => {
        next[idx].sort_order = branchSortOrders[rank];
      });
      return next;
    });
  }

  function updateAction(index: number, patch: Partial<ActionDraft>) {
    setActions((prev) => prev.map((a, i) => (i === index ? { ...a, ...patch } : a)));
  }

  function removeAction(index: number) {
    setActions((prev) => prev.filter((_, i) => i !== index));
    setSelectedNodeId((id) => (id === `action-${index}` ? null : id));
  }

  function removeCondition() {
    setHasIfElse(false);
    setActions((prev) => prev.map((a) => ({ ...a, branch: 'default' })));
    setSelectedNodeId((id) => (id === 'condition' ? null : id));
  }

  // Appends a token/document into whichever field of the SELECTED action
  // was last focused — only one action's fields are visible at a time now
  // (in the Config Panel), so there's no index to track beyond that.
  function insertIntoActiveField(text: string) {
    if (!activeFieldKey || !selectedNodeId?.startsWith('action-')) return;
    const index = Number(selectedNodeId.slice('action-'.length));
    const action = actions[index];
    if (!action) return;
    const current = String(action.action_config[activeFieldKey] || '');
    updateAction(index, { action_config: { ...action.action_config, [activeFieldKey]: current + text } });
    setFieldPickerOpen(false);
  }

  function buildPayload(): SaveAutomationPayload {
    return {
      id: editingId,
      name: name.trim(),
      trigger_type: triggerType,
      trigger_config: trigger,
      condition_tree: hasIfElse ? condition : null,
      actions: actions.map((a, i) => ({ ...a, sort_order: i })),
    };
  }

  const hasEmailAction = actions.some((a) => a.action_type === 'send_email');

  function validate(): string | null {
    if (!name.trim()) return 'Give this automation a name.';
    if (!triggerConfigured) return 'Configure a trigger first.';
    if (actions.length === 0) return 'Add at least one action.';
    for (const a of actions) {
      if (a.action_type === 'add_tag' && !String(a.action_config.tag_name || '').trim()) {
        return 'Every "Add tag" action needs a tag name.';
      }
      if (a.action_type === 'send_email' && !String(a.action_config.subject || '').trim()) {
        return 'Every "Send email" action needs a subject.';
      }
      if (
        (a.action_type === 'send_team_notification' || a.action_type === 'send_sms') &&
        !String(a.action_config.message || '').trim()
      ) {
        return `Every "${ACTION_TYPE_META[a.action_type].label}" action needs a message.`;
      }
      if (a.action_type === 'send_team_notification' && !a.action_config.channel_id) {
        return 'Every "Send team notification" action needs a Team Chat channel.';
      }
      if (a.action_type === 'wait' && !(Number(a.action_config.amount) > 0)) {
        return 'Every "Wait" action needs a duration greater than 0.';
      }
      if (a.action_type === 'update_field') {
        if (!String(a.action_config.field || '').trim()) return 'Every "Update field" action needs a field chosen.';
        if (a.action_config.value === undefined || a.action_config.value === '') {
          return 'Every "Update field" action needs a value.';
        }
      }
    }
    return null;
  }

  function handleTest() {
    setError(null);
    setTestResult(null);
    const validationError = validate();
    if (validationError) return setError(validationError);
    const payload: TestAutomationPayload = {
      ...buildPayload(),
      test_email: testEmail.trim() || undefined,
    };
    testAutomation.mutate(payload, {
      onSuccess: (result) => setTestResult(result),
      onError: (err) => setError(err instanceof Error ? err.message : 'Test failed.'),
    });
  }

  function handleSave() {
    setError(null);
    const validationError = validate();
    if (validationError) return setError(validationError);
    saveAutomation.mutate(buildPayload(), {
      onSuccess: () => navigate('/automations'),
      onError: (err) => setError(err instanceof Error ? err.message : 'Failed to save.'),
    });
  }

  // Nodes/edges are fully recomputed from the same domain state (trigger,
  // condition, actions, selectedNodeId) on every render — the canvas is a
  // read-only VIEW of that state, not its own source of truth. Positions
  // are laid out by hand (this data model is only ever a straight chain, or
  // one fork into two straight chains — never an arbitrary DAG) rather than
  // pulling in an auto-layout engine like dagre. Dragging is disabled so
  // the computed layout can't drift from what's actually saved. Nodes are
  // deliberately small/clean — clicking one opens its settings in the
  // Config Panel instead of showing the form inline.
  const { nodes, edges } = useMemo<{ nodes: Node[]; edges: Edge[] }>(() => {
    const nodes: Node[] = [];
    const edges: Edge[] = [];

    // `onAdd` is only passed for edges between two REAL nodes (trigger→
    // action, action→action, condition→action) — never on the trigger→
    // condition edge, since this data model has no branch an action
    // between Trigger and Condition could ever belong to (it would become
    // the exact same orphaned-'default'-branch dead code a real automation
    // hit in production), and never into a branch-anchor placeholder,
    // which is already itself a "click to add" affordance.
    function edge(id: string, source: string, target: string, label?: string, color?: string, onAdd?: () => void): Edge {
      const data: ButtonEdgeData = { onAdd };
      return {
        id,
        source,
        target,
        type: 'buttonEdge',
        markerEnd: { type: MarkerType.ArrowClosed, color: color || '#cbd5e1' },
        style: { stroke: color || '#cbd5e1', strokeWidth: 2 },
        label,
        labelStyle: color ? { fill: color, fontWeight: 700, fontSize: 10 } : undefined,
        labelBgStyle: color ? { fill: 'white' } : undefined,
        data: data as unknown as Record<string, unknown>,
      };
    }

    const triggerData: TriggerFlowNodeData = { triggerType, trigger, selected: selectedNodeId === 'trigger' };
    nodes.push({
      id: 'trigger',
      type: 'trigger',
      position: { x: CANVAS_CENTER_X, y: 0 },
      data: triggerData as unknown as Record<string, unknown>,
      draggable: false,
      selectable: false,
    });

    function pushActionNode(id: string, index: number, x: number, y: number) {
      const data: ActionFlowNodeData = {
        action: actions[index],
        selected: selectedNodeId === id,
        onRemove: () => removeAction(index),
      };
      // Draggable — dropping it reorders within its own branch (see
      // handleNodeDragStop); it always snaps back to a clean grid position
      // since positions are recomputed from domain state, never stored.
      nodes.push({ id, type: 'action', position: { x, y }, data: data as unknown as Record<string, unknown>, draggable: true, selectable: false });
    }

    function pushBranchAnchor(id: string, x: number, y: number, branch: Branch) {
      const data: BranchAnchorNodeData = { branch, selected: selectedNodeId === id };
      nodes.push({ id, type: 'branchAnchor', position: { x, y }, data: data as unknown as Record<string, unknown>, draggable: false, selectable: false });
    }

    if (!hasIfElse) {
      const defaultActions = actions.map((a, i) => ({ a, i })).filter(({ a }) => a.branch === 'default').sort((x, y) => x.a.sort_order - y.a.sort_order);
      let prevId = 'trigger';
      let y = CANVAS_ROW_HEIGHT;
      defaultActions.forEach(({ i }, rank) => {
        const id = `action-${i}`;
        pushActionNode(id, i, CANVAS_CENTER_X, y);
        edges.push(edge(`e-${prevId}-${id}`, prevId, id, undefined, undefined, () => handleInsertClick('default', rank - 1)));
        prevId = id;
        y += CANVAS_ROW_HEIGHT;
      });
      if (defaultActions.length === 0) {
        pushBranchAnchor('branch-default', CANVAS_CENTER_X, y, 'default');
        edges.push(edge(`e-${prevId}-branch-default`, prevId, 'branch-default'));
      }
    } else {
      const conditionData: ConditionFlowNodeData = { triggerType, condition, selected: selectedNodeId === 'condition' };
      nodes.push({
        id: 'condition',
        type: 'condition',
        position: { x: CANVAS_CENTER_X, y: CANVAS_ROW_HEIGHT },
        data: conditionData as unknown as Record<string, unknown>,
        draggable: false,
        selectable: false,
      });
      // No "+" on this edge — an action here would need `branch: 'default'`,
      // which becomes permanently dead code the moment a condition exists
      // (Evaluate & Expand Actions never resolves branch to 'default' once
      // conditionTree is set) — exactly the orphaned-action bug found in
      // production. The data model has no slot for a pre-condition step.
      edges.push(edge('e-trigger-condition', 'trigger', 'condition'));

      (['true', 'false'] as Branch[]).forEach((branch) => {
        const x = branch === 'true' ? CANVAS_LEFT_X : CANVAS_RIGHT_X;
        const color = branch === 'true' ? '#10b981' : '#f43f5e';
        const branchLabel = branch === 'true' ? 'True' : 'False';
        const branchActions = actions.map((a, i) => ({ a, i })).filter(({ a }) => a.branch === branch).sort((x, y) => x.a.sort_order - y.a.sort_order);
        let prevId = 'condition';
        let y = CANVAS_ROW_HEIGHT * 2;
        let isFirstEdge = true;
        branchActions.forEach(({ i }, rank) => {
          const id = `action-${i}`;
          pushActionNode(id, i, x, y);
          edges.push(edge(`e-${prevId}-${id}`, prevId, id, isFirstEdge ? branchLabel : undefined, isFirstEdge ? color : undefined, () => handleInsertClick(branch, rank - 1)));
          prevId = id;
          y += CANVAS_ROW_HEIGHT;
          isFirstEdge = false;
        });
        if (branchActions.length === 0) {
          const anchorId = `branch-${branch}`;
          pushBranchAnchor(anchorId, x, y, branch);
          edges.push(edge(`e-${prevId}-${anchorId}`, prevId, anchorId, isFirstEdge ? branchLabel : undefined, isFirstEdge ? color : undefined));
        }
      });
    }

    return { nodes, edges };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [triggerType, trigger, hasIfElse, condition, actions, selectedNodeId]);

  function handleNodeClick(nodeId: string) {
    if (nodeId === 'trigger' || nodeId === 'condition' || nodeId.startsWith('action-') || nodeId.startsWith('branch-')) {
      setSelectedNodeId(nodeId as SelectedNodeId);
      setConfigOpen(true);
      setInsertionPoint(null);
    }
  }

  function handleInsertClick(branch: Branch, afterIndexInBranch: number) {
    setInsertionPoint({ branch, afterIndexInBranch });
    setSelectedNodeId(null);
    setLibraryOpen(true);
  }

  // Drop position → which rank (0-based) in the SAME branch the dragged
  // action should land at, based purely on Y (branches don't change via
  // drag — only reordering within one, matching what "like in GHL" means
  // here: reorder the sequence, not rewire the graph).
  const handleNodeDragStop: OnNodeDrag = (_, node) => {
    if (!node.id.startsWith('action-')) return;
    const draggedIndex = Number(node.id.slice('action-'.length));
    const draggedAction = actions[draggedIndex];
    if (!draggedAction) return;
    const baseY = hasIfElse ? CANVAS_ROW_HEIGHT * 2 : CANVAS_ROW_HEIGHT;
    const rank = Math.round((node.position.y - baseY) / CANVAS_ROW_HEIGHT);
    reorderBranch(draggedAction.branch, draggedIndex, rank);
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-white">
      {/* Header: back, name, test/save */}
      <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-slate-200 bg-white shrink-0">
        <button
          type="button"
          onClick={() => navigate('/automations')}
          className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 shrink-0"
        >
          <i className="fa-solid fa-chevron-left text-xs" />
          Back
        </button>

        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Automation name"
          className="flex-1 max-w-md text-center text-sm font-semibold text-slate-800 border border-slate-200 rounded-full px-4 py-1.5 focus:outline-none focus:ring-2 focus:ring-[var(--theme-accent)] focus:border-transparent"
        />

        <div className="flex items-center gap-2.5 shrink-0">
          {hasEmailAction && (
            <input
              type="email"
              value={testEmail}
              onChange={(e) => setTestEmail(e.target.value)}
              placeholder="Test email address"
              title="If set, Test sends one real email here for the Send email action"
              className={`${inputClass} w-44`}
            />
          )}
          <button
            type="button"
            onClick={handleTest}
            disabled={!triggerConfigured || testAutomation.isPending}
            className="px-3 py-1.5 text-sm font-medium border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-lg disabled:opacity-50"
          >
            {testAutomation.isPending ? 'Testing...' : 'Test'}
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={!triggerConfigured || saveAutomation.isPending}
            className="px-4 py-1.5 text-sm font-semibold text-white bg-[var(--theme-accent)] hover:opacity-90 rounded-lg disabled:opacity-50"
          >
            {saveAutomation.isPending ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>

      {error && <p className="text-xs text-rose-600 bg-rose-50 border-b border-rose-200 px-4 py-1.5 shrink-0">{error}</p>}
      {testResult && (
        <p
          className={`text-xs px-4 py-1.5 border-b shrink-0 ${
            testResult.matched
              ? 'text-emerald-700 bg-emerald-50 border-emerald-200'
              : 'text-slate-500 bg-slate-50 border-slate-200'
          }`}
        >
          {testResult.matched
            ? `Matched${testResult.sample_entity ? ` — e.g. "${testResult.sample_entity.label}"` : ''}. ${testResult.actions_would_run
                .map((a) => `${ACTION_TYPE_META[a.action_type].label}${a.status === 'unsupported' ? ' (not yet supported)' : ''}`)
                .join(', ')}`
            : 'No matching records found right now.'}
          {testResult.test_email_sent && ` A test email was sent to ${testEmail.trim()}.`}
        </p>
      )}

      {/* Body: three columns — Node Library (left, click a type to append
          it), the React Flow canvas (center, small clean nodes, click to
          select), and the Config Panel (right, shows the selected node's
          settings + a dynamic-field/document picker for text fields). */}
      <div className="flex-1 flex overflow-hidden">
        <NodeLibraryPanel
          open={libraryOpen}
          onToggle={() => setLibraryOpen((v) => !v)}
          triggerConfigured={triggerConfigured}
          hasIfElse={hasIfElse}
          availableActionTypes={availableActionTypes}
          onAddCondition={handleLibraryAddCondition}
          onAddAction={handleLibraryAddAction}
          inserting={insertionPoint != null}
          onCancelInsertion={() => setInsertionPoint(null)}
        />

        <div className="flex-1 relative">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            nodeTypes={nodeTypes}
            edgeTypes={edgeTypes}
            nodesConnectable={false}
            elementsSelectable={false}
            panOnScroll
            fitView
            fitViewOptions={{ padding: 0.25 }}
            proOptions={{ hideAttribution: true }}
            onNodeClick={(_, node) => handleNodeClick(node.id)}
            onNodeDragStop={handleNodeDragStop}
            onPaneClick={() => {
              setSelectedNodeId(null);
              setInsertionPoint(null);
            }}
          >
            <Background gap={16} color="#e2e8f0" />
            <Controls showInteractive={false} />
          </ReactFlow>
        </div>

        <ConfigPanel
          open={configOpen}
          onToggle={() => setConfigOpen((v) => !v)}
          selectedNodeId={selectedNodeId}
          triggerType={triggerType}
          trigger={trigger}
          onTriggerTypeChange={handleTriggerTypeChange}
          onTriggerFieldChange={(key) => {
            updateConditionField(trigger, setTrigger, key);
            setStagePipelineId('');
          }}
          onTriggerOperatorChange={(op) => setTrigger({ ...trigger, operator: op })}
          onTriggerValueChange={(v) => setTrigger({ ...trigger, value: v })}
          condition={condition}
          onConditionFieldChange={(key) => updateConditionField(condition, setCondition, key)}
          onConditionOperatorChange={(op) => setCondition({ ...condition, operator: op })}
          onConditionValueChange={(v) => setCondition({ ...condition, value: v })}
          onRemoveCondition={removeCondition}
          actions={actions}
          onActionChange={updateAction}
          onActionRemove={removeAction}
          triggerConfigured={triggerConfigured}
          tags={tags}
          channels={channels}
          users={users}
          pipelines={pipelines}
          stages={stages}
          allStages={allStages}
          stagePipelineId={stagePipelineId}
          onStagePipelineChange={setStagePipelineId}
          activeFieldKey={activeFieldKey}
          onFieldFocus={setActiveFieldKey}
          fieldPickerOpen={fieldPickerOpen}
          onToggleFieldPicker={() => setFieldPickerOpen((v) => !v)}
          onInsertField={insertIntoActiveField}
          proposalTemplates={proposalTemplates}
          contractTemplates={contractTemplates}
          emailTemplates={emailTemplates}
          onClose={() => setSelectedNodeId(null)}
        />
      </div>
    </div>
  );
}

// Hand-computed canvas layout — this data model is only ever a straight
// chain, or one fork into two straight chains, so fixed columns/row height
// are simpler and more predictable than pulling in an auto-layout engine.
const CANVAS_CENTER_X = 360;
const CANVAS_LEFT_X = 40;
const CANVAS_RIGHT_X = 680;
const CANVAS_ROW_HEIGHT = 170;

interface TriggerFlowNodeData {
  triggerType: TriggerType;
  trigger: ConditionNode;
  selected: boolean;
}

interface ConditionFlowNodeData {
  triggerType: TriggerType;
  condition: ConditionNode;
  selected: boolean;
}

interface ActionFlowNodeData {
  action: ActionDraft;
  selected: boolean;
  onRemove: () => void;
}

interface BranchAnchorNodeData {
  branch: Branch;
  selected: boolean;
}

interface ButtonEdgeData {
  onAdd?: () => void;
}

// A "+" button at the midpoint of every edge between two real nodes — GHL-
// style "insert a step here" instead of only ever appending at the end of
// a branch. Edges without an `onAdd` (trigger→condition, and anything
// leading into a branch-anchor placeholder) render as a plain path.
function ButtonEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  markerEnd,
  style,
  label,
  labelStyle,
  data,
}: EdgeProps) {
  const [edgePath, labelX, labelY] = getSmoothStepPath({ sourceX, sourceY, sourcePosition, targetX, targetY, targetPosition });
  const d = data as unknown as ButtonEdgeData | undefined;

  return (
    <>
      <BaseEdge id={id} path={edgePath} markerEnd={markerEnd} style={style} />
      <EdgeLabelRenderer>
        {label != null && (
          <div
            className="absolute px-1 text-[10px] font-bold rounded"
            style={{
              ...(labelStyle as object),
              background: 'white',
              transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY - 16}px)`,
              pointerEvents: 'none',
            }}
          >
            {label}
          </div>
        )}
        {d?.onAdd && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              d.onAdd!();
            }}
            title="Insert a step here"
            className="nodrag nopan absolute w-5 h-5 rounded-full bg-white border border-slate-300 text-slate-400 hover:border-[var(--theme-accent)] hover:text-[var(--theme-accent)] flex items-center justify-center shadow-sm"
            style={{ transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`, pointerEvents: 'all' }}
          >
            <i className="fa-solid fa-plus" style={{ fontSize: 9 }} />
          </button>
        )}
      </EdgeLabelRenderer>
    </>
  );
}

// `nodrag`/`nowheel` let clicks inside a node behave normally instead of
// being intercepted as a canvas pan/drag gesture by React Flow. Nodes are
// deliberately small — just an icon, title, and one-line summary; the full
// settings form only appears in the Config Panel once a node is selected.
// No `nodrag` here — Action nodes need to stay draggable (see
// pushActionNode). It's harmless on the other node types too since they're
// explicitly `draggable: false` regardless; `nodrag` would only matter for
// a node that's actually draggable, and there it would block the exact
// gesture just enabled. `nowheel` stays — that one's just scroll-vs-zoom.
function flowNodeClass(selected: boolean, dashed?: boolean) {
  return `nowheel w-56 border rounded-xl px-3 py-2.5 bg-white shadow-sm cursor-pointer transition-colors ${
    dashed ? 'border-dashed' : ''
  } ${selected ? 'border-[var(--theme-accent)] ring-2 ring-indigo-100' : 'border-slate-200 hover:border-slate-300'}`;
}

function TriggerFlowNodeComponent({ data }: NodeProps) {
  const d = data as unknown as TriggerFlowNodeData;
  const subtitle = d.trigger.field
    ? fieldDef(d.triggerType, d.trigger.field)?.label || d.trigger.field
    : 'Not configured';
  return (
    <div className={flowNodeClass(d.selected)}>
      <Handle type="source" position={Position.Bottom} className="!bg-slate-300" />
      <p className="text-xs font-semibold text-slate-700">
        <i className="fa-solid fa-bolt mr-1.5 text-[var(--theme-accent)]" />
        Trigger
      </p>
      <p className="text-[11px] text-slate-400 mt-0.5 truncate">
        {TRIGGER_TYPE_LABELS[d.triggerType]} · {subtitle}
      </p>
    </div>
  );
}

function ConditionFlowNodeComponent({ data }: NodeProps) {
  const d = data as unknown as ConditionFlowNodeData;
  const subtitle = d.condition.field
    ? fieldDef(d.triggerType, d.condition.field)?.label || d.condition.field
    : 'Not configured';
  return (
    <div className={flowNodeClass(d.selected)}>
      <Handle type="target" position={Position.Top} className="!bg-slate-300" />
      <Handle type="source" position={Position.Bottom} className="!bg-slate-300" />
      <p className="text-xs font-semibold text-slate-700">
        <i className="fa-solid fa-code-branch mr-1.5 text-[var(--theme-accent)]" />
        Condition
      </p>
      <p className="text-[11px] text-slate-400 mt-0.5 truncate">{subtitle}</p>
    </div>
  );
}

function ActionFlowNodeComponent({ data }: NodeProps) {
  const d = data as unknown as ActionFlowNodeData;
  const meta = ACTION_TYPE_META[d.action.action_type];
  return (
    <div className={flowNodeClass(d.selected)}>
      <Handle type="target" position={Position.Top} className="!bg-slate-300" />
      <Handle type="source" position={Position.Bottom} className="!bg-slate-300" />
      <div className="flex items-center justify-between gap-1">
        <p className="text-xs font-semibold text-slate-700 truncate">
          <i className={`fa-solid ${meta.icon} mr-1.5 text-[var(--theme-accent)]`} />
          {meta.label}
        </p>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            d.onRemove();
          }}
          className="nodrag shrink-0 text-slate-300 hover:text-rose-600"
        >
          <i className="fa-solid fa-xmark text-xs" />
        </button>
      </div>
      {meta.comingSoon && (
        <span className="inline-block mt-1 px-1.5 py-0.5 text-[9px] font-semibold rounded-full bg-amber-100 text-amber-700">
          Coming soon
        </span>
      )}
      <p className="text-[11px] text-slate-400 mt-0.5 truncate">{actionSubtitle(d.action)}</p>
    </div>
  );
}

function BranchAnchorNodeComponent({ data }: NodeProps) {
  const d = data as unknown as BranchAnchorNodeData;
  return (
    <div className={flowNodeClass(d.selected, true)}>
      <Handle type="target" position={Position.Top} className="!bg-slate-300" />
      <p className="text-[11px] text-slate-400 text-center">
        <i className="fa-solid fa-plus mr-1" />
        {d.selected ? 'Pick a step from the library' : 'No steps yet — click to target'}
      </p>
    </div>
  );
}

// Module-level and referentially stable across renders — passing a
// freshly-created object as React Flow's `nodeTypes` prop every render
// triggers a full pane remount (and a console warning).
const nodeTypes = {
  trigger: TriggerFlowNodeComponent,
  condition: ConditionFlowNodeComponent,
  action: ActionFlowNodeComponent,
  branchAnchor: BranchAnchorNodeComponent,
};

const edgeTypes = { buttonEdge: ButtonEdge };

// The left-hand palette — AI Agent and Webhook steps aren't real
// capabilities this automation engine executes yet, so only genuinely
// supported step types are listed here (unlike the mockup this was built
// from, which included both). Clicking a type appends it to whichever
// branch is currently "targeted" — the branch of the selected node, or the
// top-level flow if nothing (or the Trigger) is selected.
function NodeLibraryPanel({
  open,
  onToggle,
  triggerConfigured,
  hasIfElse,
  availableActionTypes,
  onAddCondition,
  onAddAction,
  inserting,
  onCancelInsertion,
}: {
  open: boolean;
  onToggle: () => void;
  triggerConfigured: boolean;
  hasIfElse: boolean;
  availableActionTypes: ActionType[];
  onAddCondition: () => void;
  onAddAction: (t: ActionType) => void;
  inserting: boolean;
  onCancelInsertion: () => void;
}) {
  const itemClass =
    'w-full flex items-center gap-2 text-left px-2.5 py-2 text-xs font-medium text-slate-600 hover:bg-white hover:text-[var(--theme-accent)] rounded-lg disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-slate-600';

  if (!open) {
    return (
      <div className="w-8 shrink-0 border-r border-slate-200 bg-slate-50 flex flex-col items-center pt-3">
        <button
          type="button"
          onClick={onToggle}
          title="Expand Node Library"
          className="text-slate-400 hover:text-[var(--theme-accent)]"
        >
          <i className="fa-solid fa-chevron-right text-xs" />
        </button>
      </div>
    );
  }

  return (
    <div className="w-48 shrink-0 border-r border-slate-200 bg-slate-50 overflow-y-auto p-3">
      <div className="flex items-center justify-between mb-1">
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Node Library</p>
        <button type="button" onClick={onToggle} title="Collapse" className="text-slate-400 hover:text-slate-600 shrink-0">
          <i className="fa-solid fa-chevron-left text-xs" />
        </button>
      </div>
      {inserting ? (
        <div className="mb-3 px-2 py-1.5 text-[11px] text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg">
          Inserting a step here — pick a type below.
          <button type="button" onClick={onCancelInsertion} className="block mt-1 font-semibold text-emerald-800 hover:underline">
            Cancel
          </button>
        </div>
      ) : (
        <p className="text-[11px] text-slate-400 mb-3">
          Click a node on the canvas first to choose where a new step goes, then click a type below to add it — or click the{' '}
          <i className="fa-solid fa-plus" /> on any connection to insert one there instead.
        </p>
      )}
      <div className="space-y-0.5">
        <button
          type="button"
          onClick={onAddCondition}
          disabled={!triggerConfigured || hasIfElse || inserting}
          title={inserting ? 'Condition can only be added right after the Trigger' : hasIfElse ? 'Only one condition per automation' : undefined}
          className={itemClass}
        >
          <i className="fa-solid fa-code-branch w-4 text-center" />
          Condition
        </button>
        {availableActionTypes.map((t) => (
          <button key={t} type="button" onClick={() => onAddAction(t)} disabled={!triggerConfigured} className={itemClass}>
            <i className={`fa-solid ${ACTION_TYPE_META[t].icon} w-4 text-center`} />
            {ACTION_TYPE_META[t].label}
            {ACTION_TYPE_META[t].comingSoon && (
              <span className="ml-auto px-1 py-0.5 text-[9px] font-semibold rounded-full bg-amber-100 text-amber-700 shrink-0">Soon</span>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}

function ValueInput({
  triggerType,
  field,
  value,
  onChange,
  tags,
  pipelines,
  stages,
  stagePipelineId,
  onStagePipelineChange,
}: {
  triggerType: TriggerType;
  field: string;
  value: string | number | boolean;
  onChange: (v: string | number | boolean) => void;
  tags: { id: number; name: string }[];
  pipelines: { id: number; name: string }[];
  stages: { id: number; name: string }[];
  stagePipelineId: string;
  onStagePipelineChange: (v: string) => void;
}) {
  const def = fieldDef(triggerType, field);
  if (!def) return null;

  if (triggerType === 'pipeline' && field === 'pipeline_id') {
    return (
      <select value={String(value)} onChange={(e) => onChange(Number(e.target.value))} className={inputClass}>
        <option value="">Choose a pipeline...</option>
        {pipelines.map((p) => (
          <option key={p.id} value={p.id}>
            {p.name}
          </option>
        ))}
      </select>
    );
  }

  if (triggerType === 'pipeline' && field === 'stage_id') {
    return (
      <div className="space-y-1">
        <select value={stagePipelineId} onChange={(e) => onStagePipelineChange(e.target.value)} className={inputClass}>
          <option value="">Pipeline...</option>
          {pipelines.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
        <select
          value={String(value)}
          onChange={(e) => onChange(Number(e.target.value))}
          disabled={!stagePipelineId}
          className={inputClass}
        >
          <option value="">Stage...</option>
          {stages.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
      </div>
    );
  }

  if (triggerType === 'calendar' && field === 'type') {
    return (
      <select value={String(value)} onChange={(e) => onChange(e.target.value)} className={inputClass}>
        <option value="">Choose...</option>
        {EVENT_TYPES.map((t) => (
          <option key={t} value={t}>
            {EVENT_TYPE_META[t].label}
          </option>
        ))}
      </select>
    );
  }

  if (field === 'tags') {
    return (
      <select value={String(value)} onChange={(e) => onChange(e.target.value)} className={inputClass}>
        <option value="">Choose a tag...</option>
        {tags.map((t) => (
          <option key={t.id} value={t.name}>
            {t.name}
          </option>
        ))}
      </select>
    );
  }

  if (def.kind === 'boolean') {
    return <p className="text-xs text-slate-400 px-1 py-1.5">No value needed.</p>;
  }

  if (def.kind === 'select' && def.options) {
    return (
      <select value={String(value)} onChange={(e) => onChange(e.target.value)} className={inputClass}>
        <option value="">Choose...</option>
        {def.options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    );
  }

  if (def.kind === 'date') {
    return <input type="date" value={String(value)} onChange={(e) => onChange(e.target.value)} className={inputClass} />;
  }

  if (def.kind === 'number') {
    return (
      <input
        type="number"
        value={value === '' ? '' : Number(value)}
        onChange={(e) => onChange(e.target.value === '' ? '' : Number(e.target.value))}
        className={inputClass}
      />
    );
  }

  return <input type="text" value={String(value)} onChange={(e) => onChange(e.target.value)} className={inputClass} />;
}

function ActionCard({
  action,
  triggerType,
  tags,
  channels,
  users,
  pipelines,
  allStages,
  onChange,
  onFieldFocus,
}: {
  action: ActionDraft;
  triggerType: TriggerType;
  tags: { id: number; name: string }[];
  channels: { id: number; name?: string | null }[];
  users: { id: number; name: string }[];
  pipelines: { id: number; name: string }[];
  allStages: { id: number; name: string; pipeline_id: number }[];
  onChange: (patch: Partial<ActionDraft>) => void;
  onFieldFocus: (key: 'subject' | 'body' | 'message') => void;
}) {
  return (
    <div>
      {action.action_type === 'add_tag' && (
        <div>
          <input
            type="text"
            list="automation-tag-options"
            value={String(action.action_config.tag_name || '')}
            onChange={(e) => onChange({ action_config: { tag_name: e.target.value } })}
            placeholder="Tag name (existing or new)"
            className={inputClass}
          />
          <datalist id="automation-tag-options">
            {tags.map((t) => (
              <option key={t.id} value={t.name} />
            ))}
          </datalist>
        </div>
      )}

      {action.action_type === 'send_email' && (
        <div className="space-y-1.5">
          <input
            type="text"
            value={String(action.action_config.subject || '')}
            onChange={(e) => onChange({ action_config: { ...action.action_config, subject: e.target.value } })}
            onFocus={() => onFieldFocus('subject')}
            placeholder="Subject"
            className={inputClass}
          />
          <textarea
            value={String(action.action_config.body || '')}
            onChange={(e) => onChange({ action_config: { ...action.action_config, body: e.target.value } })}
            onFocus={() => onFieldFocus('body')}
            rows={5}
            placeholder="Email body — click Insert Field below to add tokens here"
            className={inputClass}
          />
        </div>
      )}

      {action.action_type === 'send_team_notification' && (
        <div className="space-y-1.5">
          <select
            value={String(action.action_config.channel_id || '')}
            onChange={(e) => onChange({ action_config: { ...action.action_config, channel_id: e.target.value ? Number(e.target.value) : '' } })}
            className={inputClass}
          >
            <option value="">Choose a Team Chat channel...</option>
            {channels.map((c) => (
              <option key={c.id} value={c.id}>
                # {c.name}
              </option>
            ))}
          </select>
          <textarea
            value={String(action.action_config.message || '')}
            onChange={(e) => onChange({ action_config: { ...action.action_config, message: e.target.value } })}
            onFocus={() => onFieldFocus('message')}
            rows={4}
            placeholder="Message — posted into Team Chat as the automation's creator"
            className={inputClass}
          />
        </div>
      )}

      {action.action_type === 'send_sms' && (
        <textarea
          value={String(action.action_config.message || '')}
          onChange={(e) => onChange({ action_config: { message: e.target.value } })}
          onFocus={() => onFieldFocus('message')}
          rows={4}
          placeholder="Message"
          className={inputClass}
        />
      )}

      {action.action_type === 'wait' && (
        <div className="flex gap-2">
          <input
            type="number"
            min={1}
            value={action.action_config.amount === undefined ? '' : Number(action.action_config.amount)}
            onChange={(e) =>
              onChange({ action_config: { ...action.action_config, amount: e.target.value === '' ? '' : Number(e.target.value) } })
            }
            placeholder="1"
            className={`${inputClass} w-24`}
          />
          <select
            value={String(action.action_config.unit || 'days')}
            onChange={(e) => onChange({ action_config: { ...action.action_config, unit: e.target.value as WaitUnit } })}
            className={inputClass}
          >
            {WAIT_UNIT_OPTIONS.map((u) => (
              <option key={u.value} value={u.value}>
                {u.label}
              </option>
            ))}
          </select>
        </div>
      )}

      {action.action_type === 'update_field' && (
        <div className="space-y-1.5">
          <select
            value={String(action.action_config.field || '')}
            onChange={(e) => onChange({ action_config: { field: e.target.value, value: '' } })}
            className={inputClass}
          >
            <option value="">Choose a field to update...</option>
            {UPDATE_FIELD_OPTIONS[triggerType].map((f) => (
              <option key={f.key} value={f.key}>
                {f.label}
              </option>
            ))}
          </select>
          {Boolean(action.action_config.field) && (
            <UpdateFieldValueInput
              def={UPDATE_FIELD_OPTIONS[triggerType].find((f) => f.key === action.action_config.field)!}
              value={action.action_config.value as string | number | boolean | undefined}
              onChange={(v) => onChange({ action_config: { ...action.action_config, value: v } })}
              users={users}
              pipelines={pipelines}
              allStages={allStages}
            />
          )}
        </div>
      )}
    </div>
  );
}

// The value input for "Update field" adapts to what kind of column is
// being written — a plain text/select field, a user picker (owner/
// assignee columns), a stage picker (deal stage_id, labeled with its
// pipeline so it's unambiguous across multiple pipelines), or a
// true/false picker (is_completed).
function UpdateFieldValueInput({
  def,
  value,
  onChange,
  users,
  pipelines,
  allStages,
}: {
  def: UpdateFieldDef;
  value: string | number | boolean | undefined;
  onChange: (v: string | number | boolean) => void;
  users: { id: number; name: string }[];
  pipelines: { id: number; name: string }[];
  allStages: { id: number; name: string; pipeline_id: number }[];
}) {
  if (def.valueKind === 'select') {
    return (
      <select value={String(value ?? '')} onChange={(e) => onChange(e.target.value)} className={inputClass}>
        <option value="">Choose a value...</option>
        {(def.options || []).map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    );
  }
  if (def.valueKind === 'user') {
    return (
      <select value={String(value ?? '')} onChange={(e) => onChange(Number(e.target.value))} className={inputClass}>
        <option value="">Choose a user...</option>
        {users.map((u) => (
          <option key={u.id} value={u.id}>
            {u.name}
          </option>
        ))}
      </select>
    );
  }
  if (def.valueKind === 'stage') {
    return (
      <select value={String(value ?? '')} onChange={(e) => onChange(Number(e.target.value))} className={inputClass}>
        <option value="">Choose a stage...</option>
        {allStages.map((s) => (
          <option key={s.id} value={s.id}>
            {pipelines.find((p) => p.id === s.pipeline_id)?.name || 'Pipeline'} / {s.name}
          </option>
        ))}
      </select>
    );
  }
  if (def.valueKind === 'boolean') {
    return (
      <select
        value={value === true ? 'true' : value === false ? 'false' : ''}
        onChange={(e) => onChange(e.target.value === 'true')}
        className={inputClass}
      >
        <option value="">Choose a value...</option>
        <option value="true">True</option>
        <option value="false">False</option>
      </select>
    );
  }
  return (
    <input
      type="text"
      value={String(value ?? '')}
      onChange={(e) => onChange(e.target.value)}
      placeholder="New value"
      className={inputClass}
    />
  );
}

type DocumentCategory = 'proposal' | 'contract' | 'email_template';

const documentPickerSelectClass =
  'text-[11px] border border-slate-200 rounded-md px-1.5 py-0.5 text-slate-500 focus:outline-none focus:ring-2 focus:ring-[var(--theme-accent)]';

// Proposal and Contract both insert a resolvable {{proposal_template:ID}} /
// {{contract_template:ID}} token instead of a fixed link — both are now
// standalone templates with no deal (and no public link) of their own. The
// automation engine clones the referenced template into a real, deal-bound
// proposal/contract for whichever deal triggered the automation, and swaps
// this token for that new document's link at send time.
// Email Template: inserts the full body text (no link of its own).
function DocumentPicker({
  proposalTemplates,
  contractTemplates,
  emailTemplates,
  onInsert,
}: {
  proposalTemplates: ProposalTemplate[];
  contractTemplates: ContractTemplate[];
  emailTemplates: EmailTemplate[];
  onInsert: (text: string) => void;
}) {
  const [category, setCategory] = useState<DocumentCategory | ''>('');

  const items: { id: number; label: string; value: string }[] =
    category === 'proposal'
      ? proposalTemplates.map((t) => ({ id: t.id, label: t.title, value: `{{proposal_template:${t.id}}}` }))
      : category === 'contract'
      ? contractTemplates.map((t) => ({ id: t.id, label: t.title, value: `{{contract_template:${t.id}}}` }))
      : category === 'email_template'
      ? emailTemplates.map((t) => ({ id: t.id, label: t.name, value: t.body }))
      : [];

  return (
    <div className="flex flex-col gap-1.5">
      <select
        value={category}
        onChange={(e) => setCategory(e.target.value as DocumentCategory | '')}
        className={documentPickerSelectClass}
      >
        <option value="">Insert saved doc...</option>
        <option value="proposal">Proposal</option>
        <option value="contract">Contract</option>
        <option value="email_template">Email Template</option>
      </select>
      {category && (
        <select
          value=""
          onChange={(e) => {
            const item = items.find((it) => String(it.id) === e.target.value);
            if (item) onInsert(item.value);
            setCategory('');
          }}
          className={documentPickerSelectClass}
        >
          <option value="">{items.length === 0 ? 'None saved yet' : 'Choose...'}</option>
          {items.map((it) => (
            <option key={it.id} value={it.id}>
              {it.label}
            </option>
          ))}
        </select>
      )}
    </div>
  );
}

// The grouped dropdown that opens under "Insert Field" — Contact/Company/
// Deal/Owner/Task & Calendar/Other are the real merge-token groups the
// Automation Engine resolves (AUTOMATION_DYNAMIC_FIELDS); Documents lets a
// saved proposal/contract/email template be inserted the same way.
function FieldPickerDropdown({
  proposalTemplates,
  contractTemplates,
  emailTemplates,
  onInsert,
}: {
  proposalTemplates: ProposalTemplate[];
  contractTemplates: ContractTemplate[];
  emailTemplates: EmailTemplate[];
  onInsert: (text: string) => void;
}) {
  const groups = AUTOMATION_DYNAMIC_FIELDS.reduce<Record<string, typeof AUTOMATION_DYNAMIC_FIELDS>>((acc, f) => {
    const g = f.group || 'Other';
    (acc[g] ||= []).push(f);
    return acc;
  }, {});

  return (
    <div className="mt-2 border border-slate-200 rounded-lg bg-white shadow-sm p-3 max-h-72 overflow-y-auto">
      <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-2">Insert Dynamic Field</p>

      <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-1">Documents</p>
      <div className="mb-3">
        <DocumentPicker
          proposalTemplates={proposalTemplates}
          contractTemplates={contractTemplates}
          emailTemplates={emailTemplates}
          onInsert={onInsert}
        />
      </div>

      <div className="space-y-2">
        {Object.entries(groups).map(([group, fields]) => (
          <div key={group}>
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-1">{group}</p>
            <div className="space-y-0.5">
              {fields.map((f) => (
                <button
                  key={f.token}
                  type="button"
                  onClick={() => onInsert(f.token)}
                  className="w-full text-left px-2 py-1 text-xs text-slate-600 hover:bg-slate-50 hover:text-[var(--theme-accent)] rounded-md"
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// The right-hand panel — shows nothing until a node is clicked, then shows
// that node's full settings form (previously inline on the canvas itself).
// Action nodes with free-text fields (send_email/send_team_notification/
// send_sms) get an "Insert Field" toggle that opens FieldPickerDropdown,
// which inserts into whichever field was last focused.
function ConfigPanel({
  open,
  onToggle,
  selectedNodeId,
  triggerType,
  trigger,
  onTriggerTypeChange,
  onTriggerFieldChange,
  onTriggerOperatorChange,
  onTriggerValueChange,
  condition,
  onConditionFieldChange,
  onConditionOperatorChange,
  onConditionValueChange,
  onRemoveCondition,
  actions,
  onActionChange,
  onActionRemove,
  triggerConfigured,
  tags,
  channels,
  users,
  pipelines,
  stages,
  allStages,
  stagePipelineId,
  onStagePipelineChange,
  activeFieldKey,
  onFieldFocus,
  fieldPickerOpen,
  onToggleFieldPicker,
  onInsertField,
  proposalTemplates,
  contractTemplates,
  emailTemplates,
  onClose,
}: {
  open: boolean;
  onToggle: () => void;
  selectedNodeId: SelectedNodeId;
  triggerType: TriggerType;
  trigger: ConditionNode;
  onTriggerTypeChange: (t: TriggerType) => void;
  onTriggerFieldChange: (key: string) => void;
  onTriggerOperatorChange: (op: ConditionOperator) => void;
  onTriggerValueChange: (v: string | number | boolean) => void;
  condition: ConditionNode;
  onConditionFieldChange: (key: string) => void;
  onConditionOperatorChange: (op: ConditionOperator) => void;
  onConditionValueChange: (v: string | number | boolean) => void;
  onRemoveCondition: () => void;
  actions: ActionDraft[];
  onActionChange: (index: number, patch: Partial<ActionDraft>) => void;
  onActionRemove: (index: number) => void;
  triggerConfigured: boolean;
  tags: { id: number; name: string }[];
  channels: { id: number; name?: string | null }[];
  users: { id: number; name: string }[];
  pipelines: { id: number; name: string }[];
  stages: { id: number; name: string }[];
  allStages: { id: number; name: string; pipeline_id: number }[];
  stagePipelineId: string;
  onStagePipelineChange: (v: string) => void;
  activeFieldKey: 'subject' | 'body' | 'message' | null;
  onFieldFocus: (key: 'subject' | 'body' | 'message') => void;
  fieldPickerOpen: boolean;
  onToggleFieldPicker: () => void;
  onInsertField: (text: string) => void;
  proposalTemplates: ProposalTemplate[];
  contractTemplates: ContractTemplate[];
  emailTemplates: EmailTemplate[];
  onClose: () => void;
}) {
  const panelClass = 'w-72 shrink-0 border-l border-slate-200 bg-slate-50 overflow-y-auto p-4';
  const headerClass = 'text-xs font-bold text-slate-500 uppercase tracking-wide mb-3';
  const doneButtonClass =
    'w-full mt-4 px-3 py-1.5 text-xs font-semibold text-white bg-[var(--theme-accent)] hover:opacity-90 rounded-lg';

  const collapseButton = (
    <button type="button" onClick={onToggle} title="Collapse" className="text-slate-400 hover:text-slate-600 shrink-0">
      <i className="fa-solid fa-chevron-right text-xs" />
    </button>
  );

  if (!open) {
    return (
      <div className="w-8 shrink-0 border-l border-slate-200 bg-slate-50 flex flex-col items-center pt-3">
        <button
          type="button"
          onClick={onToggle}
          title="Expand Config Panel"
          className="text-slate-400 hover:text-[var(--theme-accent)]"
        >
          <i className="fa-solid fa-chevron-left text-xs" />
        </button>
      </div>
    );
  }

  if (!selectedNodeId) {
    return (
      <div className={panelClass}>
        <div className="flex items-center justify-end mb-3">{collapseButton}</div>
        <p className="text-xs text-slate-400 text-center italic">Click a node on the canvas to configure it.</p>
      </div>
    );
  }

  if (selectedNodeId === 'trigger') {
    return (
      <div className={panelClass}>
        <div className="flex items-center justify-between mb-3">
          <p className={`${headerClass} mb-0`}>Trigger Settings</p>
          {collapseButton}
        </div>
        <div className="space-y-2">
          <div>
            <label className="block text-[11px] font-medium text-slate-500 mb-1">Category</label>
            <select value={triggerType} onChange={(e) => onTriggerTypeChange(e.target.value as TriggerType)} className={inputClass}>
              {(Object.keys(TRIGGER_TYPE_LABELS) as TriggerType[]).map((t) => (
                <option key={t} value={t}>
                  {TRIGGER_TYPE_LABELS[t]}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-[11px] font-medium text-slate-500 mb-1">Field</label>
            <select value={trigger.field} onChange={(e) => onTriggerFieldChange(e.target.value)} className={inputClass}>
              <option value="">Choose a field...</option>
              {renderFieldOptions(TRIGGER_FIELDS[triggerType])}
            </select>
          </div>
          {trigger.field && (
            <div className="flex gap-2">
              <div className="w-24">
                <label className="block text-[11px] font-medium text-slate-500 mb-1">Operator</label>
                <select
                  value={trigger.operator}
                  onChange={(e) => onTriggerOperatorChange(e.target.value as ConditionOperator)}
                  className={inputClass}
                >
                  {OPERATORS_BY_KIND[fieldDef(triggerType, trigger.field)?.kind ?? 'text'].map((op) => (
                    <option key={op.value} value={op.value}>
                      {op.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex-1">
                <label className="block text-[11px] font-medium text-slate-500 mb-1">Value</label>
                <ValueInput
                  triggerType={triggerType}
                  field={trigger.field}
                  value={trigger.value}
                  onChange={onTriggerValueChange}
                  tags={tags}
                  pipelines={pipelines}
                  stages={stages}
                  stagePipelineId={stagePipelineId}
                  onStagePipelineChange={onStagePipelineChange}
                />
              </div>
            </div>
          )}
        </div>
        <button type="button" onClick={onClose} className={doneButtonClass}>
          Done
        </button>
      </div>
    );
  }

  if (selectedNodeId === 'condition') {
    return (
      <div className={panelClass}>
        <div className="flex items-center justify-between mb-3">
          <p className={`${headerClass} mb-0`}>Condition Settings</p>
          <div className="flex items-center gap-2.5">
            <button type="button" onClick={onRemoveCondition} className="text-slate-400 hover:text-rose-600" title="Remove condition">
              <i className="fa-solid fa-trash text-xs" />
            </button>
            {collapseButton}
          </div>
        </div>
        <div className="space-y-2">
          <select value={condition.field} onChange={(e) => onConditionFieldChange(e.target.value)} className={inputClass}>
            <option value="">Choose a field...</option>
            {renderFieldOptions(TRIGGER_FIELDS[triggerType])}
          </select>
          {condition.field && (
            <div className="flex gap-2">
              <div className="w-24">
                <select
                  value={condition.operator}
                  onChange={(e) => onConditionOperatorChange(e.target.value as ConditionOperator)}
                  className={inputClass}
                >
                  {OPERATORS_BY_KIND[fieldDef(triggerType, condition.field)?.kind ?? 'text'].map((op) => (
                    <option key={op.value} value={op.value}>
                      {op.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex-1">
                <ValueInput
                  triggerType={triggerType}
                  field={condition.field}
                  value={condition.value}
                  onChange={onConditionValueChange}
                  tags={tags}
                  pipelines={pipelines}
                  stages={stages}
                  stagePipelineId={stagePipelineId}
                  onStagePipelineChange={onStagePipelineChange}
                />
              </div>
            </div>
          )}
        </div>
        <button type="button" onClick={onClose} className={doneButtonClass}>
          Done
        </button>
      </div>
    );
  }

  if (selectedNodeId.startsWith('branch-')) {
    return (
      <div className={panelClass}>
        <div className="flex items-center justify-end mb-3">{collapseButton}</div>
        <p className="text-xs text-slate-400 text-center italic">
          This branch has no steps yet — pick a type from the Node Library on the left to add one here.
        </p>
      </div>
    );
  }

  const index = Number(selectedNodeId.slice('action-'.length));
  const action = actions[index];
  if (!action) return <div className={panelClass} />;
  const meta = ACTION_TYPE_META[action.action_type];

  return (
    <div className={panelClass}>
      <div className="flex items-center justify-between mb-3">
        <p className={`${headerClass} mb-0`}>{meta.label} Settings</p>
        <div className="flex items-center gap-2.5">
          <button type="button" onClick={() => onActionRemove(index)} className="text-slate-400 hover:text-rose-600" title="Remove step">
            <i className="fa-solid fa-trash text-xs" />
          </button>
          {collapseButton}
        </div>
      </div>
      {meta.comingSoon && (
        <p className="mb-2 px-2 py-1 text-[10px] font-semibold rounded-full bg-amber-100 text-amber-700 inline-block">
          Coming soon — not yet executed
        </p>
      )}
      <ActionCard
        action={action}
        triggerType={triggerType}
        tags={tags}
        channels={channels}
        users={users}
        pipelines={pipelines}
        allStages={allStages}
        onChange={(patch) => onActionChange(index, patch)}
        onFieldFocus={onFieldFocus}
      />
      {actionHasTextFields(action.action_type) && (
        <div className="mt-2">
          <button
            type="button"
            onClick={onToggleFieldPicker}
            disabled={!activeFieldKey}
            title={!activeFieldKey ? 'Click into a field above first' : undefined}
            className="text-xs font-semibold text-[var(--theme-accent)] hover:underline disabled:opacity-40 disabled:no-underline"
          >
            <i className="fa-solid fa-plus mr-1" />
            Insert Field
          </button>
          {fieldPickerOpen && (
            <FieldPickerDropdown
              proposalTemplates={proposalTemplates}
              contractTemplates={contractTemplates}
              emailTemplates={emailTemplates}
              onInsert={onInsertField}
            />
          )}
        </div>
      )}
      <button type="button" onClick={onClose} className={doneButtonClass}>
        Save
      </button>
    </div>
  );
}
