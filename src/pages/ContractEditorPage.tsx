import { FormEvent, useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useContractTemplates, useSaveContractTemplate } from '../hooks/useContractTemplates';
import { useEmailTemplates } from '../hooks/useEmailTemplates';
import { usePages } from '../hooks/usePages';
import ScopeOfWorkEditor from '../components/ScopeOfWorkEditor';
import ContractPreviewOverlay from '../components/contracts/ContractPreviewOverlay';
import DynamicFieldDropdown, { AUTOMATION_DYNAMIC_FIELDS, insertAtCursor } from '../components/DynamicFieldDropdown';
import { RichTextEditorHandle } from '../components/RichTextEditor';
import { buildDraftPdf } from '../utils/contractPdf';
import { templatePlainBody } from '../utils/emailHtml';

const inputClass =
  'w-full px-3 py-1.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--theme-accent)]';

interface ContractForm {
  id?: number;
  title: string;
  content_html: string;
  email_subject: string;
  email_body: string;
  thank_you_page_id: string;
}

const EMPTY_FORM: ContractForm = {
  title: '',
  content_html: '',
  email_subject: '',
  email_body: '',
  thank_you_page_id: '',
};

export default function ContractEditorPage() {
  const { id } = useParams();
  const isEdit = id != null && id !== 'new';
  const navigate = useNavigate();

  const { data: templates = [] } = useContractTemplates();
  const { data: emailTemplates = [] } = useEmailTemplates();
  const { data: pages = [] } = usePages();
  const saveContractTemplate = useSaveContractTemplate();

  const [form, setForm] = useState<ContractForm>(EMPTY_FORM);
  const [error, setError] = useState<string | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [emailPanelOpen, setEmailPanelOpen] = useState(false);
  const [loadedExisting, setLoadedExisting] = useState(false);
  const [focusedComposeField, setFocusedComposeField] = useState<'subject' | 'body'>('body');
  const emailSubjectRef = useRef<HTMLInputElement>(null);
  const emailBodyRef = useRef<HTMLTextAreaElement>(null);
  const editorRef = useRef<RichTextEditorHandle>(null);
  const toolbarContainerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // Load the existing template into the form once its data arrives.
  useEffect(() => {
    if (!isEdit || loadedExisting) return;
    const t = templates.find((x) => String(x.id) === id);
    if (!t) return;
    setForm({
      id: t.id,
      title: t.title,
      content_html: t.content_html,
      email_subject: t.email_subject,
      email_body: t.email_body,
      thank_you_page_id: t.thank_you_page_id ? String(t.thank_you_page_id) : '',
    });
    setLoadedExisting(true);
  }, [isEdit, loadedExisting, templates, id]);

  useEffect(() => {
    if (!menuOpen) return;
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [menuOpen]);

  function applyEmailTemplate(templateId: string) {
    const tmpl = emailTemplates.find((t) => String(t.id) === templateId);
    if (!tmpl) return;
    setForm((f) => ({ ...f, email_subject: tmpl.subject, email_body: templatePlainBody(tmpl) }));
  }

  function insertIntoComposeField(token: string) {
    if (focusedComposeField === 'subject') {
      insertAtCursor(emailSubjectRef.current, form.email_subject, token, (v) => setForm((f) => ({ ...f, email_subject: v })));
    } else {
      insertAtCursor(emailBodyRef.current, form.email_body, token, (v) => setForm((f) => ({ ...f, email_body: v })));
    }
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!form.title.trim()) return setError('Give this contract a title.');
    const plainText = form.content_html.replace(/<[^>]*>/g, '').trim();
    if (!plainText) return setError('Write the contract content.');

    saveContractTemplate.mutate(
      {
        id: form.id,
        title: form.title.trim(),
        content_html: form.content_html,
        email_subject: form.email_subject.trim() || undefined,
        email_body: form.email_body.trim() || undefined,
        thank_you_page_id: form.thank_you_page_id ? Number(form.thank_you_page_id) : null,
      },
      {
        onSuccess: () => navigate('/documents/contracts'),
        onError: (err) => setError(err instanceof Error ? err.message : 'Failed to save.'),
      }
    );
  }

  function handleDownload() {
    const doc = buildDraftPdf(form.title || 'Untitled contract', form.content_html, 0);
    doc.save(`${(form.title || 'contract').trim().replace(/[^\w-]+/g, '_')}.pdf`);
  }

  function gotoPageBreak(direction: 1 | -1) {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const markers = Array.from(canvas.querySelectorAll<HTMLElement>('[data-page-break]'));
    if (!markers.length) return;
    const scrollTop = canvas.scrollTop;
    let target: HTMLElement | undefined;
    if (direction === 1) {
      target = markers.find((m) => m.offsetTop > scrollTop + 10);
    } else {
      target = [...markers].reverse().find((m) => m.offsetTop < scrollTop - 10);
      if (!target) canvas.scrollTo({ top: 0, behavior: 'smooth' });
    }
    if (target) canvas.scrollTo({ top: target.offsetTop - 24, behavior: 'smooth' });
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-white">
      {/* Header: back, title, page menu, preview/save */}
      <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-slate-200 bg-white shrink-0">
        <button
          type="button"
          onClick={() => navigate('/documents/contracts')}
          className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 shrink-0"
        >
          <i className="fa-solid fa-chevron-left text-xs" />
          Back
        </button>

        <input
          value={form.title}
          onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
          placeholder="New Contract"
          className="flex-1 max-w-md text-center text-sm font-semibold text-slate-800 border border-slate-200 rounded-full px-4 py-1.5 focus:outline-none focus:ring-2 focus:ring-[var(--theme-accent)] focus:border-transparent"
        />

        <div className="flex items-center gap-2.5 shrink-0">
          <span className="text-[11px] font-medium text-slate-500 bg-slate-100 px-2.5 py-1 rounded-full">Template</span>

          <div className="relative" ref={menuRef}>
            <button
              type="button"
              onClick={() => setMenuOpen((o) => !o)}
              title="Document options"
              className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-50"
            >
              <i className="fa-solid fa-ellipsis-vertical" />
            </button>
            {menuOpen && (
              <div className="absolute right-0 top-full mt-1 w-56 bg-white border border-slate-200 rounded-xl shadow-xl py-1 z-30 text-sm">
                <button
                  type="button"
                  onClick={() => {
                    editorRef.current?.insertPageBreak();
                    setMenuOpen(false);
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-left text-slate-600 hover:bg-slate-50"
                >
                  <i className="fa-solid fa-file-circle-plus w-4 text-slate-400" />
                  Insert page break
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setEmailPanelOpen(true);
                    setMenuOpen(false);
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-left text-slate-600 hover:bg-slate-50"
                >
                  <i className="fa-solid fa-envelope w-4 text-slate-400" />
                  Customize send email
                </button>
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={() => setPreviewOpen(true)}
            className="text-xs font-semibold text-[var(--theme-accent)] hover:underline"
          >
            Preview
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={saveContractTemplate.isPending}
            className="px-4 py-1.5 text-xs font-semibold text-white bg-[var(--theme-accent)] hover:opacity-90 rounded-lg disabled:opacity-50"
          >
            {saveContractTemplate.isPending ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>

      {/* Formatting toolbar — portals in from RichTextEditor as page-level chrome */}
      <div ref={toolbarContainerRef} className="relative shrink-0" />

      {error && (
        <p className="text-xs text-rose-600 bg-rose-50 border-b border-rose-200 px-4 py-1.5 shrink-0">{error}</p>
      )}

      {/* Body: canvas + Document properties column */}
      <div className="flex-1 flex overflow-hidden">
        <div ref={canvasRef} className="flex-1 overflow-y-auto bg-slate-100">
          <div className="max-w-[850px] mx-auto py-8 px-4">
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-10">
              <ScopeOfWorkEditor
                ref={editorRef}
                value={form.content_html}
                onChange={(html) => setForm((f) => ({ ...f, content_html: html }))}
                toolbarContainer={toolbarContainerRef}
              />
            </div>
          </div>
        </div>

        {/* Document properties column: dynamic field chips — no deal, this is a standalone template.
            No Total $ either — it's auto-filled from the triggering deal's value once this
            template is used to generate a real contract. */}
        <div className="w-80 shrink-0 border-l border-slate-200 bg-white overflow-y-auto p-4 space-y-4">
          <h3 className="text-sm font-bold text-slate-800">Document properties</h3>

          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Thank You page</label>
            <select
              value={form.thank_you_page_id}
              onChange={(e) => setForm((f) => ({ ...f, thank_you_page_id: e.target.value }))}
              className={inputClass}
            >
              <option value="">None — show the default confirmation</option>
              {pages.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
            <p className="text-[10px] text-slate-400 italic mt-1">
              Shown in place of the default confirmation once the client signs a contract generated from this
              template.
            </p>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1.5">Insert dynamic field</label>
            <DynamicFieldDropdown fields={AUTOMATION_DYNAMIC_FIELDS} onInsert={(t) => editorRef.current?.insertText(t)} />
            <p className="text-[10px] text-slate-400 italic mt-2">
              Fields resolve once this template is used for a specific deal (via an approved proposal or an
              automation).
            </p>
          </div>
        </div>
      </div>

      {/* Bottom bar: download + page navigation */}
      <div className="border-t border-slate-200 bg-white py-2 flex items-center justify-center gap-6 shrink-0">
        <button
          type="button"
          onClick={handleDownload}
          title="Download draft as PDF"
          className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-50"
        >
          <i className="fa-solid fa-download" />
        </button>
        <button
          type="button"
          onClick={() => gotoPageBreak(-1)}
          title="Previous page"
          className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-50"
        >
          <i className="fa-solid fa-chevron-left" />
        </button>
        <button
          type="button"
          onClick={() => gotoPageBreak(1)}
          title="Next page"
          className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-50"
        >
          <i className="fa-solid fa-chevron-right" />
        </button>
      </div>

      {/* Send-email customization panel */}
      {emailPanelOpen && (
        <div className="fixed inset-0 bg-slate-900/40 z-[130] flex items-center justify-center p-4" onClick={() => setEmailPanelOpen(false)}>
          <div className="bg-white w-full max-w-xl rounded-2xl shadow-2xl flex overflow-hidden max-h-[85vh]" onClick={(e) => e.stopPropagation()}>
            <div className="flex-1 p-5 overflow-y-auto">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-bold text-slate-800">Customize the send email</h3>
                <button onClick={() => setEmailPanelOpen(false)} className="text-slate-400 hover:text-slate-600">
                  <i className="fa-solid fa-xmark" />
                </button>
              </div>
              <div className="space-y-1.5">
                {emailTemplates.length > 0 && (
                  <select value="" onChange={(e) => applyEmailTemplate(e.target.value)} className={inputClass}>
                    <option value="">Use an email template...</option>
                    {emailTemplates.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                      </option>
                    ))}
                  </select>
                )}
                <span className="text-[11px] font-medium text-slate-500">Subject</span>
                <input
                  ref={emailSubjectRef}
                  type="text"
                  value={form.email_subject}
                  onChange={(e) => setForm((f) => ({ ...f, email_subject: e.target.value }))}
                  onFocus={() => setFocusedComposeField('subject')}
                  placeholder="Leave blank to use the default subject"
                  className={inputClass}
                />
                <span className="text-[11px] font-medium text-slate-500">Body</span>
                <textarea
                  ref={emailBodyRef}
                  value={form.email_body}
                  onChange={(e) => setForm((f) => ({ ...f, email_body: e.target.value }))}
                  onFocus={() => setFocusedComposeField('body')}
                  rows={3}
                  placeholder="Leave blank to use the default template — placeholders: {{first_name}} {{contract_link}}"
                  className={inputClass}
                />
              </div>
            </div>

            <div className="w-56 shrink-0 border-l border-slate-200 bg-slate-50 p-4 overflow-y-auto">
              <p className="text-[11px] font-semibold text-slate-500 mb-2">
                Insert into {focusedComposeField === 'subject' ? 'Subject' : 'Body'}
              </p>
              <DynamicFieldDropdown fields={AUTOMATION_DYNAMIC_FIELDS} onInsert={insertIntoComposeField} />
            </div>
          </div>
        </div>
      )}

      <ContractPreviewOverlay
        open={previewOpen}
        onClose={() => setPreviewOpen(false)}
        title={form.title}
        contentHtml={form.content_html}
      />
    </div>
  );
}
