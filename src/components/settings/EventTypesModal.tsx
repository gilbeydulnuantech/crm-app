import { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { EventTypeRow } from '../../api/eventTypes';
import { useDeleteEventType, useEventTypes, useSaveEventType } from '../../hooks/useEventTypes';
import UserColorPicker from '../calendar/UserColorPicker';
import EventTypeCreateInline from '../EventTypeCreateInline';

interface Props {
  open: boolean;
  onClose: () => void;
}

function Row({ type, isAdmin }: { type: EventTypeRow; isAdmin: boolean }) {
  const save = useSaveEventType();
  const [name, setName] = useState(type.name);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => setName(type.name), [type.name]);

  function commitName() {
    const trimmed = name.trim();
    if (!trimmed || trimmed === type.name) {
      setName(type.name);
      return;
    }
    setError(null);
    save.mutate(
      { id: type.id, name: trimmed, color: type.color },
      {
        onSuccess: (res) => {
          if (!res.success) {
            setError(res.error || 'Could not rename.');
            setName(type.name);
          }
        },
        onError: (err) => {
          setError(err instanceof Error ? err.message : 'Could not rename.');
          setName(type.name);
        },
      }
    );
  }

  return (
    <div>
      <div className="flex items-center gap-2 py-1.5">
        <UserColorPicker
          color={type.color}
          onChange={(hex) => save.mutate({ id: type.id, name: type.name, color: hex })}
        />
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          onBlur={commitName}
          onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
          maxLength={60}
          className="flex-1 min-w-0 px-2 py-1 text-sm border border-transparent hover:border-slate-200 focus:border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-[var(--theme-accent)]"
        />
        <span className="text-[11px] text-slate-400 shrink-0">
          {type.event_count} event{type.event_count === 1 ? '' : 's'} · {type.product_count} service{type.product_count === 1 ? '' : 's'}
        </span>
        {isAdmin && (
          <DeleteButton type={type} />
        )}
      </div>
      {error && <p className="text-[11px] text-rose-600 pl-6 pb-1">{error}</p>}
    </div>
  );
}

function DeleteButton({ type }: { type: EventTypeRow }) {
  const { data: types = [] } = useEventTypes();
  const del = useDeleteEventType();
  const [confirming, setConfirming] = useState(false);
  const [moveTo, setMoveTo] = useState('');
  const [error, setError] = useState<string | null>(null);
  const others = types.filter((t) => t.id !== type.id);
  const inUse = type.event_count > 0 || type.product_count > 0;

  if (type.is_system) {
    return (
      <span className="w-6 text-center text-slate-300 shrink-0" title="Used by the booking page and reminders. It can be renamed but not deleted.">
        <i className="fa-solid fa-lock text-[10px]" />
      </span>
    );
  }

  function run() {
    setError(null);
    del.mutate(
      { id: type.id, ...(moveTo ? { reassign_to_id: Number(moveTo) } : {}) },
      {
        onSuccess: (res) => {
          if (!res.success) setError(res.error || 'Could not delete.');
        },
        onError: (err) => setError(err instanceof Error ? err.message : 'Could not delete.'),
      }
    );
  }

  if (!confirming) {
    return (
      <button type="button" onClick={() => setConfirming(true)} title="Delete" className="w-6 text-slate-300 hover:text-rose-500 shrink-0">
        <i className="fa-solid fa-trash text-xs" />
      </button>
    );
  }

  return (
    <div className="absolute inset-0 z-10 bg-white/95 rounded-2xl flex items-center justify-center p-6">
      <div className="w-full max-w-xs space-y-3 text-sm">
        <p className="font-semibold text-slate-800">Delete “{type.name}”?</p>
        {inUse ? (
          <>
            <p className="text-xs text-slate-500">
              {type.event_count} event{type.event_count === 1 ? '' : 's'} and {type.product_count} service{type.product_count === 1 ? '' : 's'} use this type. Move them to:
            </p>
            <select
              value={moveTo}
              onChange={(e) => setMoveTo(e.target.value)}
              className="w-full px-3 py-1.5 text-sm border border-slate-200 rounded-lg"
            >
              <option value="">Choose a type...</option>
              {others.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </>
        ) : (
          <p className="text-xs text-slate-500">Nothing uses this type.</p>
        )}
        {error && <p className="text-xs text-rose-600">{error}</p>}
        <div className="flex justify-end gap-2">
          <button type="button" onClick={() => setConfirming(false)} className="px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 rounded-lg">
            Cancel
          </button>
          <button
            type="button"
            onClick={run}
            disabled={del.isPending || (inUse && !moveTo)}
            className="px-3 py-1.5 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-lg disabled:opacity-50"
          >
            {del.isPending ? 'Deleting...' : 'Delete'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function EventTypesModal({ open, onClose }: Props) {
  const { isAdmin } = useAuth();
  const { data: types = [], isLoading } = useEventTypes();
  const [adding, setAdding] = useState(false);

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/70 z-[100] flex items-center justify-center p-4" onClick={onClose}>
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-1">
          <h3 className="text-lg font-bold text-slate-800">Event types</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600" aria-label="Close">
            <i className="fa-solid fa-xmark" />
          </button>
        </div>
        <p className="text-xs text-slate-500 mb-3">
          Group your calendar events and services, for example Massage, Facial or Consultation. Each type has a color used on the
          calendar. Click a name to rename it, or the dot to change the color. Give a service its type on the Products page.
        </p>

        <div className="divide-y divide-slate-100 mb-3">
          {isLoading && <p className="text-xs text-slate-400 py-2">Loading...</p>}
          {!isLoading && types.length === 0 && <p className="text-xs text-slate-400 py-2">No event types yet. Add the first one below.</p>}
          {types.map((t) => (
            <Row key={t.id} type={t} isAdmin={isAdmin} />
          ))}
        </div>

        {adding ? (
          <EventTypeCreateInline onCancel={() => setAdding(false)} onCreated={() => setAdding(false)} />
        ) : (
          <button type="button" onClick={() => setAdding(true)} className="text-sm font-medium text-[var(--theme-accent-hover)] hover:underline">
            <i className="fa-solid fa-plus text-xs mr-1.5" />
            Add event type
          </button>
        )}

        <div className="flex justify-end pt-5">
          <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 rounded-lg">
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
