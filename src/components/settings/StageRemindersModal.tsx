import { FormEvent, useState } from 'react';
import {
  useStageReminders,
  useSaveStageReminder,
  useUpdateStageReminderActive,
  useDeleteStageReminder,
  useTestStageReminderStep,
  useForceRunStageReminder,
} from '../../hooks/useStageReminders';
import { usePipelines, useStages } from '../../hooks/useOpportunities';
import { StageReminderRule } from '../../api/stageReminders';
import ConfirmDialog from '../ConfirmDialog';

interface Props {
  open: boolean;
  onClose: () => void;
}

const inputClass =
  'w-full px-3 py-1.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--theme-accent)]';

interface StepForm {
  offset_hours: string;
  email_subject: string;
  email_body: string;
}

interface RuleForm {
  id?: number;
  name: string;
  pipeline_id: string;
  stage_id: string;
  steps: StepForm[];
  on_complete_advance_stage_id: string;
  on_complete_email_subject: string;
  on_complete_email_body: string;
}

const EMPTY_STEP: StepForm = { offset_hours: '24', email_subject: '', email_body: '' };
const EMPTY_FORM: RuleForm = {
  name: '',
  pipeline_id: '',
  stage_id: '',
  steps: [{ ...EMPTY_STEP }],
  on_complete_advance_stage_id: '',
  on_complete_email_subject: '',
  on_complete_email_body: '',
};

export default function StageRemindersModal({ open, onClose }: Props) {
  const { data: rules = [], isLoading } = useStageReminders(open);
  const { data: pipelines = [] } = usePipelines();
  const saveRule = useSaveStageReminder();
  const updateActive = useUpdateStageReminderActive();
  const deleteRule = useDeleteStageReminder();
  const forceRun = useForceRunStageReminder();

  const [tab, setTab] = useState<'rules' | 'test'>('rules');
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState<RuleForm>(EMPTY_FORM);
  const [error, setError] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);
  const [forceRunResult, setForceRunResult] = useState<{ id: number; message: string } | null>(null);

  const { data: stages = [] } = useStages(form.pipeline_id ? Number(form.pipeline_id) : undefined);

  if (!open) return null;

  function openCreate() {
    setForm(EMPTY_FORM);
    setError(null);
    setFormOpen(true);
  }

  function openEdit(rule: StageReminderRule) {
    setForm({
      id: rule.id,
      name: rule.name,
      pipeline_id: String(rule.pipeline_id),
      stage_id: String(rule.stage_id),
      steps: rule.steps.length
        ? rule.steps.map((s) => ({
            offset_hours: String(s.offset_hours),
            email_subject: s.email_subject,
            email_body: s.email_body,
          }))
        : [{ ...EMPTY_STEP }],
      on_complete_advance_stage_id: rule.on_complete_advance_stage_id ? String(rule.on_complete_advance_stage_id) : '',
      on_complete_email_subject: rule.on_complete_email_subject || '',
      on_complete_email_body: rule.on_complete_email_body || '',
    });
    setError(null);
    setFormOpen(true);
  }

  function addStep() {
    setForm((f) => ({ ...f, steps: [...f.steps, { ...EMPTY_STEP, offset_hours: '2' }] }));
  }

  function removeStep(index: number) {
    setForm((f) => ({ ...f, steps: f.steps.filter((_, i) => i !== index) }));
  }

  function updateStep(index: number, patch: Partial<StepForm>) {
    setForm((f) => ({ ...f, steps: f.steps.map((s, i) => (i === index ? { ...s, ...patch } : s)) }));
  }

  function handleForceRun(rule: StageReminderRule) {
    setForceRunResult(null);
    forceRun.mutate(rule.id, {
      onSuccess: (res) =>
        setForceRunResult({
          id: rule.id,
          message: `Processing ${res.processed ?? 0} candidate${res.processed === 1 ? '' : 's'} now.`,
        }),
      onError: (err) =>
        setForceRunResult({ id: rule.id, message: err instanceof Error ? err.message : 'Failed to force run.' }),
    });
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    const stageId = Number(form.stage_id);
    if (!form.name.trim()) return setError('Give this reminder a name.');
    if (!form.pipeline_id) return setError('Choose a pipeline.');
    if (!Number.isInteger(stageId) || !stageId) return setError('Choose a stage.');
    for (let i = 0; i < form.steps.length; i++) {
      const s = form.steps[i];
      const hours = Number(s.offset_hours);
      if (!Number.isInteger(hours)) return setError(`Step ${i + 1}: hours must be a whole number.`);
      if (!s.email_subject.trim()) return setError(`Step ${i + 1}: subject is required.`);
      if (!s.email_body.trim()) return setError(`Step ${i + 1}: email body is required.`);
    }
    if (!!form.on_complete_email_subject.trim() !== !!form.on_complete_email_body.trim()) {
      return setError('The "after inspection" email needs both a subject and a body, or leave both blank.');
    }

    saveRule.mutate(
      {
        id: form.id,
        name: form.name.trim(),
        stage_id: stageId,
        steps: form.steps.map((s) => ({
          offset_hours: Number(s.offset_hours),
          email_subject: s.email_subject.trim(),
          email_body: s.email_body,
        })),
        on_complete_advance_stage_id: form.on_complete_advance_stage_id ? Number(form.on_complete_advance_stage_id) : null,
        on_complete_email_subject: form.on_complete_email_subject.trim() || null,
        on_complete_email_body: form.on_complete_email_body.trim() || null,
      },
      {
        onSuccess: () => setFormOpen(false),
        onError: (err) => setError(err instanceof Error ? err.message : 'Failed to save.'),
      }
    );
  }

  return (
    <>
      <div
        className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4"
        onClick={onClose}
      >
        <div
          className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between px-6 pt-6">
            <h3 className="text-lg font-bold text-slate-800">Pipeline Stage Reminders</h3>
            <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
              <i className="fa-solid fa-xmark" />
            </button>
          </div>
          <p className="text-xs text-slate-500 px-6 mt-1">
            Appointment reminders tied to a pipeline stage, checked every 30 minutes — e.g. remind a lead 24h and
            2h before their booked inspection, or flag a no-show after it passes. Positive hours = before the
            appointment, negative = after. Placeholders:{' '}
            <code className="bg-slate-100 px-1 rounded">{'{{first_name}}'}</code>{' '}
            <code className="bg-slate-100 px-1 rounded">{'{{appointment_date}}'}</code>{' '}
            <code className="bg-slate-100 px-1 rounded">{'{{deal_name}}'}</code>
          </p>

          <div className="flex gap-1 px-6 mt-3 border-b border-slate-100">
            {(['rules', 'test'] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => {
                  setTab(t);
                  setFormOpen(false);
                }}
                className={`px-3 py-2 text-xs font-semibold border-b-2 -mb-px ${
                  tab === t
                    ? 'border-[var(--theme-accent)] text-[var(--theme-accent)]'
                    : 'border-transparent text-slate-400 hover:text-slate-600'
                }`}
              >
                {t === 'rules' ? 'Reminders' : 'Test'}
              </button>
            ))}
          </div>

          {tab === 'test' ? (
            <TestTab rules={rules} />
          ) : !formOpen ? (
            <>
              <div className="px-6 mt-4">
                <button
                  type="button"
                  onClick={openCreate}
                  className="w-full px-4 py-2 text-sm font-semibold text-white bg-[var(--theme-accent)] hover:opacity-90 rounded-lg"
                >
                  + New Stage Reminder
                </button>
              </div>

              <div className="flex-1 overflow-y-auto px-6 py-4 space-y-2">
                {isLoading ? (
                  <p className="text-sm text-slate-400 py-4 text-center">Loading...</p>
                ) : rules.length === 0 ? (
                  <p className="text-sm text-slate-400 py-4 text-center">No stage reminders yet.</p>
                ) : (
                  rules.map((rule) => (
                    <div
                      key={rule.id}
                      className={`px-3 py-2.5 border rounded-lg ${
                        rule.is_active ? 'border-slate-200' : 'border-slate-100 bg-slate-50 opacity-60'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-slate-800 truncate">{rule.name}</p>
                          <p className="text-[11px] text-slate-400 truncate">
                            {rule.pipeline_name} → {rule.stage_name} · {rule.steps.length} step
                            {rule.steps.length === 1 ? '' : 's'} · {rule.deals_in_stage} deal
                            {rule.deals_in_stage === 1 ? '' : 's'} in stage
                            {rule.on_complete_advance_stage_name && ` · on complete → ${rule.on_complete_advance_stage_name}`}
                            {rule.on_complete_email_subject && !rule.on_complete_advance_stage_name && ' · sends follow-up on complete'}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleForceRun(rule)}
                          disabled={forceRun.isPending || !rule.is_active}
                          title={rule.is_active ? 'Force run now — sends real emails / moves real deals immediately' : 'Resume the rule to force run it'}
                          className="shrink-0 text-slate-400 hover:text-amber-600 disabled:opacity-30"
                        >
                          <i className={`fa-solid ${forceRun.isPending ? 'fa-spinner fa-spin' : 'fa-bolt'} text-xs`} />
                        </button>
                        <button
                          type="button"
                          onClick={() => openEdit(rule)}
                          className="shrink-0 text-xs font-semibold text-indigo-600 hover:underline"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => updateActive.mutate({ id: rule.id, isActive: !rule.is_active })}
                          disabled={updateActive.isPending}
                          className={`shrink-0 px-2.5 py-1 text-[11px] font-semibold rounded-lg border disabled:opacity-40 ${
                            rule.is_active
                              ? 'border-slate-200 text-slate-600 hover:bg-slate-50'
                              : 'border-emerald-200 text-emerald-700 hover:bg-emerald-50'
                          }`}
                        >
                          {rule.is_active ? 'Pause' : 'Resume'}
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmDeleteId(rule.id)}
                          className="shrink-0 text-slate-400 hover:text-rose-600"
                          title="Remove"
                        >
                          <i className="fa-solid fa-trash text-xs" />
                        </button>
                      </div>
                      {forceRunResult?.id === rule.id && (
                        <p className="text-[11px] text-amber-700 mt-1.5">{forceRunResult.message}</p>
                      )}
                    </div>
                  ))
                )}
              </div>
            </>
          ) : (
            <form onSubmit={handleSubmit} className="px-6 py-4 space-y-3 overflow-y-auto">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Reminder Name</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder="e.g. Inspection reminders"
                  className={inputClass}
                />
              </div>

              <div className="flex gap-2">
                <div className="flex-1">
                  <label className="block text-xs font-medium text-slate-600 mb-1">Pipeline</label>
                  <select
                    value={form.pipeline_id}
                    onChange={(e) => setForm((f) => ({ ...f, pipeline_id: e.target.value, stage_id: '' }))}
                    className={inputClass}
                  >
                    <option value="">Choose a pipeline...</option>
                    {pipelines.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex-1">
                  <label className="block text-xs font-medium text-slate-600 mb-1">Stage</label>
                  <select
                    value={form.stage_id}
                    onChange={(e) => setForm((f) => ({ ...f, stage_id: e.target.value }))}
                    disabled={!form.pipeline_id}
                    className={inputClass}
                  >
                    <option value="">Choose a stage...</option>
                    {stages.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <p className="text-[11px] text-slate-400 -mt-1">
                Fires for any open deal currently sitting in this stage that has a linked meeting/appointment.
              </p>

              <div className="pt-2 border-t border-slate-100">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Reminder Steps</h4>
                  <button type="button" onClick={addStep} className="text-xs font-semibold text-indigo-600 hover:underline">
                    + Add Step
                  </button>
                </div>
                <div className="space-y-3">
                  {form.steps.map((step, i) => (
                    <div key={i} className="border border-slate-200 rounded-lg p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-slate-700">Reminder {i + 1}</span>
                        {form.steps.length > 1 && (
                          <button type="button" onClick={() => removeStep(i)} className="text-slate-400 hover:text-rose-600">
                            <i className="fa-solid fa-trash text-xs" />
                          </button>
                        )}
                      </div>
                      <div>
                        <label className="block text-[11px] font-medium text-slate-500 mb-1">
                          Hours before appointment (negative = hours after, for no-show follow-up)
                        </label>
                        <input
                          type="number"
                          value={step.offset_hours}
                          onChange={(e) => updateStep(i, { offset_hours: e.target.value })}
                          className={inputClass}
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-medium text-slate-500 mb-1">Subject</label>
                        <input
                          type="text"
                          value={step.email_subject}
                          onChange={(e) => updateStep(i, { email_subject: e.target.value })}
                          className={inputClass}
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-medium text-slate-500 mb-1">Body</label>
                        <textarea
                          value={step.email_body}
                          onChange={(e) => updateStep(i, { email_body: e.target.value })}
                          rows={4}
                          className={inputClass}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-2 border-t border-slate-100">
                <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">
                  When the appointment is marked complete
                </h4>
                <p className="text-[11px] text-slate-400 mb-2">
                  Fires once, the first time a rep checks off the linked meeting as completed — e.g. "we've
                  inspected and taken photos, proposal to follow." Move the deal, send a follow-up email, or
                  both. Leave both blank to do nothing here.
                </p>
                <div className="mb-2">
                  <label className="block text-[11px] font-medium text-slate-500 mb-1">Move deal to stage</label>
                  <select
                    value={form.on_complete_advance_stage_id}
                    onChange={(e) => setForm((f) => ({ ...f, on_complete_advance_stage_id: e.target.value }))}
                    disabled={!form.pipeline_id}
                    className={inputClass}
                  >
                    <option value="">Don't move the deal</option>
                    {stages
                      .filter((s) => String(s.id) !== form.stage_id)
                      .map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name}
                        </option>
                      ))}
                  </select>
                </div>
                <div className="border border-slate-200 rounded-lg p-3 space-y-2">
                  <div>
                    <label className="block text-[11px] font-medium text-slate-500 mb-1">Follow-up email subject (optional)</label>
                    <input
                      type="text"
                      value={form.on_complete_email_subject}
                      onChange={(e) => setForm((f) => ({ ...f, on_complete_email_subject: e.target.value }))}
                      placeholder="e.g. We've completed your inspection"
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-slate-500 mb-1">Body</label>
                    <textarea
                      value={form.on_complete_email_body}
                      onChange={(e) => setForm((f) => ({ ...f, on_complete_email_body: e.target.value }))}
                      rows={4}
                      placeholder="We've inspected the property and taken photos to assess the damage. We'll email your proposal once it's ready."
                      className={inputClass}
                    />
                  </div>
                </div>
              </div>

              {error && (
                <p className="text-xs text-rose-600 bg-rose-50 border border-rose-200 rounded-md px-2 py-1">{error}</p>
              )}
              <div className="flex gap-2 pt-1">
                <button
                  type="submit"
                  disabled={saveRule.isPending}
                  className="flex-1 px-4 py-2 text-sm font-semibold text-white bg-[var(--theme-accent)] hover:opacity-90 rounded-lg disabled:opacity-50"
                >
                  {saveRule.isPending ? 'Saving...' : 'Save Reminder'}
                </button>
                <button
                  type="button"
                  onClick={() => setFormOpen(false)}
                  disabled={saveRule.isPending}
                  className="flex-1 px-4 py-2 text-sm font-medium border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-lg disabled:opacity-50"
                >
                  Cancel
                </button>
              </div>
            </form>
          )}
        </div>
      </div>

      <ConfirmDialog
        open={confirmDeleteId != null}
        title="Remove Stage Reminder"
        body="Deals currently sitting in this stage will stop receiving further reminders immediately."
        confirmLabel="Remove"
        danger
        isSubmitting={deleteRule.isPending}
        onCancel={() => setConfirmDeleteId(null)}
        onConfirm={() => {
          if (confirmDeleteId != null) {
            deleteRule.mutate(confirmDeleteId, { onSuccess: () => setConfirmDeleteId(null) });
          }
        }}
      />
    </>
  );
}

interface TestContent {
  key: string;
  label: string;
  subject: string;
  body: string;
}

// Sends a real email for a chosen reminder step (or the on-complete
// follow-up) to any address the admin enters — no deal, contact, or send
// log is touched, safe to try before going live.
function TestTab({ rules }: { rules: StageReminderRule[] }) {
  const testStep = useTestStageReminderStep();
  const [ruleId, setRuleId] = useState('');
  const [contentKey, setContentKey] = useState('');
  const [testEmail, setTestEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  const selectedRule = rules.find((r) => String(r.id) === ruleId);

  const contentOptions: TestContent[] = selectedRule
    ? [
        ...selectedRule.steps.map((s) => ({
          key: `step-${s.id}`,
          label: `${s.offset_hours > 0 ? `${s.offset_hours}h before` : `${Math.abs(s.offset_hours)}h after`}: ${
            s.email_subject || '(no subject)'
          }`,
          subject: s.email_subject,
          body: s.email_body,
        })),
        ...(selectedRule.on_complete_email_subject
          ? [
              {
                key: 'on_complete',
                label: `On complete: ${selectedRule.on_complete_email_subject}`,
                subject: selectedRule.on_complete_email_subject,
                body: selectedRule.on_complete_email_body || '',
              },
            ]
          : []),
      ]
    : [];

  const selectedContent = contentOptions.find((c) => c.key === contentKey);

  function handleSend() {
    setError(null);
    setSent(false);
    if (!selectedContent) return setError('Pick a reminder and a step to send.');
    if (!testEmail.trim()) return setError('Enter an email address to send the test to.');

    testStep.mutate(
      { email_subject: selectedContent.subject, email_body: selectedContent.body, test_email: testEmail.trim() },
      {
        onSuccess: () => setSent(true),
        onError: (err) => setError(err instanceof Error ? err.message : 'Failed to send test.'),
      }
    );
  }

  return (
    <div className="px-6 py-4 space-y-3">
      <p className="text-xs text-slate-500">
        Sends exactly what's saved for the chosen step, with placeholders filled with sample data — nothing here
        touches real deals, contacts, or send history.
      </p>

      <div>
        <label className="block text-xs font-medium text-slate-600 mb-1">Reminder</label>
        <select
          value={ruleId}
          onChange={(e) => {
            setRuleId(e.target.value);
            setContentKey('');
          }}
          className={inputClass}
        >
          <option value="">Choose a reminder...</option>
          {rules.map((r) => (
            <option key={r.id} value={r.id}>
              {r.name}
            </option>
          ))}
        </select>
      </div>

      {selectedRule && (
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Step</label>
          <select value={contentKey} onChange={(e) => setContentKey(e.target.value)} className={inputClass}>
            <option value="">Choose a step...</option>
            {contentOptions.map((c) => (
              <option key={c.key} value={c.key}>
                {c.label}
              </option>
            ))}
          </select>
        </div>
      )}

      <div>
        <label className="block text-xs font-medium text-slate-600 mb-1">Send test to</label>
        <input
          type="email"
          value={testEmail}
          onChange={(e) => setTestEmail(e.target.value)}
          placeholder="you@company.com"
          className={inputClass}
        />
      </div>

      {error && (
        <p className="text-xs text-rose-600 bg-rose-50 border border-rose-200 rounded-md px-2 py-1">{error}</p>
      )}
      {sent && (
        <p className="text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-md px-2 py-1">
          Test email sent to {testEmail}.
        </p>
      )}

      <button
        type="button"
        onClick={handleSend}
        disabled={testStep.isPending}
        className="w-full px-4 py-2 text-sm font-semibold text-white bg-[var(--theme-accent)] hover:opacity-90 rounded-lg disabled:opacity-50"
      >
        {testStep.isPending ? 'Sending...' : 'Send Test Email'}
      </button>
    </div>
  );
}
