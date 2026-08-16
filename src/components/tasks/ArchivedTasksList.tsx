import { Task } from '../../types/task';
import { useRestoreTasks } from '../../hooks/useTasks';
import { toTitleCase } from '../../utils/text';

interface Props {
  tasks: Task[];
  isLoading: boolean;
}

function formatDate(value?: string | null) {
  if (!value) return '--';
  return new Date(value).toLocaleDateString(undefined, { month: 'short', day: '2-digit', year: 'numeric' });
}

// Inline counterpart to the Kanban board / list view for the Archived tab —
// matches ArchivedDealsList's pattern: a flat list with a per-row Restore
// action instead of grouping into board/table columns.
export default function ArchivedTasksList({ tasks, isLoading }: Props) {
  const restoreTasks = useRestoreTasks();

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center text-sm text-slate-400">
        Loading archived tasks...
      </div>
    );
  }

  if (tasks.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center text-sm text-slate-400">
        No archived tasks found.
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto px-4">
      <div className="divide-y divide-slate-100">
        {tasks.map((task) => (
          <div key={task.id} className="flex items-center justify-between gap-3 py-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <p className="text-sm font-semibold text-slate-800 truncate">{toTitleCase(task.subject)}</p>
                <span
                  className={`shrink-0 text-[9px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded ${
                    task.is_completed ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  {task.is_completed ? 'Completed' : 'Open'}
                </span>
              </div>
              <p className="text-xs text-slate-400 truncate mt-0.5">
                {toTitleCase(task.company_name) || toTitleCase(task.contact_name) || 'No Contact'} ·{' '}
                {task.assigned_user_name || 'Unassigned'} · Archived {formatDate(task.archived_at)}
              </p>
            </div>
            <button
              onClick={() => restoreTasks.mutate([task.id])}
              disabled={restoreTasks.isPending}
              className="shrink-0 text-xs font-semibold text-[var(--theme-accent)] hover:text-[var(--theme-accent-hover)] disabled:opacity-50 border border-slate-200 rounded-lg px-3 py-1.5 hover:bg-slate-50"
            >
              Restore
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
