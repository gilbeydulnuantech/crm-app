import { useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { fetchPublicContract, signContract } from '../api/contracts';
import SignedOutcomeScreen from '../components/SignedOutcomeScreen';
import DownPaymentForm from '../components/DownPaymentForm';
import ChatWidget from '../components/ChatWidget';
import FillableFieldsRenderer, { FieldValue, FillableFieldsRendererHandle } from '../components/richtext/FillableFieldsRenderer';
import { fillMergeFields } from '../utils/mergeFields';
import { toTitleCase } from '../utils/text';

function money(n: number) {
  return `$${Number(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function today() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// Formats a YYYY-MM-DD string for display without going through `new
// Date(isoString)`, which parses as UTC midnight and can display as the
// previous day in timezones behind UTC.
function formatDisplayDate(isoDate: string) {
  const [y, m, d] = isoDate.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString();
}

// Standalone entry point for a contract link shared/opened on its own
// (e.g. re-sent by a rep) — the primary flow is the combined view on
// PublicProposalPage, which resolves straight to this same contract data.
export default function PublicContractPage() {
  const { token = '' } = useParams();
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['public-contract', token],
    queryFn: () => fetchPublicContract(token),
    enabled: !!token,
    retry: false,
  });
  const [error, setError] = useState<string | null>(null);
  const [paidLocally, setPaidLocally] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);
  const fieldsRef = useRef<FillableFieldsRendererHandle>(null);
  const [fieldValues, setFieldValues] = useState<Record<string, FieldValue>>({});

  useEffect(() => {
    if (data?.field_values) setFieldValues(data.field_values);
  }, [data?.field_values]);

  // No manual Name/Email/Date entry form — the public link already
  // identifies who's signing (via the token, resolved server-side to the
  // linked contact), so those are taken straight from the known contact
  // instead of re-asking for them. Same idea as signature_ip being captured
  // automatically with no form field for it.
  const signatureName = data ? toTitleCase(`${data.first_name || ''} ${data.last_name || ''}`.trim()) : '';
  const signatureEmail = data?.contact_email || '';
  const signatureDate = today();

  const sign = useMutation({
    mutationFn: (payload: { signature_name: string; signature_email: string; signature_date: string; signature_data: string }) =>
      signContract({
        token,
        ...payload,
        field_values: { ...fieldValues, ...(fieldsRef.current?.collectSignatureValues() || {}) },
      }),
    onSuccess: () => refetch(),
    onError: (err) => setError(err instanceof Error ? err.message : 'Failed to sign.'),
  });

  const resolvedContentHtml = data
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

  // No standalone signature pad — signing happens through a `signature`-type
  // fillable field the rep drops into the document itself (Add Element ->
  // Fillable Fields -> Signature), same as the text/date/checkbox fields.
  // Falls back to letting a template with no signature field through
  // unsigned rather than permanently blocking Sign & Send on a template a
  // rep forgot to add one to. Narrowed to a field that's both type=signature
  // AND signerRole=client (on the same tag — every fillable field carries a
  // data-signer-role, defaulting to "client", even non-signature ones) so an
  // owner-role field (muted for this viewer) never gates Sign & Send.
  const hasSignatureField = /data-field-type="signature"[^>]*data-signer-role="client"/.test(resolvedContentHtml);

  function handleSignAndSend() {
    setError(null);
    if (!data || !data.success || !data.id) return;
    if (!signatureName) return setError("We're missing a name on file for this contact — please contact us to fix this before signing.");
    if (!signatureEmail) return setError("We're missing an email on file for this contact — please contact us to fix this before signing.");
    const signatureValues = fieldsRef.current?.collectSignatureValues() || {};
    const signatureData = Object.values(signatureValues)[0] as string | undefined;
    if (hasSignatureField && !signatureData) return setError('Please draw your signature.');

    sign.mutate({
      signature_name: signatureName.trim(),
      signature_email: signatureEmail.trim(),
      signature_date: signatureDate,
      signature_data: signatureData || '',
    });
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-start justify-center py-10 px-4">
      <div className="w-full max-w-2xl bg-white rounded-2xl shadow-lg border border-slate-200 p-8">
        {isLoading ? (
          <p className="text-sm text-slate-400 text-center py-10">Loading...</p>
        ) : !data || !data.success ? (
          <p className="text-sm text-rose-600 text-center py-10">This contract link is invalid or has expired.</p>
        ) : data.status === 'signed' && data.down_payment_token && !data.down_payment_paid && !paidLocally ? (
          <>
            <div className="text-center py-6">
              <div className="w-14 h-14 mx-auto rounded-full bg-emerald-100 flex items-center justify-center mb-4">
                <i className="fa-solid fa-circle-check text-2xl text-emerald-600" />
              </div>
              <h1 className="text-xl font-bold text-slate-800">
                Thank you{data.signature_name ? `, ${toTitleCase(data.signature_name)}` : ''}!
              </h1>
              <p className="text-sm text-slate-500 mt-1.5">Your contract is signed. One last step below.</p>
            </div>
            <DownPaymentForm token={data.down_payment_token} onPaid={() => setPaidLocally(true)} />
          </>
        ) : data.status === 'signed' ? (
          <SignedOutcomeScreen
            thankYouPageContentHtml={data.thank_you_page_content_html}
            firstName={data.first_name}
            lastName={data.last_name}
            ownerName={data.owner_name}
            signatureName={data.signature_name}
            signedAt={data.signed_at}
          />
        ) : (
          <>
            <div
              ref={contentRef}
              className="rte-content mt-5 bg-slate-50 border border-slate-100 rounded-lg p-4"
              dangerouslySetInnerHTML={{ __html: resolvedContentHtml }}
            />
            <FillableFieldsRenderer
              ref={fieldsRef}
              containerRef={contentRef}
              contentHtml={resolvedContentHtml}
              values={fieldValues}
              onChange={(fieldId, value) => setFieldValues((v) => ({ ...v, [fieldId]: value }))}
              readOnly={false}
              viewerSignerRole="client"
              otherPartyName={data.owner_name ? toTitleCase(data.owner_name) : undefined}
            />
            <p className="text-right text-lg font-bold text-slate-800 mt-3">Total: {money(data.total_amount)}</p>

            <div className="mt-8 pt-6 border-t border-slate-100">
              <div className="space-y-3">
                <p className="text-xs text-slate-500">
                  Signing as{' '}
                  <span className="font-medium text-slate-700">{signatureName || 'Unknown'}</span>
                  {signatureEmail ? ` (${signatureEmail})` : ''} on {formatDisplayDate(signatureDate)}.
                </p>
                {error && <p className="text-xs text-rose-600">{error}</p>}
                <button
                  type="button"
                  onClick={handleSignAndSend}
                  disabled={sign.isPending}
                  className="w-full px-6 py-2.5 text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg disabled:opacity-50"
                >
                  {sign.isPending ? 'Sending...' : 'Sign & Send'}
                </button>
              </div>
            </div>
          </>
        )}
      </div>
      <ChatWidget />
    </div>
  );
}
