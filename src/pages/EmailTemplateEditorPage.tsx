import { FormEvent, useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useEmailTemplates, useSaveEmailTemplate, useSendEmailTemplate } from '../hooks/useEmailTemplates';
import DynamicFieldDropdown, { AUTOMATION_DYNAMIC_FIELDS, insertAtCursor } from '../components/DynamicFieldDropdown';
import ContactPicker from '../components/pipeline/ContactPicker';
import { useContacts } from '../hooks/useContacts';
import { useCompanyProfile } from '../hooks/useCompanyProfile';
import { fillContactEmailTokens } from '../utils/emailTemplateTokens';
import { EMAIL_TRIGGER_EVENTS } from '../constants/emailTriggerEvents';
import RichTextEditor, { RichTextEditorHandle } from '../components/RichTextEditor';
import { useProducts } from '../hooks/useProducts';
import { resolveProductTokens } from '../utils/mergeFields';
import { escapeHtml, htmlToPlainText, plainTextToHtml } from '../utils/emailHtml';

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
  const { data: contacts = [] } = useContacts();
  const { data: companyProfile } = useCompanyProfile();
  const saveTemplate = useSaveEmailTemplate();
  const sendTemplate = useSendEmailTemplate();

  const [form, setForm] = useState<Form>(EMPTY_FORM);
  const [error, setError] = useState<string | null>(null);
  const [loadedExisting, setLoadedExisting] = useState(false);
  const [activeField, setActiveField] = useState<'subject' | 'body' | null>(null);
  const subjectRef = useRef<HTMLInputElement>(null);
  const bodyEditorRef = useRef<RichTextEditorHandle>(null);
  const { data: products = [] } = useProducts();

  const [showSendBar, setShowSendBar] = useState(false);
  const [sendContactId, setSendContactId] = useState<number | null>(null);
  const [sendContactName, setSendContactName] = useState('');
  const [sendError, setSendError] = useState<string | null>(null);

  useEffect(() => {
    if (!isEdit || loadedExisting) return;
    const t = templates.find((x) => String(x.id) === id);
    if (!t) return;
    // Plain-text templates open as paragraphs in the formatted editor; saving stores them as formatted from then on.
    setForm({ id: t.id, name: t.name, trigger_event: t.trigger_event || '', subject: t.subject, body: t.is_html ? t.body : plainTextToHtml(t.body) });
    setLoadedExisting(true);
  }, [isEdit, loadedExisting, templates, id]);

  function insertIntoActiveField(token: string) {
    if (activeField === 'subject') {
      insertAtCursor(subjectRef.current, form.subject, token, (v) => setForm((f) => ({ ...f, subject: v })));
    } else if (activeField === 'body') {
      bodyEditorRef.current?.insertText(token);
    }
  }

  function handleSend() {
    setSendError(null);
    if (!form.id) return;
    if (!sendContactId) return setSendError('Pick a contact to send to.');
    const contact = contacts.find((c) => c.id === sendContactId);
    if (!contact?.email) return setSendError('That contact has no email address on file.');

    const ownCompanyName = companyProfile?.company_name || '';
    const subject = fillContactEmailTokens(form.subject, contact, ownCompanyName);
    // Product tokens become their description and price; every other merge value is escaped so contact data can't inject markup.
    const withProducts = resolveProductTokens(form.body, products);
    const htmlMessage = withProducts.replace(/\{\{[^{}]*\}\}/g, (tok) => escapeHtml(fillContactEmailTokens(tok, contact, ownCompanyName)));
    const message = htmlToPlainText(htmlMessage);

    sendTemplate.mutate(
      { to: contact.email, subject, message, is_html: true, html_message: htmlMessage, contact_id: sendContactId },
      {
        onSuccess: () => {
          setShowSendBar(false);
          setSendContactId(null);
          setSendContactName('');
        },
        onError: (err) => setSendError(err instanceof Error ? err.message : 'Failed to send.'),
      }
    );
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!form.name.trim()) return setError('Give this template a name.');
    if (!form.subject.trim()) return setError('Write a subject line.');
    if (!form.body.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim() && !/<img\b/i.test(form.body)) return setError('Write the email body.');

    saveTemplate.mutate(
      {
        id: form.id,
        name: form.name.trim(),
        trigger_event: form.trigger_event || null,
        subject: form.subject.trim(),
        body: form.body,
        is_html: true,
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
            onClick={() => {
              setSendError(null);
              setShowSendBar((v) => !v);
            }}
            disabled={!form.id}
            title={!form.id ? 'Save the template before sending it.' : undefined}
            className="px-4 py-2 text-sm font-semibold text-emerald-600 hover:underline disabled:opacity-40"
          >
            Send
          </button>
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

      {showSendBar && (
        <div className="flex items-start gap-3 px-4 py-3 border-b border-slate-200 bg-slate-50 shrink-0">
          <div className="flex-1 max-w-sm">
            <ContactPicker
              contactId={sendContactId}
              contactName={sendContactName}
              onChange={(id, name) => {
                setSendContactId(id);
                setSendContactName(name);
              }}
              required={false}
            />
          </div>
          <div className="flex items-center gap-2 pt-5">
            <button
              type="button"
              onClick={handleSend}
              disabled={sendTemplate.isPending}
              className="px-4 py-1.5 text-sm font-semibold text-white bg-emerald-600 hover:opacity-90 rounded-lg disabled:opacity-50"
            >
              {sendTemplate.isPending ? 'Sending...' : 'Send email'}
            </button>
            <button
              type="button"
              onClick={() => {
                setShowSendBar(false);
                setSendError(null);
              }}
              className="px-3 py-1.5 text-sm text-slate-500 hover:text-slate-700"
            >
              Cancel
            </button>
          </div>
          {sendError && (
            <p className="text-xs text-rose-600 bg-rose-50 border border-rose-200 rounded-md px-2 py-1 mt-5">
              {sendError}
            </p>
          )}
        </div>
      )}

      <div className="flex-1 flex overflow-hidden">
        <div className="flex-1 overflow-y-auto p-6">
          <form onSubmit={handleSubmit} className="max-w-3xl mx-auto space-y-4">
            {error && <p className="text-xs text-rose-600 bg-rose-50 border border-rose-200 rounded-md px-2 py-1">{error}</p>}

            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Auto-send trigger</label>
              <select
                value={form.trigger_event}
                onChange={(e) => setForm((f) => ({ ...f, trigger_event: e.target.value }))}
                className={inputClass}
              >
                <option value="">None (manual use only)</option>
                {EMAIL_TRIGGER_EVENTS.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
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
              <div onFocusCapture={() => setActiveField('body')}>
                <RichTextEditor
                  ref={bodyEditorRef}
                  variant="email"
                  value={form.body}
                  onChange={(html) => setForm((f) => ({ ...f, body: html }))}
                />
              </div>
              <p className="text-[11px] text-slate-400 mt-1">
                Use the toolbar for bold, lists, links and images. Merge fields (like {'{{contact.first_name}}'}) and product tokens work anywhere in the text.
              </p>
            </div>
          </form>
        </div>

        <div className="w-64 shrink-0 border-l border-slate-200 bg-slate-50 overflow-y-auto p-4">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Dynamic Fields</p>
          <p className={`text-xs mb-3 ${activeField ? 'text-emerald-700' : 'text-slate-400 italic'}`}>
            {activeField ? 'Click a field below to insert it here.' : 'Click into Subject or Body first.'}
          </p>
          <DynamicFieldDropdown fields={AUTOMATION_DYNAMIC_FIELDS} onInsert={insertIntoActiveField} />
        </div>
      </div>
    </div>
  );
}
