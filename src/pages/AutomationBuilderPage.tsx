import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ReactFlow, Background, Controls, Handle, Position, MarkerType } from '@xyflow/react';
import type { Node as FlowNode, Edge, NodeProps } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { ConditionNode, SaveAutomationPayload, TestAutomationPayload, TestAutomationResult } from '../api/automations';
import { useAutomations, useSaveAutomationRule, useTestAutomationRule } from '../hooks/useAutomations';
import { useTags, useUsers } from '../hooks/useContacts';
import { useEmailTemplates } from '../hooks/useEmailTemplates';
import { useConversations } from '../hooks/useChat';
import { useAllStages, usePipelines, useStages } from '../hooks/useOpportunities';
import DynamicFieldDropdown, { AUTOMATION_DYNAMIC_FIELDS } from '../components/DynamicFieldDropdown';
import {
  ACTION_TYPE_META,
  ACTION_TYPES_BY_TRIGGER,
  ActionStepDraft,
  ConditionStepDraft,
  CreatableTriggerType,
  OPERATORS_BY_KIND,
  StepDraft,
  SupportedActionType,
  TRIGGER_FIELDS,
  TRIGGER_TYPE_LABELS,
  UPDATE_FIELD_OPTIONS,
  UpdateFieldDef,
  actionSubtitle,
  buildStepTree,
  defaultOperatorFor,
  fieldDef,
  flattenSteps,
} from '../utils/automationFields';

const inputClass =
  'w-full px-2.5 py-1.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--theme-accent)]';
const labelClass = 'block text-xs font-semibold text-slate-500 mb-1';

const EMPTY_CONDITION: ConditionNode = { field: '', operator: 'equals', value: '' };

// Trigger/condition value editor — same field catalog serves both, since
// they're evaluated by the identical evalCondition()/getFieldValue() logic
// in the Automation Engine, just at different points (candidate filter vs.
// a branch split, which can now happen anywhere in the step tree).
function ConditionValueEditor({
  triggerType,
  node,
  stagePipelineId,
  onStagePipelineChange,
  onChange,
}: {
  triggerType: CreatableTriggerType;
  node: ConditionNode;
  stagePipelineId: string;
  onStagePipelineChange: (id: string) => void;
  onChange: (node: ConditionNode) => void;
}) {
  const { data: tags = [] } = useTags();
  const { data: pipelines = [] } = usePipelines();
  const { data: stages = [] } = useStages(stagePipelineId ? Number(stagePipelineId) : undefined);
  const def = fieldDef(triggerType, node.field);

  if (!def) return null;

  if (node.field === 'tags') {
    return (
      <select className={inputClass} value={String(node.value)} onChange={(e) => onChange({ ...node, value: e.target.value })}>
        <option value="">Select a tag...</option>
        {tags.map((t) => (
          <option key={t.id} value={t.name}>
            {t.name}
          </option>
        ))}
      </select>
    );
  }

  if (node.field === 'stage_id') {
    return (
      <div className="space-y-2">
        <select className={inputClass} value={stagePipelineId} onChange={(e) => onStagePipelineChange(e.target.value)}>
          <option value="">Choose pipeline...</option>
          {pipelines.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
        <select
          className={inputClass}
          value={String(node.value)}
          onChange={(e) => onChange({ ...node, value: Number(e.target.value) })}
          disabled={!stagePipelineId}
        >
          <option value="">Choose stage...</option>
          {stages.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
      </div>
    );
  }

  if (def.kind === 'boolean') return null; // operator alone (is true/is false) fully expresses this

  if (def.kind === 'select' && def.options) {
    return (
      <select className={inputClass} value={String(node.value)} onChange={(e) => onChange({ ...node, value: e.target.value })}>
        <option value="">Choose...</option>
        {def.options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    );
  }

  if (def.kind === 'number') {
    return (
      <input
        type="number"
        className={inputClass}
        value={String(node.value)}
        onChange={(e) => onChange({ ...node, value: e.target.value === '' ? '' : Number(e.target.value) })}
        placeholder="Value"
      />
    );
  }

  if (def.kind === 'date') {
    return (
      <input
        type="date"
        className={inputClass}
        value={String(node.value)}
        onChange={(e) => onChange({ ...node, value: e.target.value })}
      />
    );
  }

  return (
    <input
      type="text"
      className={inputClass}
      value={String(node.value)}
      onChange={(e) => onChange({ ...node, value: e.target.value })}
      placeholder="Value"
    />
  );
}

function UpdateFieldValueEditor({ def, value, onChange }: { def: UpdateFieldDef; value: unknown; onChange: (v: unknown) => void }) {
  const { data: users = [] } = useUsers();
  const { data: pipelines = [] } = usePipelines();
  const [stagePipelineId, setStagePipelineId] = useState('');
  const { data: stages = [] } = useStages(stagePipelineId ? Number(stagePipelineId) : undefined);
  const { data: allStages = [] } = useAllStages(pipelines.map((p) => p.id));

  // Same reverse-lookup as ConditionValueEditorScoped: a saved "update
  // field: Stage" action only stores the stage id, so resolve its pipeline
  // once loaded rather than leaving the Stage dropdown empty until the
  // admin re-picks Pipeline.
  useEffect(() => {
    if (def.valueKind !== 'stage' || stagePipelineId || value === '' || value === undefined || value === null) return;
    const found = allStages.find((s) => s.id === Number(value));
    if (found) setStagePipelineId(String(found.pipeline_id));
  }, [def.valueKind, value, allStages, stagePipelineId]);

  if (def.valueKind === 'user') {
    return (
      <select className={inputClass} value={String(value ?? '')} onChange={(e) => onChange(Number(e.target.value))}>
        <option value="">Choose a rep...</option>
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
      <div className="space-y-2">
        <select className={inputClass} value={stagePipelineId} onChange={(e) => setStagePipelineId(e.target.value)}>
          <option value="">Choose pipeline...</option>
          {pipelines.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
        <select
          className={inputClass}
          value={String(value ?? '')}
          onChange={(e) => onChange(Number(e.target.value))}
          disabled={!stagePipelineId}
        >
          <option value="">Choose stage...</option>
          {stages.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
      </div>
    );
  }
  if (def.valueKind === 'boolean') {
    return (
      <select className={inputClass} value={String(value ?? '')} onChange={(e) => onChange(e.target.value === 'true')}>
        <option value="">Choose...</option>
        <option value="true">Yes</option>
        <option value="false">No</option>
      </select>
    );
  }
  if (def.valueKind === 'select' && def.options) {
    return (
      <select className={inputClass} value={String(value ?? '')} onChange={(e) => onChange(e.target.value)}>
        <option value="">Choose...</option>
        {def.options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    );
  }
  return <input type="text" className={inputClass} value={String(value ?? '')} onChange={(e) => onChange(e.target.value)} />;
}

function ActionConfigForm({
  triggerType,
  step,
  onChange,
}: {
  triggerType: CreatableTriggerType;
  step: ActionStepDraft;
  onChange: (config: Record<string, unknown>) => void;
}) {
  const { data: tags = [] } = useTags();
  const { data: emailTemplates = [] } = useEmailTemplates();
  const { data: conversations = [] } = useConversations();
  const cfg = step.actionConfig;

  if (step.actionType === 'add_tag' || step.actionType === 'remove_tag') {
    return (
      <div>
        <label className={labelClass}>Tag</label>
        <input
          list="automation-tag-options"
          className={inputClass}
          value={String(cfg.tag_name ?? '')}
          onChange={(e) => onChange({ ...cfg, tag_name: e.target.value })}
          placeholder="Type a tag name..."
        />
        <datalist id="automation-tag-options">
          {tags.map((t) => (
            <option key={t.id} value={t.name} />
          ))}
        </datalist>
      </div>
    );
  }

  if (step.actionType === 'send_email') {
    return (
      <div className="space-y-2">
        <div>
          <label className={labelClass}>Use a template (optional)</label>
          <select
            className={inputClass}
            value=""
            onChange={(e) => {
              const tmpl = emailTemplates.find((t) => String(t.id) === e.target.value);
              if (tmpl) onChange({ ...cfg, subject: tmpl.subject, body: tmpl.body });
              e.target.value = '';
            }}
          >
            <option value="">Choose a template to fill subject/body...</option>
            {emailTemplates.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
          <p className="text-[11px] text-slate-400 mt-1">Copies the template's subject/body in — you can still edit them below.</p>
        </div>
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className={labelClass}>Subject</label>
            <DynamicFieldDropdown fields={AUTOMATION_DYNAMIC_FIELDS} mode="popover" onInsert={(t) => onChange({ ...cfg, subject: `${cfg.subject ?? ''}${t}` })} />
          </div>
          <input
            type="text"
            className={inputClass}
            value={String(cfg.subject ?? '')}
            onChange={(e) => onChange({ ...cfg, subject: e.target.value })}
          />
        </div>
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className={labelClass}>Body</label>
            <DynamicFieldDropdown fields={AUTOMATION_DYNAMIC_FIELDS} mode="popover" onInsert={(t) => onChange({ ...cfg, body: `${cfg.body ?? ''}${t}` })} />
          </div>
          <textarea
            className={inputClass}
            rows={5}
            value={String(cfg.body ?? '')}
            onChange={(e) => onChange({ ...cfg, body: e.target.value })}
          />
        </div>
      </div>
    );
  }

  if (step.actionType === 'send_team_notification') {
    const channels = conversations.filter((c) => c.type === 'channel');
    return (
      <div className="space-y-2">
        <div>
          <label className={labelClass}>Team Chat channel</label>
          <select
            className={inputClass}
            value={String(cfg.channel_id ?? '')}
            onChange={(e) => onChange({ ...cfg, channel_id: e.target.value === '' ? '' : Number(e.target.value) })}
          >
            <option value="">Choose a channel...</option>
            {channels.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name || `Channel #${c.id}`}
              </option>
            ))}
          </select>
          {channels.length === 0 && <p className="text-[11px] text-slate-400 mt-1">No Team Chat channels found yet.</p>}
        </div>
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className={labelClass}>Message</label>
            <DynamicFieldDropdown fields={AUTOMATION_DYNAMIC_FIELDS} mode="popover" onInsert={(t) => onChange({ ...cfg, message: `${cfg.message ?? ''}${t}` })} />
          </div>
          <textarea
            className={inputClass}
            rows={3}
            value={String(cfg.message ?? '')}
            onChange={(e) => onChange({ ...cfg, message: e.target.value })}
          />
        </div>
      </div>
    );
  }

  if (step.actionType === 'wait') {
    return (
      <div className="flex gap-2">
        <input
          type="number"
          min={1}
          className={inputClass}
          value={String(cfg.amount ?? '')}
          onChange={(e) => onChange({ ...cfg, amount: e.target.value === '' ? '' : Number(e.target.value) })}
          placeholder="Amount"
        />
        <select className={inputClass} value={String(cfg.unit ?? 'days')} onChange={(e) => onChange({ ...cfg, unit: e.target.value })}>
          <option value="minutes">Minutes</option>
          <option value="hours">Hours</option>
          <option value="days">Days</option>
          <option value="months">Months</option>
        </select>
      </div>
    );
  }

  if (step.actionType === 'update_field') {
    const options = UPDATE_FIELD_OPTIONS[triggerType];
    const selected = options.find((o) => o.key === cfg.field);
    return (
      <div className="space-y-2">
        <div>
          <label className={labelClass}>Field</label>
          <select className={inputClass} value={String(cfg.field ?? '')} onChange={(e) => onChange({ field: e.target.value, value: '' })}>
            <option value="">Choose a field...</option>
            {options.map((o) => (
              <option key={o.key} value={o.key}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
        {selected && (
          <div>
            <label className={labelClass}>New value</label>
            <UpdateFieldValueEditor def={selected} value={cfg.value} onChange={(v) => onChange({ ...cfg, value: v })} />
          </div>
        )}
      </div>
    );
  }

  if (step.actionType === 'mark_closed_won') {
    return <p className="text-[11px] text-slate-400">Moves the deal to its own pipeline's "Closed Won" stage and sets its status to Won.</p>;
  }

  if (step.actionType === 'mark_closed_lost') {
    return (
      <div>
        <div className="flex items-center justify-between mb-1">
          <label className={labelClass}>Lost reason (optional)</label>
          <DynamicFieldDropdown
            fields={AUTOMATION_DYNAMIC_FIELDS}
            mode="popover"
            onInsert={(t) => onChange({ ...cfg, lost_reason: `${cfg.lost_reason ?? ''}${t}` })}
          />
        </div>
        <input
          type="text"
          className={inputClass}
          value={String(cfg.lost_reason ?? '')}
          onChange={(e) => onChange({ ...cfg, lost_reason: e.target.value })}
          placeholder="e.g. Price too high"
        />
        <p className="text-[11px] text-slate-400 mt-1">
          Moves the deal to its own pipeline's "Closed Lost" stage and sets its status to Lost. Resolved dynamic
          fields are truncated to 50 characters — keep this short.
        </p>
      </div>
    );
  }

  if (step.actionType === 'create_task') {
    return (
      <div className="space-y-2">
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className={labelClass}>Task subject</label>
            <DynamicFieldDropdown fields={AUTOMATION_DYNAMIC_FIELDS} mode="popover" onInsert={(t) => onChange({ ...cfg, subject: `${cfg.subject ?? ''}${t}` })} />
          </div>
          <input
            type="text"
            className={inputClass}
            value={String(cfg.subject ?? '')}
            onChange={(e) => onChange({ ...cfg, subject: e.target.value })}
            placeholder="e.g. Review lost deal: {{deal_name}}"
          />
        </div>
        <div>
          <label className={labelClass}>Priority</label>
          <select className={inputClass} value={String(cfg.priority ?? 'Low')} onChange={(e) => onChange({ ...cfg, priority: e.target.value })}>
            <option value="Low">Low</option>
            <option value="Medium">Medium</option>
            <option value="High">High</option>
          </select>
        </div>
        <p className="text-[11px] text-slate-400">Assigned to the record's owner, due immediately.</p>
      </div>
    );
  }

  if (step.actionType === 'send_dm') {
    return (
      <div>
        <div className="flex items-center justify-between mb-1">
          <label className={labelClass}>Message</label>
          <DynamicFieldDropdown fields={AUTOMATION_DYNAMIC_FIELDS} mode="popover" onInsert={(t) => onChange({ ...cfg, message: `${cfg.message ?? ''}${t}` })} />
        </div>
        <textarea
          className={inputClass}
          rows={3}
          value={String(cfg.message ?? '')}
          onChange={(e) => onChange({ ...cfg, message: e.target.value })}
        />
        <p className="text-[11px] text-slate-400 mt-1">Sent as a direct message to the record's owner in Team Chat.</p>
      </div>
    );
  }

  if (step.actionType === 'send_sms') {
    return (
      <div>
        <div className="flex items-center justify-between mb-1">
          <label className={labelClass}>Message</label>
          <DynamicFieldDropdown fields={AUTOMATION_DYNAMIC_FIELDS} mode="popover" onInsert={(t) => onChange({ ...cfg, message: `${cfg.message ?? ''}${t}` })} />
        </div>
        <textarea
          className={inputClass}
          rows={3}
          value={String(cfg.message ?? '')}
          onChange={(e) => onChange({ ...cfg, message: e.target.value })}
        />
        <p className="text-[11px] text-slate-400 mt-1">Skipped if the contact has no phone number or has opted out of SMS.</p>
      </div>
    );
  }

  return null;
}

// Recursive form editor — a sequence of steps, each either an action
// (existing config form) or a condition (its own field/operator/value,
// plus two nested StepSequenceEditors for its branches, which can each
// contain further actions AND further conditions, at any depth). This is
// what actually lets a condition go anywhere, not just once right after
// the trigger.
function StepSequenceEditor({
  triggerType,
  steps,
  onChange,
  nextStepKey,
  depth,
}: {
  triggerType: CreatableTriggerType;
  steps: StepDraft[];
  onChange: (steps: StepDraft[]) => void;
  nextStepKey: () => number;
  depth: number;
}) {
  const fields = TRIGGER_FIELDS[triggerType];

  function update(i: number, patch: Partial<StepDraft>) {
    onChange(steps.map((s, idx) => (idx === i ? ({ ...s, ...patch } as StepDraft) : s)));
  }
  function remove(i: number) {
    onChange(steps.filter((_, idx) => idx !== i));
  }
  function addAction() {
    onChange([...steps, { kind: 'action', stepKey: nextStepKey(), actionType: 'add_tag', actionConfig: {} }]);
  }
  function addCondition() {
    onChange([...steps, { kind: 'condition', stepKey: nextStepKey(), condition: EMPTY_CONDITION, trueSteps: [], falseSteps: [] }]);
  }

  return (
    <div className="space-y-2">
      {steps.map((step, i) =>
        step.kind === 'condition' ? (
          <div key={step.stepKey} className="border border-amber-200 rounded-lg p-2.5 bg-amber-50/50">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-bold text-amber-700 uppercase tracking-wide">Condition</span>
              <button
                type="button"
                onClick={() => remove(i)}
                className="shrink-0 w-6 h-6 flex items-center justify-center text-slate-400 hover:text-rose-600 hover:bg-rose-100 rounded-md"
                title="Remove condition"
              >
                <i className="fa-solid fa-xmark text-xs" />
              </button>
            </div>
            <div className="space-y-2 mb-3">
              <select
                className={inputClass}
                value={step.condition.field}
                onChange={(e) => {
                  const key = e.target.value;
                  const def = fieldDef(triggerType, key);
                  const kind = def?.kind ?? 'text';
                  update(i, { condition: { field: key, operator: defaultOperatorFor(kind), value: kind === 'boolean' ? true : '' } });
                }}
              >
                <option value="">Choose a field...</option>
                {fields.map((f) => (
                  <option key={f.key} value={f.key}>
                    {f.label}
                  </option>
                ))}
              </select>
              {step.condition.field && (
                <>
                  <select
                    className={inputClass}
                    value={step.condition.operator}
                    onChange={(e) => update(i, { condition: { ...step.condition, operator: e.target.value as ConditionNode['operator'] } })}
                  >
                    {OPERATORS_BY_KIND[fieldDef(triggerType, step.condition.field)?.kind ?? 'text'].map((op) => (
                      <option key={op.value} value={op.value}>
                        {op.label}
                      </option>
                    ))}
                  </select>
                  <ConditionValueEditorScoped
                    triggerType={triggerType}
                    node={step.condition}
                    onChange={(node) => update(i, { condition: node })}
                  />
                </>
              )}
            </div>

            <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-wide mb-1">If yes</p>
            <div className="mb-3 pl-2 border-l-2 border-emerald-200">
              <StepSequenceEditor
                triggerType={triggerType}
                steps={(step as ConditionStepDraft).trueSteps}
                onChange={(s) => update(i, { trueSteps: s })}
                nextStepKey={nextStepKey}
                depth={depth + 1}
              />
            </div>
            <p className="text-[10px] font-bold text-rose-600 uppercase tracking-wide mb-1">If no</p>
            <div className="pl-2 border-l-2 border-rose-200">
              <StepSequenceEditor
                triggerType={triggerType}
                steps={(step as ConditionStepDraft).falseSteps}
                onChange={(s) => update(i, { falseSteps: s })}
                nextStepKey={nextStepKey}
                depth={depth + 1}
              />
            </div>
          </div>
        ) : (
          <div key={step.stepKey} className="border border-slate-200 rounded-lg p-2.5 bg-slate-50">
            <div className="flex items-center gap-2 mb-2">
              <select
                className={`${inputClass} flex-1`}
                value={step.actionType}
                onChange={(e) => update(i, { actionType: e.target.value as SupportedActionType, actionConfig: {} })}
              >
                {ACTION_TYPES_BY_TRIGGER[triggerType].map((t) => (
                  <option key={t} value={t}>
                    {ACTION_TYPE_META[t].label}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => remove(i)}
                className="shrink-0 w-7 h-7 flex items-center justify-center text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md"
                title="Remove action"
              >
                <i className="fa-solid fa-xmark text-xs" />
              </button>
            </div>
            <ActionConfigForm triggerType={triggerType} step={step} onChange={(config) => update(i, { actionConfig: config })} />
          </div>
        )
      )}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={addAction}
          className="flex-1 text-xs font-semibold text-slate-500 border border-dashed border-slate-300 rounded-lg py-2 hover:bg-slate-50"
        >
          <i className="fa-solid fa-plus mr-1.5" />
          Add action
        </button>
        <button
          type="button"
          onClick={addCondition}
          className="flex-1 text-xs font-semibold text-amber-600 border border-dashed border-amber-300 rounded-lg py-2 hover:bg-amber-50"
        >
          <i className="fa-solid fa-code-branch mr-1.5" />
          Add condition
        </button>
      </div>
    </div>
  );
}

// Thin wrapper: the shared ConditionValueEditor also handles the
// pipeline/stage two-step picker, which needs its own local
// stagePipelineId — scoped per condition instance here rather than lifted
// to the whole page, since multiple conditions can exist anywhere in the
// tree now, each potentially filtering on a different pipeline.
function ConditionValueEditorScoped({
  triggerType,
  node,
  onChange,
}: {
  triggerType: CreatableTriggerType;
  node: ConditionNode;
  onChange: (node: ConditionNode) => void;
}) {
  const [stagePipelineId, setStagePipelineId] = useState('');
  const { data: pipelines = [] } = usePipelines();
  const { data: allStages = [] } = useAllStages(pipelines.map((p) => p.id));

  // Loading a saved condition that filters on stage_id only stores the
  // stage_id itself — resolve which pipeline that stage belongs to across
  // ALL pipelines so the Stage dropdown shows the saved value instead of
  // rendering empty until the admin re-picks Pipeline first (this is what
  // made a correctly-saved stage trigger/condition look like it "didn't
  // save").
  useEffect(() => {
    if (node.field !== 'stage_id' || stagePipelineId || node.value === '' || node.value === undefined) return;
    const found = allStages.find((s) => s.id === Number(node.value));
    if (found) setStagePipelineId(String(found.pipeline_id));
  }, [node.field, node.value, allStages, stagePipelineId]);

  return (
    <ConditionValueEditor
      triggerType={triggerType}
      node={node}
      stagePipelineId={stagePipelineId}
      onStagePipelineChange={setStagePipelineId}
      onChange={onChange}
    />
  );
}

type StepKind = 'trigger' | 'action' | 'condition';

const BADGE_STYLES: Record<StepKind, string> = {
  trigger: 'bg-blue-100 text-blue-700',
  action: 'bg-emerald-100 text-emerald-700',
  condition: 'bg-amber-100 text-amber-700',
};

const NODE_ACCENT: Record<StepKind, string> = {
  trigger: 'border-t-blue-500',
  action: 'border-t-emerald-500',
  condition: 'border-t-amber-500',
};

interface StepNodeData extends Record<string, unknown> {
  kind: StepKind;
  title: string;
  subtitle: string;
  hasTarget: boolean;
}

// Read-only React Flow node — the actual editing happens in the form
// panel on the right, so this only ever displays state, never accepts
// input (no connect handles are draggable, no drag/select is enabled on
// the ReactFlow instance itself below).
function StepFlowNode({ data }: NodeProps & { data: StepNodeData }) {
  return (
    <div className={`w-56 bg-white border border-slate-200 border-t-[3px] ${NODE_ACCENT[data.kind]} rounded-lg p-3 shadow-sm`}>
      {data.hasTarget && <Handle type="target" position={Position.Top} className="!bg-slate-300 !w-2 !h-2 !border-0" />}
      <div className="flex items-center justify-between gap-2 mb-1">
        <p className="text-sm font-bold text-slate-800 truncate">{data.title}</p>
        <span className={`shrink-0 text-[9px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded ${BADGE_STYLES[data.kind]}`}>
          {data.kind}
        </span>
      </div>
      <p className="text-xs text-slate-500 truncate">{data.subtitle}</p>
      <Handle type="source" position={Position.Bottom} className="!bg-slate-300 !w-2 !h-2 !border-0" />
    </div>
  );
}

// The condition node needs two independent, named source handles (one per
// branch) instead of the single bottom handle every other step uses.
function ConditionFlowNode({ data }: NodeProps & { data: StepNodeData }) {
  return (
    <div className="w-56 bg-white border border-slate-200 border-t-[3px] border-t-amber-500 rounded-lg p-3 shadow-sm relative">
      <Handle type="target" position={Position.Top} className="!bg-slate-300 !w-2 !h-2 !border-0" />
      <div className="flex items-center justify-between gap-2 mb-1">
        <p className="text-sm font-bold text-slate-800 truncate">{data.title}</p>
        <span className={`shrink-0 text-[9px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded ${BADGE_STYLES.condition}`}>condition</span>
      </div>
      <p className="text-xs text-slate-500 truncate">{data.subtitle}</p>
      <Handle type="source" position={Position.Bottom} id="true" style={{ left: '28%' }} className="!bg-emerald-400 !w-2 !h-2 !border-0" />
      <Handle type="source" position={Position.Bottom} id="false" style={{ left: '72%' }} className="!bg-rose-400 !w-2 !h-2 !border-0" />
    </div>
  );
}

const FLOW_NODE_TYPES = { step: StepFlowNode, condition: ConditionFlowNode };

const COL_MAIN = 480;
const ROW_HEIGHT = 130;
const MIN_SPREAD = 220;

function conditionLabel(triggerType: CreatableTriggerType, condition: ConditionNode): { title: string; subtitle: string } {
  return {
    title: condition.field ? fieldDef(triggerType, condition.field)?.label ?? condition.field : 'Condition not set',
    subtitle: condition.field ? `${condition.operator.replace('_', ' ')} ${String(condition.value)}` : 'Configure on the right',
  };
}

// Recursive layout: walks the step tree top-to-bottom, spreading a
// condition's two branches left/right of the trunk. A condition doesn't
// end the trunk — the Engine resumes with whatever comes AFTER it
// regardless of which branch fired (see Automation Engine.json's walk()),
// so the next sibling connects from the CONDITION node itself, styled
// distinctly (dashed slate, "then") from the solid trunk/branch edges.
function layoutSteps(
  steps: StepDraft[],
  triggerType: CreatableTriggerType,
  xCenter: number,
  yStart: number,
  spread: number,
  nodes: FlowNode[],
  edges: Edge[]
): { lastId: string | null; maxY: number } {
  let prevId: string | null = null;
  let prevWasCondition = false;
  let y = yStart;
  let maxY = yStart;

  function pushNode(id: string, kind: StepKind, title: string, subtitle: string, type: 'step' | 'condition') {
    nodes.push({ id, type, position: { x: xCenter - 112, y }, data: { kind, title, subtitle, hasTarget: true } satisfies StepNodeData, draggable: false, selectable: false, connectable: false });
  }
  function pushEdge(source: string, target: string, color: string, sourceHandle?: string, label?: string, dashed?: boolean) {
    edges.push({
      id: `e-${source}-${target}-${sourceHandle ?? ''}`,
      source,
      target,
      sourceHandle,
      label,
      markerEnd: { type: MarkerType.ArrowClosed, color },
      style: { stroke: color, strokeWidth: 2, strokeDasharray: dashed ? '5,5' : undefined },
      labelStyle: { fill: color, fontWeight: 700, fontSize: 10 },
      labelBgStyle: { fill: 'white' },
    });
  }

  for (const step of steps) {
    const id = `s${step.stepKey}`;
    if (step.kind === 'condition') {
      const { title, subtitle } = conditionLabel(triggerType, step.condition);
      pushNode(id, 'condition', title, subtitle, 'condition');
      if (prevId) pushEdge(prevId, id, prevWasCondition ? '#94a3b8' : '#cbd5e1', undefined, prevWasCondition ? 'then' : undefined, prevWasCondition);
      const childY = y + ROW_HEIGHT;
      const trueResult = layoutSteps(step.trueSteps, triggerType, xCenter - spread, childY, Math.max(spread / 1.7, MIN_SPREAD / 2), nodes, edges);
      const falseResult = layoutSteps(step.falseSteps, triggerType, xCenter + spread, childY, Math.max(spread / 1.7, MIN_SPREAD / 2), nodes, edges);
      if (step.trueSteps.length) pushEdge(id, `s${step.trueSteps[0].stepKey}`, '#10b981', 'true', 'Yes');
      if (step.falseSteps.length) pushEdge(id, `s${step.falseSteps[0].stepKey}`, '#f43f5e', 'false', 'No');
      maxY = Math.max(maxY, trueResult.maxY, falseResult.maxY, childY);
      y = maxY + ROW_HEIGHT;
      prevId = id; // next sibling resumes from the condition itself, not either branch's tail
      prevWasCondition = true;
      continue;
    }
    pushNode(id, 'action', ACTION_TYPE_META[step.actionType].label, actionSubtitle(step), 'step');
    if (prevId) {
      // A resume edge (from a condition straight to the step after it,
      // bypassing both branches) reads as "then, either way" — the Engine
      // really does run this next regardless of which branch fired (see
      // Automation Engine.json's walk()), so it's styled distinctly from a
      // normal sequential edge.
      pushEdge(prevId, id, prevWasCondition ? '#94a3b8' : '#cbd5e1', undefined, prevWasCondition ? 'then' : undefined, prevWasCondition);
    }
    prevId = id;
    prevWasCondition = false;
    y += ROW_HEIGHT;
    maxY = Math.max(maxY, y);
  }
  return { lastId: prevId, maxY };
}

function AutomationFlowPreview({
  triggerTitle,
  triggerSubtitle,
  triggerType,
  rootSteps,
}: {
  triggerTitle: string;
  triggerSubtitle: string;
  triggerType: CreatableTriggerType;
  rootSteps: StepDraft[];
}) {
  const { nodes, edges } = useMemo<{ nodes: FlowNode[]; edges: Edge[] }>(() => {
    const nodes: FlowNode[] = [];
    const edges: Edge[] = [];
    nodes.push({
      id: 'trigger',
      type: 'step',
      position: { x: COL_MAIN - 112, y: 0 },
      data: { kind: 'trigger', title: triggerTitle, subtitle: triggerSubtitle, hasTarget: false } satisfies StepNodeData,
      draggable: false,
      selectable: false,
      connectable: false,
    });
    const result = layoutSteps(rootSteps, triggerType, COL_MAIN, ROW_HEIGHT, 260, nodes, edges);
    if (rootSteps.length > 0) {
      edges.push({
        id: 'e-trigger-first',
        source: 'trigger',
        target: `s${rootSteps[0].stepKey}`,
        markerEnd: { type: MarkerType.ArrowClosed, color: '#cbd5e1' },
        style: { stroke: '#cbd5e1', strokeWidth: 2 },
      });
    }
    void result;
    return { nodes, edges };
  }, [triggerTitle, triggerSubtitle, triggerType, rootSteps]);

  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      nodeTypes={FLOW_NODE_TYPES}
      nodesDraggable={false}
      nodesConnectable={false}
      elementsSelectable={false}
      panOnScroll
      zoomOnScroll={false}
      fitView
      fitViewOptions={{ padding: 0.3, maxZoom: 1 }}
      proOptions={{ hideAttribution: true }}
    >
      <Background color="#e2e8f0" gap={20} />
      <Controls showInteractive={false} />
    </ReactFlow>
  );
}

// Dedicated creation/edit page — left is a live, read-only canvas preview
// of the rule (real arrows via @xyflow/react), right is the actual form.
// The step tree (trigger -> a sequence of actions and/or conditions,
// nestable at any depth) is what lets a condition go ANYWHERE in the
// automation, not just once right after the trigger.
export default function AutomationBuilderPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const isEdit = id != null;
  const saveAutomation = useSaveAutomationRule();
  const testAutomation = useTestAutomationRule();
  const { data: automations = [] } = useAutomations();

  const [name, setName] = useState('');
  const [triggerType, setTriggerType] = useState<CreatableTriggerType>('contact');
  const [trigger, setTrigger] = useState<ConditionNode>(EMPTY_CONDITION);
  const [stagePipelineId, setStagePipelineId] = useState('');
  const [steps, setSteps] = useState<StepDraft[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [testEmail, setTestEmail] = useState('');
  const [testResult, setTestResult] = useState<TestAutomationResult | null>(null);
  const [loadedExisting, setLoadedExisting] = useState(false);
  const [panelOpen, setPanelOpen] = useState(true);
  const panelRef = useRef<HTMLDivElement>(null);
  const stepKeyCounter = useRef(1);
  const nextStepKey = () => stepKeyCounter.current++;

  const existing = isEdit ? automations.find((a) => String(a.id) === id) : undefined;
  const { data: pipelinesForTrigger = [] } = usePipelines();
  const { data: allStagesForTrigger = [] } = useAllStages(pipelinesForTrigger.map((p) => p.id));

  // Same reverse-lookup as the condition/update-field editors: a saved
  // "Stage" trigger only stores the stage id, so resolve which pipeline it
  // belongs to once the data's loaded — otherwise the Stage dropdown
  // renders empty (Pipeline not yet picked) even though the trigger really
  // did save correctly, which looks exactly like "the stage wasn't saved."
  useEffect(() => {
    if (triggerType !== 'pipeline' || trigger.field !== 'stage_id' || stagePipelineId || trigger.value === '' || trigger.value === undefined) return;
    const found = allStagesForTrigger.find((s) => s.id === Number(trigger.value));
    if (found) setStagePipelineId(String(found.pipeline_id));
  }, [triggerType, trigger.field, trigger.value, allStagesForTrigger, stagePipelineId]);

  useEffect(() => {
    if (!isEdit || loadedExisting || !existing) return;
    setName(existing.name);
    setTriggerType(existing.trigger_type as CreatableTriggerType);
    setTrigger(existing.trigger_config);
    const { steps: loadedSteps, maxStepKey } = buildStepTree(existing.actions);
    setSteps(loadedSteps);
    stepKeyCounter.current = maxStepKey + 1;
    setLoadedExisting(true);
  }, [isEdit, loadedExisting, existing]);

  // Collapses the form panel on any click outside it (e.g. onto the canvas)
  // so the flow preview can take the full width — clicking the collapsed
  // tab (or any field inside the panel) brings it back.
  useEffect(() => {
    if (!panelOpen) return;
    function handlePointerDown(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setPanelOpen(false);
      }
    }
    document.addEventListener('mousedown', handlePointerDown);
    return () => document.removeEventListener('mousedown', handlePointerDown);
  }, [panelOpen]);

  const triggerConfigured = Boolean(trigger.field && trigger.operator && trigger.value !== '' && trigger.value !== undefined);

  if (isEdit && !existing) {
    return <div className="flex-1 flex items-center justify-center text-sm text-slate-400">Loading...</div>;
  }

  function handleTriggerTypeChange(next: CreatableTriggerType) {
    setTriggerType(next);
    setTrigger(EMPTY_CONDITION);
    setStagePipelineId('');
    setSteps([]);
  }

  function buildPayload(): SaveAutomationPayload {
    return {
      id: existing?.id,
      name: name.trim(),
      trigger_type: triggerType,
      trigger_config: trigger,
      condition_tree: null,
      actions: flattenSteps(steps),
    };
  }

  function validateSteps(list: StepDraft[]): string | null {
    for (const step of list) {
      if (step.kind === 'condition') {
        if (!(step.condition.field && step.condition.operator && step.condition.value !== '' && step.condition.value !== undefined)) {
          return 'Finish configuring every condition, or remove it.';
        }
        const trueError = validateSteps(step.trueSteps);
        if (trueError) return trueError;
        const falseError = validateSteps(step.falseSteps);
        if (falseError) return falseError;
        continue;
      }
      const cfg = step.actionConfig;
      if (step.actionType === 'add_tag' && !String(cfg.tag_name || '').trim()) return 'Every "Add tag" action needs a tag name.';
      if (step.actionType === 'remove_tag' && !String(cfg.tag_name || '').trim()) return 'Every "Remove tag" action needs a tag name.';
      if (step.actionType === 'send_email' && !String(cfg.subject || '').trim()) return 'Every "Send email" action needs a subject.';
      if (step.actionType === 'send_team_notification') {
        if (!String(cfg.message || '').trim()) return 'Every "Send team notification" action needs a message.';
        if (!cfg.channel_id) return 'Every "Send team notification" action needs a Team Chat channel.';
      }
      if (step.actionType === 'wait' && !(Number(cfg.amount) > 0)) return 'Every "Wait" action needs a duration greater than 0.';
      if (step.actionType === 'create_task' && !String(cfg.subject || '').trim()) return 'Every "Create task" action needs a subject.';
      if (step.actionType === 'send_dm' && !String(cfg.message || '').trim()) return 'Every "Message owner" action needs a message.';
      if (step.actionType === 'send_sms' && !String(cfg.message || '').trim()) return 'Every "Send SMS" action needs a message.';
      if (step.actionType === 'update_field') {
        if (!String(cfg.field || '').trim()) return 'Every "Update field" action needs a field chosen.';
        if (cfg.value === undefined || cfg.value === '') return 'Every "Update field" action needs a value.';
      }
    }
    return null;
  }

  function validate(): string | null {
    if (!name.trim()) return 'Give this automation a name.';
    if (!triggerConfigured) return 'Configure a trigger first.';
    if (steps.length === 0) return 'Add at least one step.';
    return validateSteps(steps);
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

  function handleTest() {
    setError(null);
    setTestResult(null);
    const validationError = validate();
    if (validationError) return setError(validationError);
    const payload: TestAutomationPayload = { ...buildPayload(), test_email: testEmail.trim() || undefined };
    testAutomation.mutate(payload, {
      onSuccess: (result) => setTestResult(result),
      onError: (err) => setError(err instanceof Error ? err.message : 'Test failed.'),
    });
  }

  const fields = TRIGGER_FIELDS[triggerType];

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <div className="px-6 pt-5 pb-3 shrink-0 border-b border-slate-100">
        <button type="button" onClick={() => navigate('/automations')} className="text-xs text-slate-400 hover:text-slate-600 mb-1">
          <i className="fa-solid fa-arrow-left mr-1" /> Back to Automations
        </button>
        <h1 className="text-lg font-bold text-slate-800">{isEdit ? 'Edit Automation' : 'New Automation'}</h1>
      </div>

      <div className="flex-1 flex min-h-0">
        {/* Left: live canvas preview, fills all remaining width */}
        <div className="flex-1 min-w-0 relative">
          <AutomationFlowPreview
            triggerTitle={`${TRIGGER_TYPE_LABELS[triggerType]} — ${trigger.field ? fieldDef(triggerType, trigger.field)?.label ?? trigger.field : 'not set'}`}
            triggerSubtitle={triggerConfigured ? `${trigger.operator.replace('_', ' ')} ${trigger.value}` : 'Configure the trigger on the right'}
            triggerType={triggerType}
            rootSteps={steps}
          />
        </div>

        {/* Right: the form panel — its own scrolling column, pinned to the
            right edge. Collapses to a slim tab on an outside click (see the
            mousedown effect above) so the canvas can take the full width;
            clicking the tab (or anywhere in the panel) brings it back. */}
        {!panelOpen && (
          <button
            type="button"
            onClick={() => setPanelOpen(true)}
            className="shrink-0 w-9 border-l border-slate-200 bg-white hover:bg-slate-50 flex flex-col items-center justify-center gap-2 text-slate-400 hover:text-slate-600"
            title="Open automation form"
          >
            <i className="fa-solid fa-chevron-left text-xs" />
            <span className="text-[10px] font-semibold uppercase tracking-wide [writing-mode:vertical-rl]">Edit</span>
          </button>
        )}
        <div
          ref={panelRef}
          className={`shrink-0 border-l border-slate-200 bg-white overflow-y-auto p-5 space-y-5 transition-all ${
            panelOpen ? 'w-[420px]' : 'w-0 p-0 opacity-0 pointer-events-none overflow-hidden'
          }`}
        >
          {error && <div className="text-xs text-rose-600 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2">{error}</div>}

          <div>
            <label className={labelClass}>Automation name</label>
            <input type="text" className={inputClass} value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Tag stale deals" />
          </div>

          <div>
            <p className="text-xs font-bold text-blue-600 uppercase tracking-wide mb-2">Trigger</p>
            <div className="space-y-2">
              <select className={inputClass} value={triggerType} onChange={(e) => handleTriggerTypeChange(e.target.value as CreatableTriggerType)}>
                {(Object.keys(TRIGGER_TYPE_LABELS) as CreatableTriggerType[]).map((t) => (
                  <option key={t} value={t}>
                    {TRIGGER_TYPE_LABELS[t]}
                  </option>
                ))}
              </select>
              <select
                className={inputClass}
                value={trigger.field}
                onChange={(e) => {
                  const key = e.target.value;
                  const def = fieldDef(triggerType, key);
                  const kind = def?.kind ?? 'text';
                  setTrigger({ field: key, operator: defaultOperatorFor(kind), value: kind === 'boolean' ? true : '' });
                }}
              >
                <option value="">Choose a field...</option>
                {fields.map((f) => (
                  <option key={f.key} value={f.key}>
                    {f.label}
                  </option>
                ))}
              </select>
              {trigger.field && (
                <>
                  <select
                    className={inputClass}
                    value={trigger.operator}
                    onChange={(e) => setTrigger({ ...trigger, operator: e.target.value as ConditionNode['operator'] })}
                  >
                    {OPERATORS_BY_KIND[fieldDef(triggerType, trigger.field)?.kind ?? 'text'].map((op) => (
                      <option key={op.value} value={op.value}>
                        {op.label}
                      </option>
                    ))}
                  </select>
                  <ConditionValueEditor
                    triggerType={triggerType}
                    node={trigger}
                    stagePipelineId={stagePipelineId}
                    onStagePipelineChange={setStagePipelineId}
                    onChange={setTrigger}
                  />
                </>
              )}
            </div>
          </div>

          <div>
            <p className="text-xs font-bold text-emerald-600 uppercase tracking-wide mb-2">Steps</p>
            <p className="text-[11px] text-slate-400 mb-2">
              Add actions and conditions in any order — a condition can go anywhere, including after other steps, and its branches can
              contain further conditions.
            </p>
            <StepSequenceEditor triggerType={triggerType} steps={steps} onChange={setSteps} nextStepKey={nextStepKey} depth={0} />
          </div>

          {testResult && (
            <div className="text-xs bg-slate-50 border border-slate-200 rounded-lg p-3 space-y-1">
              <p className="font-semibold text-slate-700">{testResult.matched ? 'Would match a real record' : 'No matching record found'}</p>
              {testResult.sample_entity && <p className="text-slate-500">Sample: {testResult.sample_entity.label}</p>}
              {testResult.actions_would_run?.map((a, i) => (
                <p key={i} className={a.status === 'unsupported' ? 'text-amber-600' : 'text-emerald-600'}>
                  {a.action_type}: {a.status === 'unsupported' ? 'not supported yet' : 'would run'}
                </p>
              ))}
            </div>
          )}

          <div className="space-y-2 pt-2 border-t border-slate-100">
            <input
              type="email"
              className={inputClass}
              value={testEmail}
              onChange={(e) => setTestEmail(e.target.value)}
              placeholder="Test email (optional, sends 1 real email)"
            />
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleTest}
                disabled={testAutomation.isPending}
                className="flex-1 px-3 py-2 text-sm font-semibold border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-50"
              >
                {testAutomation.isPending ? 'Testing...' : 'Test'}
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={saveAutomation.isPending}
                className="flex-1 px-3 py-2 text-sm font-semibold text-white rounded-lg bg-[var(--theme-accent)] hover:opacity-90 disabled:opacity-50"
              >
                {saveAutomation.isPending ? 'Saving...' : isEdit ? 'Save Changes' : 'Save Automation'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
