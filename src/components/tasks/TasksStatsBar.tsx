import { useMemo } from 'react';
import { Task, taskStatus } from '../../types/task';

export type TaskStatFilter = 'open' | 'dueToday' | 'overdue' | 'completed';

interface Props {
  tasks: Task[];
  activeFilter: TaskStatFilter | null;
  onSelect: (filter: TaskStatFilter) => void;
}

export default function TasksStatsBar({ tasks, activeFilter, onSelect }: Props) {
  const stats = useMemo(() => {
    const open = tasks.filter((t) => !t.is_completed);
    const dueToday = open.filter((t) => taskStatus(t) === 'Due Today').length;
    const overdue = open.filter((t) => taskStatus(t) === 'Overdue').length;

    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    const completedThisWeek = tasks.filter(
      (t) => t.is_completed && t.completed_at && new Date(t.completed_at) >= weekAgo
    ).length;

    return { open: open.length, dueToday, overdue, completedThisWeek };
  }, [tasks]);

  const cards: { filter: TaskStatFilter; label: string; value: number; tone?: string }[] = [
    { filter: 'open', label: 'Open', value: stats.open },
    { filter: 'dueToday', label: 'Due Today', value: stats.dueToday, tone: 'text-amber-600' },
    { filter: 'overdue', label: 'Overdue', value: stats.overdue, tone: 'text-rose-600' },
    { filter: 'completed', label: 'Completed', value: stats.completedThisWeek, tone: 'text-emerald-600' },
  ];

  return (
    <div className="flex items-center gap-1.5">
      {cards.map((c) => {
        const isActive = activeFilter === c.filter;
        return (
          <button
            key={c.label}
            onClick={() => onSelect(c.filter)}
            title={`Filter to ${c.label}`}
            className={`flex items-center gap-1 px-2 py-1 rounded-full border text-[11px] font-medium cursor-pointer transition-all hover:shadow-sm ${
              isActive
                ? 'border-[var(--theme-accent)] ring-1 ring-[var(--theme-accent-tint)] bg-[var(--theme-accent-tint)] text-[var(--theme-accent-hover)]'
                : 'border-slate-200 text-slate-600 hover:border-slate-300'
            }`}
          >
            <span className={`font-bold ${c.tone ?? (isActive ? 'text-[var(--theme-accent-hover)]' : 'text-slate-800')}`}>
              {c.value}
            </span>
            {c.label}
          </button>
        );
      })}
    </div>
  );
}
