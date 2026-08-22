import { useRef } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { fetchPublicContract } from '../api/contracts';
import { fetchPublicProposal } from '../api/proposals';
import FillableFieldsRenderer, { FieldValue } from '../components/richtext/FillableFieldsRenderer';
import { fillMergeFields } from '../utils/mergeFields';

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
  });
  // preview=true — this is an internal render for PDF generation, not the
  // client viewing their proposal, so it must not count as a lead view.
  const { data: proposal, isLoading: proposalLoading } = useQuery({
    queryKey: ['public-proposal', proposalToken],
    queryFn: () => fetchPublicProposal(proposalToken, true),
    enabled: !!proposalToken,
    retry: false,
  });
  const contentRef = useRef<HTMLDivElement>(null);
  const proposalContentRef = useRef<HTMLDivElement>(null);

  if (isLoading || (proposalToken && proposalLoading)) return null;
  if (!data || !data.success) return <p className="p-8 text-sm text-rose-600">This contract link is invalid or has expired.</p>;

  const resolvedHtml = fillMergeFields(data.content_html, {
    client_name: `${data.first_name || ''} ${data.last_name || ''}`.trim(),
    client_email: data.contact_email,
    owner_name: data.owner_name,
    owner_email: data.owner_email,
    owner_phone: data.owner_phone,
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
          <div className="mt-6 pt-6 border-t border-slate-100">
            <p className="text-xs font-medium text-slate-500 mb-2">Signed by</p>
            {data.signature_data && <img src={data.signature_data} alt="Signature" className="h-16" />}
            <p className="text-sm font-semibold text-slate-800 mt-2">{data.signature_name}</p>
            <p className="text-xs text-slate-400">
              {data.signature_email} · {data.signature_date}
              {data.signed_at ? ` · ${new Date(data.signed_at).toLocaleString()}` : ''}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
