import { useDraggable } from '@dnd-kit/core';
import { Task, taskStatus } from '../../types/task';
import { toTitleCase } from '../../utils/text';
import { DEFAULT_USER_COLOR, hexToRgba } from '../../utils/userColor';

interface Props {
  task: Task;
  onClick: () => void;
  canEdit: boolean;
}

const PRIORITY_BORDER: Record<string, string> = {
  High: '#F43F5E',
  Medium: '#F59E0B',
  Low: '#3B82F6',
};

export default function TaskCard({ task, onClick, canEdit }: Props) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: task.id,
    data: { task },
    disabled: !canEdit,
  });

  const status = taskStatus(task);
  const isOverdue = status === 'Overdue';
  const borderColor = task.priority ? PRIORITY_BORDER[task.priority] : '#E2E8F0';
  const ownerColor = task.user_id ? task.assigned_user_color || DEFAULT_USER_COLOR : undefined;
  const accountName = task.account_name || task.company_name;
  const subtaskTotal = task.subtask_total ?? 0;
  const attachmentCount = task.attachments?.length ?? 0;

  const style = {
    ...(transform ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`, zIndex: 50 } : undefined),
    borderLeftWidth: '3px',
    borderLeftColor: borderColor,
  };

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
      title={canEdit ? undefined : 'View only — assigned to someone else'}
      className={`bg-white border border-slate-200 rounded-lg p-2.5 shadow-sm hover:shadow-md transition-all ${
        canEdit ? 'cursor-grab active:cursor-grabbing' : 'cursor-pointer'
      } ${isDragging ? 'opacity-40 ring-2 ring-indigo-400 border-transparent scale-105' : ''}`}
    >
      <div className="flex items-center gap-1.5">
        {task.priority && (
          <span
            className="shrink-0 flex items-center gap-1 text-[9px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded"
            style={{ backgroundColor: hexToRgba(borderColor, 0.14), color: borderColor }}
          >
            {task.priority === 'High' && <i className="fa-solid fa-triangle-exclamation text-[8px]" />}
            {task.priority}
          </span>
        )}
        {task.task_type && <span className="text-[10px] text-slate-400 truncate">{task.task_type}</span>}
        {!canEdit && <i className="fa-solid fa-lock text-slate-300 text-[10px] shrink-0 ml-auto" />}
      </div>

      <div
        className={`text-xs font-bold truncate mt-1 ${
          task.is_completed ? 'text-slate-400 line-through' : 'text-slate-800'
        }`}
      >
        {task.subject}
      </div>

      {accountName && (
        <div className="text-[11px] text-slate-500 truncate mt-1 flex items-center gap-1">
          <i className="fa-solid fa-building text-[9px]" />
          {toTitleCase(accountName)}
        </div>
      )}
      {task.opportunity_name && (
        <div className="text-[11px] text-slate-400 truncate mt-0.5 flex items-center gap-1">
          <i className="fa-solid fa-sack-dollar text-[9px]" />
          Deal: {task.opportunity_name}
        </div>
      )}

      {(subtaskTotal > 0 || attachmentCount > 0) && (
        <div className="flex items-center gap-3 mt-1.5 text-[10px] text-slate-400">
          {subtaskTotal > 0 && (
            <span className="flex items-center gap-1">
              <i className="fa-solid fa-list-check text-[9px]" />
              {task.subtask_completed ?? 0}/{subtaskTotal} Subtasks
            </span>
          )}
          {attachmentCount > 0 && (
            <span className="flex items-center gap-1">
              <i className="fa-solid fa-paperclip text-[9px]" />
              {attachmentCount} Attachment{attachmentCount > 1 ? 's' : ''}
            </span>
          )}
        </div>
      )}

      <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-50">
        {task.due_at ? (
          <span
            className={`text-[10px] flex items-center gap-1 shrink-0 ${
              isOverdue ? 'text-rose-600 font-semibold' : 'text-slate-400'
            }`}
          >
            {isOverdue && <i className="fa-solid fa-circle-exclamation text-[9px]" />}
            {isOverdue ? 'Overdue: ' : ''}
            {new Date(task.due_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
          </span>
        ) : (
          <span />
        )}

        <span
          style={ownerColor ? { backgroundColor: hexToRgba(ownerColor, 0.18), color: ownerColor } : undefined}
          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold truncate max-w-[65%] ${
            ownerColor ? '' : 'bg-slate-100 text-slate-500'
          }`}
        >
          <i className="fa-solid fa-user text-[9px]" />
          <span className="truncate">{task.assigned_user_name ? toTitleCase(task.assigned_user_name) : 'Unassigned'}</span>
        </span>
      </div>
    </div>
  );
}
