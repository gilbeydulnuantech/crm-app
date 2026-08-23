import { ReactNode, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
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

function defaultOperatorFor(kind: FieldKind): ConditionOperator {
  return OPERATORS_BY_KIND[kind][0].value;
}

// Full-page automation builder — same "when this happens → do this"
// two-column shape used by GHL/HubSpot/Zoho, and the same full-page
// pattern as the Proposal/Contract editors (AppLayout hides the main nav
// on this route for maximum width, see NO_SIDEBAR_PATTERN).
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
  // Tracks which action's which text field was last focused, so the
  // right-hand Dynamic Fields/Documents panel knows where to insert —
  // available to every action's text field, not just Send Email's body.
  const [activeField, setActiveField] = useState<{ index: number; key: 'subject' | 'body' | 'message' } | null>(null);

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

  // The "Add a step" dropdown mixes one virtual, UI-only entry ("If/Else
  // Condition") in with the real ActionType options — picking it doesn't
  // add an action at all, it flips on the existing condition_tree UI below
  // (only offered once, since this data model supports a single if/else,
  // not an arbitrary step sequence).
  function handleAddStep(branch: Branch, value: string) {
    if (!value) return;
    if (value === '__condition__') {
      setHasIfElse(true);
      setCondition(EMPTY_CONDITION);
      return;
    }
    addAction(branch, value as ActionType);
  }

  function updateAction(index: number, patch: Partial<ActionDraft>) {
    setActions((prev) => prev.map((a, i) => (i === index ? { ...a, ...patch } : a)));
  }

  function removeAction(index: number) {
    setActions((prev) => prev.filter((_, i) => i !== index));
    setActiveField((f) => (f?.index === index ? null : f));
  }

  // Appends a token/document to whichever field was last focused — the
  // side panel is available to any action's text field, not just Send
  // Email's body, so insertion has to go through this shared tracked
  // target instead of each field owning its own inline picker.
  function insertIntoActiveField(text: string) {
    if (!activeField) return;
    const action = actions[activeField.index];
    if (!action) return;
    const key = activeField.key;
    const current = String(action.action_config[key] || '');
    updateAction(activeField.index, { action_config: { ...action.action_config, [key]: current + text } });
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

      {/* Body: a vertical flow (left) — Trigger node, arrow down, then
          whatever step was chosen from the dropdown appears as its own
          connected node below, GHL-canvas style. Picking "Condition" forks
          the flow into True/False branches, each its own connected column
          that keeps growing downward as more steps are added. A persistent
          Dynamic Fields / Documents panel (right) inserts into whichever
          action field was last focused — available to any action, not
          just Send Email. */}
      <div className="flex-1 flex overflow-hidden">
        <div className="flex-1 overflow-y-auto p-6">
          <div className="max-w-2xl mx-auto flex flex-col items-center">
            {/* Trigger node */}
          <FlowNode icon="fa-bolt" title="Trigger" className="w-full">
            <div className="space-y-2">
              <div>
                <label className="block text-[11px] font-medium text-slate-500 mb-1">Category</label>
                <select
                  value={triggerType}
                  onChange={(e) => handleTriggerTypeChange(e.target.value as TriggerType)}
                  className={inputClass}
                >
                  {(Object.keys(TRIGGER_TYPE_LABELS) as TriggerType[]).map((t) => (
                    <option key={t} value={t}>
                      {TRIGGER_TYPE_LABELS[t]}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-medium text-slate-500 mb-1">Field</label>
                <select
                  value={trigger.field}
                  onChange={(e) => {
                    updateConditionField(trigger, setTrigger, e.target.value);
                    setStagePipelineId('');
                  }}
                  className={inputClass}
                >
                  <option value="">Choose a field...</option>
                  {TRIGGER_FIELDS[triggerType].map((f) => (
                    <option key={f.key} value={f.key}>
                      {f.label}
                    </option>
                  ))}
                </select>
              </div>
              {trigger.field && (
                <div className="flex gap-2">
                  <div className="w-28">
                    <label className="block text-[11px] font-medium text-slate-500 mb-1">Operator</label>
                    <select
                      value={trigger.operator}
                      onChange={(e) => setTrigger({ ...trigger, operator: e.target.value as ConditionOperator })}
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
                      onChange={(v) => setTrigger({ ...trigger, value: v })}
                      tags={tags}
                      pipelines={pipelines}
                      stages={stages}
                      stagePipelineId={stagePipelineId}
                      onStagePipelineChange={setStagePipelineId}
                    />
                  </div>
                </div>
              )}
            </div>
          </FlowNode>

          <FlowArrow />

          {!hasIfElse ? (
            <div className="w-full flex flex-col items-center">
              {actions
                .map((a, i) => ({ a, i }))
                .filter(({ a }) => a.branch === 'default')
                .map(({ a, i }) => (
                  <div key={i} className="w-full flex flex-col items-center">
                    <FlowNode
                      icon={ACTION_TYPE_META[a.action_type].icon}
                      title={ACTION_TYPE_META[a.action_type].label}
                      className="w-full"
                      right={<ActionNodeExtras meta={ACTION_TYPE_META[a.action_type]} onRemove={() => removeAction(i)} />}
                    >
                      <ActionCard
                        action={a}
                        triggerType={triggerType}
                        tags={tags}
                        channels={channels}
                        users={users}
                        pipelines={pipelines}
                        allStages={allStages}
                        onChange={(patch) => updateAction(i, patch)}
                        onFieldFocus={(key) => setActiveField({ index: i, key })}
                      />
                    </FlowNode>
                    <FlowArrow />
                  </div>
                ))}
              <AddStepSelect
                disabled={!triggerConfigured}
                availableActionTypes={availableActionTypes}
                allowCondition
                onSelect={(v) => handleAddStep('default', v)}
              />
            </div>
          ) : (
            <div className="w-full flex flex-col items-center">
              <FlowNode
                icon="fa-code-branch"
                title="Condition"
                className="w-full"
                right={
                  <button
                    type="button"
                    onClick={() => {
                      setHasIfElse(false);
                      setActions((prev) => prev.map((a) => ({ ...a, branch: 'default' })));
                    }}
                    className="text-slate-400 hover:text-rose-600"
                    title="Remove condition"
                  >
                    <i className="fa-solid fa-xmark text-xs" />
                  </button>
                }
              >
                <div className="space-y-2">
                  <select
                    value={condition.field}
                    onChange={(e) => updateConditionField(condition, setCondition, e.target.value)}
                    className={inputClass}
                  >
                    <option value="">Choose a field...</option>
                    {TRIGGER_FIELDS[triggerType].map((f) => (
                      <option key={f.key} value={f.key}>
                        {f.label}
                      </option>
                    ))}
                  </select>
                  {condition.field && (
                    <div className="flex gap-2">
                      <div className="w-28">
                        <select
                          value={condition.operator}
                          onChange={(e) => setCondition({ ...condition, operator: e.target.value as ConditionOperator })}
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
                          onChange={(v) => setCondition({ ...condition, value: v })}
                          tags={tags}
                          pipelines={pipelines}
                          stages={stages}
                          stagePipelineId={stagePipelineId}
                          onStagePipelineChange={setStagePipelineId}
                        />
                      </div>
                    </div>
                  )}
                </div>
              </FlowNode>

              <ForkConnector />

              <div className="w-full grid grid-cols-2 gap-6">
                {(['true', 'false'] as Branch[]).map((branch) => (
                  <div key={branch} className="flex flex-col items-center">
                    <span
                      className={`mb-2 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide rounded-full ${
                        branch === 'true' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
                      }`}
                    >
                      {branch === 'true' ? 'True' : 'False'}
                    </span>
                    {actions
                      .map((a, i) => ({ a, i }))
                      .filter(({ a }) => a.branch === branch)
                      .map(({ a, i }) => (
                        <div key={i} className="w-full flex flex-col items-center">
                          <FlowNode
                            icon={ACTION_TYPE_META[a.action_type].icon}
                            title={ACTION_TYPE_META[a.action_type].label}
                            className="w-full"
                            right={<ActionNodeExtras meta={ACTION_TYPE_META[a.action_type]} onRemove={() => removeAction(i)} />}
                          >
                            <ActionCard
                              action={a}
                              triggerType={triggerType}
                              tags={tags}
                              channels={channels}
                              users={users}
                              pipelines={pipelines}
                              allStages={allStages}
                              onChange={(patch) => updateAction(i, patch)}
                              onFieldFocus={(key) => setActiveField({ index: i, key })}
                            />
                          </FlowNode>
                          <FlowArrow />
                        </div>
                      ))}
                    <AddStepSelect
                      disabled={!triggerConfigured}
                      availableActionTypes={availableActionTypes}
                      onSelect={(v) => handleAddStep(branch, v)}
                    />
                  </div>
                ))}
              </div>
            </div>
            )}
          </div>
        </div>

        <DynamicFieldsPanel
          activeField={activeField}
          proposalTemplates={proposalTemplates}
          contractTemplates={contractTemplates}
          emailTemplates={emailTemplates}
          onInsert={insertIntoActiveField}
        />
      </div>
    </div>
  );
}

// A single connected node in the flow — a titled box with an icon header,
// used for both the Trigger and every Action/Condition step below it.
// `right` holds per-node header extras (a "coming soon" badge, a remove
// button) so individual step bodies (ActionCard) don't need their own
// duplicate header.
function FlowNode({
  icon,
  title,
  right,
  className = '',
  children,
}: {
  icon: string;
  title: string;
  right?: ReactNode;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={`border border-slate-200 rounded-xl p-3 bg-white shadow-sm ${className}`}>
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
          <i className={`fa-solid ${icon} mr-1.5 text-[var(--theme-accent)]`} />
          {title}
        </p>
        {right}
      </div>
      {children}
    </div>
  );
}

// The connecting line between two stacked nodes.
function FlowArrow() {
  return (
    <div className="flex flex-col items-center">
      <div className="w-0.5 h-4 bg-slate-300" />
      <i className="fa-solid fa-caret-down text-slate-300 text-lg -mt-2" />
    </div>
  );
}

// The branch split below a Condition node — one line down from the
// condition, forking left/right into the True/False columns.
function ForkConnector() {
  return (
    <div className="flex justify-center w-full">
      <svg viewBox="0 0 240 36" className="w-56 h-9 text-slate-300" preserveAspectRatio="xMidYMin meet">
        <line x1="120" y1="0" x2="120" y2="12" stroke="currentColor" strokeWidth="2" />
        <line x1="30" y1="12" x2="210" y2="12" stroke="currentColor" strokeWidth="2" />
        <line x1="30" y1="12" x2="30" y2="26" stroke="currentColor" strokeWidth="2" />
        <line x1="210" y1="12" x2="210" y2="26" stroke="currentColor" strokeWidth="2" />
        <polygon points="30,34 23,22 37,22" fill="currentColor" />
        <polygon points="210,34 203,22 217,22" fill="currentColor" />
      </svg>
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

// The single dropdown used to append a new step to a branch — mixes a
// "Condition" group (just the one If/Else virtual entry) in with the real
// action types, GHL/HubSpot-style, so branching reads as just another kind
// of step instead of a separate always-visible toggle. `allowCondition` is
// only passed on the top-level (non-branched) add button — once an if/else
// already exists, or a branch's own add-step select is being used, adding
// a second condition isn't supported by this data model.
function AddStepSelect({
  disabled,
  availableActionTypes,
  allowCondition,
  onSelect,
}: {
  disabled: boolean;
  availableActionTypes: ActionType[];
  allowCondition?: boolean;
  onSelect: (value: string) => void;
}) {
  return (
    <select
      value=""
      disabled={disabled}
      onChange={(e) => {
        if (e.target.value) onSelect(e.target.value);
        e.target.value = '';
      }}
      className="w-full px-3 py-1.5 text-sm font-medium border border-dashed border-slate-300 hover:bg-slate-50 text-slate-600 rounded-lg disabled:opacity-40 bg-white"
    >
      <option value="">+ Add a step...</option>
      {allowCondition && (
        <optgroup label="Condition">
          <option value="__condition__">If/Else Condition</option>
        </optgroup>
      )}
      <optgroup label="Action">
        {availableActionTypes.map((t) => (
          <option key={t} value={t}>
            {ACTION_TYPE_META[t].label}
          </option>
        ))}
      </optgroup>
    </select>
  );
}

// The "coming soon" badge + remove button for an action step, rendered in
// its FlowNode's header (`right` slot) rather than inside ActionCard, so
// the step's title isn't duplicated between the node header and the card.
function ActionNodeExtras({ meta, onRemove }: { meta: { label: string; comingSoon?: boolean }; onRemove: () => void }) {
  return (
    <div className="flex items-center gap-2">
      {meta.comingSoon && (
        <span className="px-1.5 py-0.5 text-[10px] font-semibold rounded-full bg-amber-100 text-amber-700">
          Coming soon — not yet executed
        </span>
      )}
      <button type="button" onClick={onRemove} className="text-slate-400 hover:text-rose-600">
        <i className="fa-solid fa-xmark text-xs" />
      </button>
    </div>
  );
}

// The type/dropdown that decides WHAT an action is lives one level up now
// (AddStepSelect, chosen at creation) — this card just configures the type
// it was created with; the title/remove/coming-soon badge live in the
// wrapping FlowNode's header (ActionNodeExtras) instead of duplicating
// here. Changing type after the fact means removing the step and adding a
// new one, same as GHL/HubSpot's builders (a step's icon/type isn't
// editable in place either).
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
            rows={3}
            placeholder="Email body — use the Dynamic Fields / Documents panel on the right to insert tokens here"
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
            rows={2}
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
          rows={2}
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

// Persistent right-hand panel — Dynamic Fields and Documents, available to
// ANY action's text field, not just Send Email's body. Clicking a field or
// document appends it to whichever field was last focused (activeField),
// tracked by the parent; there's no per-field inline picker anymore.
function DynamicFieldsPanel({
  activeField,
  proposalTemplates,
  contractTemplates,
  emailTemplates,
  onInsert,
}: {
  activeField: { index: number; key: 'subject' | 'body' | 'message' } | null;
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
    <div className="w-64 shrink-0 border-l border-slate-200 bg-slate-50 overflow-y-auto p-4">
      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Insert Into</p>
      <p className={`text-xs mb-4 ${activeField ? 'text-emerald-700' : 'text-slate-400 italic'}`}>
        {activeField ? 'Click a field or document below to insert it here.' : 'Click into a Subject, Body, or Message field first.'}
      </p>

      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Documents</p>
      <div className="mb-4">
        <DocumentPicker
          proposalTemplates={proposalTemplates}
          contractTemplates={contractTemplates}
          emailTemplates={emailTemplates}
          onInsert={onInsert}
        />
      </div>

      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Dynamic Fields</p>
      <div className="space-y-3">
        {Object.entries(groups).map(([group, fields]) => (
          <div key={group}>
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-1">{group}</p>
            <div className="space-y-0.5">
              {fields.map((f) => (
                <button
                  key={f.token}
                  type="button"
                  onClick={() => onInsert(f.token)}
                  className="w-full text-left px-2 py-1 text-xs text-slate-600 hover:bg-white hover:text-[var(--theme-accent)] rounded-md"
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
