import Image from '@tiptap/extension-image';
import { ReactNodeViewRenderer } from '@tiptap/react';
import ResizableImageView from './ResizableImageView';

export default Image.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      width: {
        default: null,
        parseHTML: (element: HTMLElement) => element.style.width || element.getAttribute('width'),
        renderHTML: (attributes: { width?: string | null }) => {
          if (!attributes.width) return {};
          return { style: `width: ${attributes.width}` };
        },
      },
      // Rendered on the bare <img> itself (no wrapping div) so it stays
      // correct in the static HTML shown outside the editor (Preview,
      // public pages) too. Left/right float the image so surrounding
      // paragraph text wraps around it, Word-style; center keeps it as its
      // own non-wrapped, centered line (matches Word's "In Line with Text"
      // vs. "Square"/"Tight" wrap behavior).
      align: {
        default: 'left',
        parseHTML: (element: HTMLElement) => element.getAttribute('data-align') || 'left',
        renderHTML: (attributes: { align?: string | null }) => {
          const align = attributes.align || 'left';
          const style =
            align === 'center'
              ? 'display:block;margin-left:auto;margin-right:auto;'
              : align === 'right'
                ? 'float:right;margin:0 0 0.5em 1em;'
                : 'float:left;margin:0 1em 0.5em 0;';
          return { 'data-align': align, style };
        },
      },
    };
  },
  addNodeView() {
    return ReactNodeViewRenderer(ResizableImageView);
  },
});
