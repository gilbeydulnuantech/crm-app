import { useState } from 'react';
import { useSaveEventType } from '../hooks/useEventTypes';
import UserColorPicker from './calendar/UserColorPicker';

interface Props {
  onCreated: (type: { id: number; key: string; name: string }) => void;
  onCancel: () => void;
}

const DEFAULT_COLOR = '#8B5CF6';

// Small "name + color + Add" row for creating an event type without leaving the form you are in
// (a new service, or a new event). The full list is managed under Settings > Event types.
export default function EventTypeCreateInline({ onCreated, onCancel }: Props) {
  const save = useSaveEventType();
  const [name, setName] = useState('');
  const [color, setColor] = useState(DEFAULT_COLOR);
  const [error, setError] = useState<string | null>(null);

  async function handleAdd() {
    const trimmed = name.trim();
    if (!trimmed) {
      setError('Type a name first.');
      return;
    }
    setError(null);
    try {
      const res = await save.mutateAsync({ name: trimmed, color });
      if (!res.success || !res.id || !res.key) throw new Error(res.error || 'Could not add the type.');
      onCreated({ id: res.id, key: res.key, name: trimmed });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not add the type.');
    }
  }

  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 p-2 space-y-1.5">
      <div className="flex items-center gap-2">
        <UserColorPicker color={color} onChange={setColor} />
        <input
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              handleAdd();
            }
          }}
          placeholder="New type, e.g. Massage"
          maxLength={60}
          className="flex-1 min-w-0 px-2 py-1 text-sm border border-slate-200 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-[var(--theme-accent)]"
        />
        <button
          type="button"
          onClick={handleAdd}
          disabled={save.isPending}
          className="px-2.5 py-1 text-xs font-semibold text-white rounded-md disabled:opacity-50"
          style={{ backgroundColor: 'var(--theme-accent)' }}
        >
          {save.isPending ? 'Adding...' : 'Add'}
        </button>
        <button type="button" onClick={onCancel} className="text-xs text-slate-400 hover:text-slate-600">
          Cancel
        </button>
      </div>
      {error && <p className="text-[11px] text-rose-600">{error}</p>}
    </div>
  );
}
