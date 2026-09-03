import { FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useCompanyProfile } from '../hooks/useCompanyProfile';
import { useProposalTemplates, useSaveProposalTemplate } from '../hooks/useProposalTemplates';
import { useSaveProposal, useProposals, useMarkProposalEmailed } from '../hooks/useProposals';
import { useContractTemplates } from '../hooks/useContractTemplates';
import { usePages } from '../hooks/usePages';
import { useEmailTemplates } from '../hooks/useEmailTemplates';
import { usePipelines, useAllStages, useAllOpportunities } from '../hooks/useOpportunities';
import { useContacts, useSendContactEmail } from '../hooks/useContacts';
import { useAuth } from '../context/AuthContext';
import ScopeOfWorkEditor from '../components/ScopeOfWorkEditor';
import ProposalPreviewOverlay from '../components/proposals/ProposalPreviewOverlay';
import { insertAtCursor, DynamicField } from '../components/DynamicFieldDropdown';
import { RichTextEditorHandle } from '../components/RichTextEditor';
import { buildDraftPdf } from '../utils/contractPdf';

const inputClass =
  'w-full px-3 py-1.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--theme-accent)]';

// Standalone template — no deal/pipeline/stage. These fields resolve once
// this template is cloned into a real, deal-bound proposal (via an
// Automation or the deal-triggered Document Flow). The deal_*/down_payment_*/
// balance_* tokens are offered for consistency with the other document
// editors but aren't wired into fillMergeFields (utils/mergeFields.ts) yet —
// they'll render literally until that resolver is extended to fill them.
const PROPOSAL_DYNAMIC_FIELDS: DynamicField[] = [
  { token: '{{client_name}}', label: 'Client Name', group: 'Client' },
  { token: '{{client_company_name}}', label: 'Client Company', group: 'Client' },
  { token: '{{client_address}}', label: 'Client Address', group: 'Client' },
  { token: '{{client_email}}', label: 'Client Email', group: 'Client' },
  { token: '{{client_phone}}', label: 'Client Phone', group: 'Client' },
  { token: '{{owner_name}}', label: 'Owner Name', group: 'User' },
  { token: '{{owner_email}}', label: 'Owner Email', group: 'User' },
  { token: '{{owner_phone}}', label: 'Owner Phone', group: 'User' },
  { token: '{{company_name}}', label: 'Company Name', group: 'User' },
  { token: '{{proposal_link}}', label: 'Proposal Link', group: 'Proposal' },
  { token: '{{deal_name}}', label: 'Deal Name', group: 'Deal' },
  { token: '{{deal_value}}', label: 'Deal Value', group: 'Deal' },
  { token: '{{deal_created_at}}', label: 'Created At', group: 'Deal' },
  { token: '{{deal_due_at}}', label: 'Due At', group: 'Deal' },
  { token: '{{down_payment_amount}}', label: 'Down Payment Amount', group: 'Payment' },
  { token: '{{down_payment_paid_at}}', label: 'Down Payment Paid At', group: 'Payment' },
  { token: '{{balance_amount}}', label: 'Balance Amount', group: 'Payment' },
  { token: '{{balance_paid_at}}', label: 'Balance Paid At', group: 'Payment' },
];

interface ProposalForm {
  id?: number;
  title: string;
  content_html: string;
  email_subject: string;
  email_body: string;
  linked_contract_template_id: string;
  total_amount: string;
}

const EMPTY_FORM: ProposalForm = {
  title: '',
  content_html: '',
  email_subject: '',
  email_body: '',
  linked_contract_template_id: '',
  total_amount: '',
};

interface SelectedDeal {
  opportunityId: number;
  dealName: string;
  contactId: number | null;
  contactName: string;
  contactEmail: string;
}

export default function ProposalEditorPage() {
  const { id } = useParams();
  const isEdit = id != null && id !== 'new';
  const navigate = useNavigate();

  const { data: templates = [] } = useProposalTemplates();
  const { data: contractTemplates = [] } = useContractTemplates();
  const { data: pages = [] } = usePages();
  const { data: emailTemplates = [] } = useEmailTemplates();
  const { data: companyProfile } = useCompanyProfile(true);
  const { user } = useAuth();
  const saveProposalTemplate = useSaveProposalTemplate();
  const saveProposal = useSaveProposal();
  const sendContactEmail = useSendContactEmail();
  const markProposalEmailed = useMarkProposalEmailed();

  // Receiver: picks which open deal (in an "inspection" stage) this
  // proposal is for. Once set, Save writes a real, deal-bound proposal
  // (proposals table) instead of a reusable template, and Send becomes
  // available.
  const { data: pipelines = [] } = usePipelines();
  const pipelineIds = useMemo(() => pipelines.map((p) => p.id), [pipelines]);
  const { data: allStages = [] } = useAllStages(pipelineIds);
  const inspectionStageIds = useMemo(
    () => new Set(allStages.filter((s) => /inspection/i.test(s.name)).map((s) => s.id)),
    [allStages]
  );
  const { data: allDeals = [] } = useAllOpportunities(pipelineIds);
  const inspectionDeals = useMemo(
    () => allDeals.filter((d) => d.status === 'Open' && inspectionStageIds.has(d.stage_id)),
    [allDeals, inspectionStageIds]
  );
  const { data: allContacts = [] } = useContacts();
  const contactsById = useMemo(() => new Map(allContacts.map((c) => [c.id, c])), [allContacts]);

  const [selectedDeal, setSelectedDeal] = useState<SelectedDeal | null>(null);

  // Needed to resolve {{proposal_link}} before sending — save-proposal only
  // returns the new id, not the public_token, so once saved we look this
  // deal's proposals back up (same cache the save already invalidates).
  const { data: dealProposals = [] } = useProposals(selectedDeal?.opportunityId ?? null, !!selectedDeal);
  const [receiverOpen, setReceiverOpen] = useState(false);
  const receiverRef = useRef<HTMLDivElement>(null);

  const [form, setForm] = useState<ProposalForm>(EMPTY_FORM);
  const [error, setError] = useState<string | null>(null);
  const [saveConfirmation, setSaveConfirmation] = useState<string | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [sendPanelOpen, setSendPanelOpen] = useState(false);
  const [sendResult, setSendResult] = useState<{ ok: boolean; message: string } | null>(null);
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
      linked_contract_template_id: t.linked_contract_template_id ? String(t.linked_contract_template_id) : '',
      total_amount: '',
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

  useEffect(() => {
    if (!receiverOpen) return;
    function handleClickOutside(e: MouseEvent) {
      if (receiverRef.current && !receiverRef.current.contains(e.target as Node)) setReceiverOpen(false);
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [receiverOpen]);

  function pickReceiver(deal: (typeof inspectionDeals)[number]) {
    const contact = deal.contact_id ? contactsById.get(deal.contact_id) : undefined;
    setSelectedDeal({
      opportunityId: deal.id,
      dealName: deal.name,
      contactId: deal.contact_id,
      contactName: contact ? `${contact.first_name} ${contact.last_name}`.trim() : deal.contact_name || '',
      contactEmail: contact?.email || '',
    });
    // A form.id at this point can only be a *template* id (proposal_templates
    // and proposals are separate id sequences) — clear it so Save always
    // creates a fresh, correctly deal-scoped proposal row instead of risking
    // an id collision or silently not matching this deal's proposals list.
    // Total $ prefills from the deal's own value — still just a starting
    // point, the rep can override it before saving/sending.
    setForm((f) => ({ ...f, id: undefined, total_amount: deal.deal_value != null ? String(deal.deal_value) : f.total_amount }));
    setSaveConfirmation(null);
    setReceiverOpen(false);
  }

  function applyEmailTemplate(templateId: string) {
    const tmpl = emailTemplates.find((t) => String(t.id) === templateId);
    if (!tmpl) return;
    setForm((f) => ({ ...f, email_subject: tmpl.subject, email_body: tmpl.body }));
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSaveConfirmation(null);
    if (!form.title.trim()) return setError('Give this proposal a title.');
    const plainText = form.content_html.replace(/<[^>]*>/g, '').trim();
    if (!plainText) return setError('Write the proposal content.');
    if (!form.linked_contract_template_id) return setError('Choose a linked contract template.');

    if (selectedDeal) {
      const totalAmount = form.total_amount ? Number(form.total_amount) : 0;
      if (!Number.isFinite(totalAmount) || totalAmount < 0) return setError('Total must be 0 or more.');

      saveProposal.mutate(
        {
          id: form.id,
          opportunity_id: selectedDeal.opportunityId,
          title: form.title.trim(),
          content_html: form.content_html,
          total_amount: totalAmount,
          email_subject: form.email_subject.trim() || undefined,
          email_body: form.email_body.trim() || undefined,
          client_name: selectedDeal.contactName || undefined,
          client_email: selectedDeal.contactEmail || undefined,
          linked_contract_template_id: Number(form.linked_contract_template_id),
        },
        {
          onSuccess: (result) => {
            if (result?.id) setForm((f) => ({ ...f, id: result.id }));
            setSaveConfirmation('Saved. You can now send it to the receiver.');
          },
          onError: (err) => setError(err instanceof Error ? err.message : 'Failed to save.'),
        }
      );
      return;
    }

    saveProposalTemplate.mutate(
      {
        id: form.id,
        title: form.title.trim(),
        content_html: form.content_html,
        email_subject: form.email_subject.trim() || undefined,
        email_body: form.email_body.trim() || undefined,
        linked_contract_template_id: form.linked_contract_template_id ? Number(form.linked_contract_template_id) : null,
      },
      {
        onSuccess: () => navigate('/documents/proposals'),
        onError: (err) => setError(err instanceof Error ? err.message : 'Failed to save.'),
      }
    );
  }

  const savedProposal = form.id ? dealProposals.find((p) => p.id === form.id) : undefined;
  const proposalLink = savedProposal ? `${window.location.origin}/documents/proposal/${savedProposal.public_token}` : '';

  // Sends through the same general-purpose "send an email to this contact"
  // workflow the rest of the CRM's manual-compose feature already uses
  // (ComposeEmailPopover) — it logs to the contact's own activity feed, and
  // takes exactly what's typed here rather than re-resolving from whatever
  // was last saved on the proposal record. That workflow resolves
  // {{company_name}} itself server-side; every other token here is
  // resolved client-side first so Send always matches what's on screen.
  function resolveTokens(text: string): string {
    const contact = selectedDeal?.contactId != null ? contactsById.get(selectedDeal.contactId) : undefined;
    const map: Record<string, string> = {
      '{{first_name}}': contact?.first_name || '',
      '{{client_name}}': selectedDeal?.contactName || '',
      '{{client_company_name}}': contact?.company_name || '',
      '{{client_address}}': [contact?.city, contact?.state].filter(Boolean).join(', '),
      '{{client_email}}': selectedDeal?.contactEmail || '',
      '{{client_phone}}': contact?.phone || '',
      '{{owner_name}}': user?.name || '',
      '{{owner_email}}': user?.email || '',
      '{{company_name}}': companyProfile?.company_name || '',
      '{{proposal_link}}': proposalLink,
    };
    return Object.entries(map).reduce((out, [token, val]) => out.split(token).join(val), text);
  }

  function handleSend() {
    if (!selectedDeal?.contactId || !selectedDeal.contactEmail) return;
    if (!user?.email) {
      setSendResult({ ok: false, message: 'Your account has no email on file — cannot set a sender address.' });
      return;
    }
    setSendResult(null);
    const subject = resolveTokens(form.email_subject.trim() || `Your proposal: ${form.title}`);
    const message = resolveTokens(form.email_body.trim() || `Hi {{first_name}}, please review your proposal here: {{proposal_link}}`);
    sendContactEmail.mutate(
      { contactId: selectedDeal.contactId, subject, message, to: selectedDeal.contactEmail, from: user.email, attachments: [] },
      {
        onSuccess: () => {
          setSendResult({ ok: true, message: 'Sent!' });
          // Best-effort status sync — the email already sent regardless of
          // whether this succeeds, so a failure here doesn't change the
          // "Sent!" result, just leaves the status badge stale.
          if (form.id) markProposalEmailed.mutate(form.id);
          setTimeout(() => setSendPanelOpen(false), 900);
        },
        onError: (err) => setSendResult({ ok: false, message: err instanceof Error ? err.message : 'Failed to send.' }),
      }
    );
  }

  function insertIntoComposeField(token: string) {
    if (focusedComposeField === 'subject') {
      insertAtCursor(emailSubjectRef.current, form.email_subject, token, (v) => setForm((f) => ({ ...f, email_subject: v })));
    } else {
      insertAtCursor(emailBodyRef.current, form.email_body, token, (v) => setForm((f) => ({ ...f, email_body: v })));
    }
  }

  function handleDownload() {
    const doc = buildDraftPdf(form.title || 'Untitled proposal', form.content_html, 0);
    doc.save(`${(form.title || 'proposal').trim().replace(/[^\w-]+/g, '_')}.pdf`);
  }

  // Page breaks are purely visual markers the rep drops into the content —
  // treat each one as a page boundary and scroll the canvas to it, so the
  // prev/next controls give a "flip through the document" feel.
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

  // Chains Preview into a full click-through test of proposal → contract →
  // thank you page, entirely with sample data — see ProposalPreviewOverlay.
  const linkedContract = form.linked_contract_template_id
    ? contractTemplates.find((t) => String(t.id) === form.linked_contract_template_id)
    : undefined;
  const linkedThankYouPage = linkedContract?.thank_you_page_id
    ? pages.find((p) => p.id === linkedContract.thank_you_page_id)
    : undefined;

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-white">
      {/* Header: back, title, page menu, preview/save */}
      <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-slate-200 bg-white shrink-0">
        <button
          type="button"
          onClick={() => navigate('/documents/proposals')}
          className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 shrink-0"
        >
          <i className="fa-solid fa-chevron-left text-xs" />
          Back
        </button>

        <input
          value={form.title}
          onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
          placeholder="New Proposal"
          className="flex-1 max-w-md text-center text-sm font-semibold text-slate-800 border border-slate-200 rounded-full px-4 py-1.5 focus:outline-none focus:ring-2 focus:ring-[var(--theme-accent)] focus:border-transparent"
        />

        <div className="flex items-center gap-2.5 shrink-0">
          <div className="relative" ref={receiverRef}>
            <button
              type="button"
              onClick={() => setReceiverOpen((o) => !o)}
              className={`text-[11px] font-medium px-2.5 py-1 rounded-full flex items-center gap-1.5 ${
                selectedDeal ? 'bg-[var(--theme-accent-tint)] text-[var(--theme-accent-hover)]' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
              }`}
            >
              <i className="fa-solid fa-user-tag text-[10px]" />
              {selectedDeal ? selectedDeal.dealName : 'Receiver'}
              <i className={`fa-solid fa-chevron-down text-[9px] transition-transform ${receiverOpen ? 'rotate-180' : ''}`} />
            </button>
            {receiverOpen && (
              <div className="absolute right-0 top-full mt-1 w-64 bg-white border border-slate-200 rounded-xl shadow-xl py-1 z-30 text-sm max-h-72 overflow-y-auto">
                <p className="px-3 py-1.5 text-[10px] font-semibold text-slate-400 uppercase tracking-wide">
                  Deals in an inspection stage
                </p>
                {inspectionDeals.length === 0 && (
                  <p className="px-3 py-2 text-xs text-slate-400 italic">No open deals in an inspection stage.</p>
                )}
                {inspectionDeals.map((d) => (
                  <button
                    key={d.id}
                    type="button"
                    onClick={() => pickReceiver(d)}
                    className="w-full text-left px-3 py-2 hover:bg-slate-50"
                  >
                    <p className="text-xs font-medium text-slate-800 truncate">{d.name}</p>
                    <p className="text-[10px] text-slate-400 truncate">{d.contact_name || 'No contact'}</p>
                  </button>
                ))}
                {selectedDeal && (
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedDeal(null);
                      setReceiverOpen(false);
                    }}
                    className="w-full text-left px-3 py-2 text-rose-600 hover:bg-rose-50 border-t border-slate-100 text-xs font-medium"
                  >
                    Clear receiver
                  </button>
                )}
              </div>
            )}
          </div>

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
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={() => {
              setSendResult(null);
              setSendPanelOpen(true);
            }}
            disabled={!selectedDeal || !savedProposal}
            title={!selectedDeal ? 'Pick a receiver first' : !savedProposal ? 'Save the proposal first' : 'Send proposal email'}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-slate-400"
          >
            <i className="fa-solid fa-paper-plane" />
          </button>

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
            disabled={saveProposalTemplate.isPending || saveProposal.isPending}
            className="px-4 py-1.5 text-xs font-semibold text-white bg-[var(--theme-accent)] hover:opacity-90 rounded-lg disabled:opacity-50"
          >
            {saveProposalTemplate.isPending || saveProposal.isPending ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>

      {/* Formatting toolbar — portals in from RichTextEditor as page-level chrome */}
      <div ref={toolbarContainerRef} className="relative shrink-0" />

      {error && (
        <p className="text-xs text-rose-600 bg-rose-50 border-b border-rose-200 px-4 py-1.5 shrink-0">{error}</p>
      )}
      {saveConfirmation && !error && (
        <p className="text-xs text-emerald-700 bg-emerald-50 border-b border-emerald-200 px-4 py-1.5 shrink-0">{saveConfirmation}</p>
      )}

      {/* Body: canvas + Document properties column */}
      <div className="flex-1 flex overflow-hidden">
        <div ref={canvasRef} className="flex-1 overflow-y-auto bg-slate-100">
          <div className="max-w-[850px] mx-auto py-8 px-4">
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-10">
              {companyProfile?.logo_url && (
                <img src={companyProfile.logo_url} alt="" className="h-10 max-w-[200px] object-contain mb-6" />
              )}
              <ScopeOfWorkEditor
                ref={editorRef}
                value={form.content_html}
                onChange={(html) => setForm((f) => ({ ...f, content_html: html }))}
                toolbarContainer={toolbarContainerRef}
              />
            </div>
          </div>
        </div>

        {/* Document properties column: dynamic field chips. Linked contract
            template only applies to reusable templates; Total $ only
            applies once a receiver (real deal) is picked. */}
        <div className="w-80 shrink-0 border-l border-slate-200 bg-white overflow-y-auto p-4 space-y-4">
          <h3 className="text-sm font-bold text-slate-800">Document properties</h3>

          {selectedDeal && (
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Total $</label>
              <input
                type="number"
                min={0}
                step="any"
                value={form.total_amount}
                onChange={(e) => setForm((f) => ({ ...f, total_amount: e.target.value }))}
                className={inputClass}
              />
              <p className="text-[10px] text-slate-400 italic mt-1">
                Sending to <span className="font-medium text-slate-600">{selectedDeal.contactName || 'this contact'}</span>
                {selectedDeal.contactEmail ? ` (${selectedDeal.contactEmail})` : ' — no email on file yet'}.
              </p>
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Linked contract template</label>
            <select
              value={form.linked_contract_template_id}
              onChange={(e) => setForm((f) => ({ ...f, linked_contract_template_id: e.target.value }))}
              className={inputClass}
            >
              <option value="" disabled>
                {contractTemplates.length === 0 ? 'No contract templates yet — create one first' : 'Select a contract template...'}
              </option>
              {contractTemplates.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.title}
                </option>
              ))}
            </select>
            <p className="text-[10px] text-slate-400 italic mt-1">
              Required — when this proposal gets approved, this is the contract it auto-generates.
            </p>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1.5">Insert dynamic field</label>
            <div className="flex flex-col gap-2.5">
              {Object.entries(
                PROPOSAL_DYNAMIC_FIELDS.reduce<Record<string, typeof PROPOSAL_DYNAMIC_FIELDS>>((acc, f) => {
                  (acc[f.group!] ||= []).push(f);
                  return acc;
                }, {})
              ).map(([group, groupFields]) => (
                <div key={group}>
                  <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-1">{group}</p>
                  <div className="flex flex-col gap-1.5">
                    {groupFields.map((f) => (
                      <button
                        key={f.token}
                        type="button"
                        onClick={() => editorRef.current?.insertText(f.token)}
                        className="w-full text-left text-[11px] font-medium border border-slate-200 rounded-md px-2 py-1 text-slate-600 bg-white hover:border-[var(--theme-accent)] hover:text-[var(--theme-accent)]"
                      >
                        {f.label}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            <p className="text-[10px] text-slate-400 italic mt-2">
              Fields resolve once this template is used to generate a proposal for a specific deal.
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

      {/* Send / customize email panel */}
      {sendPanelOpen && (
        <div className="fixed inset-0 bg-slate-900/40 z-[130] flex items-center justify-center p-4" onClick={() => setSendPanelOpen(false)}>
          <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl flex overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="flex-1 p-5">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-bold text-slate-800">
                  {selectedDeal ? 'Send proposal' : 'Customize the send email'}
                </h3>
                <button onClick={() => setSendPanelOpen(false)} className="text-slate-400 hover:text-slate-600">
                  <i className="fa-solid fa-xmark" />
                </button>
              </div>

              {selectedDeal && (
                <div className="mb-2.5">
                  <span className="text-[11px] font-medium text-slate-500">To</span>
                  <p className="text-sm text-slate-800 px-3 py-1.5 border border-slate-200 rounded-lg bg-slate-50">
                    {selectedDeal.contactEmail || <span className="text-rose-500 italic">No email on file for this contact</span>}
                  </p>
                  {!savedProposal && (
                    <p className="text-[10px] text-amber-600 mt-1">Still syncing the saved proposal — try again in a moment.</p>
                  )}
                </div>
              )}

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
                  rows={6}
                  placeholder="Write the email manually, or pick a template above — placeholders: {{first_name}} {{proposal_link}}"
                  className={inputClass}
                />
              </div>

              {sendResult && (
                <p className={`text-xs mt-2.5 ${sendResult.ok ? 'text-emerald-700' : 'text-rose-600'}`}>{sendResult.message}</p>
              )}

              <div className="flex gap-2 pt-3">
                {selectedDeal && (
                  <button
                    type="button"
                    onClick={handleSend}
                    disabled={sendContactEmail.isPending || !selectedDeal.contactEmail || !savedProposal}
                    className="flex-1 px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg disabled:opacity-50"
                  >
                    {sendContactEmail.isPending ? 'Sending...' : 'Send Proposal'}
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setSendPanelOpen(false)}
                  className="flex-1 px-4 py-2 text-xs font-medium border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-lg"
                >
                  Close
                </button>
              </div>
            </div>

            {/* Persistent dynamic-field panel — click a field to insert it
                into whichever of Subject/Body was last focused. */}
            <div className="w-56 shrink-0 border-l border-slate-200 bg-slate-50 p-4 overflow-y-auto">
              <p className="text-[11px] font-semibold text-slate-500 mb-2">
                Insert into {focusedComposeField === 'subject' ? 'Subject' : 'Body'}
              </p>
              <div className="flex flex-col gap-2.5">
                {Object.entries(
                  PROPOSAL_DYNAMIC_FIELDS.reduce<Record<string, typeof PROPOSAL_DYNAMIC_FIELDS>>((acc, f) => {
                    (acc[f.group!] ||= []).push(f);
                    return acc;
                  }, {})
                ).map(([group, groupFields]) => (
                  <div key={group}>
                    <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-1">{group}</p>
                    <div className="flex flex-col gap-1.5">
                      {groupFields.map((f) => (
                        <button
                          key={f.token}
                          type="button"
                          onClick={() => insertIntoComposeField(f.token)}
                          className="w-full text-left text-[11px] font-medium border border-slate-200 rounded-md px-2 py-1 text-slate-600 bg-white hover:border-[var(--theme-accent)] hover:text-[var(--theme-accent)]"
                        >
                          {f.label}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      <ProposalPreviewOverlay
        open={previewOpen}
        onClose={() => setPreviewOpen(false)}
        title={form.title}
        contentHtml={form.content_html}
        linkedContractTitle={linkedContract?.title}
        linkedContractContentHtml={linkedContract?.content_html}
        linkedThankYouPageContentHtml={linkedThankYouPage?.content_html}
      />
    </div>
  );
}
