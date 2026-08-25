import { InvoiceLineItemInput } from '../../api/payments';

const inputClass =
  'px-2 py-1 text-xs border border-slate-200 rounded focus:outline-none focus:ring-2 focus:ring-indigo-500';

function money(n: number) {
  return `$${Number(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function lineTotal(it: InvoiceLineItemInput) {
  return it.qty * it.unit_price - (it.discount || 0) + (it.tax || 0);
}

export function invoiceTotals(items: InvoiceLineItemInput[]) {
  const amount = items.reduce((sum, it) => sum + it.qty * it.unit_price, 0);
  const discount = items.reduce((sum, it) => sum + (it.discount || 0), 0);
  const tax = items.reduce((sum, it) => sum + (it.tax || 0), 0);
  return { amount, discount, tax, total: amount - discount + tax };
}

interface Props {
  items: InvoiceLineItemInput[];
  onChange: (items: InvoiceLineItemInput[]) => void;
}

// Shared by the New Invoice modal and the Invoice Detail page's Edit mode
// so both build the exact same shape/computation.
export default function InvoiceLineItemsEditor({ items, onChange }: Props) {
  function updateItem(i: number, patch: Partial<InvoiceLineItemInput>) {
    onChange(items.map((it, idx) => (idx === i ? { ...it, ...patch } : it)));
  }
  function addItem() {
    onChange([...items, { product: '', qty: 1, unit_price: 0, discount: 0, tax: 0 }]);
  }
  function removeItem(i: number) {
    onChange(items.filter((_, idx) => idx !== i));
  }

  const totals = invoiceTotals(items);

  return (
    <div>
      <table className="w-full text-xs">
        <thead>
          <tr className="text-left text-slate-400 uppercase tracking-wide border-b border-slate-100">
            <th className="py-1.5 pr-2 font-semibold">Product / Service</th>
            <th className="py-1.5 px-2 font-semibold w-14">Qty</th>
            <th className="py-1.5 px-2 font-semibold w-24">Unit Price</th>
            <th className="py-1.5 px-2 font-semibold w-20">Discount</th>
            <th className="py-1.5 px-2 font-semibold w-20">Tax</th>
            <th className="py-1.5 pl-2 font-semibold w-24 text-right">Total</th>
            <th className="w-6" />
          </tr>
        </thead>
        <tbody>
          {items.map((it, i) => (
            <tr key={i} className="border-b border-slate-50 last:border-0">
              <td className="py-1.5 pr-2">
                <input
                  type="text"
                  value={it.product}
                  onChange={(e) => updateItem(i, { product: e.target.value })}
                  placeholder="Product or service"
                  className={`${inputClass} w-full`}
                />
              </td>
              <td className="py-1.5 px-2">
                <input
                  type="number"
                  value={it.qty}
                  onChange={(e) => updateItem(i, { qty: Number(e.target.value) })}
                  className={`${inputClass} w-full`}
                />
              </td>
              <td className="py-1.5 px-2">
                <input
                  type="number"
                  value={it.unit_price}
                  onChange={(e) => updateItem(i, { unit_price: Number(e.target.value) })}
                  className={`${inputClass} w-full`}
                />
              </td>
              <td className="py-1.5 px-2">
                <input
                  type="number"
                  value={it.discount || 0}
                  onChange={(e) => updateItem(i, { discount: Number(e.target.value) })}
                  className={`${inputClass} w-full`}
                />
              </td>
              <td className="py-1.5 px-2">
                <input
                  type="number"
                  value={it.tax || 0}
                  onChange={(e) => updateItem(i, { tax: Number(e.target.value) })}
                  className={`${inputClass} w-full`}
                />
              </td>
              <td className="py-1.5 pl-2 text-right font-medium text-slate-700">{money(lineTotal(it))}</td>
              <td className="py-1.5 text-center">
                <button type="button" onClick={() => removeItem(i)} className="text-slate-300 hover:text-rose-500">
                  <i className="fa-solid fa-xmark" />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <button type="button" onClick={addItem} className="text-xs font-semibold text-indigo-600 hover:underline mt-2">
        <i className="fa-solid fa-plus mr-1" /> Add line item
      </button>

      <div className="mt-3 pt-3 border-t border-slate-100 space-y-1 text-xs max-w-52 ml-auto">
        <div className="flex justify-between"><span className="text-slate-400">Subtotal</span><span>{money(totals.amount)}</span></div>
        <div className="flex justify-between"><span className="text-slate-400">Discount</span><span>{money(totals.discount)}</span></div>
        <div className="flex justify-between"><span className="text-slate-400">Tax</span><span>{money(totals.tax)}</span></div>
        <div className="flex justify-between font-bold text-slate-800 pt-1 border-t border-slate-100">
          <span>Total</span><span>{money(totals.total)}</span>
        </div>
      </div>
    </div>
  );
}
