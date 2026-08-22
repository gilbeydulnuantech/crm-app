import { FormEvent, useRef, useState } from 'react';
import { useProposals, useSaveProposal, useSendProposal, useArchiveProposal, useDeleteProposal } from '../../hooks/useProposals';
import { useEmailTemplates } from '../../hooks/useEmailTemplates';
import { Proposal } from '../../api/proposals';
import ScopeOfWorkEditor from '../ScopeOfWorkEditor';
import ConfirmDialog from '../ConfirmDialog';
import DynamicFieldDropdown, { insertAtCursor } from '../DynamicFieldDropdown';

interface Props {
  opportunityId: number;
  canEdit: boolean;
  onCreateNew: () => void;
}

const inputClass =
  'w-full px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--theme-accent)]';

interface ProposalForm {
  id?: number;
  title: string;
  content_html: string;
  total_amount: string;
  email_subject: string;
  email_body: string;
  client_name: string;
  client_company_name: string;
  client_address: string;
  client_email: string;
  client_phone: string;
  contractor_company_name: string;
  contractor_email: string;
  contractor_phone: string;
}

const EMPTY_FORM: ProposalForm = {
  title: '',
  content_html: '',
  total_amount: '',
  email_subject: '',
  email_body: '',
  client_name: '',
  client_company_name: '',
  client_address: '',
  client_email: '',
  client_phone: '',
  contractor_company_name: '',
  contractor_email: '',
  contractor_phone: '',
};

function money(n: number) {
  return `$${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

const STATUS_LABEL: Record<Proposal['status'], string> = {
  draft: 'Draft',
  emailed: 'Emailed',
  viewed: 'Viewed',
  approved: 'Approved',
};

const STATUS_CLASS: Record<Proposal['status'], string> = {
  draft: 'bg-slate-100 text-slate-600',
  emailed: 'bg-amber-100 text-amber-700',
  viewed: 'bg-indigo-100 text-indigo-700',
  approved: 'bg-emerald-100 text-emerald-700',
};

export default function ProposalsSection({ opportunityId, canEdit, onCreateNew }: Props) {
  const { data: proposals = [], isLoading } = useProposals(opportunityId);
  const { data: emailTemplates = [] } = useEmailTemplates();
  const saveProposal = useSaveProposal();
  const sendProposal = useSendProposal();
  const archiveProposal = useArchiveProposal();
  const deleteProposal = useDeleteProposal();

  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState<ProposalForm>(EMPTY_FORM);
  const [error, setError] = useState<string | null>(null);
  const [sendResult, setSendResult] = useState<{ id: number; message: string } | null>(null);
  const [copiedId, setCopiedId] = useState<number | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);
  const emailSubjectRef = useRef<HTMLInputElement>(null);
  const emailBodyRef = useRef<HTMLTextAreaElement>(null);

  function applyEmailTemplate(templateId: string) {
    const tmpl = emailTemplates.find((t) => String(t.id) === templateId);
    if (!tmpl) return;
    setForm((f) => ({ ...f, email_subject: tmpl.subject, email_body: tmpl.body }));
  }

  function openEdit(p: Proposal) {
    setForm({
      id: p.id,
      title: p.title,
      content_html: p.content_html,
      total_amount: String(p.total_amount),
      email_subject: p.email_subject,
      email_body: p.email_body,
      client_name: p.client_name || '',
      client_company_name: p.client_company_name || '',
      client_address: p.client_address || '',
      client_email: p.client_email || '',
      client_phone: p.client_phone || '',
      contractor_company_name: p.contractor_company_name || '',
      contractor_email: p.contractor_email || '',
      contractor_phone: p.contractor_phone || '',
    });
    setError(null);
    setFormOpen(true);
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (!form.title.trim()) return setError('Give this proposal a title.');
    const plainText = form.content_html.replace(/<[^>]*>/g, '').trim();
    if (!plainText) return setError('Write the proposal content.');
    const totalAmount = form.total_amount ? Number(form.total_amount) : 0;
    if (!Number.isFinite(totalAmount) || totalAmount < 0) return setError('Total must be 0 or more.');

    saveProposal.mutate(
      {
        id: form.id,
        opportunity_id: opportunityId,
        title: form.title.trim(),
        content_html: form.content_html,
        total_amount: totalAmount,
        email_subject: form.email_subject.trim() || undefined,
        email_body: form.email_body.trim() || undefined,
        client_name: form.client_name.trim() || undefined,
        client_company_name: form.client_company_name.trim() || undefined,
        client_address: form.client_address.trim() || undefined,
        client_email: form.client_email.trim() || undefined,
        client_phone: form.client_phone.trim() || undefined,
        contractor_company_name: form.contractor_company_name.trim() || undefined,
        contractor_email: form.contractor_email.trim() || undefined,
        contractor_phone: form.contractor_phone.trim() || undefined,
      },
      {
        onSuccess: () => setFormOpen(false),
        onError: (err) => setError(err instanceof Error ? err.message : 'Failed to save.'),
      }
    );
  }

  function handleSend(p: Proposal) {
    setSendResult(null);
    sendProposal.mutate(p.id, {
      onSuccess: () => setSendResult({ id: p.id, message: 'Sent.' }),
      onError: (err) => setSendResult({ id: p.id, message: err instanceof Error ? err.message : 'Failed to send.' }),
    });
  }

  function publicLink(token: string, preview = false) {
    return `${window.location.origin}/documents/proposal/${token}${preview ? '?preview=1' : ''}`;
  }

  function handleCopyLink(p: Proposal) {
    navigator.clipboard.writeText(publicLink(p.public_token)).then(() => {
      setCopiedId(p.id);
      setTimeout(() => setCopiedId(null), 1500);
    });
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Proposals</h3>
        {canEdit && !formOpen && (
          <button type="button" onClick={onCreateNew} className="text-xs font-semibold text-indigo-600 hover:underline">
            + New Proposal
          </button>
        )}
      </div>

      {formOpen ? (
        <form onSubmit={handleSubmit} className="space-y-2.5 border border-slate-200 rounded-lg p-3">
          <div className="flex gap-2">
            <div className="flex-1">
              <label className="block text-[11px] font-medium text-slate-500 mb-1">Title</label>
              <input
                type="text"
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                placeholder="e.g. Roof Replacement Proposal"
                className={inputClass}
              />
            </div>
            <div className="w-28">
              <label className="block text-[11px] font-medium text-slate-500 mb-1">Total $</label>
              <input
                type="number"
                min={0}
                step="any"
                value={form.total_amount}
                onChange={(e) => setForm((f) => ({ ...f, total_amount: e.target.value }))}
                className={inputClass}
              />
            </div>
          </div>

          <details className="text-xs" open>
            <summary className="cursor-pointer text-slate-500 font-medium select-none">
              Client &amp; contractor info (leave blank to auto-fill from the linked contact/company)
            </summary>
            <div className="grid grid-cols-2 gap-2 mt-1.5">
              <div>
                <label className="block text-[11px] font-medium text-slate-500 mb-1">Client name</label>
                <input
                  type="text"
                  value={form.client_name}
                  onChange={(e) => setForm((f) => ({ ...f, client_name: e.target.value }))}
                  className={inputClass}
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-slate-500 mb-1">Client company name</label>
                <input
                  type="text"
                  value={form.client_company_name}
                  onChange={(e) => setForm((f) => ({ ...f, client_company_name: e.target.value }))}
                  className={inputClass}
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-slate-500 mb-1">Client address</label>
                <input
                  type="text"
                  value={form.client_address}
                  onChange={(e) => setForm((f) => ({ ...f, client_address: e.target.value }))}
                  className={inputClass}
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-slate-500 mb-1">Client email</label>
                <input
                  type="email"
                  value={form.client_email}
                  onChange={(e) => setForm((f) => ({ ...f, client_email: e.target.value }))}
                  className={inputClass}
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-slate-500 mb-1">Client phone</label>
                <input
                  type="text"
                  value={form.client_phone}
                  onChange={(e) => setForm((f) => ({ ...f, client_phone: e.target.value }))}
                  className={inputClass}
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-slate-500 mb-1">Contractor company name</label>
                <input
                  type="text"
                  value={form.contractor_company_name}
                  onChange={(e) => setForm((f) => ({ ...f, contractor_company_name: e.target.value }))}
                  className={inputClass}
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-slate-500 mb-1">Contractor email</label>
                <input
                  type="email"
                  value={form.contractor_email}
                  onChange={(e) => setForm((f) => ({ ...f, contractor_email: e.target.value }))}
                  className={inputClass}
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-slate-500 mb-1">Contractor phone</label>
                <input
                  type="text"
                  value={form.contractor_phone}
                  onChange={(e) => setForm((f) => ({ ...f, contractor_phone: e.target.value }))}
                  className={inputClass}
                />
              </div>
            </div>
          </details>

          <ScopeOfWorkEditor value={form.content_html} onChange={(html) => setForm((f) => ({ ...f, content_html: html }))} />

          <details className="text-xs">
            <summary className="cursor-pointer text-slate-500 font-medium select-none">Customize the send email (optional)</summary>
            <div className="space-y-1.5 mt-1.5">
              {emailTemplates.length > 0 && (
                <select
                  value=""
                  onChange={(e) => applyEmailTemplate(e.target.value)}
                  className={inputClass}
                >
                  <option value="">Use an email template...</option>
                  {emailTemplates.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              )}
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-medium text-slate-500">Subject</span>
                <DynamicFieldDropdown
                  onInsert={(token) =>
                    insertAtCursor(emailSubjectRef.current, form.email_subject, token, (v) =>
                      setForm((f) => ({ ...f, email_subject: v }))
                    )
                  }
                />
              </div>
              <input
                ref={emailSubjectRef}
                type="text"
                value={form.email_subject}
                onChange={(e) => setForm((f) => ({ ...f, email_subject: e.target.value }))}
                placeholder="Leave blank to use the default subject"
                className={inputClass}
              />
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-medium text-slate-500">Body</span>
                <DynamicFieldDropdown
                  onInsert={(token) =>
                    insertAtCursor(emailBodyRef.current, form.email_body, token, (v) => setForm((f) => ({ ...f, email_body: v })))
                  }
                />
              </div>
              <textarea
                ref={emailBodyRef}
                value={form.email_body}
                onChange={(e) => setForm((f) => ({ ...f, email_body: e.target.value }))}
                rows={3}
                placeholder="Leave blank to use the default template — placeholders: {{first_name}} {{proposal_link}}"
                className={inputClass}
              />
            </div>
          </details>

          {error && <p className="text-[11px] text-rose-600 bg-rose-50 border border-rose-200 rounded-md px-2 py-1">{error}</p>}

          <div className="flex gap-2 pt-1">
            <button
              type="submit"
              disabled={saveProposal.isPending}
              className="flex-1 px-3 py-1.5 text-xs font-semibold text-white bg-[var(--theme-accent)] hover:opacity-90 rounded-lg disabled:opacity-50"
            >
              {saveProposal.isPending ? 'Saving...' : 'Save Proposal'}
            </button>
            <button
              type="button"
              onClick={() => setFormOpen(false)}
              disabled={saveProposal.isPending}
              className="flex-1 px-3 py-1.5 text-xs font-medium border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-lg disabled:opacity-50"
            >
              Cancel
            </button>
          </div>
        </form>
      ) : isLoading ? (
        <p className="text-xs text-slate-400">Loading...</p>
      ) : proposals.length === 0 ? (
        <p className="text-xs text-slate-400 italic">No proposals yet.</p>
      ) : (
        <div className="space-y-1.5">
          {proposals.map((p) => (
            <div key={p.id} className="px-2.5 py-2 border border-slate-200 rounded-lg">
              <div className="flex items-center gap-2">
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium text-slate-800 truncate">{p.title}</p>
                  <p className="text-[10px] text-slate-400">{money(p.total_amount)}</p>
                </div>
                <span className={`shrink-0 px-1.5 py-0.5 text-[10px] font-semibold rounded-full ${STATUS_CLASS[p.status]}`}>
                  {STATUS_LABEL[p.status]}
                </span>
                <button type="button" onClick={() => handleCopyLink(p)} title="Copy link" className="shrink-0 text-slate-400 hover:text-indigo-600">
                  <i className={`fa-solid ${copiedId === p.id ? 'fa-check' : 'fa-link'} text-[11px]`} />
                </button>
                <a
                  href={publicLink(p.public_token, true)}
                  target="_blank"
                  rel="noreferrer"
                  className="shrink-0 text-[11px] font-semibold text-slate-500 hover:underline"
                >
                  View
                </a>
                {canEdit && (
                  <>
                    <button type="button" onClick={() => openEdit(p)} title="Edit" className="shrink-0 text-slate-400 hover:text-indigo-600">
                      <i className="fa-solid fa-pen text-[11px]" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSend(p)}
                      disabled={sendProposal.isPending}
                      className="shrink-0 text-[11px] font-semibold text-emerald-600 hover:underline disabled:opacity-40"
                    >
                      {p.emailed_at ? 'Resend' : 'Send'}
                    </button>
                    <button
                      type="button"
                      onClick={() => archiveProposal.mutate(p.id)}
                      disabled={archiveProposal.isPending}
                      title="Archive"
                      className="shrink-0 text-slate-400 hover:text-amber-600 disabled:opacity-30"
                    >
                      <i className="fa-solid fa-box-archive text-[11px]" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmDeleteId(p.id)}
                      title="Delete"
                      className="shrink-0 text-slate-400 hover:text-rose-600"
                    >
                      <i className="fa-solid fa-trash text-[11px]" />
                    </button>
                  </>
                )}
              </div>
              {sendResult?.id === p.id && <p className="text-[10px] text-emerald-700 mt-1">{sendResult.message}</p>}
            </div>
          ))}
        </div>
      )}

      <ConfirmDialog
        open={confirmDeleteId != null}
        title="Delete Proposal"
        body="This permanently removes the proposal. If it's already been signed as a contract, that contract stays untouched."
        confirmLabel="Delete"
        danger
        isSubmitting={deleteProposal.isPending}
        onCancel={() => setConfirmDeleteId(null)}
        onConfirm={() => {
          if (confirmDeleteId != null) {
            deleteProposal.mutate(confirmDeleteId, { onSuccess: () => setConfirmDeleteId(null) });
          }
        }}
      />
    </div>
  );
}
