import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useProducts, useDeleteProduct } from '../hooks/useProducts';
import ConfirmDialog from '../components/ConfirmDialog';

function money(n: number) {
  return `$${Number(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default function ProductsListPage() {
  const navigate = useNavigate();
  const { data: products = [], isLoading, error } = useProducts();
  const deleteProduct = useDeleteProduct();

  const [search, setSearch] = useState('');
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return products;
    return products.filter((p) =>
      [p.name, p.sku, p.category].some((v) => (v || '').toLowerCase().includes(q))
    );
  }, [products, search]);

  function handleDeleteConfirm() {
    if (confirmDeleteId == null) return;
    setDeleteError(null);
    deleteProduct.mutate(confirmDeleteId, {
      onSuccess: () => setConfirmDeleteId(null),
      onError: (err) => setDeleteError(err instanceof Error ? err.message : 'Failed to delete.'),
    });
  }

  return (
    <div className="flex-1 overflow-y-auto p-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-lg font-bold text-slate-800">Products &amp; Services</h1>
          <button
            type="button"
            onClick={() => navigate('/products/new')}
            className="px-4 py-2 text-sm font-semibold text-white bg-[var(--theme-accent)] hover:opacity-90 rounded-lg"
          >
            + New Product
          </button>
        </div>
        <p className="text-xs text-slate-500 -mt-2 mb-4">
          Your catalog of what you sell. Pick items from it when building an invoice or proposal — each
          document keeps its own copy of the price, so changing a price here never changes a document you already sent.
        </p>

        {products.length > 0 && (
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, SKU or category..."
            className="w-full max-w-sm mb-3 px-3 py-1.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--theme-accent)]"
          />
        )}

        {isLoading ? (
          <p className="text-sm text-slate-400">Loading...</p>
        ) : error ? (
          <p className="text-sm text-rose-600 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2">
            {error instanceof Error ? error.message : 'Failed to load products.'}
          </p>
        ) : products.length === 0 ? (
          <p className="text-sm text-slate-400 italic">No products yet. Add the services you sell so you can reuse them on invoices and proposals.</p>
        ) : filtered.length === 0 ? (
          <p className="text-sm text-slate-400 italic">No products match your search.</p>
        ) : (
          <div className="space-y-2">
            {filtered.map((p) => (
              <div key={p.id} className="bg-white px-4 py-3 border border-slate-200 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-slate-800 truncate">
                      {p.name}
                      {!p.is_active && (
                        <span className="ml-2 text-[10px] font-semibold uppercase tracking-wide text-slate-400 bg-slate-100 rounded-full px-2 py-0.5">
                          Inactive
                        </span>
                      )}
                    </p>
                    <p className="text-[11px] text-slate-400 truncate">
                      {[p.category, p.sku ? `SKU ${p.sku}` : null, p.tax_rate ? `${p.tax_rate}% tax` : null].filter(Boolean).join(' · ') || 'No category'}
                    </p>
                  </div>
                  <p className="text-sm font-semibold text-slate-700 shrink-0">
                    {money(p.unit_price)} <span className="text-[11px] font-normal text-slate-400">/ {p.unit}</span>
                  </p>
                  <button
                    type="button"
                    onClick={() => navigate(`/products/${p.id}/edit`)}
                    title="Edit"
                    className="shrink-0 text-slate-400 hover:text-[var(--theme-accent)]"
                  >
                    <i className="fa-solid fa-pen text-xs" />
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setDeleteError(null);
                      setConfirmDeleteId(p.id);
                    }}
                    title="Delete"
                    className="shrink-0 text-slate-400 hover:text-rose-600"
                  >
                    <i className="fa-solid fa-trash text-xs" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        <ConfirmDialog
          open={confirmDeleteId != null}
          title="Delete Product"
          body="This removes the product from your catalog. Invoices and proposals that already used it keep their own copy and are not changed."
          confirmLabel="Delete"
          danger
          error={deleteError}
          isSubmitting={deleteProduct.isPending}
          onCancel={() => {
            setConfirmDeleteId(null);
            setDeleteError(null);
          }}
          onConfirm={handleDeleteConfirm}
        />
      </div>
    </div>
  );
}
