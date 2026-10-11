import { useState } from 'react';
import { DiscountCard } from '../../api/billing';
import { useDeleteDiscountCard, useDiscountCards, useSaveDiscountCard } from '../../hooks/useBilling';

interface Props {
  open: boolean;
  onClose: () => void;
}

const inputClass =
  'px-2 py-1 text-sm border border-slate-200 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-[var(--theme-accent)]';

function Row({ card }: { card: DiscountCard }) {
  const save = useSaveDiscountCard();
  const del = useDeleteDiscountCard();
  const [name, setName] = useState(card.name);
  const [percent, setPercent] = useState(String(card.percent));
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function commit(patch: Partial<{ name: string; percent: string; is_active: boolean }> = {}) {
    const next = { name: name.trim(), percent: percent, is_active: card.is_active, ...patch };
    const pct = Number(next.percent);
    if (!next.name || !(pct > 0 && pct <= 100)) {
      setName(card.name);
      setPercent(String(card.percent));
      return;
    }
    if (next.name === card.name && pct === Number(card.percent) && next.is_active === card.is_active) return;
    setError(null);
    save.mutate(
      { id: card.id, name: next.name, percent: pct, is_active: next.is_active },
      {
        onSuccess: (res) => {
          if (!res.success) {
            setError(res.error || 'Could not save.');
            setName(card.name);
          }
        },
        onError: (err) => {
          setError(err instanceof Error ? err.message : 'Could not save.');
          setName(card.name);
        },
      }
    );
  }

  return (
    <div className={`py-2 ${card.is_active ? '' : 'opacity-60'}`}>
      <div className="flex items-center gap-2">
        <input value={name} onChange={(e) => setName(e.target.value)} onBlur={() => commit()} maxLength={60} aria-label="Name" className={`${inputClass} flex-1 min-w-0 font-medium`} />
        <div className="flex items-center gap-1 shrink-0">
          <input
            value={percent}
            onChange={(e) => setPercent(e.target.value.replace(/[^0-9.]/g, ''))}
            onBlur={() => commit()}
            inputMode="decimal"
            aria-label="Percent off"
            className={`${inputClass} w-16 text-right`}
          />
          <span className="text-sm text-slate-500">% off</span>
        </div>
        <button
          type="button"
          onClick={() => commit({ is_active: !card.is_active })}
          title={card.is_active ? 'Hide (stops being offered, keeps past visits)' : 'Offer again'}
          className="w-7 text-slate-400 hover:text-slate-700 shrink-0"
        >
          <i className={`fa-solid ${card.is_active ? 'fa-eye' : 'fa-eye-slash'} text-xs`} />
        </button>
        {confirming ? (
          <span className="flex items-center gap-1 shrink-0">
            <button
              type="button"
              onClick={() => del.mutate(card.id, { onError: (err) => setError(err instanceof Error ? err.message : 'Could not delete.') })}
              className="px-2 py-1 text-[11px] font-semibold text-white bg-rose-600 rounded-md"
            >
              Delete
            </button>
            <button type="button" onClick={() => setConfirming(false)} className="text-[11px] text-slate-400 hover:text-slate-600">
              Keep
            </button>
          </span>
        ) : (
          <button type="button" onClick={() => setConfirming(true)} title="Delete" className="w-7 text-slate-300 hover:text-rose-500 shrink-0">
            <i className="fa-solid fa-trash text-xs" />
          </button>
        )}
      </div>
      <p className="text-[11px] text-slate-400 pl-1">
        Used on {card.uses} visit{card.uses === 1 ? '' : 's'}.{confirming && card.uses > 0 ? ' Past visits keep the name and percentage they were given.' : ''}
      </p>
      {error && <p className="text-[11px] text-rose-600 pl-1">{error}</p>}
    </div>
  );
}

// Promotions a client can present, like "Promo 20%" or "VIP 50%". Admin only. Reps just pick one on the event.
export default function DiscountCardsModal({ open, onClose }: Props) {
  const { data: cards = [], isLoading } = useDiscountCards();
  const save = useSaveDiscountCard();
  const [name, setName] = useState('');
  const [percent, setPercent] = useState('');
  const [error, setError] = useState<string | null>(null);

  if (!open) return null;

  function handleAdd() {
    const pct = Number(percent);
    if (!name.trim()) return setError('Give the card a name.');
    if (!(pct > 0 && pct <= 100)) return setError('Enter a percentage between 1 and 100.');
    setError(null);
    save.mutate(
      { name: name.trim(), percent: pct },
      {
        onSuccess: (res) => {
          if (res.success) {
            setName('');
            setPercent('');
          } else setError(res.error || 'Could not add.');
        },
        onError: (err) => setError(err instanceof Error ? err.message : 'Could not add.'),
      }
    );
  }

  return (
    <div className="fixed inset-0 bg-slate-900/70 z-[100] flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-1">
          <h3 className="text-lg font-bold text-slate-800">Discount cards</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600" aria-label="Close">
            <i className="fa-solid fa-xmark" />
          </button>
        </div>
        <p className="text-xs text-slate-500 mb-3">
          Promotions clients may bring, for example "Promo 20%" or "VIP 50%". On the day, the rep picks the client's card on the booking and the amount to pay
          and the therapist's commission update automatically.
        </p>

        <div className="flex items-center gap-2 mb-1">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
            maxLength={60}
            placeholder="Card name"
            className={`${inputClass} flex-1`}
          />
          <input
            value={percent}
            onChange={(e) => setPercent(e.target.value.replace(/[^0-9.]/g, ''))}
            onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
            inputMode="decimal"
            placeholder="%"
            className={`${inputClass} w-16 text-right`}
            aria-label="Percent off"
          />
          <button
            type="button"
            onClick={handleAdd}
            disabled={save.isPending}
            className="px-3 py-1 text-sm font-semibold text-white rounded-md disabled:opacity-50"
            style={{ backgroundColor: 'var(--theme-accent)' }}
          >
            {save.isPending ? 'Adding...' : 'Add'}
          </button>
        </div>
        {error && <p className="text-xs text-rose-600 mb-2">{error}</p>}

        <div className="divide-y divide-slate-100 mt-2">
          {isLoading && <p className="text-xs text-slate-400 py-2">Loading...</p>}
          {!isLoading && cards.length === 0 && <p className="text-xs text-slate-400 py-2">No discount cards yet.</p>}
          {cards.map((c) => (
            <Row key={c.id} card={c} />
          ))}
        </div>

        <div className="flex justify-end pt-4">
          <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 rounded-lg">
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
