import { Extension } from '@tiptap/core';

export interface IndentOptions {
  types: string[];
  minIndent: number;
  maxIndent: number;
  indentSize: number; // em per level
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    indent: {
      increaseIndent: () => ReturnType;
      decreaseIndent: () => ReturnType;
    };
  }
}

// Word-style Tab/Shift-Tab paragraph indent. Renders as a real margin-left
// style on the block (not literal tab/space characters, which browsers
// collapse in HTML) so it survives into the saved content_html and shows up
// identically in Preview and the sent public page.
const Indent = Extension.create<IndentOptions>({
  name: 'indent',

  addOptions() {
    return {
      types: ['paragraph', 'heading'],
      minIndent: 0,
      maxIndent: 8,
      indentSize: 2,
    };
  },

  addGlobalAttributes() {
    return [
      {
        types: this.options.types,
        attributes: {
          indent: {
            default: 0,
            parseHTML: (element: HTMLElement) => {
              const margin = parseFloat(element.style.marginLeft || '0');
              return Number.isFinite(margin) && margin > 0 ? Math.round(margin / this.options.indentSize) : 0;
            },
            renderHTML: (attributes: { indent?: number }) => {
              if (!attributes.indent) return {};
              return { style: `margin-left: ${attributes.indent * this.options.indentSize}em;` };
            },
          },
        },
      },
    ];
  },

  addCommands() {
    return {
      increaseIndent:
        () =>
        ({ tr, state, dispatch }) => {
          const { from, to } = state.selection;
          let changed = false;
          state.doc.nodesBetween(from, to, (node, pos) => {
            if (this.options.types.includes(node.type.name)) {
              const current = (node.attrs.indent as number) || 0;
              if (current < this.options.maxIndent) {
                tr.setNodeAttribute(pos, 'indent', current + 1);
                changed = true;
              }
            }
          });
          if (changed && dispatch) dispatch(tr);
          return changed;
        },
      decreaseIndent:
        () =>
        ({ tr, state, dispatch }) => {
          const { from, to } = state.selection;
          let changed = false;
          state.doc.nodesBetween(from, to, (node, pos) => {
            if (this.options.types.includes(node.type.name)) {
              const current = (node.attrs.indent as number) || 0;
              if (current > this.options.minIndent) {
                tr.setNodeAttribute(pos, 'indent', current - 1);
                changed = true;
              }
            }
          });
          if (changed && dispatch) dispatch(tr);
          return changed;
        },
    };
  },

  addKeyboardShortcuts() {
    return {
      // Lists already use Tab/Shift-Tab to sink/lift list items — only take
      // over the key outside of a list so that behavior is unaffected.
      Tab: () => {
        if (this.editor.isActive('listItem')) return false;
        return this.editor.commands.increaseIndent();
      },
      'Shift-Tab': () => {
        if (this.editor.isActive('listItem')) return false;
        return this.editor.commands.decreaseIndent();
      },
    };
  },
});

export default Indent;
