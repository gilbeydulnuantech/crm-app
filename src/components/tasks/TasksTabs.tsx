import { TasksView } from '../../types/task';

interface Props {
  view: TasksView;
  onChange: (view: TasksView) => void;
}

const TABS: { key: TasksView; label: string }[] = [
  { key: 'all', label: 'All Tasks' },
  { key: 'mine', label: 'My Tasks' },
  { key: 'completed', label: 'Completed' },
];

export default function TasksTabs({ view, onChange }: Props) {
  return (
    <div className="px-4 pt-3 pb-3 flex items-center gap-2 shrink-0 border-b border-slate-200">
      {TABS.map((t) => (
        <button
          key={t.key}
          onClick={() => onChange(t.key)}
          className={`px-3 py-1.5 text-sm font-semibold rounded-lg transition-colors ${
            view === t.key ? 'bg-indigo-600 text-white' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}
