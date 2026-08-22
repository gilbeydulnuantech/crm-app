import { FormEvent, useRef, useState } from 'react';
import {
  useEmailTemplates,
  useSaveEmailTemplate,
  useSetEmailTemplateActive,
  useDeleteEmailTemplate,
} from '../hooks/useEmailTemplates';
import { EmailTemplate } from '../api/emailTemplates';
import ConfirmDialog from '../components/ConfirmDialog';
import DynamicFieldDropdown, { insertAtCursor } from '../components/DynamicFieldDropdown';

const inputClass =
  'w-full px-3 py-1.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--theme-accent)]';

// Contracts now live on their own pages (Sidebar → Contracts) — this page is
// Email Templates only.
export default function Documents() {
  return (
    <div className="flex-1 overflow-y-auto p-6">
      <EmailTemplatesPanel />
    </div>
  );
}

interface EmailTemplateForm {
  id?: number;
  name: string;
  trigger_event: string;
  subject: string;
  body: string;
}

const EMPTY_TEMPLATE_FORM: EmailTemplateForm = {
  name: '',
  trigger_event: '',
  subject: '',
  body: '',
};

const TRIGGER_LABEL: Record<string, string> = {
  proposal_approved: 'When a proposal is approved',
};

function EmailTemplatesPanel() {
  const { data: templates = [], isLoading, error: loadError } = useEmailTemplates();
  const saveTemplate = useSaveEmailTemplate();
  const setActive = useSetEmailTemplateActive();
  const deleteTemplate = useDeleteEmailTemplate();

  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState<EmailTemplateForm>(EMPTY_TEMPLATE_FORM);
  const [error, setError] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const subjectRef = useRef<HTMLInputElement>(null);
  const bodyRef = useRef<HTMLTextAreaElement>(null);

  function openEdit(t: EmailTemplate) {
    setForm({ id: t.id, name: t.name, trigger_event: t.trigger_event || '', subject: t.subject, body: t.body });
    setError(null);
    setFormOpen(true);
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
        onSuccess: () => {
          setFormOpen(false);
          setForm(EMPTY_TEMPLATE_FORM);
        },
        onError: (err) => setError(err instanceof Error ? err.message : 'Failed to save.'),
      }
    );
  }

  return (
    <div className="max-w-3xl">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold text-slate-800">Email Templates</h2>
        {!formOpen && (
          <button
            type="button"
            onClick={() => {
              setForm(EMPTY_TEMPLATE_FORM);
              setFormOpen(true);
            }}
            className="px-4 py-2 text-sm font-semibold text-white bg-[var(--theme-accent)] hover:opacity-90 rounded-lg"
          >
            + New Template
          </button>
        )}
      </div>
      <p className="text-xs text-slate-500 -mt-2 mb-4">
        Reusable emails, like a thank-you note. Pick one from a proposal's "Customize the send email" section to
        fill in its subject/body, or set an auto-send trigger to have it fire on its own — e.g. the moment a lead
        approves a proposal.
      </p>

      {formOpen ? (
        <form onSubmit={handleSubmit} className="bg-white border border-slate-200 rounded-xl p-5 space-y-3">
          <div className="flex gap-2">
            <div className="flex-1">
              <label className="block text-xs font-medium text-slate-600 mb-1">Name</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="e.g. Thank You After Approval"
                className={inputClass}
              />
            </div>
            <div className="w-64">
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
          </div>
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-medium text-slate-600">Subject</label>
              <DynamicFieldDropdown
                onInsert={(token) =>
                  insertAtCursor(subjectRef.current, form.subject, token, (v) => setForm((f) => ({ ...f, subject: v })))
                }
              />
            </div>
            <input
              ref={subjectRef}
              type="text"
              value={form.subject}
              onChange={(e) => setForm((f) => ({ ...f, subject: e.target.value }))}
              placeholder="e.g. Thank you for your business!"
              className={inputClass}
            />
          </div>
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-medium text-slate-600">Body</label>
              <DynamicFieldDropdown
                onInsert={(token) =>
                  insertAtCursor(bodyRef.current, form.body, token, (v) => setForm((f) => ({ ...f, body: v })))
                }
              />
            </div>
            <textarea
              ref={bodyRef}
              value={form.body}
              onChange={(e) => setForm((f) => ({ ...f, body: e.target.value }))}
              rows={6}
              placeholder="Placeholders: {{first_name}} {{last_name}} {{deal_name}}"
              className={inputClass}
            />
          </div>

          {error && <p className="text-xs text-rose-600 bg-rose-50 border border-rose-200 rounded-md px-2 py-1">{error}</p>}
          <div className="flex gap-2 pt-1">
            <button
              type="submit"
              disabled={saveTemplate.isPending}
              className="flex-1 px-4 py-2 text-sm font-semibold text-white bg-[var(--theme-accent)] hover:opacity-90 rounded-lg disabled:opacity-50"
            >
              {saveTemplate.isPending ? 'Saving...' : 'Save Template'}
            </button>
            <button
              type="button"
              onClick={() => {
                setFormOpen(false);
                setForm(EMPTY_TEMPLATE_FORM);
                setError(null);
              }}
              className="flex-1 px-4 py-2 text-sm font-medium border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-lg"
            >
              Cancel
            </button>
          </div>
        </form>
      ) : isLoading ? (
        <p className="text-sm text-slate-400">Loading...</p>
      ) : loadError ? (
        <p className="text-sm text-rose-600 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2">
          {loadError instanceof Error ? loadError.message : 'Failed to load email templates.'}
        </p>
      ) : templates.length === 0 ? (
        <p className="text-sm text-slate-400 italic">No email templates yet.</p>
      ) : (
        <div className="space-y-2">
          {templates.map((t) => (
            <div key={t.id} className="bg-white px-4 py-3 border border-slate-200 rounded-lg">
              <div className="flex items-center gap-3">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-slate-800 truncate">{t.name}</p>
                  <p className="text-[11px] text-slate-400 truncate">{t.subject}</p>
                </div>
                {t.trigger_event && (
                  <span
                    className={`shrink-0 px-1.5 py-0.5 text-[10px] font-semibold rounded-full ${
                      t.is_active ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-500'
                    }`}
                  >
                    {t.is_active ? 'Auto-sends' : 'Auto-send off'} · {TRIGGER_LABEL[t.trigger_event] || t.trigger_event}
                  </span>
                )}
                {t.trigger_event && (
                  <button
                    type="button"
                    onClick={() => setActive.mutate({ id: t.id, is_active: !t.is_active })}
                    disabled={setActive.isPending}
                    title={t.is_active ? 'Turn off auto-send' : 'Turn on auto-send'}
                    className="shrink-0 text-slate-400 hover:text-indigo-600 disabled:opacity-30"
                  >
                    <i className={`fa-solid ${t.is_active ? 'fa-toggle-on' : 'fa-toggle-off'} text-sm`} />
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => openEdit(t)}
                  title="Edit"
                  className="shrink-0 text-slate-400 hover:text-indigo-600"
                >
                  <i className="fa-solid fa-pen text-xs" />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setDeleteError(null);
                    setConfirmDeleteId(t.id);
                  }}
                  title="Delete"
                  className="shrink-0 text-slate-400 hover:text-rose-600"
                >
                  <i className="fa-solid fa-trash text-xs" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <ConfirmDialog
        open={confirmDeleteId != null}
        title="Delete Email Template"
        body="This permanently removes the template. If it's set to auto-send, that automation stops."
        confirmLabel="Delete"
        danger
        error={deleteError}
        isSubmitting={deleteTemplate.isPending}
        onCancel={() => {
          setConfirmDeleteId(null);
          setDeleteError(null);
        }}
        onConfirm={() => {
          if (confirmDeleteId == null) return;
          setDeleteError(null);
          deleteTemplate.mutate(confirmDeleteId, {
            onSuccess: () => setConfirmDeleteId(null),
            onError: (err) => setDeleteError(err instanceof Error ? err.message : 'Failed to delete.'),
          });
        }}
      />
    </div>
  );
}
