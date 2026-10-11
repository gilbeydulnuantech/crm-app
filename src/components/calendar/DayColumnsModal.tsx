import { TeamUser } from '../../api/contacts';
import { Resource } from '../../types/resource';
import { formatHourLabel } from '../../utils/timeFormat';
import { toTitleCase } from '../../utils/text';

interface Props {
  open: boolean;
  onClose: () => void;
  users: TeamUser[];
  resources: Resource[];
  selectedColumns: Set<string>;
  onToggleColumn: (key: string) => void;
  selectedHours: Set<number>;
  onToggleHour: (hour: number) => void;
  onReset: () => void;
}

export function hourLabel(h: number) {
  return formatHourLabel(h);
}

function CheckRow({ checked, onChange, label, dot }: { checked: boolean; onChange: () => void; label: string; dot?: string }) {
  return (
    <label className="flex items-center gap-2 py-1 text-sm text-slate-700 cursor-pointer select-none">
      <input
        type="checkbox"
        checked={checked}
        onChange={onChange}
        className="rounded border-slate-300 text-[var(--theme-accent)] focus:ring-[var(--theme-accent)]"
      />
      {dot && <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: dot }} />}
      <span className="truncate">{label}</span>
    </label>
  );
}

// Checkbox list for the Day view: tick a column to show it, untick to remove it.
// Changes apply immediately, so there is no separate save step.
export default function DayColumnsModal({
  open,
  onClose,
  users,
  resources,
  selectedColumns,
  onToggleColumn,
  selectedHours,
  onToggleHour,
  onReset,
}: Props) {
  if (!open) return null;
  const activeResources = resources.filter((r) => r.is_active !== false);
  return (
    <div className="fixed inset-0 bg-slate-900/70 z-[100] flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-1">
          <h3 className="text-lg font-bold text-slate-800">Day view columns</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600" aria-label="Close">
            <i className="fa-solid fa-xmark" />
          </button>
        </div>
        <p className="text-xs text-slate-400 mb-3">Tick a box to add that column. Untick it to remove it.</p>

        <div className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1">Team members</div>
        <div className="mb-3">
          {users.map((u) => (
            <CheckRow
              key={u.id}
              checked={selectedColumns.has(`u:${u.id}`)}
              onChange={() => onToggleColumn(`u:${u.id}`)}
              label={toTitleCase(u.name) + (u.location ? ` · ${u.location}` : '')}
              dot={u.color}
            />
          ))}
          {users.length === 0 && <div className="text-xs text-slate-400 py-1">No team members.</div>}
        </div>

        {activeResources.length > 0 && (
          <>
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1">Rooms and equipment</div>
            <div className="mb-3">
              {activeResources.map((r) => (
                <CheckRow
                  key={r.id}
                  checked={selectedColumns.has(`r:${r.id}`)}
                  onChange={() => onToggleColumn(`r:${r.id}`)}
                  label={r.name}
                  dot={r.color}
                />
              ))}
            </div>
          </>
        )}

        <div className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1">Other</div>
        <div className="mb-3">
          <CheckRow
            checked={selectedColumns.has('unassigned')}
            onChange={() => onToggleColumn('unassigned')}
            label="Unassigned (no team member)"
          />
        </div>

        <div className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1">Hours</div>
        <div className="grid grid-cols-3 gap-x-3 mb-4">
          {Array.from({ length: 24 }, (_, h) => (
            <CheckRow key={h} checked={selectedHours.has(h)} onChange={() => onToggleHour(h)} label={hourLabel(h)} />
          ))}
        </div>

        <div className="flex items-center justify-between pt-2 border-t border-slate-100">
          <button type="button" onClick={onReset} className="text-xs text-slate-500 hover:text-slate-700 underline">
            Reset to default
          </button>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 text-sm font-medium bg-[var(--theme-accent)] hover:bg-[var(--theme-accent-hover)] text-white rounded-lg"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
