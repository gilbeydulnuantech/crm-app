import Table, { TableView } from '@tiptap/extension-table';
import type { Node as ProseMirrorNode } from '@tiptap/pm/model';

type Align = 'left' | 'center' | 'right';

// Applies node.attrs.align to the live editing DOM — the base TableView
// only manages column widths, so alignment would otherwise only show up in
// the saved/rendered HTML output and never while actually editing.
class AlignableTableView extends TableView {
  constructor(node: ProseMirrorNode, cellMinWidth: number) {
    super(node, cellMinWidth);
    this.applyAlign();
  }

  update(node: ProseMirrorNode) {
    const result = super.update(node);
    if (result) this.applyAlign();
    return result;
  }

  applyAlign() {
    const align: Align = (this.node.attrs.align as Align) || 'left';
    this.table.style.marginLeft = align === 'left' ? '0' : 'auto';
    this.table.style.marginRight = align === 'right' ? '0' : 'auto';
  }
}

// Selectable (click the table to select it as a block, e.g. via the drag
// handle) and alignable — a rep can shrink a table with the column-resize
// handles, then center/left/right it on the page instead of it always
// spanning full width.
const AlignableTable = Table.extend({
  addOptions() {
    return {
      ...this.parent?.(),
      allowTableNodeSelection: true,
      View: AlignableTableView,
    };
  },

  addAttributes() {
    return {
      ...this.parent?.(),
      align: {
        default: 'left',
        parseHTML: (element: HTMLElement) => {
          const style = element.getAttribute('style') || '';
          if (/margin-left:\s*auto/.test(style) && /margin-right:\s*auto/.test(style)) return 'center';
          if (/margin-left:\s*auto/.test(style)) return 'right';
          return 'left';
        },
        renderHTML: (attributes: { align?: Align }) => {
          if (!attributes.align || attributes.align === 'left') return {};
          return {
            style: attributes.align === 'center' ? 'margin-left: auto; margin-right: auto;' : 'margin-left: auto; margin-right: 0;',
          };
        },
      },
    };
  },
});

export default AlignableTable;
