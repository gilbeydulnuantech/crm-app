import { FormEvent, useState } from 'react';
import { useContracts, useSaveContract, useSendContract, useArchiveContract, useDeleteContract } from '../../hooks/useContracts';
import { Contract } from '../../api/contracts';
import { useAuth } from '../../context/AuthContext';
import ScopeOfWorkEditor from '../ScopeOfWorkEditor';
import ConfirmDialog from '../ConfirmDialog';
import SignedContractViewModal from './SignedContractViewModal';

function formatSignedAt(iso: string) {
  return new Date(iso).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
}

interface Props {
  opportunityId: number;
  canEdit: boolean;
  onCreateNew: () => void;
}

const inputClass =
  'w-full px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--theme-accent)]';

interface ContractForm {
  id?: number;
  title: string;
  content_html: string;
  total_amount: string;
  email_subject: string;
  email_body: string;
}

const EMPTY_FORM: ContractForm = {
  title: '',
  content_html: '',
  total_amount: '',
  email_subject: '',
  email_body: '',
};

function money(n: number) {
  return `$${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

const STATUS_LABEL: Record<Contract['status'], string> = {
  draft: 'Draft',
  sent: 'Sent',
  signed: 'Signed',
};

const STATUS_CLASS: Record<Contract['status'], string> = {
  draft: 'bg-slate-100 text-slate-600',
  sent: 'bg-amber-100 text-amber-700',
  signed: 'bg-emerald-100 text-emerald-700',
};

export default function ContractsSection({ opportunityId, canEdit, onCreateNew }: Props) {
  const { isAdmin } = useAuth();
  const { data: contracts = [], isLoading } = useContracts(opportunityId);
  const saveContract = useSaveContract();
  const sendContract = useSendContract();
  const archiveContract = useArchiveContract();
  const deleteContract = useDeleteContract();

  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState<ContractForm>(EMPTY_FORM);
  const [error, setError] = useState<string | null>(null);
  const [sendResult, setSendResult] = useState<{ id: number; message: string } | null>(null);
  const [copiedId, setCopiedId] = useState<number | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);
  const [viewSignedId, setViewSignedId] = useState<number | null>(null);

  function openEdit(c: Contract) {
    setForm({
      id: c.id,
      title: c.title,
      content_html: c.content_html,
      total_amount: String(c.total_amount),
      email_subject: c.email_subject,
      email_body: c.email_body,
    });
    setError(null);
    setFormOpen(true);
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (!form.title.trim()) return setError('Give this contract a title.');
    const plainText = form.content_html.replace(/<[^>]*>/g, '').trim();
    if (!plainText) return setError('Write the scope of work.');
    const totalAmount = form.total_amount ? Number(form.total_amount) : 0;
    if (!Number.isFinite(totalAmount) || totalAmount < 0) return setError('Total must be 0 or more.');

    saveContract.mutate(
      {
        id: form.id,
        opportunity_id: opportunityId,
        title: form.title.trim(),
        content_html: form.content_html,
        total_amount: totalAmount,
        email_subject: form.email_subject.trim() || undefined,
        email_body: form.email_body.trim() || undefined,
      },
      {
        onSuccess: () => setFormOpen(false),
        onError: (err) => setError(err instanceof Error ? err.message : 'Failed to save.'),
      }
    );
  }

  function handleSend(c: Contract) {
    setSendResult(null);
    sendContract.mutate(c.id, {
      onSuccess: () => setSendResult({ id: c.id, message: 'Sent.' }),
      onError: (err) => setSendResult({ id: c.id, message: err instanceof Error ? err.message : 'Failed to send.' }),
    });
  }

  function publicLink(token: string) {
    return `${window.location.origin}/documents/contract/${token}`;
  }

  function handleCopyLink(c: Contract) {
    navigator.clipboard.writeText(publicLink(c.public_token)).then(() => {
      setCopiedId(c.id);
      setTimeout(() => setCopiedId(null), 1500);
    });
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Contracts</h3>
        {canEdit && !formOpen && (
          <button type="button" onClick={onCreateNew} className="text-xs font-semibold text-indigo-600 hover:underline">
            + New Contract
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

          <ScopeOfWorkEditor value={form.content_html} onChange={(html) => setForm((f) => ({ ...f, content_html: html }))} label="Scope of Work" />

          <details className="text-xs">
            <summary className="cursor-pointer text-slate-500 font-medium select-none">Customize the send email (optional)</summary>
            <div className="space-y-1.5 mt-1.5">
              <input
                type="text"
                value={form.email_subject}
                onChange={(e) => setForm((f) => ({ ...f, email_subject: e.target.value }))}
                placeholder="Leave blank to use the default subject"
                className={inputClass}
              />
              <textarea
                value={form.email_body}
                onChange={(e) => setForm((f) => ({ ...f, email_body: e.target.value }))}
                rows={3}
                placeholder="Leave blank to use the default template — placeholders: {{first_name}} {{contract_link}}"
                className={inputClass}
              />
            </div>
          </details>

          {error && <p className="text-[11px] text-rose-600 bg-rose-50 border border-rose-200 rounded-md px-2 py-1">{error}</p>}

          <div className="flex gap-2 pt-1">
            <button
              type="submit"
              disabled={saveContract.isPending}
              className="flex-1 px-3 py-1.5 text-xs font-semibold text-white bg-[var(--theme-accent)] hover:opacity-90 rounded-lg disabled:opacity-50"
            >
              {saveContract.isPending ? 'Saving...' : 'Save Contract'}
            </button>
            <button
              type="button"
              onClick={() => setFormOpen(false)}
              disabled={saveContract.isPending}
              className="flex-1 px-3 py-1.5 text-xs font-medium border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-lg disabled:opacity-50"
            >
              Cancel
            </button>
          </div>
        </form>
      ) : isLoading ? (
        <p className="text-xs text-slate-400">Loading...</p>
      ) : contracts.length === 0 ? (
        <p className="text-xs text-slate-400 italic">No contracts yet.</p>
      ) : (
        <div className="space-y-1.5">
          {contracts.map((c) => (
            <div key={c.id} className="px-2.5 py-2 border border-slate-200 rounded-lg">
              <div className="flex items-center gap-2">
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium text-slate-800 truncate">{c.title}</p>
                  <p className="text-[10px] text-slate-400">{money(c.total_amount)}</p>
                </div>
                <span className={`shrink-0 px-1.5 py-0.5 text-[10px] font-semibold rounded-full ${STATUS_CLASS[c.status]}`}>
                  {STATUS_LABEL[c.status]}
                </span>
                <button type="button" onClick={() => handleCopyLink(c)} title="Copy link" className="shrink-0 text-slate-400 hover:text-indigo-600">
                  <i className={`fa-solid ${copiedId === c.id ? 'fa-check' : 'fa-link'} text-[11px]`} />
                </button>
                {c.status === 'signed' ? (
                  <button
                    type="button"
                    onClick={() => setViewSignedId(c.id)}
                    className="shrink-0 text-[11px] font-semibold text-slate-500 hover:underline"
                  >
                    View
                  </button>
                ) : (
                  <a
                    href={publicLink(c.public_token)}
                    target="_blank"
                    rel="noreferrer"
                    className="shrink-0 text-[11px] font-semibold text-slate-500 hover:underline"
                  >
                    View
                  </a>
                )}
                {canEdit && (
                  <>
                    <button type="button" onClick={() => openEdit(c)} title="Edit" className="shrink-0 text-slate-400 hover:text-indigo-600">
                      <i className="fa-solid fa-pen text-[11px]" />
                    </button>
                    {c.status === 'draft' && (
                      <button
                        type="button"
                        onClick={() => handleSend(c)}
                        disabled={sendContract.isPending}
                        className="shrink-0 text-[11px] font-semibold text-emerald-600 hover:underline disabled:opacity-40"
                      >
                        Send
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => archiveContract.mutate(c.id)}
                      disabled={archiveContract.isPending}
                      title="Archive"
                      className="shrink-0 text-slate-400 hover:text-amber-600 disabled:opacity-30"
                    >
                      <i className="fa-solid fa-box-archive text-[11px]" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmDeleteId(c.id)}
                      title="Delete"
                      className="shrink-0 text-slate-400 hover:text-rose-600"
                    >
                      <i className="fa-solid fa-trash text-[11px]" />
                    </button>
                  </>
                )}
              </div>
              {sendResult?.id === c.id && <p className="text-[10px] text-emerald-700 mt-1">{sendResult.message}</p>}
              {isAdmin && c.status === 'signed' && c.signed_at && (
                <p className="text-[10px] text-slate-400 mt-1">
                  Signed {formatSignedAt(c.signed_at)}
                  {c.signature_ip ? ` from ${c.signature_ip}` : ''}
                </p>
              )}
            </div>
          ))}
        </div>
      )}

      <ConfirmDialog
        open={confirmDeleteId != null}
        title="Delete Contract"
        body="This permanently removes the contract, including its signature if it's already been signed."
        confirmLabel="Delete"
        danger
        isSubmitting={deleteContract.isPending}
        onCancel={() => setConfirmDeleteId(null)}
        onConfirm={() => {
          if (confirmDeleteId != null) {
            deleteContract.mutate(confirmDeleteId, { onSuccess: () => setConfirmDeleteId(null) });
          }
        }}
      />

      <SignedContractViewModal contractId={viewSignedId} onClose={() => setViewSignedId(null)} />
    </div>
  );
}
