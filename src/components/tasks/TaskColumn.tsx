import { useDroppable } from '@dnd-kit/core';
import { Task, TaskStatus, TaskStatusRow } from '../../types/task';
import TaskCard from './TaskCard';

interface Props {
  status: TaskStatus;
  label: string;
  tasks: Task[];
  users: { id: number; name: string }[];
  statuses: TaskStatusRow[];
  onCardClick: (task: Task) => void;
  onViewDetails: (task: Task) => void;
  onEdit: (task: Task) => void;
  onReassign: (task: Task, userId: number) => void;
  onMoveStatus: (task: Task, status: TaskStatus) => void;
  onMarkComplete: (task: Task) => void;
  onArchive: (task: Task) => void;
  onDelete: (task: Task) => void;
  canEditTask: (task: Task) => boolean;
  isAdmin: boolean;
  highlightTaskId?: number | null;
}

export default function TaskColumn({
  status,
  label,
  tasks,
  users,
  statuses,
  onCardClick,
  onViewDetails,
  onEdit,
  onReassign,
  onMoveStatus,
  onMarkComplete,
  onArchive,
  onDelete,
  canEditTask,
  isAdmin,
  highlightTaskId,
}: Props) {
  const { setNodeRef, isOver } = useDroppable({ id: status });

  return (
    <div
      ref={setNodeRef}
      className={`w-64 h-full shrink-0 flex flex-col rounded-xl border bg-slate-50 border-slate-200 transition-colors ${
        isOver ? 'ring-2 ring-[var(--theme-accent)]' : ''
      }`}
    >
      <div className="p-3 border-b border-slate-200 flex items-center justify-between shrink-0">
        <span className="text-xs font-semibold text-slate-600 uppercase tracking-wide">{label}</span>
        <span className="text-[10px] bg-white border border-slate-200 rounded-full px-1.5 py-0.5 text-slate-500">
          {tasks.length}
        </span>
      </div>
      <div className="flex-1 p-2 space-y-2 overflow-y-auto min-h-[80px]">
        {tasks.map((t) => (
          <TaskCard
            key={t.id}
            task={t}
            users={users}
            statuses={statuses}
            onClick={() => onCardClick(t)}
            onViewDetails={() => onViewDetails(t)}
            onEdit={() => onEdit(t)}
            onReassign={(userId) => onReassign(t, userId)}
            onMoveStatus={(s) => onMoveStatus(t, s)}
            onMarkComplete={() => onMarkComplete(t)}
            onArchive={() => onArchive(t)}
            onDelete={() => onDelete(t)}
            canEdit={canEditTask(t)}
            isAdmin={isAdmin}
            highlighted={t.id === highlightTaskId}
          />
        ))}
        {tasks.length === 0 && <div className="text-center text-[11px] text-slate-300 py-6">No tasks</div>}
      </div>
    </div>
  );
}
