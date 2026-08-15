import { useMemo } from 'react';
import { Task, taskStatus } from '../../types/task';

export default function TasksStatsBar({ tasks }: { tasks: Task[] }) {
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

  const cards = [
    { label: 'Open', value: stats.open },
    { label: 'Due Today', value: stats.dueToday, tone: 'text-amber-600' },
    { label: 'Overdue', value: stats.overdue, tone: 'text-rose-600' },
    { label: 'Completed', value: stats.completedThisWeek, tone: 'text-emerald-600' },
  ];

  return (
    <div className="flex items-center gap-2.5 min-w-0">
      {cards.map((c, i) => (
        <div key={c.label} className="flex items-center gap-2.5 shrink-0">
          {i > 0 && <span className="w-px h-4 bg-slate-200 shrink-0" />}
          <div className="flex items-baseline gap-1 whitespace-nowrap">
            <span className={`text-xs font-bold ${c.tone ?? 'text-slate-800'}`}>{c.value}</span>
            <span className="text-[9px] text-slate-400 uppercase tracking-wide">{c.label}</span>
          </div>
        </div>
      ))}
    </div>
  );
}
