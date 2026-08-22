import { Node, mergeAttributes } from '@tiptap/core';
import { ReactNodeViewRenderer } from '@tiptap/react';
import FillableFieldView from './FillableFieldView';

export type FillableFieldType = 'signature' | 'text' | 'date' | 'initials' | 'checkbox';

// An inline placeholder the REP drops into the document while building it.
// It carries no value of its own — the client fills the real control in on
// the public page (see FillableFieldsRenderer), keyed by fieldId, and that
// gets submitted alongside Approve/Sign.
const FillableField = Node.create({
  name: 'fillableField',
  group: 'inline',
  inline: true,
  atom: true,
  selectable: true,

  addAttributes() {
    return {
      fieldId: { default: '' },
      fieldType: { default: 'text' },
      label: { default: '' },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'span[data-fillable-field]',
        getAttrs: (element: HTMLElement) => ({
          fieldId: element.getAttribute('data-field-id') || '',
          fieldType: element.getAttribute('data-field-type') || 'text',
          label: element.getAttribute('data-label') || '',
        }),
      },
    ];
  },

  renderHTML({ node }) {
    return [
      'span',
      mergeAttributes({
        'data-fillable-field': 'true',
        'data-field-id': node.attrs.fieldId,
        'data-field-type': node.attrs.fieldType,
        'data-label': node.attrs.label,
        class: 'fillable-field-placeholder',
      }),
      `[${node.attrs.label || node.attrs.fieldType}]`,
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer(FillableFieldView);
  },
});

export default FillableField;
