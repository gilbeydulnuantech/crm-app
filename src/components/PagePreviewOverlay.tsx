import { useProducts } from '../hooks/useProducts';
import { resolveProductTokens } from '../utils/mergeFields';

// Sample values so a preview reads naturally instead of showing literal
// {{tokens}} — these aren't the real resolved values (that happens once a
// Page is linked to a contract's "Thank You page"), just stand-ins for
// checking the page's layout/copy.
const SAMPLE_VALUES: Record<string, string> = {
  contact_full_name: 'Jane Doe',
  first_name: 'Jane',
  last_name: 'Doe',
  owner_name: 'Alex Johnson',
  signature_name: 'Jane Doe',
  signed_at: new Date().toLocaleDateString(),
};

function fillSampleFields(html: string): string {
  let result = html || '';
  for (const [key, value] of Object.entries(SAMPLE_VALUES)) {
    result = result.replace(new RegExp(`\\{\\{\\s*${key}\\s*\\}\\}`, 'gi'), value);
  }
  return result;
}

interface Props {
  open: boolean;
  onClose: () => void;
  name: string;
  contentHtml: string;
}

export default function PagePreviewOverlay({ open, onClose, name, contentHtml }: Props) {
  const { data: products = [] } = useProducts();
  if (!open) return null;

  const resolvedHtml = resolveProductTokens(fillSampleFields(contentHtml), products);

  return (
    <div
      className="fixed inset-0 bg-slate-900/70 z-[130] flex items-start justify-center overflow-y-auto py-10 px-4"
      onClick={onClose}
    >
      <div className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl p-8 relative" onClick={(e) => e.stopPropagation()}>
        <button type="button" onClick={onClose} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600">
          <i className="fa-solid fa-xmark" />
        </button>

        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">{name || 'Untitled Page'}</p>

        {contentHtml.replace(/<[^>]*>/g, '').trim() ? (
          <div className="rte-content mt-4" dangerouslySetInnerHTML={{ __html: resolvedHtml }} />
        ) : (
          <p className="text-sm text-slate-400 italic mt-4">Write the page content to see it here.</p>
        )}

        <p className="text-[11px] text-slate-400 italic mt-6 pt-4 border-t border-slate-100">
          This is a preview with sample values — dynamic fields resolve to real data once this page is linked to a
          contract's Thank You page.
        </p>
      </div>
    </div>
  );
}
