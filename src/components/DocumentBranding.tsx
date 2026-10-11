import { useDocumentBranding } from '../hooks/useDocumentBranding';

// Company header and footer for proposals and contracts — on the customer's page, the internal views, the editor
// previews and the PDF, so a document looks the same wherever it is opened. Renders nothing unless an admin has
// switched on "Show company header and footer on proposals and contracts" (Settings > Company Profile).
const BRAND_FALLBACK = '#2563EB';

export function DocBrandHeader() {
  const { data } = useDocumentBranding();
  if (!data || !data.document_branding_enabled) return null;
  const color = /^#[0-9a-fA-F]{6}$/.test(data.brand_color || '') ? (data.brand_color as string) : BRAND_FALLBACK;
  if (!data.logo_url && !data.company_name) return null;
  return (
    <div className="pb-3 mb-5" style={{ borderBottom: `3px solid ${color}` }}>
      {data.logo_url && <img src={data.logo_url} alt={data.company_name || ''} style={{ maxHeight: 56, maxWidth: 220, display: 'block', marginBottom: 6 }} />}
      {data.company_name && (
        <div className="text-lg font-bold" style={{ color }}>
          {data.company_name}
        </div>
      )}
    </div>
  );
}

export function DocBrandFooter() {
  const { data } = useDocumentBranding();
  if (!data || !data.document_branding_enabled) return null;
  const lines = [data.address, data.phone, data.website, data.email].filter(Boolean) as string[];
  if (lines.length === 0 && !data.footer_note) return null;
  return (
    <div className="mt-6 pt-3 border-t border-slate-200 text-[11px] text-slate-500">
      {lines.length > 0 && <div>{lines.join(' · ')}</div>}
      {data.footer_note && <div className="mt-1 whitespace-pre-line">{data.footer_note}</div>}
    </div>
  );
}
