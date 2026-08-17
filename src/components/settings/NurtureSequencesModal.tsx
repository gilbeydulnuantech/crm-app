import { FormEvent, useState } from 'react';
import {
  useNurtureSequences,
  useSaveNurtureSequence,
  useUpdateNurtureSequenceActive,
  useDeleteNurtureSequence,
  useTestNurtureStep,
  useForceRunNurtureSequence,
} from '../../hooks/useNurtureSequences';
import { NurtureSequence } from '../../api/nurtureSequences';
import { LEAD_STATUS_OPTIONS } from '../../types/contact';
import ConfirmDialog from '../ConfirmDialog';

interface Props {
  open: boolean;
  onClose: () => void;
}

const inputClass =
  'w-full px-3 py-1.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--theme-accent)]';

interface StepForm {
  delay_days: string;
  email_subject: string;
  email_body: string;
}

interface SequenceForm {
  id?: number;
  name: string;
  trigger_inactive_days: string;
  exit_on_reply: boolean;
  exit_lead_status: string;
  steps: StepForm[];
}

const EMPTY_STEP: StepForm = { delay_days: '2', email_subject: '', email_body: '' };
const EMPTY_FORM: SequenceForm = {
  name: '',
  trigger_inactive_days: '2',
  exit_on_reply: true,
  exit_lead_status: '',
  steps: [{ ...EMPTY_STEP }],
};

export default function NurtureSequencesModal({ open, onClose }: Props) {
  const { data: sequences = [], isLoading } = useNurtureSequences(open);
  const saveSequence = useSaveNurtureSequence();
  const updateActive = useUpdateNurtureSequenceActive();
  const deleteSequence = useDeleteNurtureSequence();
  const forceRun = useForceRunNurtureSequence();

  const [tab, setTab] = useState<'sequences' | 'test'>('sequences');
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState<SequenceForm>(EMPTY_FORM);
  const [error, setError] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);
  const [forceRunResult, setForceRunResult] = useState<{ id: number; message: string } | null>(null);

  if (!open) return null;

  function openCreate() {
    setForm(EMPTY_FORM);
    setError(null);
    setFormOpen(true);
  }

  function openEdit(seq: NurtureSequence) {
    setForm({
      id: seq.id,
      name: seq.name,
      trigger_inactive_days: String(seq.trigger_inactive_days),
      exit_on_reply: seq.exit_on_reply,
      exit_lead_status: seq.exit_lead_status || '',
      steps: seq.steps.length
        ? seq.steps.map((s) => ({
            delay_days: String(s.delay_days),
            email_subject: s.email_subject,
            email_body: s.email_body,
          }))
        : [{ ...EMPTY_STEP }],
    });
    setError(null);
    setFormOpen(true);
  }

  function addStep() {
    setForm((f) => ({ ...f, steps: [...f.steps, { ...EMPTY_STEP, delay_days: '3' }] }));
  }

  function removeStep(index: number) {
    setForm((f) => ({ ...f, steps: f.steps.filter((_, i) => i !== index) }));
  }

  function updateStep(index: number, patch: Partial<StepForm>) {
    setForm((f) => ({ ...f, steps: f.steps.map((s, i) => (i === index ? { ...s, ...patch } : s)) }));
  }

  function handleForceRun(seq: NurtureSequence) {
    setForceRunResult(null);
    forceRun.mutate(seq.id, {
      onSuccess: (res) =>
        setForceRunResult({
          id: seq.id,
          message: `Processing ${res.processed ?? 0} enrolled contact${res.processed === 1 ? '' : 's'} now.`,
        }),
      onError: (err) =>
        setForceRunResult({ id: seq.id, message: err instanceof Error ? err.message : 'Failed to force run.' }),
    });
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    const inactiveDays = Number(form.trigger_inactive_days);
    if (!form.name.trim()) return setError('Give this sequence a name.');
    if (!Number.isInteger(inactiveDays) || inactiveDays < 1) {
      return setError('Trigger days must be a positive whole number.');
    }
    for (let i = 0; i < form.steps.length; i++) {
      const s = form.steps[i];
      const days = Number(s.delay_days);
      if (!Number.isInteger(days) || days < 0) return setError(`Step ${i + 1}: delay must be 0 or more days.`);
      if (!s.email_subject.trim()) return setError(`Step ${i + 1}: subject is required.`);
      if (!s.email_body.trim()) return setError(`Step ${i + 1}: email body is required.`);
    }

    saveSequence.mutate(
      {
        id: form.id,
        name: form.name.trim(),
        trigger_inactive_days: inactiveDays,
        exit_on_reply: form.exit_on_reply,
        exit_lead_status: form.exit_lead_status || null,
        steps: form.steps.map((s) => ({
          delay_days: Number(s.delay_days),
          email_subject: s.email_subject.trim(),
          email_body: s.email_body,
        })),
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
          <h3 className="text-lg font-bold text-slate-800">Email Nurture Sequences</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <i className="fa-solid fa-xmark" />
          </button>
        </div>
        <p className="text-xs text-slate-500 px-6 mt-1">
          Multi-step drip campaigns for contacts who've gone quiet, checked hourly. A reply from the contact
          stops the sequence automatically — placeholders: <code className="bg-slate-100 px-1 rounded">{'{{first_name}}'}</code>{' '}
          <code className="bg-slate-100 px-1 rounded">{'{{last_name}}'}</code>
        </p>

        <div className="flex gap-1 px-6 mt-3 border-b border-slate-100">
          {(['sequences', 'test'] as const).map((t) => (
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
              {t === 'sequences' ? 'Sequences' : 'Test'}
            </button>
          ))}
        </div>

        {tab === 'test' ? (
          <TestTab sequences={sequences} />
        ) : !formOpen ? (
          <>
            <div className="px-6 mt-4">
              <button
                type="button"
                onClick={openCreate}
                className="w-full px-4 py-2 text-sm font-semibold text-white bg-[var(--theme-accent)] hover:opacity-90 rounded-lg"
              >
                + New Sequence
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-2">
              {isLoading ? (
                <p className="text-sm text-slate-400 py-4 text-center">Loading...</p>
              ) : sequences.length === 0 ? (
                <p className="text-sm text-slate-400 py-4 text-center">No nurture sequences yet.</p>
              ) : (
                sequences.map((seq) => (
                  <div
                    key={seq.id}
                    className={`px-3 py-2.5 border rounded-lg ${
                      seq.is_active ? 'border-slate-200' : 'border-slate-100 bg-slate-50 opacity-60'
                    }`}
                  >
                  <div className="flex items-center gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-slate-800 truncate">{seq.name}</p>
                      <p className="text-[11px] text-slate-400 truncate">
                        {seq.steps.length} step{seq.steps.length === 1 ? '' : 's'} · inactive {seq.trigger_inactive_days}d ·{' '}
                        {seq.active_enrollments} active {seq.active_enrollments === 1 ? 'contact' : 'contacts'}
                        {seq.exit_on_reply && ' · stops on reply'}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleForceRun(seq)}
                      disabled={forceRun.isPending || !seq.is_active}
                      title={seq.is_active ? 'Force run now — sends real emails to enrolled contacts immediately' : 'Resume the sequence to force run it'}
                      className="shrink-0 text-slate-400 hover:text-amber-600 disabled:opacity-30"
                    >
                      <i className={`fa-solid ${forceRun.isPending ? 'fa-spinner fa-spin' : 'fa-bolt'} text-xs`} />
                    </button>
                    <button
                      type="button"
                      onClick={() => openEdit(seq)}
                      className="shrink-0 text-xs font-semibold text-indigo-600 hover:underline"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => updateActive.mutate({ id: seq.id, isActive: !seq.is_active })}
                      disabled={updateActive.isPending}
                      className={`shrink-0 px-2.5 py-1 text-[11px] font-semibold rounded-lg border disabled:opacity-40 ${
                        seq.is_active
                          ? 'border-slate-200 text-slate-600 hover:bg-slate-50'
                          : 'border-emerald-200 text-emerald-700 hover:bg-emerald-50'
                      }`}
                    >
                      {seq.is_active ? 'Pause' : 'Resume'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmDeleteId(seq.id)}
                      className="shrink-0 text-slate-400 hover:text-rose-600"
                      title="Remove"
                    >
                      <i className="fa-solid fa-trash text-xs" />
                    </button>
                  </div>
                  {forceRunResult?.id === seq.id && (
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
              <label className="block text-xs font-medium text-slate-600 mb-1">Sequence Name</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="e.g. New lead nurture"
                className={inputClass}
              />
            </div>

            <div className="flex gap-2">
              <div className="flex-1">
                <label className="block text-xs font-medium text-slate-600 mb-1">Start after inactive (days)</label>
                <input
                  type="number"
                  min={1}
                  value={form.trigger_inactive_days}
                  onChange={(e) => setForm((f) => ({ ...f, trigger_inactive_days: e.target.value }))}
                  className={inputClass}
                />
              </div>
              <div className="flex-1">
                <label className="block text-xs font-medium text-slate-600 mb-1">If contact replies, set status to</label>
                <select
                  value={form.exit_lead_status}
                  onChange={(e) => setForm((f) => ({ ...f, exit_lead_status: e.target.value }))}
                  className={inputClass}
                >
                  <option value="">Don't change status</option>
                  {LEAD_STATUS_OPTIONS.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <label className="flex items-center gap-2 text-xs text-slate-600 cursor-pointer">
              <input
                type="checkbox"
                checked={form.exit_on_reply}
                onChange={(e) => setForm((f) => ({ ...f, exit_on_reply: e.target.checked }))}
                className="rounded border-slate-300 text-indigo-600 focus:ring-[var(--theme-accent)]"
              />
              Stop the sequence as soon as the contact replies (recommended)
            </label>

            <div className="pt-2 border-t border-slate-100">
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Email Steps</h4>
                <button
                  type="button"
                  onClick={addStep}
                  className="text-xs font-semibold text-indigo-600 hover:underline"
                >
                  + Add Step
                </button>
              </div>
              <div className="space-y-3">
                {form.steps.map((step, i) => (
                  <div key={i} className="border border-slate-200 rounded-lg p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-slate-700">Email {i + 1}</span>
                      {form.steps.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeStep(i)}
                          className="text-slate-400 hover:text-rose-600"
                        >
                          <i className="fa-solid fa-trash text-xs" />
                        </button>
                      )}
                    </div>
                    <div>
                      <label className="block text-[11px] font-medium text-slate-500 mb-1">
                        {i === 0 ? 'Days after becoming inactive' : 'Days after previous email'}
                      </label>
                      <input
                        type="number"
                        min={0}
                        value={step.delay_days}
                        onChange={(e) => updateStep(i, { delay_days: e.target.value })}
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

            {error && (
              <p className="text-xs text-rose-600 bg-rose-50 border border-rose-200 rounded-md px-2 py-1">{error}</p>
            )}
            <div className="flex gap-2 pt-1">
              <button
                type="submit"
                disabled={saveSequence.isPending}
                className="flex-1 px-4 py-2 text-sm font-semibold text-white bg-[var(--theme-accent)] hover:opacity-90 rounded-lg disabled:opacity-50"
              >
                {saveSequence.isPending ? 'Saving...' : 'Save Sequence'}
              </button>
              <button
                type="button"
                onClick={() => setFormOpen(false)}
                disabled={saveSequence.isPending}
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
        title="Remove Nurture Sequence"
        body="Contacts currently enrolled will stop receiving further emails from this sequence immediately."
        confirmLabel="Remove"
        danger
        isSubmitting={deleteSequence.isPending}
        onCancel={() => setConfirmDeleteId(null)}
        onConfirm={() => {
          if (confirmDeleteId != null) {
            deleteSequence.mutate(confirmDeleteId, { onSuccess: () => setConfirmDeleteId(null) });
          }
        }}
      />
    </>
  );
}

// Sends a real email for a chosen step to any address the admin enters —
// no enrollment or contact is touched, safe to try before going live.
function TestTab({ sequences }: { sequences: NurtureSequence[] }) {
  const testStep = useTestNurtureStep();
  const [sequenceId, setSequenceId] = useState('');
  const [stepNumber, setStepNumber] = useState('');
  const [testEmail, setTestEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  const selectedSequence = sequences.find((s) => String(s.id) === sequenceId);
  const selectedStep = selectedSequence?.steps.find((s) => String(s.step_number) === stepNumber);

  function handleSend() {
    setError(null);
    setSent(false);
    if (!selectedStep) return setError('Pick a sequence and a step to send.');
    if (!testEmail.trim()) return setError('Enter an email address to send the test to.');

    testStep.mutate(
      { email_subject: selectedStep.email_subject, email_body: selectedStep.email_body, test_email: testEmail.trim() },
      {
        onSuccess: () => setSent(true),
        onError: (err) => setError(err instanceof Error ? err.message : 'Failed to send test.'),
      }
    );
  }

  return (
    <div className="px-6 py-4 space-y-3">
      <p className="text-xs text-slate-500">
        Sends exactly what's saved for the chosen step, with placeholders filled with sample data — nothing
        here touches real contacts or enrollments.
      </p>

      <div>
        <label className="block text-xs font-medium text-slate-600 mb-1">Sequence</label>
        <select
          value={sequenceId}
          onChange={(e) => {
            setSequenceId(e.target.value);
            setStepNumber('');
          }}
          className={inputClass}
        >
          <option value="">Choose a sequence...</option>
          {sequences.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
      </div>

      {selectedSequence && (
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Step</label>
          <select value={stepNumber} onChange={(e) => setStepNumber(e.target.value)} className={inputClass}>
            <option value="">Choose a step...</option>
            {selectedSequence.steps.map((s) => (
              <option key={s.step_number} value={s.step_number}>
                Email {s.step_number}: {s.email_subject || '(no subject)'}
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
