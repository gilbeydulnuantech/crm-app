import { FormEvent, useEffect, useState } from 'react';
import { Opportunity } from '../../types/opportunity';
import { useSaveContract } from '../../hooks/useContracts';
import ScopeOfWorkEditor from '../ScopeOfWorkEditor';

interface Props {
  opportunity: Opportunity | null;
  onClose: () => void;
}

const inputClass =
  'w-full px-3 py-1.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--theme-accent)]';

export default function CreateContractModal({ opportunity, onClose }: Props) {
  const saveContract = useSaveContract();

  const [title, setTitle] = useState('');
  const [totalAmount, setTotalAmount] = useState('');
  const [contentHtml, setContentHtml] = useState('');
  const [emailSubject, setEmailSubject] = useState('');
  const [emailBody, setEmailBody] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Title/Total pre-fill from the deal card; Scope of Work stays blank —
  // contracts don't carry the client/contractor snapshot fields proposals do.
  useEffect(() => {
    if (!opportunity) return;
    setTitle(opportunity.name || '');
    setTotalAmount(opportunity.deal_value != null ? String(opportunity.deal_value) : '');
    setContentHtml('');
    setEmailSubject('');
    setEmailBody('');
    setError(null);
  }, [opportunity?.id]);

  if (!opportunity) return null;

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!opportunity) return;
    if (!title.trim()) return setError('Give this contract a title.');
    const plainText = contentHtml.replace(/<[^>]*>/g, '').trim();
    if (!plainText) return setError('Write the scope of work.');

    saveContract.mutate(
      {
        opportunity_id: opportunity.id,
        title: title.trim(),
        content_html: contentHtml,
        total_amount: totalAmount ? Number(totalAmount) : 0,
        email_subject: emailSubject.trim() || undefined,
        email_body: emailBody.trim() || undefined,
      },
      {
        onSuccess: () => onClose(),
        onError: (err) => setError(err instanceof Error ? err.message : 'Failed to save.'),
      }
    );
  }

  return (
    <div className="fixed inset-0 bg-slate-900/70 z-[120] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl max-h-[85vh] flex flex-col">
        <div className="flex items-center justify-between px-6 pt-6 shrink-0">
          <h3 className="text-lg font-bold text-slate-800">New Contract for {opportunity.name}</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <i className="fa-solid fa-xmark" />
          </button>
        </div>
        <p className="text-xs text-slate-500 px-6 mt-1 shrink-0">
          Title and total pre-fill from this deal — write the scope of work below.
        </p>

        <form onSubmit={handleSubmit} className="px-6 py-4 space-y-3 overflow-y-auto">
          <div className="flex gap-2">
            <div className="flex-1">
              <label className="block text-xs font-medium text-slate-600 mb-1">Title</label>
              <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} className={inputClass} />
            </div>
            <div className="w-32">
              <label className="block text-xs font-medium text-slate-600 mb-1">Total $</label>
              <input
                type="number"
                min={0}
                step="any"
                value={totalAmount}
                onChange={(e) => setTotalAmount(e.target.value)}
                className={inputClass}
              />
            </div>
          </div>

          <ScopeOfWorkEditor value={contentHtml} onChange={setContentHtml} label="Scope of Work" />

          <details className="text-xs">
            <summary className="cursor-pointer text-slate-500 font-medium select-none">Customize the send email (optional)</summary>
            <div className="space-y-1.5 mt-1.5">
              <input
                type="text"
                value={emailSubject}
                onChange={(e) => setEmailSubject(e.target.value)}
                placeholder="Leave blank to use the default subject"
                className={inputClass}
              />
              <textarea
                value={emailBody}
                onChange={(e) => setEmailBody(e.target.value)}
                rows={3}
                placeholder="Leave blank to use the default template — placeholders: {{first_name}} {{contract_link}}"
                className={inputClass}
              />
            </div>
          </details>

          {error && <p className="text-xs text-rose-600 bg-rose-50 border border-rose-200 rounded-md px-2 py-1">{error}</p>}

          <div className="flex gap-2 pt-1">
            <button
              type="submit"
              disabled={saveContract.isPending}
              className="flex-1 px-4 py-2 text-sm font-semibold text-white bg-[var(--theme-accent)] hover:opacity-90 rounded-lg disabled:opacity-50"
            >
              {saveContract.isPending ? 'Saving...' : 'Save Contract'}
            </button>
            <button
              type="button"
              onClick={onClose}
              disabled={saveContract.isPending}
              className="flex-1 px-4 py-2 text-sm font-medium border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-lg disabled:opacity-50"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
