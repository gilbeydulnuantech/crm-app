import { useEffect, useRef, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { fetchPublicProposal, approveProposal } from '../api/proposals';
import { fetchPublicContract, signContract } from '../api/contracts';
import SignatureField, { SignatureFieldHandle } from '../components/SignatureField';
import SignedOutcomeScreen from '../components/SignedOutcomeScreen';
import DownPaymentForm from '../components/DownPaymentForm';
import ChatWidget from '../components/ChatWidget';
import FillableFieldsRenderer, { FieldValue, FillableFieldsRendererHandle } from '../components/richtext/FillableFieldsRenderer';
import { fillMergeFields } from '../utils/mergeFields';

function money(n: number) {
  return `$${Number(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function today() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export default function PublicProposalPage() {
  const { token = '' } = useParams();
  const [searchParams] = useSearchParams();
  const preview = searchParams.get('preview') === '1';
  const { data, isLoading, refetch: refetchProposal } = useQuery({
    queryKey: ['public-proposal', token],
    queryFn: () => fetchPublicProposal(token, preview),
    enabled: !!token,
    retry: false,
  });

  const [contractToken, setContractToken] = useState<string | null>(null);
  const [approveError, setApproveError] = useState<string | null>(null);
  const [paidLocally, setPaidLocally] = useState(false);
  const proposalContentRef = useRef<HTMLDivElement>(null);
  const proposalFieldsRef = useRef<FillableFieldsRendererHandle>(null);
  const [proposalFieldValues, setProposalFieldValues] = useState<Record<string, FieldValue>>({});

  useEffect(() => {
    if (data?.field_values) setProposalFieldValues(data.field_values);
  }, [data?.field_values]);

  const approve = useMutation({
    mutationFn: () => {
      const signatureValues = proposalFieldsRef.current?.collectSignatureValues() || {};
      return approveProposal(token, { ...proposalFieldValues, ...signatureValues });
    },
    onSuccess: (res) => {
      if (res.contract_token) setContractToken(res.contract_token);
      // data.status (from the initial fetch) is what gates which section
      // renders below — without this, the page stays stuck on the Approve
      // button after a successful approve until the user manually reloads.
      refetchProposal();
    },
    onError: (err) => setApproveError(err instanceof Error ? err.message : 'Failed to approve.'),
  });

  // Returning visitor whose proposal is already approved — silently resolve
  // the attached contract's token instead of making them click Approve again.
  useEffect(() => {
    if (data?.status === 'approved' && !contractToken && !approve.isPending && !approve.isSuccess) {
      approve.mutate();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data?.status]);

  const { data: contract, error: contractError, refetch: refetchContract } = useQuery({
    queryKey: ['public-contract', contractToken],
    queryFn: () => fetchPublicContract(contractToken!),
    enabled: !!contractToken,
    retry: false,
  });

  const [signatureName, setSignatureName] = useState('');
  const [signatureEmail, setSignatureEmail] = useState('');
  const [signatureDate, setSignatureDate] = useState(today());
  const [signError, setSignError] = useState<string | null>(null);
  const [hasSignature, setHasSignature] = useState(false);
  const padRef = useRef<SignatureFieldHandle>(null);
  const contractContentRef = useRef<HTMLDivElement>(null);
  const contractFieldsRef = useRef<FillableFieldsRendererHandle>(null);
  const [contractFieldValues, setContractFieldValues] = useState<Record<string, FieldValue>>({});

  useEffect(() => {
    if (contract?.field_values) setContractFieldValues(contract.field_values);
  }, [contract?.field_values]);

  useEffect(() => {
    if (data?.contact_email) setSignatureEmail(data.contact_email);
  }, [data?.contact_email]);

  const sign = useMutation({
    mutationFn: (payload: { signature_name: string; signature_email: string; signature_date: string; signature_data: string }) =>
      signContract({
        token: contractToken!,
        ...payload,
        field_values: { ...contractFieldValues, ...(contractFieldsRef.current?.collectSignatureValues() || {}) },
      }),
    onSuccess: () => refetchContract(),
    onError: (err) => setSignError(err instanceof Error ? err.message : 'Failed to sign.'),
  });

  function handleSignAndSend() {
    setSignError(null);
    if (!data || !contract || !contract.success || !contract.id) return;
    if (!signatureName.trim()) return setSignError('Enter your full name.');
    if (!signatureEmail.trim()) return setSignError('Enter your email.');
    if (!signatureDate) return setSignError('Enter the date.');
    if (!padRef.current || padRef.current.isEmpty()) return setSignError('Please draw your signature.');

    sign.mutate({
      signature_name: signatureName.trim(),
      signature_email: signatureEmail.trim(),
      signature_date: signatureDate,
      signature_data: padRef.current.toDataURL(),
    });
  }

  const mergeValues = data
    ? {
        client_name: data.client_name,
        client_company_name: data.client_company_name,
        client_address: data.client_address,
        client_email: data.client_email,
        client_phone: data.client_phone,
        owner_name: data.owner_name,
        owner_email: data.owner_email,
        owner_phone: data.owner_phone,
      }
    : {};
  const resolvedProposalHtml = data ? fillMergeFields(data.content_html, mergeValues) : '';
  // The contract auto-generated from this proposal shares the same
  // client/owner — reuse the proposal's merge values for its content too.
  const resolvedContractHtml = contract ? fillMergeFields(contract.content_html, mergeValues) : '';

  return (
    <div className="min-h-screen bg-slate-50 flex items-start justify-center py-10 px-4">
      <div className="w-full max-w-2xl bg-white rounded-2xl shadow-lg border border-slate-200 p-8">
        {isLoading ? (
          <p className="text-sm text-slate-400 text-center py-10">Loading...</p>
        ) : !data || !data.success ? (
          <p className="text-sm text-rose-600 text-center py-10">This proposal link is invalid or has expired.</p>
        ) : contract?.status === 'signed' && contract.down_payment_token && !contract.down_payment_paid && !paidLocally ? (
          <>
            <div className="text-center py-6">
              <div className="w-14 h-14 mx-auto rounded-full bg-emerald-100 flex items-center justify-center mb-4">
                <i className="fa-solid fa-circle-check text-2xl text-emerald-600" />
              </div>
              <h1 className="text-xl font-bold text-slate-800">
                Thank you{contract.signature_name ? `, ${contract.signature_name}` : ''}!
              </h1>
              <p className="text-sm text-slate-500 mt-1.5">Your contract is signed. One last step below.</p>
            </div>
            <DownPaymentForm token={contract.down_payment_token} onPaid={() => setPaidLocally(true)} />
          </>
        ) : contract?.status === 'signed' ? (
          <SignedOutcomeScreen
            thankYouPageContentHtml={contract.thank_you_page_content_html}
            firstName={data.first_name}
            lastName={data.last_name}
            ownerName={data.owner_name}
            signatureName={contract.signature_name}
            signedAt={contract.signed_at}
          />
        ) : (
          <>
            {/* No auto-generated logo/title/"Proposal for X" caption or
                Client/Contractor/Owner box — the rep composes the entire
                document themselves (logo, heading, client info, all via
                {{token}}s) in the body below, so this page renders exactly
                what they wrote instead of layering an auto header on top
                of it. */}

            <div ref={proposalContentRef} className="rte-content" dangerouslySetInnerHTML={{ __html: resolvedProposalHtml }} />
            <FillableFieldsRenderer
              ref={proposalFieldsRef}
              containerRef={proposalContentRef}
              contentHtml={resolvedProposalHtml}
              values={proposalFieldValues}
              onChange={(fieldId, value) => setProposalFieldValues((v) => ({ ...v, [fieldId]: value }))}
              readOnly={data.status === 'approved'}
            />
            <p className="text-right text-lg font-bold text-slate-800 mt-3">Total: {money(data.total_amount)}</p>

            <div className="mt-8 pt-6 border-t border-slate-100">
              {data.status !== 'approved' ? (
                <div className="text-center">
                  <button
                    type="button"
                    onClick={() => {
                      setApproveError(null);
                      approve.mutate();
                    }}
                    disabled={approve.isPending}
                    className="px-6 py-2.5 text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg disabled:opacity-50"
                  >
                    {approve.isPending ? 'Approving...' : 'Approve Proposal'}
                  </button>
                  {approveError && <p className="text-xs text-rose-600 mt-2">{approveError}</p>}
                </div>
              ) : approveError ? (
                <p className="text-sm text-rose-600 text-center">{approveError}</p>
              ) : contractError ? (
                <p className="text-sm text-rose-600 text-center">
                  {contractError instanceof Error ? contractError.message : 'Failed to load your work agreement.'}
                </p>
              ) : !contract ? (
                <p className="text-sm text-slate-400 text-center">Loading your work agreement...</p>
              ) : !contract.success || !contract.id ? (
                <p className="text-sm text-rose-600 text-center">
                  Something went wrong loading your work agreement — please refresh, or contact us if this persists.
                </p>
              ) : (
                <>
                  <p className="text-sm font-semibold text-emerald-700 text-center mb-4">
                    <i className="fa-solid fa-circle-check mr-1.5" />
                    Proposal approved — sign the work agreement below to finalize.
                  </p>

                  <div
                    ref={contractContentRef}
                    className="rte-content mt-3 bg-slate-50 border border-slate-100 rounded-lg p-4"
                    dangerouslySetInnerHTML={{ __html: resolvedContractHtml }}
                  />
                  <FillableFieldsRenderer
                    ref={contractFieldsRef}
                    containerRef={contractContentRef}
                    contentHtml={resolvedContractHtml}
                    values={contractFieldValues}
                    onChange={(fieldId, value) => setContractFieldValues((v) => ({ ...v, [fieldId]: value }))}
                    readOnly={false}
                  />

                  <div className="space-y-3 mt-5">
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
                    {signError && <p className="text-xs text-rose-600">{signError}</p>}
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
                </>
              )}
            </div>
          </>
        )}
      </div>
      <ChatWidget />
    </div>
  );
}
