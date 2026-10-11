import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { usePipelines, useStages } from '../hooks/useOpportunities';
import { useEmailTemplates } from '../hooks/useEmailTemplates';
import { useStageReminders, useSaveStageReminder } from '../hooks/usePipelineStageReminders';
import { StageReminderStepDraft } from '../api/pipelineStageReminders';
import DynamicFieldDropdown, { AUTOMATION_DYNAMIC_FIELDS, insertAtCursor } from '../components/DynamicFieldDropdown';
import { templatePlainBody } from '../utils/emailHtml';

const inputClass =
  'w-full px-3 py-1.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--theme-accent)]';
const labelClass = 'block text-xs font-medium text-slate-600 mb-1';

interface StepDraft extends StageReminderStepDraft {
  key: string;
}

function emptyStep(): StepDraft {
  return { key: crypto.randomUUID(), offset_hours: 24, email_subject: '', email_body: '' };
}

// A focused field is either one reminder step's subject/body, or the
// on-complete email's subject/body ('oncomplete') — dynamic-field inserts
// and "load from template" both act on whichever of these was last focused.
type FieldKey = string | 'oncomplete';
interface FocusTarget {
  key: FieldKey;
  field: 'subject' | 'body';
}

export default function StageReminderEditorPage() {
  const { id } = useParams();
  const isEdit = id != null && id !== 'new';
  const navigate = useNavigate();

  const { data: rules = [], isLoading } = useStageReminders();
  const { data: pipelines = [] } = usePipelines();
  const { data: templates = [] } = useEmailTemplates();
  const saveRule = useSaveStageReminder();

  const rule = useMemo(() => (isEdit ? rules.find((r) => String(r.id) === id) : undefined), [isEdit, rules, id]);

  const [loaded, setLoaded] = useState(false);
  const [name, setName] = useState('');
  const [pipelineId, setPipelineId] = useState<number | undefined>(undefined);
  const [stageId, setStageId] = useState<number | undefined>(undefined);
  const [steps, setSteps] = useState<StepDraft[]>([emptyStep()]);
  const [onCompleteEnabled, setOnCompleteEnabled] = useState(false);
  const [onCompleteAdvanceStageId, setOnCompleteAdvanceStageId] = useState<number | ''>('');
  const [onCompleteSubject, setOnCompleteSubject] = useState('');
  const [onCompleteBody, setOnCompleteBody] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saveConfirmation, setSaveConfirmation] = useState<string | null>(null);
  const [focusTarget, setFocusTarget] = useState<FocusTarget | null>(null);

  const { data: stages = [] } = useStages(pipelineId);

  const subjectRefs = useRef(new Map<FieldKey, HTMLInputElement>());
  const bodyRefs = useRef(new Map<FieldKey, HTMLTextAreaElement>());

  // Load the existing rule into the form once it arrives. Not editable
  // (new rule) skips this and just defaults to the account's default pipeline.
  useEffect(() => {
    if (loaded) return;
    if (isEdit) {
      if (!rule) return; // still loading
      setName(rule.name);
      setPipelineId(rule.pipeline_id);
      setStageId(rule.stage_id);
      setSteps(
        rule.steps.length > 0
          ? rule.steps.map((s) => ({ key: crypto.randomUUID(), offset_hours: s.offset_hours, email_subject: s.email_subject, email_body: s.email_body }))
          : [emptyStep()]
      );
      setOnCompleteEnabled(!!(rule.on_complete_email_subject || rule.on_complete_advance_stage_id));
      setOnCompleteAdvanceStageId(rule.on_complete_advance_stage_id ?? '');
      setOnCompleteSubject(rule.on_complete_email_subject ?? '');
      setOnCompleteBody(rule.on_complete_email_body ?? '');
      setLoaded(true);
    } else if (pipelines.length > 0) {
      setPipelineId(pipelines.find((p) => p.is_default)?.id ?? pipelines[0].id);
      setLoaded(true);
    }
  }, [isEdit, loaded, rule, pipelines]);

  function updateStep(key: string, patch: Partial<StepDraft>) {
    setSteps((prev) => prev.map((s) => (s.key === key ? { ...s, ...patch } : s)));
  }

  function addStep() {
    setSteps((prev) => [...prev, emptyStep()]);
  }

  function removeStep(key: string) {
    setSteps((prev) => (prev.length > 1 ? prev.filter((s) => s.key !== key) : prev));
  }

  // Dynamic-field insert acts on the last-focused subject/body field,
  // wherever it is (a specific step, or the on-complete email).
  function insertField(token: string) {
    if (!focusTarget) return;
    const { key, field } = focusTarget;
    const el = (field === 'subject' ? subjectRefs.current : bodyRefs.current).get(key);
    if (key === 'oncomplete') {
      const current = field === 'subject' ? onCompleteSubject : onCompleteBody;
      const setter = field === 'subject' ? setOnCompleteSubject : setOnCompleteBody;
      insertAtCursor(el ?? null, current, token, setter);
    } else {
      const step = steps.find((s) => s.key === key);
      if (!step) return;
      const current = field === 'subject' ? step.email_subject : step.email_body;
      insertAtCursor(el ?? null, current, token, (v) =>
        updateStep(key, field === 'subject' ? { email_subject: v } : { email_body: v })
      );
    }
  }

  // "Load from template" replaces the whole subject+body of whichever field
  // group (step, or on-complete) was last focused — same full-replace
  // behavior as the Proposal editor's template dropdown.
  function applyTemplate(templateId: string) {
    const t = templates.find((t) => String(t.id) === templateId);
    if (!t || !focusTarget) return;
    if (focusTarget.key === 'oncomplete') {
      setOnCompleteSubject(t.subject);
      setOnCompleteBody(templatePlainBody(t));
    } else {
      updateStep(focusTarget.key, { email_subject: t.subject, email_body: templatePlainBody(t) });
    }
  }

  function handleSave() {
    setError(null);
    setSaveConfirmation(null);
    if (!name.trim()) return setError('Give this rule a name.');
    if (!stageId) return setError('Pick a pipeline stage.');
    for (let i = 0; i < steps.length; i++) {
      const s = steps[i];
      if (!Number.isInteger(s.offset_hours)) return setError(`Step ${i + 1}: hours must be a whole number.`);
      if (!s.email_subject.trim()) return setError(`Step ${i + 1}: subject is required.`);
      if (!s.email_body.trim()) return setError(`Step ${i + 1}: email body is required.`);
    }
    if (onCompleteEnabled && (onCompleteSubject.trim() || onCompleteBody.trim()) && (!onCompleteSubject.trim() || !onCompleteBody.trim())) {
      return setError('The "after inspection" email needs both a subject and a body.');
    }

    saveRule.mutate(
      {
        id: rule?.id,
        name: name.trim(),
        stage_id: stageId,
        steps: steps.map((s) => ({ offset_hours: s.offset_hours, email_subject: s.email_subject.trim(), email_body: s.email_body })),
        on_complete_advance_stage_id: onCompleteEnabled && onCompleteAdvanceStageId !== '' ? Number(onCompleteAdvanceStageId) : null,
        on_complete_email_subject: onCompleteEnabled ? onCompleteSubject.trim() || null : null,
        on_complete_email_body: onCompleteEnabled ? onCompleteBody.trim() || null : null,
      },
      {
        onSuccess: () => {
          setSaveConfirmation('Saved.');
          navigate('/automations/stage-reminders');
        },
        onError: (err) => setError(err instanceof Error ? err.message : 'Failed to save.'),
      }
    );
  }

  if (isEdit && isLoading && !rule) {
    return <div className="flex-1 flex items-center justify-center text-sm text-slate-400">Loading...</div>;
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-white">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-slate-200 bg-white shrink-0">
        <button
          type="button"
          onClick={() => navigate('/automations/stage-reminders')}
          className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 shrink-0"
        >
          <i className="fa-solid fa-chevron-left text-xs" />
          Back
        </button>

        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="New Reminder Rule"
          className="flex-1 max-w-md text-center text-sm font-semibold text-slate-800 border border-slate-200 rounded-full px-4 py-1.5 focus:outline-none focus:ring-2 focus:ring-[var(--theme-accent)] focus:border-transparent"
        />

        <button
          type="button"
          onClick={handleSave}
          disabled={saveRule.isPending}
          className="px-4 py-1.5 text-xs font-semibold text-white bg-[var(--theme-accent)] hover:opacity-90 rounded-lg disabled:opacity-50 shrink-0"
        >
          {saveRule.isPending ? 'Saving...' : 'Save'}
        </button>
      </div>

      {error && <p className="text-xs text-rose-600 bg-rose-50 border-b border-rose-200 px-4 py-1.5 shrink-0">{error}</p>}
      {saveConfirmation && !error && (
        <p className="text-xs text-emerald-700 bg-emerald-50 border-b border-emerald-200 px-4 py-1.5 shrink-0">{saveConfirmation}</p>
      )}

      {/* Body: canvas + dynamic-fields column */}
      <div className="flex-1 flex overflow-hidden">
        <div className="flex-1 overflow-y-auto bg-slate-100">
          <div className="max-w-3xl mx-auto py-8 px-4 space-y-4">
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelClass}>Pipeline</label>
                  <select
                    value={pipelineId ?? ''}
                    onChange={(e) => {
                      setPipelineId(Number(e.target.value));
                      setStageId(undefined);
                    }}
                    className={inputClass}
                  >
                    <option value="" disabled>
                      Select a pipeline
                    </option>
                    {pipelines.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={labelClass}>Stage that triggers this rule</label>
                  <select
                    value={stageId ?? ''}
                    onChange={(e) => setStageId(Number(e.target.value))}
                    disabled={!pipelineId}
                    className={inputClass}
                  >
                    <option value="" disabled>
                      Select a stage
                    </option>
                    {stages.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
              <div className="flex items-center justify-between mb-1">
                <h3 className="text-sm font-bold text-slate-800">Reminder steps</h3>
                <button type="button" onClick={addStep} className="text-xs font-semibold text-[var(--theme-accent)] hover:underline">
                  <i className="fa-solid fa-plus mr-1" />
                  Add step
                </button>
              </div>
              <p className="text-[11px] text-slate-400 mb-3">
                Hours before the appointment (e.g. 24 = day-before). Use 0 or a negative number to send it after
                instead (no-show follow-up).
              </p>

              <div className="space-y-3">
                {steps.map((s, i) => (
                  <div key={s.key} className="border border-slate-200 rounded-lg p-3 space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-slate-500 shrink-0">Step {i + 1}</span>
                      <input
                        type="number"
                        value={s.offset_hours}
                        onChange={(e) => updateStep(s.key, { offset_hours: parseInt(e.target.value, 10) || 0 })}
                        className={`${inputClass} w-24`}
                      />
                      <span className="text-xs text-slate-500 shrink-0">hours before</span>
                      {steps.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeStep(s.key)}
                          className="ml-auto shrink-0 text-slate-300 hover:text-rose-500"
                          title="Remove step"
                        >
                          <i className="fa-solid fa-trash text-xs" />
                        </button>
                      )}
                    </div>
                    <input
                      ref={(el) => {
                        if (el) subjectRefs.current.set(s.key, el);
                        else subjectRefs.current.delete(s.key);
                      }}
                      type="text"
                      value={s.email_subject}
                      onChange={(e) => updateStep(s.key, { email_subject: e.target.value })}
                      onFocus={() => setFocusTarget({ key: s.key, field: 'subject' })}
                      placeholder="Subject"
                      className={inputClass}
                    />
                    <textarea
                      ref={(el) => {
                        if (el) bodyRefs.current.set(s.key, el);
                        else bodyRefs.current.delete(s.key);
                      }}
                      value={s.email_body}
                      onChange={(e) => updateStep(s.key, { email_body: e.target.value })}
                      onFocus={() => setFocusTarget({ key: s.key, field: 'body' })}
                      placeholder="Write the email yourself, or use the panel on the right to load a template."
                      rows={4}
                      className={inputClass}
                    />
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
              <label className="flex items-center gap-2 text-sm font-bold text-slate-800 mb-2">
                <input
                  type="checkbox"
                  checked={onCompleteEnabled}
                  onChange={(e) => setOnCompleteEnabled(e.target.checked)}
                  className="rounded border-slate-300"
                />
                After the inspection is marked complete...
              </label>
              {onCompleteEnabled && (
                <div className="space-y-2 pl-6">
                  <div>
                    <label className={labelClass}>Move the deal to stage (optional)</label>
                    <select
                      value={onCompleteAdvanceStageId}
                      onChange={(e) => setOnCompleteAdvanceStageId(e.target.value ? Number(e.target.value) : '')}
                      className={inputClass}
                    >
                      <option value="">Don't move the deal</option>
                      {stages.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <label className={labelClass}>Follow-up email (optional)</label>
                  <input
                    ref={(el) => {
                      if (el) subjectRefs.current.set('oncomplete', el);
                      else subjectRefs.current.delete('oncomplete');
                    }}
                    type="text"
                    value={onCompleteSubject}
                    onChange={(e) => setOnCompleteSubject(e.target.value)}
                    onFocus={() => setFocusTarget({ key: 'oncomplete', field: 'subject' })}
                    placeholder="Subject"
                    className={inputClass}
                  />
                  <textarea
                    ref={(el) => {
                      if (el) bodyRefs.current.set('oncomplete', el);
                      else bodyRefs.current.delete('oncomplete');
                    }}
                    value={onCompleteBody}
                    onChange={(e) => setOnCompleteBody(e.target.value)}
                    onFocus={() => setFocusTarget({ key: 'oncomplete', field: 'body' })}
                    placeholder="Write the email yourself, or use the panel on the right to load a template."
                    rows={3}
                    className={inputClass}
                  />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Dynamic fields + email template column */}
        <div className="w-80 shrink-0 border-l border-slate-200 bg-white overflow-y-auto p-4 space-y-4">
          <div>
            <h3 className="text-sm font-bold text-slate-800 mb-1">Email template</h3>
            <select value="" onChange={(e) => applyTemplate(e.target.value)} disabled={!focusTarget} className={inputClass}>
              <option value="">{focusTarget ? 'Load from template...' : 'Click a subject/body field first'}</option>
              {templates.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
            <p className="text-[10px] text-slate-400 italic mt-1">
              Replaces the subject and body of whichever field you last clicked into with this template's copy — feel
              free to keep editing after. Not a live link; changing the template later won't change this rule.
            </p>
          </div>

          <div className="border-t border-slate-100 pt-4">
            <h3 className="text-sm font-bold text-slate-800 mb-1.5">Insert dynamic field</h3>
            <p className="text-[10px] text-slate-400 mb-2">
              {focusTarget ? 'Inserts at your cursor in the last field you clicked into.' : 'Click a subject/body field first.'}
            </p>
            <DynamicFieldDropdown fields={AUTOMATION_DYNAMIC_FIELDS} onInsert={insertField} />
          </div>
        </div>
      </div>
    </div>
  );
}
