import { FormEvent, useRef, useState } from 'react';
import {
  useDocumentFlows,
  useSaveDocumentFlow,
  useUpdateDocumentFlowActive,
  useDeleteDocumentFlow,
} from '../../hooks/useDocumentFlow';
import { usePipelines, useStages } from '../../hooks/useOpportunities';
import { useContractTemplates } from '../../hooks/useContractTemplates';
import { DocumentFlow } from '../../api/documentFlow';
import ConfirmDialog from '../ConfirmDialog';

interface Props {
  open: boolean;
  onClose: () => void;
}

interface FieldOption {
  label: string;
  token: string;
}

const PROPOSAL_FIELDS: FieldOption[] = [
  { label: 'First name', token: '{{first_name}}' },
  { label: 'Last name', token: '{{last_name}}' },
  { label: 'Proposal link', token: '{{proposal_link}}' },
];

const CONTRACT_FIELDS: FieldOption[] = [
  { label: 'First name', token: '{{first_name}}' },
  { label: 'Last name', token: '{{last_name}}' },
  { label: 'Contract link', token: '{{contract_link}}' },
];

// Inserts the chosen placeholder at the caret position of whatever
// input/textarea it's paired with, rather than just appending to the end.
function FieldInserter({
  fields,
  targetRef,
  value,
  onChange,
}: {
  fields: FieldOption[];
  targetRef: React.RefObject<HTMLInputElement | HTMLTextAreaElement>;
  value: string;
  onChange: (next: string) => void;
}) {
  function handleInsert(e: React.ChangeEvent<HTMLSelectElement>) {
    const token = e.target.value;
    e.target.value = '';
    if (!token) return;

    const el = targetRef.current;
    if (!el) {
      onChange(value + token);
      return;
    }
    const start = el.selectionStart ?? value.length;
    const end = el.selectionEnd ?? value.length;
    const next = value.slice(0, start) + token + value.slice(end);
    onChange(next);
    requestAnimationFrame(() => {
      el.focus();
      const pos = start + token.length;
      el.setSelectionRange(pos, pos);
    });
  }

  return (
    <select
      onChange={handleInsert}
      value=""
      className="text-[10px] font-medium border border-slate-200 rounded-md px-1.5 py-0.5 text-slate-500 bg-white hover:border-slate-300 focus:outline-none"
    >
      <option value="">Insert field...</option>
      {fields.map((f) => (
        <option key={f.token} value={f.token}>
          {f.label}
        </option>
      ))}
    </select>
  );
}

const inputClass =
  'w-full px-3 py-1.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--theme-accent)]';

interface FlowForm {
  id?: number;
  name: string;
  pipeline_id: string;
  trigger_stage_id: string;
  delay_hours: string;
  proposal_email_subject: string;
  proposal_email_body: string;
  proposal_viewed_stage_id: string;
  proposal_approved_stage_id: string;
  contract_email_subject: string;
  contract_email_body: string;
  contract_signed_stage_id: string;
  contract_template_id: string;
  proposal_reminder_delay_hours: string;
  proposal_reminder_email_subject: string;
  proposal_reminder_email_body: string;
}

const EMPTY_FORM: FlowForm = {
  name: '',
  pipeline_id: '',
  trigger_stage_id: '',
  delay_hours: '24',
  proposal_email_subject: '',
  proposal_email_body: '',
  proposal_viewed_stage_id: '',
  proposal_approved_stage_id: '',
  contract_email_subject: '',
  contract_email_body: '',
  contract_signed_stage_id: '',
  contract_template_id: '',
  proposal_reminder_delay_hours: '',
  proposal_reminder_email_subject: '',
  proposal_reminder_email_body: '',
};

export default function DocumentFlowModal({ open, onClose }: Props) {
  const { data: flows = [], isLoading } = useDocumentFlows(open);
  const { data: pipelines = [] } = usePipelines();
  const { data: contractTemplates = [] } = useContractTemplates();
  const saveFlow = useSaveDocumentFlow();
  const updateActive = useUpdateDocumentFlowActive();
  const deleteFlow = useDeleteDocumentFlow();

  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState<FlowForm>(EMPTY_FORM);
  const [error, setError] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);

  const proposalSubjectRef = useRef<HTMLInputElement>(null);
  const proposalBodyRef = useRef<HTMLTextAreaElement>(null);
  const contractSubjectRef = useRef<HTMLInputElement>(null);
  const contractBodyRef = useRef<HTMLTextAreaElement>(null);
  const reminderSubjectRef = useRef<HTMLInputElement>(null);
  const reminderBodyRef = useRef<HTMLTextAreaElement>(null);

  const { data: stages = [] } = useStages(form.pipeline_id ? Number(form.pipeline_id) : undefined);

  if (!open) return null;

  function openCreate() {
    setForm(EMPTY_FORM);
    setError(null);
    setFormOpen(true);
  }

  function openEdit(f: DocumentFlow) {
    setForm({
      id: f.id,
      name: f.name,
      pipeline_id: String(f.pipeline_id),
      trigger_stage_id: String(f.trigger_stage_id),
      delay_hours: String(f.delay_hours),
      proposal_email_subject: f.proposal_email_subject,
      proposal_email_body: f.proposal_email_body,
      proposal_viewed_stage_id: f.proposal_viewed_stage_id ? String(f.proposal_viewed_stage_id) : '',
      proposal_approved_stage_id: f.proposal_approved_stage_id ? String(f.proposal_approved_stage_id) : '',
      contract_email_subject: f.contract_email_subject,
      contract_email_body: f.contract_email_body,
      contract_signed_stage_id: f.contract_signed_stage_id ? String(f.contract_signed_stage_id) : '',
      contract_template_id: f.contract_template_id ? String(f.contract_template_id) : '',
      proposal_reminder_delay_hours: f.proposal_reminder_delay_hours != null ? String(f.proposal_reminder_delay_hours) : '',
      proposal_reminder_email_subject: f.proposal_reminder_email_subject || '',
      proposal_reminder_email_body: f.proposal_reminder_email_body || '',
    });
    setError(null);
    setFormOpen(true);
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    const triggerStageId = Number(form.trigger_stage_id);
    const delayHours = Number(form.delay_hours);
    if (!form.name.trim()) return setError('Give this flow a name.');
    if (!form.pipeline_id) return setError('Choose a pipeline.');
    if (!Number.isInteger(triggerStageId) || !triggerStageId) return setError('Choose a trigger stage.');
    if (!Number.isInteger(delayHours) || delayHours < 0) return setError('Delay hours must be 0 or more.');
    if (!form.proposal_email_subject.trim() || !form.proposal_email_body.trim()) {
      return setError('Proposal email subject and body are required.');
    }
    if (!form.contract_email_subject.trim() || !form.contract_email_body.trim()) {
      return setError('Contract email subject and body are required.');
    }
    const reminderDelayHours = form.proposal_reminder_delay_hours.trim() ? Number(form.proposal_reminder_delay_hours) : null;
    if (form.proposal_reminder_delay_hours.trim() && (!Number.isInteger(reminderDelayHours) || (reminderDelayHours ?? 0) <= 0)) {
      return setError('Reminder delay must be a whole number of hours greater than 0.');
    }
    if (reminderDelayHours != null && (!form.proposal_reminder_email_subject.trim() || !form.proposal_reminder_email_body.trim())) {
      return setError('Reminder email subject and body are required when a reminder delay is set.');
    }

    saveFlow.mutate(
      {
        id: form.id,
        name: form.name.trim(),
        trigger_stage_id: triggerStageId,
        delay_hours: delayHours,
        proposal_email_subject: form.proposal_email_subject.trim(),
        proposal_email_body: form.proposal_email_body,
        proposal_viewed_stage_id: form.proposal_viewed_stage_id ? Number(form.proposal_viewed_stage_id) : null,
        proposal_approved_stage_id: form.proposal_approved_stage_id ? Number(form.proposal_approved_stage_id) : null,
        contract_email_subject: form.contract_email_subject.trim(),
        contract_email_body: form.contract_email_body,
        contract_signed_stage_id: form.contract_signed_stage_id ? Number(form.contract_signed_stage_id) : null,
        contract_template_id: form.contract_template_id ? Number(form.contract_template_id) : null,
        proposal_reminder_delay_hours: reminderDelayHours,
        proposal_reminder_email_subject: reminderDelayHours != null ? form.proposal_reminder_email_subject.trim() : null,
        proposal_reminder_email_body: reminderDelayHours != null ? form.proposal_reminder_email_body : null,
      },
      {
        onSuccess: () => setFormOpen(false),
        onError: (err) => setError(err instanceof Error ? err.message : 'Failed to save.'),
      }
    );
  }

  return (
    <>
      <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col">
          <div className="flex items-center justify-between px-6 pt-6">
            <h3 className="text-lg font-bold text-slate-800">Proposal & Contract Flow</h3>
            <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
              <i className="fa-solid fa-xmark" />
            </button>
          </div>
          <p className="text-xs text-slate-500 px-6 mt-1">
            Reps create a proposal on a deal (Deal Detail → Proposals); this rule automatically emails its link N
            hours after the deal enters a stage, then moves the deal forward as the lead opens it, approves it, and
            signs the auto-generated contract. Placeholders:{' '}
            <code className="bg-slate-100 px-1 rounded">{'{{first_name}}'}</code>{' '}
            <code className="bg-slate-100 px-1 rounded">{'{{proposal_link}}'}</code>{' '}
            <code className="bg-slate-100 px-1 rounded">{'{{contract_link}}'}</code>
          </p>

          {!formOpen ? (
            <>
              <div className="px-6 mt-4">
                <button
                  type="button"
                  onClick={openCreate}
                  className="w-full px-4 py-2 text-sm font-semibold text-white bg-[var(--theme-accent)] hover:opacity-90 rounded-lg"
                >
                  + New Flow
                </button>
              </div>

              <div className="flex-1 overflow-y-auto px-6 py-4 space-y-2">
                {isLoading ? (
                  <p className="text-sm text-slate-400 py-4 text-center">Loading...</p>
                ) : flows.length === 0 ? (
                  <p className="text-sm text-slate-400 py-4 text-center">No flows configured yet.</p>
                ) : (
                  flows.map((f) => (
                    <div
                      key={f.id}
                      className={`px-3 py-2.5 border rounded-lg ${
                        f.is_active ? 'border-slate-200' : 'border-slate-100 bg-slate-50 opacity-60'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-slate-800 truncate">{f.name}</p>
                          <p className="text-[11px] text-slate-400 truncate">
                            {f.pipeline_name} → {f.trigger_stage_name} · sends after {f.delay_hours}h ·{' '}
                            {f.deals_in_stage} deal{f.deals_in_stage === 1 ? '' : 's'} in stage
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => openEdit(f)}
                          className="shrink-0 text-xs font-semibold text-indigo-600 hover:underline"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => updateActive.mutate({ id: f.id, isActive: !f.is_active })}
                          disabled={updateActive.isPending}
                          className={`shrink-0 px-2.5 py-1 text-[11px] font-semibold rounded-lg border disabled:opacity-40 ${
                            f.is_active
                              ? 'border-slate-200 text-slate-600 hover:bg-slate-50'
                              : 'border-emerald-200 text-emerald-700 hover:bg-emerald-50'
                          }`}
                        >
                          {f.is_active ? 'Pause' : 'Resume'}
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmDeleteId(f.id)}
                          className="shrink-0 text-slate-400 hover:text-rose-600"
                          title="Remove"
                        >
                          <i className="fa-solid fa-trash text-xs" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </>
          ) : (
            <form onSubmit={handleSubmit} className="px-6 py-4 space-y-3 overflow-y-auto">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Flow Name</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder="e.g. Inspection to Contract"
                  className={inputClass}
                />
              </div>

              <div className="flex gap-2">
                <div className="flex-1">
                  <label className="block text-xs font-medium text-slate-600 mb-1">Pipeline</label>
                  <select
                    value={form.pipeline_id}
                    onChange={(e) => setForm((f) => ({ ...f, pipeline_id: e.target.value, trigger_stage_id: '' }))}
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
                  <label className="block text-xs font-medium text-slate-600 mb-1">Trigger stage</label>
                  <select
                    value={form.trigger_stage_id}
                    onChange={(e) => setForm((f) => ({ ...f, trigger_stage_id: e.target.value }))}
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
                <div className="w-28">
                  <label className="block text-xs font-medium text-slate-600 mb-1">Delay (hrs)</label>
                  <input
                    type="number"
                    min={0}
                    value={form.delay_hours}
                    onChange={(e) => setForm((f) => ({ ...f, delay_hours: e.target.value }))}
                    className={inputClass}
                  />
                </div>
              </div>

              <div className="pt-2 border-t border-slate-100">
                <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
                  1. Proposal email (sent once a proposal exists on the deal)
                </h4>
                <div className="space-y-2">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-[11px] font-medium text-slate-500">Subject</label>
                      <FieldInserter
                        fields={PROPOSAL_FIELDS}
                        targetRef={proposalSubjectRef}
                        value={form.proposal_email_subject}
                        onChange={(v) => setForm((f) => ({ ...f, proposal_email_subject: v }))}
                      />
                    </div>
                    <input
                      ref={proposalSubjectRef}
                      type="text"
                      value={form.proposal_email_subject}
                      onChange={(e) => setForm((f) => ({ ...f, proposal_email_subject: e.target.value }))}
                      placeholder="Subject — e.g. Your proposal is ready"
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-[11px] font-medium text-slate-500">Body</label>
                      <FieldInserter
                        fields={PROPOSAL_FIELDS}
                        targetRef={proposalBodyRef}
                        value={form.proposal_email_body}
                        onChange={(v) => setForm((f) => ({ ...f, proposal_email_body: v }))}
                      />
                    </div>
                    <textarea
                      ref={proposalBodyRef}
                      value={form.proposal_email_body}
                      onChange={(e) => setForm((f) => ({ ...f, proposal_email_body: e.target.value }))}
                      rows={3}
                      placeholder="Hi {{first_name}}, please review your proposal here: {{proposal_link}}"
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-slate-500 mb-1">
                      When the lead opens the link, move the deal to
                    </label>
                    <select
                      value={form.proposal_viewed_stage_id}
                      onChange={(e) => setForm((f) => ({ ...f, proposal_viewed_stage_id: e.target.value }))}
                      disabled={!form.pipeline_id}
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
                </div>
              </div>

              <div className="pt-2 border-t border-slate-100">
                <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
                  Follow-up if viewed but not approved
                </h4>
                <div className="space-y-2">
                  <div>
                    <label className="block text-[11px] font-medium text-slate-500 mb-1">
                      Send a reminder if not approved within (hours)
                    </label>
                    <input
                      type="number"
                      min={1}
                      value={form.proposal_reminder_delay_hours}
                      onChange={(e) => setForm((f) => ({ ...f, proposal_reminder_delay_hours: e.target.value }))}
                      placeholder="Leave blank to disable"
                      className={inputClass}
                    />
                  </div>
                  {form.proposal_reminder_delay_hours.trim() && (
                    <>
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="text-[11px] font-medium text-slate-500">Reminder subject</label>
                          <FieldInserter
                            fields={PROPOSAL_FIELDS}
                            targetRef={reminderSubjectRef}
                            value={form.proposal_reminder_email_subject}
                            onChange={(v) => setForm((f) => ({ ...f, proposal_reminder_email_subject: v }))}
                          />
                        </div>
                        <input
                          ref={reminderSubjectRef}
                          type="text"
                          value={form.proposal_reminder_email_subject}
                          onChange={(e) => setForm((f) => ({ ...f, proposal_reminder_email_subject: e.target.value }))}
                          placeholder="Subject — e.g. Still interested? Your proposal is waiting"
                          className={inputClass}
                        />
                      </div>
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="text-[11px] font-medium text-slate-500">Reminder body</label>
                          <FieldInserter
                            fields={PROPOSAL_FIELDS}
                            targetRef={reminderBodyRef}
                            value={form.proposal_reminder_email_body}
                            onChange={(v) => setForm((f) => ({ ...f, proposal_reminder_email_body: v }))}
                          />
                        </div>
                        <textarea
                          ref={reminderBodyRef}
                          value={form.proposal_reminder_email_body}
                          onChange={(e) => setForm((f) => ({ ...f, proposal_reminder_email_body: e.target.value }))}
                          rows={3}
                          placeholder="Hi {{first_name}}, just following up on your proposal: {{proposal_link}}"
                          className={inputClass}
                        />
                      </div>
                    </>
                  )}
                  <p className="text-[10px] text-slate-400">
                    Fires once, only for a proposal that's been viewed but not approved — sent exactly one time per
                    proposal, never repeats.
                  </p>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-100">
                <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
                  2. When the lead clicks Approve — auto-generated contract
                </h4>
                <div className="space-y-2">
                  <div>
                    <label className="block text-[11px] font-medium text-slate-500 mb-1">Contract template</label>
                    <select
                      value={form.contract_template_id}
                      onChange={(e) => setForm((f) => ({ ...f, contract_template_id: e.target.value }))}
                      className={inputClass}
                    >
                      <option value="">Clone the proposal's own content (no template linked)</option>
                      {contractTemplates.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.title}
                        </option>
                      ))}
                    </select>
                    <p className="text-[10px] text-slate-400 mt-1">
                      The generated contract is tied to the lead who approved and their deal — its content comes from
                      this template (or the proposal itself if none is chosen).
                    </p>
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-[11px] font-medium text-slate-500">Subject</label>
                      <FieldInserter
                        fields={CONTRACT_FIELDS}
                        targetRef={contractSubjectRef}
                        value={form.contract_email_subject}
                        onChange={(v) => setForm((f) => ({ ...f, contract_email_subject: v }))}
                      />
                    </div>
                    <input
                      ref={contractSubjectRef}
                      type="text"
                      value={form.contract_email_subject}
                      onChange={(e) => setForm((f) => ({ ...f, contract_email_subject: e.target.value }))}
                      placeholder="Subject — e.g. Your contract is ready to sign"
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-[11px] font-medium text-slate-500">Body</label>
                      <FieldInserter
                        fields={CONTRACT_FIELDS}
                        targetRef={contractBodyRef}
                        value={form.contract_email_body}
                        onChange={(v) => setForm((f) => ({ ...f, contract_email_body: v }))}
                      />
                    </div>
                    <textarea
                      ref={contractBodyRef}
                      value={form.contract_email_body}
                      onChange={(e) => setForm((f) => ({ ...f, contract_email_body: e.target.value }))}
                      rows={3}
                      placeholder="Hi {{first_name}}, please sign your contract here: {{contract_link}}"
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-slate-500 mb-1">
                      On approval, move the deal to
                    </label>
                    <select
                      value={form.proposal_approved_stage_id}
                      onChange={(e) => setForm((f) => ({ ...f, proposal_approved_stage_id: e.target.value }))}
                      disabled={!form.pipeline_id}
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
                </div>
              </div>

              <div className="pt-2 border-t border-slate-100">
                <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
                  3. When the lead signs the contract
                </h4>
                <label className="block text-[11px] font-medium text-slate-500 mb-1">Move the deal to</label>
                <select
                  value={form.contract_signed_stage_id}
                  onChange={(e) => setForm((f) => ({ ...f, contract_signed_stage_id: e.target.value }))}
                  disabled={!form.pipeline_id}
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

              {error && (
                <p className="text-xs text-rose-600 bg-rose-50 border border-rose-200 rounded-md px-2 py-1">{error}</p>
              )}
              <div className="flex gap-2 pt-1">
                <button
                  type="submit"
                  disabled={saveFlow.isPending}
                  className="flex-1 px-4 py-2 text-sm font-semibold text-white bg-[var(--theme-accent)] hover:opacity-90 rounded-lg disabled:opacity-50"
                >
                  {saveFlow.isPending ? 'Saving...' : 'Save Flow'}
                </button>
                <button
                  type="button"
                  onClick={() => setFormOpen(false)}
                  disabled={saveFlow.isPending}
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
        title="Remove Document Flow"
        body="Existing proposals and contracts already created under this flow are kept, but future automation for this stage stops immediately."
        confirmLabel="Remove"
        danger
        isSubmitting={deleteFlow.isPending}
        onCancel={() => setConfirmDeleteId(null)}
        onConfirm={() => {
          if (confirmDeleteId != null) {
            deleteFlow.mutate(confirmDeleteId, { onSuccess: () => setConfirmDeleteId(null) });
          }
        }}
      />
    </>
  );
}
