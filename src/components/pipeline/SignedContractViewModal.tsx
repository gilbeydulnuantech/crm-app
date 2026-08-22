import { FormEvent, useRef, useState } from 'react';
import { useSignedContract, useSendSignedContractEmail } from '../../hooks/useContracts';
import { useAuth } from '../../context/AuthContext';
import { generateContractPdf } from '../../api/contracts';
import FillableFieldsRenderer, { FieldValue } from '../richtext/FillableFieldsRenderer';
import { fillMergeFields } from '../../utils/mergeFields';

function downloadBase64Pdf(base64: string, filename: string) {
  const byteChars = atob(base64);
  const byteNumbers = new Array(byteChars.length);
  for (let i = 0; i < byteChars.length; i++) byteNumbers[i] = byteChars.charCodeAt(i);
  const blob = new Blob([new Uint8Array(byteNumbers)], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

interface Props {
  contractId: number | null;
  onClose: () => void;
}

function money(n: number) {
  return `$${Number(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

// Admin/rep-facing read view of a signed contract — the template with the
// actual signer's merge fields, filled-in interactive fields, and drawn
// signature all resolved and locked, plus Send (resend a copy) and
// Download PDF actions. This is the internal counterpart to the client's
// public signing page, which itself shows nothing further once signed.
export default function SignedContractViewModal({ contractId, onClose }: Props) {
  const { isAdmin } = useAuth();
  const { data, isLoading, error } = useSignedContract(contractId, contractId != null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [sendOpen, setSendOpen] = useState(false);
  const [sendTo, setSendTo] = useState('');
  const [sendSubject, setSendSubject] = useState('');
  const [sendBody, setSendBody] = useState('');
  const [sendError, setSendError] = useState<string | null>(null);
  const [sendDone, setSendDone] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState<string | null>(null);
  const sendEmail = useSendSignedContractEmail();

  if (contractId == null) return null;

  function openSend() {
    if (!data) return;
    setSendTo(data.signature_email || data.contact_email || '');
    setSendSubject(`Your signed contract — ${data.title}`);
    setSendBody(
      `Hi ${data.first_name || 'there'},\n\nAttached is a copy of your signed contract, "${data.title}", signed on ${
        data.signed_at ? new Date(data.signed_at).toLocaleDateString() : ''
      }.\n\nThanks,\n${data.owner_name || ''}`
    );
    setSendError(null);
    setSendDone(false);
    setSendOpen(true);
  }

  function handleSendSubmit(e: FormEvent) {
    e.preventDefault();
    setSendError(null);
    if (!sendTo.trim()) return setSendError('Enter a recipient email.');
    if (contractId == null) return;
    sendEmail.mutate(
      { contract_id: contractId, to: sendTo.trim(), subject: sendSubject.trim(), body: sendBody },
      {
        onSuccess: () => setSendDone(true),
        onError: (err) => setSendError(err instanceof Error ? err.message : 'Failed to send.'),
      }
    );
  }

  async function handleDownload() {
    if (!data || contractId == null) return;
    setDownloadError(null);
    setIsDownloading(true);
    try {
      const res = await generateContractPdf(contractId);
      if (!res.success || !res.pdfBase64) throw new Error(res.error || 'Failed to generate the PDF.');
      downloadBase64Pdf(res.pdfBase64, `${(res.title || data.title).replace(/\s+/g, '_')}_signed.pdf`);
    } catch (err) {
      setDownloadError(err instanceof Error ? err.message : 'Failed to generate the PDF. Please try again.');
    } finally {
      setIsDownloading(false);
    }
  }

  const resolvedHtml = data
    ? fillMergeFields(data.content_html, {
        client_name: `${data.first_name || ''} ${data.last_name || ''}`.trim(),
        client_email: data.contact_email,
        owner_name: data.owner_name,
        owner_email: data.owner_email,
        owner_phone: data.owner_phone,
      })
    : '';

  return (
    <div className="fixed inset-0 bg-slate-900/70 z-[130] flex items-start justify-center overflow-y-auto py-10 px-4" onClick={onClose}>
      <div className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl p-8 relative" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between gap-3 mb-2">
          <span className="px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide rounded-full bg-emerald-100 text-emerald-700">
            Signed
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={openSend}
              className="px-3 py-1.5 text-xs font-semibold text-white bg-[var(--theme-accent)] hover:opacity-90 rounded-lg"
            >
              <i className="fa-solid fa-paper-plane mr-1.5" />
              Send
            </button>
            <button
              type="button"
              onClick={handleDownload}
              disabled={isDownloading || isLoading || !data}
              className="px-3 py-1.5 text-xs font-semibold text-slate-600 border border-slate-200 hover:bg-slate-50 rounded-lg disabled:opacity-50"
            >
              <i className="fa-solid fa-download mr-1.5" />
              {isDownloading ? 'Preparing...' : 'Download PDF'}
            </button>
            <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-600 ml-1">
              <i className="fa-solid fa-xmark" />
            </button>
          </div>
        </div>
        {downloadError && <p className="text-xs text-rose-600 mb-2">{downloadError}</p>}

        {isLoading ? (
          <p className="text-sm text-slate-400 text-center py-10">Loading...</p>
        ) : error || !data || !data.success ? (
          <p className="text-sm text-rose-600 text-center py-10">
            {error instanceof Error ? error.message : 'Failed to load this contract.'}
          </p>
        ) : (
          <>
            <div
              ref={contentRef}
              className="rte-content mt-5 bg-slate-50 border border-slate-100 rounded-lg p-4"
              dangerouslySetInnerHTML={{ __html: resolvedHtml }}
            />
            <FillableFieldsRenderer
              containerRef={contentRef}
              contentHtml={resolvedHtml}
              values={(data.field_values as Record<string, FieldValue>) || {}}
              onChange={() => {}}
              readOnly
            />
            <p className="text-right text-lg font-bold text-slate-800 mt-3">Total: {money(data.total_amount)}</p>

            <div className="mt-6 pt-6 border-t border-slate-100">
              <p className="text-xs font-medium text-slate-500 mb-2">Signed by</p>
              {data.signature_data && (
                <img src={data.signature_data} alt="Signature" className="h-16 border border-slate-100 rounded bg-white" />
              )}
              <p className="text-sm font-semibold text-slate-800 mt-2">{data.signature_name}</p>
              <p className="text-xs text-slate-400">
                {data.signature_email} · {data.signature_date}
                {data.signed_at ? ` · ${new Date(data.signed_at).toLocaleString()}` : ''}
              </p>
              {isAdmin && data.signature_ip && <p className="text-[11px] text-slate-400 mt-1">IP: {data.signature_ip}</p>}
            </div>
          </>
        )}
      </div>

      {sendOpen && (
        <div className="fixed inset-0 z-[140] flex items-start justify-center pt-24 px-4" onClick={(e) => e.stopPropagation()}>
          <div className="fixed inset-0 bg-slate-900/40" onClick={() => setSendOpen(false)} />
          <div className="relative bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-md p-4">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-semibold text-slate-700">Send Signed Contract</h4>
              <button onClick={() => setSendOpen(false)} className="text-slate-400 hover:text-slate-600">
                <i className="fa-solid fa-xmark text-sm" />
              </button>
            </div>

            {sendDone ? (
              <p className="text-sm text-emerald-700 text-center py-4">
                <i className="fa-solid fa-circle-check mr-1.5" />
                Sent.
              </p>
            ) : (
              <form onSubmit={handleSendSubmit} className="space-y-2.5">
                <div>
                  <label className="block text-[11px] font-medium text-slate-500 mb-1">To</label>
                  <input
                    value={sendTo}
                    onChange={(e) => setSendTo(e.target.value)}
                    className="w-full px-2.5 py-1.5 text-sm border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-[var(--theme-accent)]"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-slate-500 mb-1">Subject</label>
                  <input
                    value={sendSubject}
                    onChange={(e) => setSendSubject(e.target.value)}
                    className="w-full px-2.5 py-1.5 text-sm border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-[var(--theme-accent)]"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-slate-500 mb-1">Message</label>
                  <textarea
                    rows={5}
                    value={sendBody}
                    onChange={(e) => setSendBody(e.target.value)}
                    className="w-full px-2.5 py-1.5 text-sm border border-slate-200 rounded-md resize-none focus:outline-none focus:ring-2 focus:ring-[var(--theme-accent)]"
                  />
                </div>
                {sendError && (
                  <div className="p-2 text-xs rounded-md text-center bg-rose-50 text-rose-700 border border-rose-200">{sendError}</div>
                )}
                <div className="flex justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setSendOpen(false)}
                    className="px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 rounded-md"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={sendEmail.isPending}
                    className="px-3 py-1.5 text-xs font-semibold bg-[var(--theme-accent)] hover:opacity-90 disabled:opacity-60 text-white rounded-md"
                  >
                    {sendEmail.isPending ? 'Sending...' : 'Send'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
