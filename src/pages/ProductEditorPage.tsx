import { useEventTypes } from '../hooks/useEventTypes';
import EventTypeCreateInline from '../components/EventTypeCreateInline';
import { FormEvent, useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useProducts, useSaveProduct } from '../hooks/useProducts';
import ScopeOfWorkEditor from '../components/ScopeOfWorkEditor';
import { RichTextEditorHandle } from '../components/RichTextEditor';

const inputClass =
  'w-full px-3 py-1.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--theme-accent)]';

const UNITS = ['each', 'hour', 'day', 'visit', 'sq ft', 'linear ft', 'square (100 sq ft)', 'job', 'month'];

// Same shell as ProposalEditorPage/PageEditorPage: header with Back + name +
// Save, formatting toolbar, a document canvas (the description) and a
// "properties" column on the right (price, unit, tax, SKU...).
export default function ProductEditorPage() {
  const { id } = useParams();
  const isEdit = id != null && id !== 'new';
  const navigate = useNavigate();

  const { data: products = [] } = useProducts();
  const saveProduct = useSaveProduct();

  const [productId, setProductId] = useState<number | undefined>(undefined);
  const [name, setName] = useState('');
  const [descriptionHtml, setDescriptionHtml] = useState('');
  const [unitPrice, setUnitPrice] = useState('');
  const [taxRate, setTaxRate] = useState('');
  const [unit, setUnit] = useState('each');
  const [sku, setSku] = useState('');
  const [category, setCategory] = useState('');
  const [eventTypeId, setEventTypeId] = useState<number | null>(null);
  const [creatingType, setCreatingType] = useState(false);
  const [bookableOnline, setBookableOnline] = useState(true);
  // Lengths a client can pick online, each with a price. Empty = one length priced at the unit price above.
  const [lengths, setLengths] = useState<{ minutes: string; price: string }[]>([]);
  const { data: eventTypes = [] } = useEventTypes();
  const [isActive, setIsActive] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [loadedExisting, setLoadedExisting] = useState(false);
  const editorRef = useRef<RichTextEditorHandle>(null);
  const toolbarContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isEdit || loadedExisting) return;
    const p = products.find((x) => String(x.id) === id);
    if (!p) return;
    setProductId(p.id);
    setName(p.name);
    setDescriptionHtml(p.description_html);
    setUnitPrice(String(p.unit_price));
    setTaxRate(p.tax_rate ? String(p.tax_rate) : '');
    setUnit(p.unit);
    setSku(p.sku || '');
    setCategory(p.category || '');
    setEventTypeId(p.event_type_id ?? null);
    setBookableOnline(p.bookable_online === true);
    setLengths((p.durations ?? []).map((d) => ({ minutes: String(d.minutes), price: String(d.price) })));
    setIsActive(p.is_active);
    setLoadedExisting(true);
  }, [isEdit, loadedExisting, products, id]);

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!name.trim()) return setError('Give this product a name.');
    const price = unitPrice === '' ? 0 : Number(unitPrice);
    if (!Number.isFinite(price) || price < 0) return setError('Price must be 0 or more.');
    const tax = taxRate === '' ? 0 : Number(taxRate);
    if (!Number.isFinite(tax) || tax < 0 || tax > 100) return setError('Tax rate must be between 0 and 100.');

    saveProduct.mutate(
      {
        id: productId,
        name: name.trim(),
        description_html: descriptionHtml,
        sku: sku.trim() || undefined,
        category: category.trim() || undefined,
        unit: unit.trim() || 'each',
        unit_price: price,
        tax_rate: tax,
        is_active: isActive,
        event_type_id: eventTypeId,
        bookable_online: bookableOnline,
        durations: lengths.map((l) => ({ minutes: Number(l.minutes), price: Number(l.price) || 0 })),
      },
      {
        onSuccess: () => navigate('/products'),
        onError: (err) => setError(err instanceof Error ? err.message : 'Failed to save.'),
      }
    );
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-white">
      <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-slate-200 bg-white shrink-0">
        <button
          type="button"
          onClick={() => navigate('/products')}
          className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 shrink-0"
        >
          <i className="fa-solid fa-chevron-left text-xs" />
          Back
        </button>

        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="New Product"
          className="flex-1 max-w-md text-center text-sm font-semibold text-slate-800 border border-slate-200 rounded-full px-4 py-1.5 focus:outline-none focus:ring-2 focus:ring-[var(--theme-accent)] focus:border-transparent"
        />

        <button
          type="button"
          onClick={handleSubmit}
          disabled={saveProduct.isPending}
          className="px-4 py-1.5 text-xs font-semibold text-white bg-[var(--theme-accent)] hover:opacity-90 rounded-lg disabled:opacity-50 shrink-0"
        >
          {saveProduct.isPending ? 'Saving...' : 'Save'}
        </button>
      </div>

      <div ref={toolbarContainerRef} className="relative shrink-0" />

      {error && <p className="text-xs text-rose-600 bg-rose-50 border-b border-rose-200 px-4 py-1.5 shrink-0">{error}</p>}

      <div className="flex-1 flex overflow-hidden">
        <div className="flex-1 overflow-y-auto bg-slate-100">
          <div className="max-w-[850px] mx-auto py-8 px-4">
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-10">
              <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide mb-3">Description</p>
              <ScopeOfWorkEditor
                ref={editorRef}
                value={descriptionHtml}
                onChange={setDescriptionHtml}
                toolbarContainer={toolbarContainerRef}
              />
            </div>
          </div>
        </div>

        <div className="w-80 shrink-0 border-l border-slate-200 bg-white overflow-y-auto p-4 space-y-4">
          <h3 className="text-sm font-bold text-slate-800">Product properties</h3>

          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Price $</label>
            <input type="number" min={0} step="any" value={unitPrice} onChange={(e) => setUnitPrice(e.target.value)} className={inputClass} placeholder="0.00" />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Unit</label>
            <input list="product-units" value={unit} onChange={(e) => setUnit(e.target.value)} className={inputClass} />
            <datalist id="product-units">
              {UNITS.map((u) => (
                <option key={u} value={u} />
              ))}
            </datalist>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Tax rate %</label>
            <input type="number" min={0} max={100} step="any" value={taxRate} onChange={(e) => setTaxRate(e.target.value)} className={inputClass} placeholder="0" />
            <p className="text-[10px] text-slate-400 italic mt-1">Applied as a dollar tax amount when you add this item to an invoice or proposal.</p>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">SKU</label>
            <input value={sku} onChange={(e) => setSku(e.target.value)} className={inputClass} maxLength={80} />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Category</label>
            <input value={category} onChange={(e) => setCategory(e.target.value)} className={inputClass} maxLength={80} placeholder="e.g. Roofing, Labor, Materials" />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Event type</label>
            <select
              value={eventTypeId ?? ''}
              onChange={(e) => {
                if (e.target.value === '__new') setCreatingType(true);
                else setEventTypeId(e.target.value ? Number(e.target.value) : null);
              }}
              className={inputClass}
            >
              <option value="">No type</option>
              {eventTypes.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
              <option value="__new">+ New type...</option>
            </select>
            {creatingType && (
              <div className="mt-1.5">
                <EventTypeCreateInline
                  onCancel={() => setCreatingType(false)}
                  onCreated={(t) => {
                    setEventTypeId(t.id);
                    setCreatingType(false);
                  }}
                />
              </div>
            )}
            <p className="text-[10px] text-slate-400 italic mt-1">When this service is picked as the title of a calendar event, the event takes this type and its color.</p>
          </div>

          <label className="flex items-center gap-2 text-xs text-slate-600 cursor-pointer">
            <input type="checkbox" checked={bookableOnline} onChange={(e) => setBookableOnline(e.target.checked)} className="rounded border-slate-300" />
            Show this service on the public booking page (clients pick a service before choosing their staff member)
          </label>

          {bookableOnline && (
            <div>
              <div className="text-xs font-medium text-slate-600 mb-1">Lengths and prices (optional)</div>
              <p className="text-[10px] text-slate-400 italic mb-2">
                Add 30, 60, 90 or 120 minutes with a price for each, and the client picks a length when booking online. Leave empty for a single length at the price above.
              </p>
              <div className="space-y-2">
                {lengths.map((l, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <select
                      value={l.minutes}
                      onChange={(e) => setLengths((cur) => cur.map((x, j) => (j === i ? { ...x, minutes: e.target.value } : x)))}
                      className="px-2 py-1.5 text-sm border border-slate-200 rounded-lg bg-white"
                      aria-label="Length"
                    >
                      {[15, 30, 45, 60, 75, 90, 120, 150, 180].map((m) => (
                        <option key={m} value={m}>
                          {m} min
                        </option>
                      ))}
                    </select>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={l.price}
                      onChange={(e) => setLengths((cur) => cur.map((x, j) => (j === i ? { ...x, price: e.target.value } : x)))}
                      placeholder="Price"
                      className="w-28 px-2 py-1.5 text-sm border border-slate-200 rounded-lg"
                      aria-label="Price"
                    />
                    <button type="button" onClick={() => setLengths((cur) => cur.filter((_, j) => j !== i))} className="text-slate-400 hover:text-rose-600" aria-label="Remove length">
                      <i className="fa-solid fa-xmark" />
                    </button>
                  </div>
                ))}
              </div>
              <button
                type="button"
                onClick={() =>
                  setLengths((cur) => {
                    const used = new Set(cur.map((x) => Number(x.minutes)));
                    const next = [30, 60, 90, 120, 45, 15, 150, 180, 75].find((m) => !used.has(m)) ?? 60;
                    return [...cur, { minutes: String(next), price: '' }];
                  })
                }
                className="mt-2 text-xs font-medium text-[var(--theme-accent)] hover:underline"
              >
                + Add a length
              </button>
            </div>
          )}

          <label className="flex items-center gap-2 text-xs text-slate-600 cursor-pointer">
            <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} className="rounded border-slate-300" />
            Active (available when building invoices and proposals)
          </label>
        </div>
      </div>
    </div>
  );
}
