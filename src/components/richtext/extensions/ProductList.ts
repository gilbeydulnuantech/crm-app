import { Node, mergeAttributes } from '@tiptap/core';
import { ReactNodeViewRenderer } from '@tiptap/react';
import ProductListView, { ProductItem } from './ProductListView';

function money(n: number) {
  return `$${Number(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

const ProductList = Node.create({
  name: 'productList',
  group: 'block',
  atom: true,
  selectable: true,

  addAttributes() {
    return {
      items: {
        default: [] as ProductItem[],
        parseHTML: (element: HTMLElement) => {
          try {
            return JSON.parse(element.getAttribute('data-items') || '[]');
          } catch {
            return [];
          }
        },
        renderHTML: (attributes: { items?: ProductItem[] }) => ({
          'data-items': JSON.stringify(attributes.items || []),
        }),
      },
    };
  },

  parseHTML() {
    return [{ tag: 'div[data-product-list]' }];
  },

  renderHTML({ HTMLAttributes, node }) {
    const items: ProductItem[] = node.attrs.items || [];
    const total = items.reduce((sum, it) => sum + (Number(it.qty) || 0) * (Number(it.price) || 0), 0);

    return [
      'div',
      mergeAttributes(HTMLAttributes, { 'data-product-list': 'true', class: 'proposal-product-list' }),
      [
        'table',
        {},
        ['thead', {}, ['tr', {}, ['th', {}, 'Item'], ['th', {}, 'Qty'], ['th', {}, 'Price'], ['th', {}, 'Total']]],
        [
          'tbody',
          {},
          ...items.map((it) => [
            'tr',
            {},
            ['td', {}, it.name || ''],
            ['td', {}, String(it.qty || 0)],
            ['td', {}, money(it.price)],
            ['td', {}, money((Number(it.qty) || 0) * (Number(it.price) || 0))],
          ]),
        ],
        ['tfoot', {}, ['tr', {}, ['td', { colspan: '3' }, 'Grand Total'], ['td', {}, money(total)]]],
      ],
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer(ProductListView);
  },
});

export default ProductList;
