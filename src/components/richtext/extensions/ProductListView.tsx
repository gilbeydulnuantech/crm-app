import { NodeViewWrapper, NodeViewProps } from '@tiptap/react';
import { generateId } from '../../../utils/id';

export interface ProductItem {
  id: string;
  name: string;
  qty: number;
  price: number;
}

function money(n: number) {
  return `$${Number(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default function ProductListView({ node, updateAttributes }: NodeViewProps) {
  const items: ProductItem[] = node.attrs.items || [];
  const total = items.reduce((sum, it) => sum + (Number(it.qty) || 0) * (Number(it.price) || 0), 0);

  function setItems(next: ProductItem[]) {
    updateAttributes({ items: next });
  }

  function updateItem(id: string, patch: Partial<ProductItem>) {
    setItems(items.map((it) => (it.id === id ? { ...it, ...patch } : it)));
  }

  function addRow() {
    setItems([...items, { id: generateId(), name: '', qty: 1, price: 0 }]);
  }

  function removeRow(id: string) {
    setItems(items.filter((it) => it.id !== id));
  }

  return (
    <NodeViewWrapper className="proposal-product-list not-prose" contentEditable={false}>
      <table className="w-full border-collapse text-sm my-2">
        <thead>
          <tr>
            <th className="border border-slate-200 bg-slate-50 px-2 py-1 text-left font-semibold">Item</th>
            <th className="border border-slate-200 bg-slate-50 px-2 py-1 text-left font-semibold w-20">Qty</th>
            <th className="border border-slate-200 bg-slate-50 px-2 py-1 text-left font-semibold w-28">Price</th>
            <th className="border border-slate-200 bg-slate-50 px-2 py-1 text-left font-semibold w-28">Total</th>
            <th className="border border-slate-200 bg-slate-50 w-8" />
          </tr>
        </thead>
        <tbody>
          {items.map((it) => (
            <tr key={it.id}>
              <td className="border border-slate-200 p-0">
                <input
                  value={it.name}
                  onChange={(e) => updateItem(it.id, { name: e.target.value })}
                  placeholder="Item name"
                  className="w-full px-2 py-1 focus:outline-none focus:ring-1 focus:ring-[var(--theme-accent)]"
                />
              </td>
              <td className="border border-slate-200 p-0">
                <input
                  type="number"
                  min={0}
                  value={it.qty}
                  onChange={(e) => updateItem(it.id, { qty: Number(e.target.value) })}
                  className="w-full px-2 py-1 focus:outline-none focus:ring-1 focus:ring-[var(--theme-accent)]"
                />
              </td>
              <td className="border border-slate-200 p-0">
                <input
                  type="number"
                  min={0}
                  step="any"
                  value={it.price}
                  onChange={(e) => updateItem(it.id, { price: Number(e.target.value) })}
                  className="w-full px-2 py-1 focus:outline-none focus:ring-1 focus:ring-[var(--theme-accent)]"
                />
              </td>
              <td className="border border-slate-200 px-2 py-1 text-slate-600">{money((it.qty || 0) * (it.price || 0))}</td>
              <td className="border border-slate-200 text-center">
                <button type="button" onClick={() => removeRow(it.id)} className="text-slate-400 hover:text-rose-600 px-1">
                  <i className="fa-solid fa-xmark text-xs" />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr>
            <td colSpan={3} className="border border-slate-200 px-2 py-1 text-right font-semibold">
              Grand Total
            </td>
            <td className="border border-slate-200 px-2 py-1 font-semibold" colSpan={2}>
              {money(total)}
            </td>
          </tr>
        </tfoot>
      </table>
      <button type="button" onClick={addRow} className="text-xs font-semibold text-[var(--theme-accent)] hover:underline">
        + Add Row
      </button>
    </NodeViewWrapper>
  );
}
