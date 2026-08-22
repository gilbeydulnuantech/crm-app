import { useEffect, useRef, useState } from 'react';
import FillableFieldsRenderer, { FieldValue } from '../richtext/FillableFieldsRenderer';
import ThankYouScreen from '../ThankYouScreen';
import { fillPageFields } from '../../utils/mergeFields';

// Sample values so the preview reads naturally instead of showing literal
// {{tokens}} — not real data, just enough to check layout/copy end to end.
const SAMPLE = {
  first_name: 'Jane',
  last_name: 'Doe',
  owner_name: 'Alex Johnson',
  signature_name: 'Jane Doe',
  signed_at: new Date().toISOString(),
};

interface Props {
  open: boolean;
  onClose: () => void;
  title: string;
  contentHtml: string;
  // Optional next-step content — when set, the disabled "preview only"
  // buttons below become real, clickable steps through the whole
  // proposal → contract → thank-you chain, all client-side with sample
  // data, no backend calls. Any step left unset falls back to the old
  // disabled single-step preview for that step.
  linkedContractTitle?: string | null;
  linkedContractContentHtml?: string | null;
  linkedThankYouPageContentHtml?: string | null;
}

type Step = 'proposal' | 'contract' | 'thankyou';

// A read-only render of a proposal template's content — with fillable
// fields rendered as their real interactive controls via
// FillableFieldsRenderer, a true size/layout preview, not just the editor's
// static "[Signature]" chip. When a Linked contract template (and its own
// Thank You page) are configured, Approve/Sign & Send become real buttons
// that step through the whole chain in place, entirely in this overlay.
export default function ProposalPreviewOverlay({
  open,
  onClose,
  title,
  contentHtml,
  linkedContractTitle,
  linkedContractContentHtml,
  linkedThankYouPageContentHtml,
}: Props) {
  const [step, setStep] = useState<Step>('proposal');
  const proposalContentRef = useRef<HTMLDivElement>(null);
  const contractContentRef = useRef<HTMLDivElement>(null);
  const [proposalFieldValues, setProposalFieldValues] = useState<Record<string, FieldValue>>({});
  const [contractFieldValues, setContractFieldValues] = useState<Record<string, FieldValue>>({});

  useEffect(() => {
    if (open) setStep('proposal');
  }, [open]);

  if (!open) return null;

  const canPreviewContract = !!(linkedContractContentHtml && linkedContractContentHtml.replace(/<[^>]*>/g, '').trim());
  const canPreviewThankYou = !!(linkedThankYouPageContentHtml && linkedThankYouPageContentHtml.replace(/<[^>]*>/g, '').trim());

  return (
    <div
      className="fixed inset-0 bg-slate-900/70 z-[130] flex items-start justify-center overflow-y-auto py-10 px-4"
      onClick={onClose}
    >
      <div className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl p-8 relative" onClick={(e) => e.stopPropagation()}>
        <button type="button" onClick={onClose} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600">
          <i className="fa-solid fa-xmark" />
        </button>

        {step !== 'proposal' && (
          <span className="inline-block mb-3 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide rounded-full bg-indigo-100 text-indigo-700">
            Test mode — {step === 'contract' ? 'contract step' : 'thank you page'}
          </span>
        )}

        {step === 'proposal' && (
          <>
            <h1 className="text-2xl font-bold text-slate-800">{title || 'Untitled Proposal'}</h1>

            {contentHtml.replace(/<[^>]*>/g, '').trim() ? (
              <div ref={proposalContentRef} className="rte-content mt-6" dangerouslySetInnerHTML={{ __html: contentHtml }} />
            ) : (
              <p className="text-sm text-slate-400 italic mt-6">Write the Scope of Work to see it here.</p>
            )}
            <FillableFieldsRenderer
              containerRef={proposalContentRef}
              contentHtml={contentHtml}
              values={proposalFieldValues}
              onChange={(fieldId, value) => setProposalFieldValues((v) => ({ ...v, [fieldId]: value }))}
            />

            <div className="mt-8 pt-6 border-t border-slate-100 text-center">
              <button
                type="button"
                disabled={!canPreviewContract}
                onClick={() => canPreviewContract && setStep('contract')}
                className="px-6 py-2.5 text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-emerald-600"
              >
                Approve Proposal
              </button>
              <p className="text-[11px] text-slate-400 mt-2">
                {canPreviewContract
                  ? 'Test mode — click to preview the contract this generates.'
                  : 'This is a preview — set a Linked contract template to test the full flow here, or approving works once this template generates a real proposal for a deal.'}
              </p>
            </div>
          </>
        )}

        {step === 'contract' && (
          <>
            <h1 className="text-2xl font-bold text-slate-800">{linkedContractTitle || 'Untitled Contract'}</h1>

            <div
              ref={contractContentRef}
              className="rte-content mt-6 bg-slate-50 border border-slate-100 rounded-lg p-4"
              dangerouslySetInnerHTML={{ __html: linkedContractContentHtml || '' }}
            />
            <FillableFieldsRenderer
              containerRef={contractContentRef}
              contentHtml={linkedContractContentHtml || ''}
              values={contractFieldValues}
              onChange={(fieldId, value) => setContractFieldValues((v) => ({ ...v, [fieldId]: value }))}
            />

            <div className="mt-8 pt-6 border-t border-slate-100 text-center">
              <button
                type="button"
                onClick={() => setStep('thankyou')}
                className="w-full px-6 py-2.5 text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg"
              >
                Sign & Send
              </button>
              <p className="text-[11px] text-slate-400 mt-2">
                Test mode — click to preview {canPreviewThankYou ? "this contract's Thank You page" : 'the default confirmation screen'}.
              </p>
            </div>
          </>
        )}

        {step === 'thankyou' &&
          (canPreviewThankYou ? (
            <div
              className="rte-content"
              dangerouslySetInnerHTML={{
                __html: fillPageFields(linkedThankYouPageContentHtml || '', {
                  contact_full_name: `${SAMPLE.first_name} ${SAMPLE.last_name}`,
                  first_name: SAMPLE.first_name,
                  last_name: SAMPLE.last_name,
                  owner_name: SAMPLE.owner_name,
                  signature_name: SAMPLE.signature_name,
                  signed_at: SAMPLE.signed_at,
                }),
              }}
            />
          ) : (
            <ThankYouScreen signatureName={SAMPLE.signature_name} signedAt={SAMPLE.signed_at} />
          ))}
      </div>
    </div>
  );
}
