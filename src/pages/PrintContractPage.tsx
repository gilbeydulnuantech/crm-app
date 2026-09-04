import { useRef } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { fetchPublicContract } from '../api/contracts';
import { fetchPublicProposal } from '../api/proposals';
import FillableFieldsRenderer, { FieldValue } from '../components/richtext/FillableFieldsRenderer';
import { fillMergeFields } from '../utils/mergeFields';
import { toTitleCase } from '../utils/text';

function money(n: number) {
  return `$${Number(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

// Print-only rendering of a signed contract — no page chrome, no buttons,
// no interactive form. Fetched via the same public token as the client
// signing page, so no auth is needed here. This route exists purely as a
// navigation target for Puppeteer (server-side, same machine as n8n) to
// render to PDF via page.pdf() — real page navigation loads cross-origin
// images (the Drive-hosted logo) completely normally, sidestepping the
// CORS restrictions that only apply to fetch/canvas-style reads.
//
// An optional ?proposal=<token> renders the approved proposal that led to
// this contract first, on its own page (break-after: page), so downloading
// the signed contract bundles both documents into one PDF.
export default function PrintContractPage() {
  const { token = '' } = useParams();
  const [searchParams] = useSearchParams();
  const proposalToken = searchParams.get('proposal') || '';

  const { data, isLoading } = useQuery({
    queryKey: ['public-contract', token],
    queryFn: () => fetchPublicContract(token),
    enabled: !!token,
    retry: false,
    // This is a one-shot render for Puppeteer to snapshot into a PDF, not a
    // page anyone actually leaves open — the app's global 15s
    // refetchInterval default was firing a background refetch that kept
    // Puppeteer's networkidle0 wait from ever settling, adding ~15-20s to
    // every PDF generation for no benefit (nothing here needs to stay live).
    refetchInterval: false,
  });
  // preview=true — this is an internal render for PDF generation, not the
  // client viewing their proposal, so it must not count as a lead view.
  const { data: proposal, isLoading: proposalLoading } = useQuery({
    queryKey: ['public-proposal', proposalToken],
    queryFn: () => fetchPublicProposal(proposalToken, true),
    enabled: !!proposalToken,
    refetchInterval: false,
    retry: false,
  });
  const contentRef = useRef<HTMLDivElement>(null);
  const proposalContentRef = useRef<HTMLDivElement>(null);

  if (isLoading || (proposalToken && proposalLoading)) return null;
  if (!data || !data.success) return <p className="p-8 text-sm text-rose-600">This contract link is invalid or has expired.</p>;

  const resolvedHtml = fillMergeFields(data.content_html, {
    client_name: `${data.first_name || ''} ${data.last_name || ''}`.trim(),
    first_name: data.first_name,
    last_name: data.last_name,
    client_email: data.contact_email,
    owner_name: data.owner_name,
    owner_email: data.owner_email,
    owner_phone: data.owner_phone,
    company_name: data.company_name,
  });
  const resolvedProposalHtml =
    proposal && proposal.success
      ? fillMergeFields(proposal.content_html, {
          client_name: proposal.client_name,
          client_company_name: proposal.client_company_name,
          client_address: proposal.client_address,
          client_email: proposal.client_email,
          client_phone: proposal.client_phone,
          owner_name: proposal.owner_name,
          owner_email: proposal.owner_email,
          owner_phone: proposal.owner_phone,
          inspection_date: proposal.inspection_date,
          deal_value: proposal.deal_value,
          deal_name: proposal.deal_name,
          deal_created_at: proposal.deal_created_at,
          deal_due_at: proposal.deal_due_at,
          down_payment_amount: proposal.down_payment_amount,
          down_payment_paid_at: proposal.down_payment_paid_at,
          balance_amount: proposal.balance_amount,
          balance_paid_at: proposal.balance_paid_at,
        })
      : '';

  return (
    <div className="bg-white">
      {proposal && proposal.success && (
        <div className="p-8" style={{ breakAfter: 'page' }}>
          <div
            ref={proposalContentRef}
            className="rte-content"
            dangerouslySetInnerHTML={{ __html: resolvedProposalHtml }}
          />
          <FillableFieldsRenderer
            containerRef={proposalContentRef}
            contentHtml={resolvedProposalHtml}
            values={(proposal.field_values as Record<string, FieldValue>) || {}}
            onChange={() => {}}
            readOnly
          />
          <p className="text-right text-lg font-bold text-slate-800 mt-3">Total: {money(proposal.total_amount)}</p>
        </div>
      )}

      <div className="p-8">
        <div
          ref={contentRef}
          className="rte-content"
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

        {data.status === 'signed' && (
          // Audit trail only — the actual signature images already render
          // inline in the document above (via field_values), so a second
          // copy of them here would just be duplicate visual noise.
          <div className="mt-6 pt-4 border-t border-slate-100 space-y-1">
            <p className="text-xs text-slate-500">
              Signed by <span className="font-medium text-slate-700">{toTitleCase(data.signature_name)}</span>
              {data.signature_email ? ` (${data.signature_email})` : ''}
              {data.signed_at ? ` on ${new Date(data.signed_at).toLocaleString()}` : ''}
            </p>
            {data.cosigned_at && (
              <p className="text-xs text-slate-500">
                Countersigned by <span className="font-medium text-slate-700">{toTitleCase(data.cosigned_by_name)}</span>
                {` on ${new Date(data.cosigned_at).toLocaleString()}`}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
