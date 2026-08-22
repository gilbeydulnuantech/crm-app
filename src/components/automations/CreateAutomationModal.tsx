import { useEffect, useState } from 'react';
import {
  Automation,
  ActionType,
  Branch,
  ConditionNode,
  ConditionOperator,
  TriggerType,
  SaveAutomationPayload,
  TestAutomationPayload,
  TestAutomationResult,
} from '../../api/automations';
import { useSaveAutomation, useTestAutomation } from '../../hooks/useAutomations';
import { useTags } from '../../hooks/useContacts';
import { usePipelines, useStages, useAllStages } from '../../hooks/useOpportunities';
import { useProposalTemplates } from '../../hooks/useProposalTemplates';
import { useContractTemplates } from '../../hooks/useContractTemplates';
import { useEmailTemplates } from '../../hooks/useEmailTemplates';
import { ProposalTemplate } from '../../api/proposalTemplates';
import { ContractTemplate } from '../../api/contractTemplates';
import { EmailTemplate } from '../../api/emailTemplates';
import { LEAD_STATUS_OPTIONS } from '../../types/contact';
import { COMPANY_STATUSES, COMPANY_REVENUE_BANDS, COMPANY_EMPLOYEE_BANDS } from '../../types/company';
import { EVENT_TYPES, EVENT_TYPE_META } from '../../types/event';
import DynamicFieldDropdown, { insertAtCursor } from '../DynamicFieldDropdown';

interface Props {
  automation: Automation | 'new' | null;
  onClose: () => void;
}

const inputClass =
  'w-full px-2.5 py-1.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--theme-accent)]';

type FieldKind = 'select' | 'text' | 'date' | 'number' | 'boolean';

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
    { key: 'birthdate', label: 'Birthdate', kind: 'date' },
    { key: 'age', label: 'Age', kind: 'number' },
    { key: 'location', label: 'Location', kind: 'text' },
  ],
  company: [
    { key: 'account_status', label: 'Status', kind: 'select', options: COMPANY_STATUSES },
    { key: 'tags', label: 'Tags', kind: 'select' },
    { key: 'location', label: 'Location', kind: 'text' },
    { key: 'annual_revenue', label: 'Annual Revenue', kind: 'select', options: COMPANY_REVENUE_BANDS },
    { key: 'employee_count', label: 'Employee Number', kind: 'select', options: COMPANY_EMPLOYEE_BANDS },
  ],
  task: [
    { key: 'is_completed', label: 'Complete', kind: 'boolean' },
    { key: 'overdue', label: 'Overdue', kind: 'boolean' },
  ],
  calendar: [
    { key: 'type', label: 'Type', kind: 'select', options: EVENT_TYPES },
    { key: 'due_at', label: 'Due Date', kind: 'date' },
  ],
  pipeline: [
    { key: 'pipeline_id', label: 'Pipeline', kind: 'select' },
    { key: 'stage_id', label: 'Stage', kind: 'select' },
  ],
};

const TRIGGER_TYPE_LABELS: Record<TriggerType, string> = {
  contact: 'Contact',
  company: 'Company',
  task: 'Task',
  calendar: 'Calendar',
  pipeline: 'Pipeline',
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

const ACTION_TYPE_META: Record<ActionType, { label: string; comingSoon?: boolean }> = {
  add_tag: { label: 'Add tag' },
  send_email: { label: 'Send email' },
  send_team_notification: { label: 'Send team notification', comingSoon: true },
  send_sms: { label: 'Send SMS', comingSoon: true },
};

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

export default function CreateAutomationModal({ automation, onClose }: Props) {
  const saveAutomation = useSaveAutomation();
  const testAutomation = useTestAutomation();
  const { data: tags = [] } = useTags();
  const { data: pipelines = [] } = usePipelines();
  const { data: proposalTemplates = [] } = useProposalTemplates();
  const { data: contractTemplates = [] } = useContractTemplates();
  const { data: emailTemplates = [] } = useEmailTemplates();

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
    if (!automation) return;
    if (automation === 'new') {
      setName('');
      setTriggerType('contact');
      setTrigger(EMPTY_CONDITION);
      setStagePipelineId('');
      setHasIfElse(false);
      setCondition(EMPTY_CONDITION);
      setActions([]);
    } else {
      setName(automation.name);
      setTriggerType(automation.trigger_type);
      setTrigger(automation.trigger_config);
      setStagePipelineId('');
      setHasIfElse(!!automation.condition_tree);
      setCondition(automation.condition_tree ?? EMPTY_CONDITION);
      setActions(
        automation.actions
          .slice()
          .sort((a, b) => a.sort_order - b.sort_order)
          .map((a) => ({
            branch: a.branch,
            action_type: a.action_type,
            action_config: a.action_config,
            sort_order: a.sort_order,
          }))
      );
    }
    setError(null);
    setTestResult(null);
    setTestEmail('');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [automation === 'new' ? 'new' : automation?.id]);

  if (!automation) return null;
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

  function addAction(branch: Branch) {
    setActions((prev) => [
      ...prev,
      { branch, action_type: availableActionTypes[0], action_config: {}, sort_order: prev.length },
    ]);
  }

  function updateAction(index: number, patch: Partial<ActionDraft>) {
    setActions((prev) => prev.map((a, i) => (i === index ? { ...a, ...patch } : a)));
  }

  function removeAction(index: number) {
    setActions((prev) => prev.filter((_, i) => i !== index));
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
      onSuccess: () => onClose(),
      onError: (err) => setError(err instanceof Error ? err.message : 'Failed to save.'),
    });
  }

  const branches: Branch[] = hasIfElse ? ['true', 'false'] : ['default'];

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[120] flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-3 px-6 pt-6 pb-3 border-b border-slate-100 shrink-0">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <h3 className="text-lg font-bold text-slate-800 shrink-0">
              {automation === 'new' ? 'New Automation' : 'Edit Automation'}
            </h3>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Automation name"
              className={`${inputClass} max-w-xs`}
            />
          </div>
          <div className="flex items-center gap-2 shrink-0">
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
            <button onClick={onClose} className="text-slate-400 hover:text-slate-600 ml-1">
              <i className="fa-solid fa-xmark" />
            </button>
          </div>
        </div>

        <div className="px-6 py-4 space-y-4 overflow-y-auto">
          {error && <p className="text-xs text-rose-600 bg-rose-50 border border-rose-200 rounded-md px-2 py-1">{error}</p>}
          {testResult && (
            <p
              className={`text-xs rounded-md px-2 py-1 border ${
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

          {/* Trigger */}
          <div className="border border-slate-200 rounded-xl p-3">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Trigger</p>
            <div className="flex flex-wrap gap-2 items-end">
              <div className="w-32">
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
              <div className="w-40">
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
                <>
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
                  <div className="w-44">
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
                </>
              )}
            </div>
          </div>

          {/* If/Else */}
          {!hasIfElse ? (
            <button
              type="button"
              disabled={!triggerConfigured}
              onClick={() => {
                setHasIfElse(true);
                setCondition(EMPTY_CONDITION);
              }}
              className="px-3 py-1.5 text-sm font-medium border border-dashed border-slate-300 hover:bg-slate-50 text-slate-600 rounded-lg disabled:opacity-40"
            >
              + Add If/Else
            </button>
          ) : (
            <div className="border border-slate-200 rounded-xl p-3">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">If/Else</p>
                <button
                  type="button"
                  onClick={() => {
                    setHasIfElse(false);
                    setActions((prev) => prev.map((a) => ({ ...a, branch: 'default' })));
                  }}
                  className="text-xs text-slate-400 hover:text-rose-600"
                >
                  Remove
                </button>
              </div>
              <div className="flex flex-wrap gap-2 items-end">
                <div className="w-40">
                  <label className="block text-[11px] font-medium text-slate-500 mb-1">Field</label>
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
                </div>
                {condition.field && (
                  <>
                    <div className="w-28">
                      <label className="block text-[11px] font-medium text-slate-500 mb-1">Operator</label>
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
                    <div className="w-44">
                      <label className="block text-[11px] font-medium text-slate-500 mb-1">Value</label>
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
                  </>
                )}
              </div>
            </div>
          )}

          {/* Actions */}
          {branches.map((branch) => (
            <div key={branch} className="border border-slate-200 rounded-xl p-3">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
                {hasIfElse ? `If ${branch === 'true' ? 'True' : 'False'}` : 'Actions'}
              </p>
              <div className="space-y-2">
                {actions
                  .map((a, i) => ({ a, i }))
                  .filter(({ a }) => a.branch === branch)
                  .map(({ a, i }) => (
                    <ActionCard
                      key={i}
                      action={a}
                      availableActionTypes={availableActionTypes}
                      tags={tags}
                      proposalTemplates={proposalTemplates}
                      contractTemplates={contractTemplates}
                      emailTemplates={emailTemplates}
                      onChange={(patch) => updateAction(i, patch)}
                      onRemove={() => removeAction(i)}
                    />
                  ))}
              </div>
              <button
                type="button"
                disabled={!triggerConfigured}
                onClick={() => addAction(branch)}
                className="mt-2 px-3 py-1.5 text-sm font-medium border border-dashed border-slate-300 hover:bg-slate-50 text-slate-600 rounded-lg disabled:opacity-40"
              >
                + Add Action
              </button>
            </div>
          ))}
        </div>
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
  availableActionTypes,
  tags,
  proposalTemplates,
  contractTemplates,
  emailTemplates,
  onChange,
  onRemove,
}: {
  action: ActionDraft;
  availableActionTypes: ActionType[];
  tags: { id: number; name: string }[];
  proposalTemplates: ProposalTemplate[];
  contractTemplates: ContractTemplate[];
  emailTemplates: EmailTemplate[];
  onChange: (patch: Partial<ActionDraft>) => void;
  onRemove: () => void;
}) {
  const meta = ACTION_TYPE_META[action.action_type];

  return (
    <div className="border border-slate-100 bg-slate-50 rounded-lg p-2.5">
      <div className="flex items-center gap-2 mb-2">
        <select
          value={action.action_type}
          onChange={(e) => onChange({ action_type: e.target.value as ActionType, action_config: {} })}
          className={`${inputClass} w-52`}
        >
          {availableActionTypes.map((t) => (
            <option key={t} value={t}>
              {ACTION_TYPE_META[t].label}
            </option>
          ))}
        </select>
        {meta.comingSoon && (
          <span className="px-1.5 py-0.5 text-[10px] font-semibold rounded-full bg-amber-100 text-amber-700">
            Coming soon — not yet executed
          </span>
        )}
        <button type="button" onClick={onRemove} className="ml-auto text-slate-400 hover:text-rose-600">
          <i className="fa-solid fa-xmark text-xs" />
        </button>
      </div>

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
            placeholder="Subject"
            className={inputClass}
          />
          <div className="flex items-center justify-end gap-2">
            <DocumentPicker
              proposalTemplates={proposalTemplates}
              contractTemplates={contractTemplates}
              emailTemplates={emailTemplates}
              onInsert={(text) =>
                insertAtCursor(null, String(action.action_config.body || ''), text, (v) =>
                  onChange({ action_config: { ...action.action_config, body: v } })
                )
              }
            />
            <DynamicFieldDropdown
              onInsert={(token) =>
                insertAtCursor(null, String(action.action_config.body || ''), token, (v) =>
                  onChange({ action_config: { ...action.action_config, body: v } })
                )
              }
            />
          </div>
          <textarea
            value={String(action.action_config.body || '')}
            onChange={(e) => onChange({ action_config: { ...action.action_config, body: e.target.value } })}
            rows={3}
            placeholder="Email body"
            className={inputClass}
          />
        </div>
      )}

      {(action.action_type === 'send_team_notification' || action.action_type === 'send_sms') && (
        <textarea
          value={String(action.action_config.message || '')}
          onChange={(e) => onChange({ action_config: { message: e.target.value } })}
          rows={2}
          placeholder="Message"
          className={inputClass}
        />
      )}
    </div>
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
    <div className="flex items-center gap-1.5">
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
