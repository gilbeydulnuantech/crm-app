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
    { label: 'Completed This Week', value: stats.completedThisWeek, tone: 'text-emerald-600' },
  ];

  return (
    <div className="px-4 pt-4 grid grid-cols-4 gap-3 shrink-0">
      {cards.map((c) => (
        <div key={c.label} className="border border-slate-200 rounded-lg p-3 text-center">
          <div className={`text-xl font-bold ${c.tone ?? 'text-slate-800'}`}>{c.value}</div>
          <div className="text-[11px] text-slate-500 uppercase tracking-wide">{c.label}</div>
        </div>
      ))}
    </div>
  );
}
