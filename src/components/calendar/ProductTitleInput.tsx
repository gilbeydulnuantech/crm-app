import { useMemo, useState } from 'react';
import { useProducts } from '../../hooks/useProducts';

interface Props {
  value: string;
  onChange: (value: string) => void;
  /** Linked product id (or null). Kept while the title still contains the product's name. */
  productId: number | null;
  onProductChange: (id: number | null) => void;
  placeholder?: string;
  className?: string;
}

function money(n: number) {
  return `$${Number(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

// The event title is still free text, but it doubles as a picker: focusing it lists the
// saved Products & Services (name on the left, price on the right) and choosing one
// fills in its name. Typing narrows the list; anything typed that isn't a product is kept as is.
export default function ProductTitleInput({ value, onChange, productId, onProductChange, placeholder, className }: Props) {
  const { data: products = [] } = useProducts();
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);

  const options = useMemo(() => {
    const q = value.trim().toLowerCase();
    const live = products.filter((p) => p.is_active);
    return q ? live.filter((p) => p.name.toLowerCase().includes(q) || (p.category ?? '').toLowerCase().includes(q)) : live;
  }, [products, value]);

  function pick(p: { id: number; name: string }) {
    onChange(p.name);
    onProductChange(p.id);
    setOpen(false);
  }

  function handleTyping(text: string) {
    onChange(text);
    if (productId != null) {
      const linked = products.find((p) => p.id === productId);
      if (!linked || !text.toLowerCase().includes(linked.name.toLowerCase())) onProductChange(null);
    }
  }

  const showList = open && options.length > 0;

  return (
    <div className="relative">
      <input
        required
        value={value}
        onChange={(e) => {
          handleTyping(e.target.value);
          setOpen(true);
          setActive(0);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={(e) => {
          if (!showList) return;
          if (e.key === 'ArrowDown') {
            e.preventDefault();
            setActive((i) => Math.min(options.length - 1, i + 1));
          } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setActive((i) => Math.max(0, i - 1));
          } else if (e.key === 'Enter') {
            e.preventDefault();
            pick(options[active]);
          } else if (e.key === 'Escape') {
            e.stopPropagation();
            setOpen(false);
          }
        }}
        placeholder={placeholder}
        autoComplete="off"
        className={className}
      />
      {showList && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <ul className="absolute top-full mt-1 left-0 w-full bg-white border border-slate-200 rounded-lg shadow-lg z-20 py-1 max-h-56 overflow-y-auto">
            {options.map((p, i) => (
              <li key={p.id}>
                <button
                  type="button"
                  onMouseEnter={() => setActive(i)}
                  onClick={() => pick(p)}
                  className={`w-full flex items-center justify-between gap-3 px-3 py-1.5 text-sm text-left text-slate-700 ${
                    i === active ? 'bg-slate-50' : ''
                  }`}
                >
                  <span className="truncate">
                    {p.name}
                    {p.category && <span className="ml-2 text-[10px] text-slate-400">{p.category}</span>}
                  </span>
                  <span className="shrink-0 text-xs font-medium text-slate-500">{money(p.unit_price)}</span>
                </button>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
