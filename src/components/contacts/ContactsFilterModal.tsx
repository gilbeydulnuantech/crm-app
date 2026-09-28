export interface AdvancedFilterValue {
  company: string;
  stage: string;
  task: '' | 'has_task' | 'no_task' | 'overdue';
}

interface Option {
  value: string;
  label: string;
}

interface Props {
  open: boolean;
  value: AdvancedFilterValue;
  companies: Option[];
  stages: Option[];
  onChange: (next: AdvancedFilterValue) => void;
  onClose: () => void;
}

const TASK_OPTIONS: Option[] = [
  { value: '', label: 'Any' },
  { value: 'has_task', label: 'Has open task' },
  { value: 'overdue', label: 'Has overdue task' },
  { value: 'no_task', label: 'No open task' },
];

export default function ContactsFilterModal({
  open,
  value,
  companies,
  stages,
  onChange,
  onClose,
}: Props) {
  if (!open) return null;

  function clear() {
    onChange({ company: '', stage: '', task: '' });
  }

  return (
    <div className="fixed inset-0 bg-slate-900/70 z-[100] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-slate-800">Filter Contacts</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <i className="fa-solid fa-xmark" />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Company</label>
            <select
              value={value.company}
              onChange={(e) => onChange({ ...value, company: e.target.value })}
              className="w-full px-3 py-1.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--theme-accent)]"
            >
              <option value="">All Companies</option>
              {companies.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Pipeline Stage</label>
            <select
              value={value.stage}
              onChange={(e) => onChange({ ...value, stage: e.target.value })}
              className="w-full px-3 py-1.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--theme-accent)]"
            >
              <option value="">Any Stage</option>
              {stages.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
            <p className="text-[11px] text-slate-400 mt-1">
              Matches contacts with an open deal currently in this stage.
            </p>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Task</label>
            <select
              value={value.task}
              onChange={(e) => onChange({ ...value, task: e.target.value as AdvancedFilterValue['task'] })}
              className="w-full px-3 py-1.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--theme-accent)]"
            >
              {TASK_OPTIONS.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex justify-between gap-2 pt-5">
          <button
            onClick={clear}
            className="px-4 py-2 text-sm font-medium text-slate-500 hover:text-rose-600"
          >
            Clear Filters
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-semibold bg-[var(--theme-accent)] hover:bg-[var(--theme-accent-hover)] text-white rounded-lg"
          >
            Apply
          </button>
        </div>
      </div>
    </div>
  );
}
