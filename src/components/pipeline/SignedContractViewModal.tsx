import { FormEvent, useRef, useState } from 'react';
import { useSignedContract, useSendSignedContractEmail, useCosignContract } from '../../hooks/useContracts';
import { useAuth } from '../../context/AuthContext';
import { generateContractPdf } from '../../api/contracts';
import FillableFieldsRenderer, { FieldValue } from '../richtext/FillableFieldsRenderer';
import SignatureField, { SignatureFieldHandle } from '../SignatureField';
import { fillMergeFields } from '../../utils/mergeFields';
import { toTitleCase } from '../../utils/text';
import { DocBrandHeader, DocBrandFooter } from '../DocumentBranding';

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
  const { user, isAdmin } = useAuth();
  const { data, isLoading, error } = useSignedContract(contractId, contractId != null);
  const contentRef = useRef<HTMLDivElement>(null);
  const cosignPadRef = useRef<SignatureFieldHandle>(null);
  const [sendOpen, setSendOpen] = useState(false);
  const [sendTo, setSendTo] = useState('');
  const [sendSubject, setSendSubject] = useState('');
  const [sendBody, setSendBody] = useState('');
  const [sendError, setSendError] = useState<string | null>(null);
  const [sendDone, setSendDone] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState<string | null>(null);
  const [cosignError, setCosignError] = useState<string | null>(null);
  // Values the owner types into their own non-signature fields (e.g. a date
  // next to the contractor signature) while countersigning — kept separate
  // from `data.field_values` (the client's already-submitted values) so only
  // what the owner actually touches gets sent to the cosign endpoint.
  const [ownerFieldEdits, setOwnerFieldEdits] = useState<Record<string, FieldValue>>({});
  const sendEmail = useSendSignedContractEmail();
  const cosign = useCosignContract();

  if (contractId == null) return null;

  function openSend() {
    if (!data) return;
    setSendTo(data.signature_email || data.contact_email || '');
    setSendSubject(`Your signed contract — ${data.title}`);
    setSendBody(
      `Hi ${data.first_name ? toTitleCase(data.first_name) : 'there'},\n\nAttached is a copy of your signed contract, "${data.title}", signed on ${
        data.signed_at ? new Date(data.signed_at).toLocaleDateString() : ''
      }.\n\nThanks,\n${data.owner_name ? toTitleCase(data.owner_name) : ''}`
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
        first_name: data.first_name,
        last_name: data.last_name,
        client_email: data.contact_email,
        owner_name: data.owner_name,
        owner_email: data.owner_email,
        owner_phone: data.owner_phone,
        company_name: data.company_name,
      })
    : '';

  // Only contracts built with a dedicated "Owner Signature" field need a
  // co-sign step at all — one with no owner field behaves exactly as before
  // (Send/Download available immediately once the client has signed).
  const hasOwnerField = /data-field-type="signature"[^>]*data-signer-role="owner"/.test(resolvedHtml);
  const isCosigned = !!data?.cosigned_at;
  const canCosign = !!user && (isAdmin || (data?.assigned_user != null && data.assigned_user === user.id));
  const awaitingCosign = hasOwnerField && !isCosigned;

  function handleCosign() {
    setCosignError(null);
    if (!data || contractId == null) return;
    if (!cosignPadRef.current || cosignPadRef.current.isEmpty()) return setCosignError('Please draw your signature.');
    const ownerFieldId = contentRef.current?.querySelector<HTMLElement>('[data-field-type="signature"][data-signer-role="owner"]')
      ?.dataset.fieldId;
    if (!ownerFieldId) return setCosignError('Could not find the owner signature field on this contract.');
    cosign.mutate(
      { contractId, ownerFieldId, signatureData: cosignPadRef.current.toDataURL(), fieldValues: ownerFieldEdits },
      { onError: (err) => setCosignError(err instanceof Error ? err.message : 'Failed to countersign.') }
    );
  }

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
              disabled={awaitingCosign}
              title={awaitingCosign ? 'Waiting on the owner countersignature before this can be sent.' : undefined}
              className="px-3 py-1.5 text-xs font-semibold text-white bg-[var(--theme-accent)] hover:opacity-90 rounded-lg disabled:opacity-50"
            >
              <i className="fa-solid fa-paper-plane mr-1.5" />
              Send
            </button>
            <button
              type="button"
              onClick={handleDownload}
              disabled={isDownloading || isLoading || !data || awaitingCosign}
              title={awaitingCosign ? 'Waiting on the owner countersignature before this can be downloaded.' : undefined}
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
            <DocBrandHeader />
            <div
              ref={contentRef}
              className="rte-content mt-5 bg-slate-50 border border-slate-100 rounded-lg p-4"
              dangerouslySetInnerHTML={{ __html: resolvedHtml }}
            />
            <FillableFieldsRenderer
              containerRef={contentRef}
              contentHtml={resolvedHtml}
              values={{ ...((data.field_values as Record<string, FieldValue>) || {}), ...ownerFieldEdits }}
              onChange={(fieldId, value) => setOwnerFieldEdits((v) => ({ ...v, [fieldId]: value }))}
              readOnly
              editableSignerRole={!isCosigned && canCosign ? 'owner' : undefined}
            />
            <DocBrandFooter />
            <p className="text-right text-lg font-bold text-slate-800 mt-3">Total: {money(data.total_amount)}</p>

            {/* Audit trail only — the actual signature images already render
                inline in the document above (via field_values), so a second
                copy of them here would just be duplicate visual noise. */}
            <div className="mt-6 pt-4 border-t border-slate-100 space-y-1">
              <p className="text-xs text-slate-500">
                <i className="fa-solid fa-signature mr-1.5 text-slate-400" />
                Signed by <span className="font-medium text-slate-700">{toTitleCase(data.signature_name)}</span>
                {data.signature_email ? ` (${data.signature_email})` : ''}
                {data.signed_at ? ` on ${new Date(data.signed_at).toLocaleString()}` : ''}
                {isAdmin && data.signature_ip ? ` · IP ${data.signature_ip}` : ''}
              </p>
              {isCosigned && (
                <p className="text-xs text-slate-500">
                  <i className="fa-solid fa-signature mr-1.5 text-slate-400" />
                  Countersigned by <span className="font-medium text-slate-700">{toTitleCase(data.cosigned_by_name)}</span>
                  {data.cosigned_at ? ` on ${new Date(data.cosigned_at).toLocaleString()}` : ''}
                </p>
              )}
            </div>

            {hasOwnerField && !isCosigned && (
              <div className="mt-6 pt-6 border-t border-slate-100">
                {canCosign ? (
                  <div className="space-y-2.5">
                    <p className="text-xs text-slate-500">
                      This contract has an owner signature field awaiting your countersignature before it can be sent.
                      Any other fields reserved for you in the document above (like a date) are now editable too.
                    </p>
                    <SignatureField ref={cosignPadRef} />
                    {cosignError && <p className="text-xs text-rose-600">{cosignError}</p>}
                    <button
                      type="button"
                      onClick={handleCosign}
                      disabled={cosign.isPending}
                      className="px-3 py-1.5 text-xs font-semibold text-white bg-[var(--theme-accent)] hover:opacity-90 rounded-lg disabled:opacity-50"
                    >
                      {cosign.isPending ? 'Countersigning...' : 'Countersign'}
                    </button>
                  </div>
                ) : (
                  <p className="text-xs text-slate-400 italic">Awaiting the assigned owner's countersignature.</p>
                )}
              </div>
            )}
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
