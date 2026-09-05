import { useState } from 'react';
import { useDraftDealFollowup } from '../../hooks/useDealFollowup';

// AI-drafted follow-up message for a deal, generated on-demand from a
// self-hosted Ollama instance (llama3.1) — see the "Draft Deal Follow-Up"
// n8n workflow. Takes 10-50s depending on whether the model is already
// warm; shown as an editable draft the rep can tweak before copying it
// into an actual email/message, not sent automatically.
export default function DraftFollowupButton({ dealId }: { dealId: number }) {
  const draftFollowup = useDraftDealFollowup();
  const [draft, setDraft] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  function handleDraft() {
    setDraft(null);
    draftFollowup.mutate(dealId, {
      onSuccess: (res) => setDraft(res.draft),
    });
  }

  function handleCopy() {
    if (!draft) return;
    navigator.clipboard.writeText(draft);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div className="mt-2">
      <button
        type="button"
        onClick={handleDraft}
        disabled={draftFollowup.isPending}
        className="text-[11px] font-semibold text-indigo-700 hover:underline disabled:opacity-50"
      >
        {draftFollowup.isPending ? 'Drafting... (can take up to a minute)' : draft ? 'Regenerate draft' : '✨ Draft a follow-up message'}
      </button>

      {draftFollowup.isError && (
        <p className="text-[11px] text-rose-600 mt-1">
          {draftFollowup.error instanceof Error ? draftFollowup.error.message : 'Failed to generate a draft.'}
        </p>
      )}

      {draft && (
        <div className="mt-2 space-y-1.5">
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            rows={4}
            className="w-full text-xs p-2 border border-indigo-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[var(--theme-accent)]"
          />
          <button
            type="button"
            onClick={handleCopy}
            className="text-[11px] font-semibold text-slate-500 hover:text-slate-700"
          >
            <i className={`fa-solid ${copied ? 'fa-check text-emerald-500' : 'fa-copy'} mr-1`} />
            {copied ? 'Copied!' : 'Copy'}
          </button>
        </div>
      )}
    </div>
  );
}
