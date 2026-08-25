import { FormEvent, useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useEmailTemplates, useSaveEmailTemplate } from '../hooks/useEmailTemplates';
import { AUTOMATION_DYNAMIC_FIELDS, insertAtCursor } from '../components/DynamicFieldDropdown';
import DynamicFieldsPanel from '../components/DynamicFieldsPanel';

const inputClass =
  'w-full px-3 py-1.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--theme-accent)]';

interface Form {
  id?: number;
  name: string;
  trigger_event: string;
  subject: string;
  body: string;
}

const EMPTY_FORM: Form = { name: '', trigger_event: '', subject: '', body: '' };

export default function EmailTemplateEditorPage() {
  const { id } = useParams();
  const isEdit = id != null && id !== 'new';
  const navigate = useNavigate();

  const { data: templates = [] } = useEmailTemplates();
  const saveTemplate = useSaveEmailTemplate();

  const [form, setForm] = useState<Form>(EMPTY_FORM);
  const [error, setError] = useState<string | null>(null);
  const [loadedExisting, setLoadedExisting] = useState(false);
  const [activeField, setActiveField] = useState<'subject' | 'body' | null>(null);
  const subjectRef = useRef<HTMLInputElement>(null);
  const bodyRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!isEdit || loadedExisting) return;
    const t = templates.find((x) => String(x.id) === id);
    if (!t) return;
    setForm({ id: t.id, name: t.name, trigger_event: t.trigger_event || '', subject: t.subject, body: t.body });
    setLoadedExisting(true);
  }, [isEdit, loadedExisting, templates, id]);

  function insertIntoActiveField(token: string) {
    if (activeField === 'subject') {
      insertAtCursor(subjectRef.current, form.subject, token, (v) => setForm((f) => ({ ...f, subject: v })));
    } else if (activeField === 'body') {
      insertAtCursor(bodyRef.current, form.body, token, (v) => setForm((f) => ({ ...f, body: v })));
    }
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!form.name.trim()) return setError('Give this template a name.');
    if (!form.subject.trim()) return setError('Write a subject line.');
    if (!form.body.trim()) return setError('Write the email body.');

    saveTemplate.mutate(
      {
        id: form.id,
        name: form.name.trim(),
        trigger_event: form.trigger_event || null,
        subject: form.subject.trim(),
        body: form.body,
      },
      {
        onSuccess: () => navigate('/documents/templates'),
        onError: (err) => setError(err instanceof Error ? err.message : 'Failed to save.'),
      }
    );
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-white">
      <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-slate-200 bg-white shrink-0">
        <button
          type="button"
          onClick={() => navigate('/documents/templates')}
          className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 shrink-0"
        >
          <i className="fa-solid fa-chevron-left text-xs" />
          Back
        </button>

        <input
          value={form.name}
          onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
          placeholder="New Email Template"
          className="flex-1 max-w-md text-center text-sm font-semibold text-slate-800 border border-slate-200 rounded-full px-4 py-1.5 focus:outline-none focus:ring-2 focus:ring-[var(--theme-accent)] focus:border-transparent"
        />

        <div className="flex items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={handleSubmit}
            disabled={saveTemplate.isPending}
            className="px-4 py-2 text-sm font-semibold text-white bg-[var(--theme-accent)] hover:opacity-90 rounded-lg disabled:opacity-50"
          >
            {saveTemplate.isPending ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        <div className="flex-1 overflow-y-auto p-6">
          <form onSubmit={handleSubmit} className="max-w-2xl mx-auto space-y-4">
            {error && <p className="text-xs text-rose-600 bg-rose-50 border border-rose-200 rounded-md px-2 py-1">{error}</p>}

            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Auto-send trigger</label>
              <select
                value={form.trigger_event}
                onChange={(e) => setForm((f) => ({ ...f, trigger_event: e.target.value }))}
                className={inputClass}
              >
                <option value="">None (manual use only)</option>
                <option value="proposal_approved">When a proposal is approved</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Subject</label>
              <input
                ref={subjectRef}
                type="text"
                value={form.subject}
                onChange={(e) => setForm((f) => ({ ...f, subject: e.target.value }))}
                onFocus={() => setActiveField('subject')}
                placeholder="e.g. Thank you for your business!"
                className={inputClass}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Body</label>
              <textarea
                ref={bodyRef}
                value={form.body}
                onChange={(e) => setForm((f) => ({ ...f, body: e.target.value }))}
                onFocus={() => setActiveField('body')}
                rows={10}
                placeholder="Placeholders: {{first_name}} {{last_name}} {{deal_name}}"
                className={inputClass}
              />
            </div>
          </form>
        </div>

        <DynamicFieldsPanel fields={AUTOMATION_DYNAMIC_FIELDS} activeField={activeField} onInsert={insertIntoActiveField} />
      </div>
    </div>
  );
}
