import { useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { fetchPublicContract, signContract } from '../api/contracts';
import SignatureField, { SignatureFieldHandle } from '../components/SignatureField';
import SignedOutcomeScreen from '../components/SignedOutcomeScreen';
import FillableFieldsRenderer, { FieldValue, FillableFieldsRendererHandle } from '../components/richtext/FillableFieldsRenderer';
import { fillMergeFields } from '../utils/mergeFields';

function money(n: number) {
  return `$${Number(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function today() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
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
  const [signatureName, setSignatureName] = useState('');
  const [signatureEmail, setSignatureEmail] = useState('');
  const [signatureDate, setSignatureDate] = useState(today());
  const [error, setError] = useState<string | null>(null);
  const [hasSignature, setHasSignature] = useState(false);
  const padRef = useRef<SignatureFieldHandle>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const fieldsRef = useRef<FillableFieldsRendererHandle>(null);
  const [fieldValues, setFieldValues] = useState<Record<string, FieldValue>>({});

  useEffect(() => {
    if (data?.field_values) setFieldValues(data.field_values);
  }, [data?.field_values]);

  useEffect(() => {
    if (data?.contact_email) setSignatureEmail(data.contact_email);
  }, [data?.contact_email]);

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

  function handleSignAndSend() {
    setError(null);
    if (!data || !data.success || !data.id) return;
    if (!signatureName.trim()) return setError('Enter your full name.');
    if (!signatureEmail.trim()) return setError('Enter your email.');
    if (!signatureDate) return setError('Enter the date.');
    if (!padRef.current || padRef.current.isEmpty()) return setError('Please draw your signature.');

    sign.mutate({
      signature_name: signatureName.trim(),
      signature_email: signatureEmail.trim(),
      signature_date: signatureDate,
      signature_data: padRef.current.toDataURL(),
    });
  }

  const resolvedContentHtml = data
    ? fillMergeFields(data.content_html, {
        client_name: `${data.first_name || ''} ${data.last_name || ''}`.trim(),
        client_email: data.contact_email,
        owner_name: data.owner_name,
        owner_email: data.owner_email,
        owner_phone: data.owner_phone,
      })
    : '';

  return (
    <div className="min-h-screen bg-slate-50 flex items-start justify-center py-10 px-4">
      <div className="w-full max-w-2xl bg-white rounded-2xl shadow-lg border border-slate-200 p-8">
        {isLoading ? (
          <p className="text-sm text-slate-400 text-center py-10">Loading...</p>
        ) : !data || !data.success ? (
          <p className="text-sm text-rose-600 text-center py-10">This contract link is invalid or has expired.</p>
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
            />
            <p className="text-right text-lg font-bold text-slate-800 mt-3">Total: {money(data.total_amount)}</p>

            <div className="mt-8 pt-6 border-t border-slate-100">
              <div className="space-y-3">
                <div className="flex gap-3">
                  <div className="flex-1">
                    <label className="block text-xs font-medium text-slate-600 mb-1">Full Name</label>
                    <input
                      type="text"
                      value={signatureName}
                      onChange={(e) => setSignatureName(e.target.value)}
                      placeholder="Jane Doe"
                      className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                  <div className="flex-1">
                    <label className="block text-xs font-medium text-slate-600 mb-1">Date</label>
                    <input
                      type="date"
                      value={signatureDate}
                      onChange={(e) => setSignatureDate(e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Email</label>
                  <input
                    type="email"
                    value={signatureEmail}
                    onChange={(e) => setSignatureEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <SignatureField ref={padRef} onChange={setHasSignature} />
                {error && <p className="text-xs text-rose-600">{error}</p>}
                <button
                  type="button"
                  onClick={handleSignAndSend}
                  disabled={sign.isPending || !hasSignature || !signatureName.trim() || !signatureEmail.trim() || !signatureDate}
                  title={!hasSignature ? 'Draw or type your signature to enable submitting' : undefined}
                  className="w-full px-6 py-2.5 text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg disabled:opacity-50"
                >
                  {sign.isPending ? 'Sending...' : 'Sign & Send'}
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
