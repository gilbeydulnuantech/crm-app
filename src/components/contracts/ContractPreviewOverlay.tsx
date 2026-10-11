import { useProducts } from '../../hooks/useProducts';
import { resolveProductTokens } from '../../utils/mergeFields';
import { useRef, useState } from 'react';
import FillableFieldsRenderer, { FieldValue } from '../richtext/FillableFieldsRenderer';
import { DocBrandHeader, DocBrandFooter } from '../DocumentBranding';

interface Props {
  open: boolean;
  onClose: () => void;
  title: string;
  contentHtml: string;
}

// A read-only render of exactly what the client will see on the public
// contract page — same idea as ProposalPreviewOverlay, minus the
// client/contractor boxes contracts don't carry. No total shown — this is a
// standalone template, so the amount only exists once it's generated for a
// specific deal. Fillable fields (signature, text, date, etc.) render as
// their real interactive controls here too, via FillableFieldsRenderer —
// not just the editor's static "[Signature]" chip — so this is a true
// size/layout preview of what the client will actually see and fill in.
export default function ContractPreviewOverlay({ open, onClose, title, contentHtml: rawContentHtml }: Props) {
  const { data: products = [] } = useProducts();
  const contentHtml = resolveProductTokens(rawContentHtml, products);
  const contentRef = useRef<HTMLDivElement>(null);
  const [fieldValues, setFieldValues] = useState<Record<string, FieldValue>>({});

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 bg-slate-900/70 z-[130] flex items-start justify-center overflow-y-auto py-10 px-4"
      onClick={onClose}
    >
      <div className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl p-8 relative" onClick={(e) => e.stopPropagation()}>
        <button type="button" onClick={onClose} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600">
          <i className="fa-solid fa-xmark" />
        </button>

        <h1 className="text-2xl font-bold text-slate-800">{title || 'Untitled Contract'}</h1>

        <DocBrandHeader />

        {contentHtml.replace(/<[^>]*>/g, '').trim() ? (
          <div ref={contentRef} className="rte-content mt-6 bg-slate-50 border border-slate-100 rounded-lg p-4" dangerouslySetInnerHTML={{ __html: contentHtml }} />
        ) : (
          <p className="text-sm text-slate-400 italic mt-6">Write the contract content to see it here.</p>
        )}
        <FillableFieldsRenderer
          containerRef={contentRef}
          contentHtml={contentHtml}
          values={fieldValues}
          onChange={(fieldId, value) => setFieldValues((v) => ({ ...v, [fieldId]: value }))}
        />
          <DocBrandFooter />

        <div className="mt-8 pt-6 border-t border-slate-100 text-center">
          <button
            type="button"
            disabled
            className="w-full px-6 py-2.5 text-sm font-semibold text-white bg-emerald-600 rounded-lg opacity-50 cursor-not-allowed"
          >
            Sign & Send
          </button>
          <p className="text-[11px] text-slate-400 mt-2">This is a preview — signing works once the contract is saved and sent.</p>
        </div>
      </div>
    </div>
  );
}
