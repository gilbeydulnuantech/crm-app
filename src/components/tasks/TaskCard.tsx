import { useDraggable } from '@dnd-kit/core';
import { Task } from '../../types/task';
import { toTitleCase } from '../../utils/text';

interface Props {
  task: Task;
  onClick: () => void;
}

const PRIORITY_DOT: Record<string, string> = {
  High: 'bg-rose-500',
  Medium: 'bg-amber-500',
  Low: 'bg-emerald-500',
};

export default function TaskCard({ task, onClick }: Props) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: task.id,
    data: { task },
  });

  const style = transform
    ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`, zIndex: 50 }
    : undefined;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      onClick={() => {
        if (transform && (Math.abs(transform.x) > 5 || Math.abs(transform.y) > 5)) return;
        onClick();
      }}
      className={`bg-white border border-slate-200 rounded-lg p-2.5 shadow-sm hover:shadow-md cursor-grab active:cursor-grabbing transition-all ${
        isDragging ? 'opacity-40 ring-2 ring-indigo-400 border-transparent scale-105' : ''
      }`}
    >
      <div
        className={`text-xs font-bold truncate ${
          task.is_completed ? 'text-slate-400 line-through' : 'text-slate-800'
        }`}
      >
        {task.subject}
      </div>

      {task.contact_name && (
        <div className="text-[11px] text-slate-500 truncate mt-1 flex items-center gap-1">
          <i className="fa-solid fa-user text-[9px]" />
          {toTitleCase(task.contact_name)}
        </div>
      )}
      {task.company_name && (
        <div className="text-[11px] text-slate-400 truncate mt-0.5 flex items-center gap-1">
          <i className="fa-solid fa-building text-[9px]" />
          {task.company_name}
        </div>
      )}

      <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-50">
        <span className="flex items-center gap-1 text-[10px] text-slate-500 truncate">
          <i className="fa-solid fa-user-tie text-[9px] shrink-0" />
          {task.assigned_user_name ? toTitleCase(task.assigned_user_name) : 'Unassigned'}
        </span>
        {task.priority && (
          <span className="flex items-center gap-1 text-[10px] text-slate-500 shrink-0">
            <span className={`w-1.5 h-1.5 rounded-full ${PRIORITY_DOT[task.priority] ?? 'bg-slate-300'}`} />
            {task.priority}
          </span>
        )}
      </div>

      {task.due_at && (
        <div className="text-[10px] text-slate-400 mt-1.5 flex items-center gap-1">
          <i className="fa-regular fa-calendar text-[9px]" />
          {new Date(task.due_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })},{' '}
          {new Date(task.due_at).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}
        </div>
      )}

      {task.opportunity_name && (
        <div className="text-[10px] text-slate-400 mt-1 flex items-center gap-1 truncate">
          <i className="fa-solid fa-sack-dollar text-[9px] shrink-0" />
          {task.opportunity_name}
        </div>
      )}
    </div>
  );
}
