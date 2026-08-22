import { Node } from '@tiptap/core';

// A purely visual/editorial marker — the exported "signed PDF" is a plain-text
// summary (see utils/contractPdf.ts), so this has no pagination effect there.
// It's a cue for the rep laying out a long document, and for print/CSS.
const PageBreak = Node.create({
  name: 'pageBreak',
  group: 'block',
  atom: true,
  selectable: true,

  parseHTML() {
    return [{ tag: 'div[data-page-break]' }];
  },

  renderHTML() {
    return ['div', { 'data-page-break': 'true', class: 'proposal-page-break' }, 'Page Break'];
  },
});

export default PageBreak;
