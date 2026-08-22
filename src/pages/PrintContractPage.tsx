import { useRef } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { fetchPublicContract } from '../api/contracts';
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
export default function PrintContractPage() {
  const { token = '' } = useParams();
  const { data, isLoading } = useQuery({
    queryKey: ['public-contract', token],
    queryFn: () => fetchPublicContract(token),
    enabled: !!token,
    retry: false,
  });
  const contentRef = useRef<HTMLDivElement>(null);

  if (isLoading) return null;
  if (!data || !data.success) return <p className="p-8 text-sm text-rose-600">This contract link is invalid or has expired.</p>;

  const resolvedHtml = fillMergeFields(data.content_html, {
    client_name: `${data.first_name || ''} ${data.last_name || ''}`.trim(),
    client_email: data.contact_email,
    owner_name: data.owner_name,
    owner_email: data.owner_email,
    owner_phone: data.owner_phone,
  });

  return (
    <div className="bg-white p-8">
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
  );
}
