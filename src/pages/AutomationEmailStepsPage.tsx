import { useEffect, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useAutomationEmailSteps, useUpdateAutomationEmailStep } from '../hooks/useAutomationEmailSteps';
import { useEmailTemplates, useSaveEmailTemplate } from '../hooks/useEmailTemplates';
import { API_BASE_URL } from '../api/client';

const inputClass =
  'w-full px-3 py-1.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--theme-accent)]';

// Each step's email copy lives in a real email_templates row — this page
// edits that row directly (no n8n changes needed) and, separately, lets a
// rep repoint a step at a totally different existing template (which DOES
// require a small automation_email_steps update, but never touches the
// n8n workflow itself — the workflow always resolves the current template
// live by step_key).
export default function AutomationEmailStepsPage() {
  const { workflowId } = useParams();
  const [searchParams] = useSearchParams();
  const workflowName = searchParams.get('name') || 'Automation';
  const navigate = useNavigate();

  const { data: steps = [], isLoading } = useAutomationEmailSteps(workflowId || '');
  const { data: templates = [] } = useEmailTemplates();
  const updateStep = useUpdateAutomationEmailStep(workflowId || '');
  const saveTemplate = useSaveEmailTemplate();

  const [openStepKey, setOpenStepKey] = useState<string | null>(null);
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const openStep = steps.find((s) => s.step_key === openStepKey);

  useEffect(() => {
    if (openStep) {
      setSubject(openStep.subject);
      setBody(openStep.body);
      setError(null);
      setSaved(false);
    }
  }, [openStep?.step_key, openStep?.subject, openStep?.body]);

  if (!workflowId) return null;

  function handleSaveCopy() {
    if (!openStep) return;
    setError(null);
    setSaved(false);
    if (!subject.trim()) return setError('Subject is required.');
    saveTemplate.mutate(
      { id: openStep.email_template_id, name: `[${workflowName}] ${openStep.label}`, subject: subject.trim(), body },
      {
        onSuccess: () => setSaved(true),
        onError: (err) => setError(err instanceof Error ? err.message : 'Failed to save.'),
      }
    );
  }

  function handleSwapTemplate(stepKey: string, templateId: number) {
    if (!workflowId) return;
    updateStep.mutate({ n8n_workflow_id: workflowId, step_key: stepKey, email_template_id: templateId });
  }

  return (
    <div className="flex-1 overflow-y-auto p-6">
      <div className="max-w-3xl mx-auto">
        <button
          type="button"
          onClick={() => navigate('/automations')}
          className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 mb-2"
        >
          <i className="fa-solid fa-chevron-left text-xs" />
          Back to Automations
        </button>

        <div className="flex items-center justify-between mb-1">
          <h1 className="text-lg font-bold text-slate-800">{workflowName}</h1>
          <a
            href={`${API_BASE_URL}/workflow/${workflowId}`}
            target="_blank"
            rel="noreferrer"
            className="text-xs font-semibold text-[var(--theme-accent)] hover:underline shrink-0"
          >
            View workflow in n8n <i className="fa-solid fa-arrow-up-right-from-square ml-0.5" />
          </a>
        </div>
        <p className="text-xs text-slate-500 mb-5">
          Edit the copy each step sends, or point a step at a different existing template. The automation's logic
          (waits, branching, tagging) lives in n8n and isn't editable here.
        </p>

        {isLoading ? (
          <p className="text-sm text-slate-400">Loading...</p>
        ) : steps.length === 0 ? (
          <p className="text-sm text-slate-400 italic">
            This automation has no editable email steps registered yet.
          </p>
        ) : (
          <div className="space-y-2">
            {steps.map((s) => (
              <div key={s.step_key} className="bg-white border border-slate-200 rounded-lg overflow-hidden">
                <div className="px-4 py-3 flex items-center gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-slate-800">{s.label}</p>
                    <p className="text-[11px] text-slate-400 truncate">{s.subject}</p>
                  </div>
                  <select
                    value={s.email_template_id}
                    onChange={(e) => handleSwapTemplate(s.step_key, Number(e.target.value))}
                    onClick={(e) => e.stopPropagation()}
                    className="shrink-0 text-xs px-2 py-1.5 rounded-lg border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-[var(--theme-accent)]"
                    title="Use a different existing template for this step"
                  >
                    {templates.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => setOpenStepKey(openStepKey === s.step_key ? null : s.step_key)}
                    className="shrink-0 text-xs font-semibold text-[var(--theme-accent)] hover:underline"
                  >
                    {openStepKey === s.step_key ? 'Close' : 'Edit copy'}
                  </button>
                </div>

                {openStepKey === s.step_key && (
                  <div className="px-4 pb-4 pt-1 border-t border-slate-100 space-y-2">
                    <div>
                      <label className="block text-[11px] font-medium text-slate-500 mb-1">Subject</label>
                      <input type="text" value={subject} onChange={(e) => setSubject(e.target.value)} className={inputClass} />
                    </div>
                    <div>
                      <label className="block text-[11px] font-medium text-slate-500 mb-1">Body</label>
                      <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={6} className={inputClass} />
                    </div>
                    <p className="text-[10px] text-slate-400">
                      Placeholders: <code className="bg-slate-100 px-1 rounded">{'{{first_name}}'}</code>{' '}
                      <code className="bg-slate-100 px-1 rounded">{'{{last_name}}'}</code>{' '}
                      <code className="bg-slate-100 px-1 rounded">{'{{email}}'}</code>
                    </p>
                    {error && <p className="text-xs text-rose-600 bg-rose-50 border border-rose-200 rounded-md px-2 py-1">{error}</p>}
                    {saved && <p className="text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-md px-2 py-1">Saved.</p>}
                    <button
                      type="button"
                      onClick={handleSaveCopy}
                      disabled={saveTemplate.isPending}
                      className="px-4 py-1.5 text-sm font-semibold text-white bg-[var(--theme-accent)] hover:opacity-90 rounded-lg disabled:opacity-50"
                    >
                      {saveTemplate.isPending ? 'Saving...' : 'Save Copy'}
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
