import { toTitleCase } from '../../utils/text';

export interface DealFilters {
  owner: string; // 'all' | 'mine' | 'unassigned' | a user id as string
  datePreset: 'all' | 'this_month' | 'next_30' | 'this_quarter' | 'custom';
  customStart: string;
  customEnd: string;
  minValue: string;
  maxValue: string;
  tagIds: number[];
}

export const EMPTY_DEAL_FILTERS: DealFilters = {
  owner: 'all',
  datePreset: 'all',
  customStart: '',
  customEnd: '',
  minValue: '',
  maxValue: '',
  tagIds: [],
};

export function countActiveDealFilters(f: DealFilters): number {
  return (
    (f.owner !== 'all' ? 1 : 0) +
    (f.datePreset !== 'all' ? 1 : 0) +
    (f.minValue || f.maxValue ? 1 : 0) +
    (f.tagIds.length > 0 ? 1 : 0)
  );
}

interface Props {
  open: boolean;
  value: DealFilters;
  users: { id: number; name: string }[];
  tags: { id: number; name: string }[];
  onChange: (next: DealFilters) => void;
  onClose: () => void;
}

const DATE_PRESETS: { value: DealFilters['datePreset']; label: string }[] = [
  { value: 'all', label: 'Any time' },
  { value: 'this_month', label: 'This Month' },
  { value: 'next_30', label: 'Next 30 Days' },
  { value: 'this_quarter', label: 'This Quarter' },
  { value: 'custom', label: 'Custom Range' },
];

export default function PipelineFilterPanel({ open, value, users, tags, onChange, onClose }: Props) {
  if (!open) return null;

  function update<K extends keyof DealFilters>(key: K, v: DealFilters[K]) {
    onChange({ ...value, [key]: v });
  }

  function toggleTag(id: number) {
    onChange({
      ...value,
      tagIds: value.tagIds.includes(id) ? value.tagIds.filter((t) => t !== id) : [...value.tagIds, id],
    });
  }

  const activeCount = countActiveDealFilters(value);

  return (
    <>
      <div className="fixed inset-0 bg-slate-900/40 z-[90]" onClick={onClose} />
      <div className="fixed top-0 right-0 h-full w-full max-w-sm bg-white shadow-2xl z-[100] flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 shrink-0">
          <h3 className="text-base font-bold text-slate-800">Filter Deals</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <i className="fa-solid fa-xmark text-lg" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          <div>
            <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1.5">
              Deal Owner
            </label>
            <select
              value={value.owner}
              onChange={(e) => update('owner', e.target.value)}
              className="w-full px-3 py-1.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--theme-accent)]"
            >
              <option value="all">All Owners</option>
              <option value="mine">My Deals</option>
              <option value="unassigned">Unassigned</option>
              {users.map((u) => (
                <option key={u.id} value={String(u.id)}>
                  {toTitleCase(u.name)}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1.5">
              Expected Close Date
            </label>
            <select
              value={value.datePreset}
              onChange={(e) => update('datePreset', e.target.value as DealFilters['datePreset'])}
              className="w-full px-3 py-1.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--theme-accent)]"
            >
              {DATE_PRESETS.map((p) => (
                <option key={p.value} value={p.value}>
                  {p.label}
                </option>
              ))}
            </select>
            {value.datePreset === 'custom' && (
              <div className="grid grid-cols-2 gap-2 mt-2">
                <input
                  type="date"
                  value={value.customStart}
                  onChange={(e) => update('customStart', e.target.value)}
                  className="px-2.5 py-1.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--theme-accent)]"
                />
                <input
                  type="date"
                  value={value.customEnd}
                  onChange={(e) => update('customEnd', e.target.value)}
                  className="px-2.5 py-1.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--theme-accent)]"
                />
              </div>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1.5">
              Deal Value
            </label>
            <div className="grid grid-cols-2 gap-2">
              <input
                type="number"
                placeholder="Min ($)"
                value={value.minValue}
                onChange={(e) => update('minValue', e.target.value)}
                className="px-2.5 py-1.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--theme-accent)]"
              />
              <input
                type="number"
                placeholder="Max ($)"
                value={value.maxValue}
                onChange={(e) => update('maxValue', e.target.value)}
                className="px-2.5 py-1.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--theme-accent)]"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1.5">
              Tags / Service Types
            </label>
            {tags.length === 0 ? (
              <p className="text-xs text-slate-400">No tags yet.</p>
            ) : (
              <div className="space-y-1 max-h-48 overflow-y-auto">
                {tags.map((t) => (
                  <label
                    key={t.id}
                    className="flex items-center gap-2 px-1 py-1 text-sm text-slate-700 hover:bg-slate-50 rounded cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={value.tagIds.includes(t.id)}
                      onChange={() => toggleTag(t.id)}
                      className="rounded border-slate-300 text-indigo-600 focus:ring-[var(--theme-accent)]"
                    />
                    #{t.name}
                  </label>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="p-4 border-t border-slate-200 shrink-0 flex gap-2">
          <button
            onClick={() => onChange(EMPTY_DEAL_FILTERS)}
            disabled={activeCount === 0}
            className="flex-1 border border-slate-200 hover:bg-slate-50 text-slate-600 text-sm font-medium py-2 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Clear All
          </button>
          <button
            onClick={onClose}
            className="flex-1 bg-[var(--theme-accent)] hover:bg-[var(--theme-accent-hover)] text-white text-sm font-semibold py-2 rounded-lg"
          >
            Apply Filters
          </button>
        </div>
      </div>
    </>
  );
}
