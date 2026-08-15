import { useEffect, useRef, useState } from 'react';
import { TASK_STATUSES, TASK_STATUS_LABELS, Task, TaskStatus, taskKanbanStatus } from '../../types/task';
import { toTitleCase } from '../../utils/text';

interface Props {
  task: Task;
  users: { id: number; name: string }[];
  canEdit: boolean;
  isAdmin: boolean;
  onViewDetails: () => void;
  onEdit: () => void;
  onReassign: (userId: number) => void;
  onMoveStatus: (status: TaskStatus) => void;
  onMarkComplete: () => void;
  onArchive: () => void;
  onDelete: () => void;
}

function MenuItem({
  icon,
  label,
  onClick,
  danger,
}: {
  icon: string;
  label: string;
  onClick: () => void;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-left hover:bg-slate-50 ${
        danger ? 'text-rose-600' : 'text-slate-700'
      }`}
    >
      <i className={`fa-solid ${icon} w-3.5 text-[11px]`} />
      {label}
    </button>
  );
}

export default function TaskCardMenu({
  task,
  users,
  canEdit,
  isAdmin,
  onViewDetails,
  onEdit,
  onReassign,
  onMoveStatus,
  onMarkComplete,
  onArchive,
  onDelete,
}: Props) {
  const [open, setOpen] = useState(false);
  const [statusSubmenuOpen, setStatusSubmenuOpen] = useState(false);
  const [reassignSubmenuOpen, setReassignSubmenuOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
        setStatusSubmenuOpen(false);
        setReassignSubmenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  function close() {
    setOpen(false);
    setStatusSubmenuOpen(false);
    setReassignSubmenuOpen(false);
  }

  function run(fn: () => void) {
    close();
    fn();
  }

  const currentStatus = taskKanbanStatus(task);

  return (
    <div ref={ref} className="relative shrink-0">
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setOpen((o) => !o);
        }}
        className="w-5 h-5 flex items-center justify-center rounded text-slate-400 hover:text-slate-600 hover:bg-slate-100"
      >
        <i className="fa-solid fa-ellipsis-vertical text-[11px]" />
      </button>

      {open && (
        <div
          onClick={(e) => e.stopPropagation()}
          className="absolute right-0 top-6 z-[60] w-44 bg-white rounded-lg shadow-lg border border-slate-200 py-1"
        >
          <MenuItem icon="fa-eye" label="View Details" onClick={() => run(onViewDetails)} />

          {canEdit && (
            <>
              <MenuItem icon="fa-pen" label="Edit Task" onClick={() => run(onEdit)} />

              {!task.is_completed && (
                <MenuItem icon="fa-circle-check" label="Mark Complete" onClick={() => run(onMarkComplete)} />
              )}

              <div
                className="relative"
                onMouseEnter={() => setStatusSubmenuOpen(true)}
                onMouseLeave={() => setStatusSubmenuOpen(false)}
              >
                <button
                  type="button"
                  className="w-full flex items-center justify-between gap-2 px-3 py-1.5 text-xs font-medium text-left text-slate-700 hover:bg-slate-50"
                >
                  <span className="flex items-center gap-2">
                    <i className="fa-solid fa-arrow-right-arrow-left w-3.5 text-[11px]" />
                    Move to Status
                  </span>
                  <i className="fa-solid fa-chevron-right text-[9px] text-slate-400" />
                </button>
                {statusSubmenuOpen && (
                  <div className="absolute left-full top-0 -ml-px w-40 bg-white rounded-lg shadow-lg border border-slate-200 py-1">
                    {TASK_STATUSES.map((s) => (
                      <button
                        key={s}
                        type="button"
                        disabled={s === currentStatus}
                        onClick={() => run(() => onMoveStatus(s))}
                        className="w-full flex items-center px-3 py-1.5 text-xs font-medium text-left text-slate-700 hover:bg-slate-50 disabled:text-slate-300 disabled:cursor-default"
                      >
                        {TASK_STATUS_LABELS[s]}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div
                className="relative"
                onMouseEnter={() => setReassignSubmenuOpen(true)}
                onMouseLeave={() => setReassignSubmenuOpen(false)}
              >
                <button
                  type="button"
                  className="w-full flex items-center justify-between gap-2 px-3 py-1.5 text-xs font-medium text-left text-slate-700 hover:bg-slate-50"
                >
                  <span className="flex items-center gap-2">
                    <i className="fa-solid fa-user-pen w-3.5 text-[11px]" />
                    Reassign
                  </span>
                  <i className="fa-solid fa-chevron-right text-[9px] text-slate-400" />
                </button>
                {reassignSubmenuOpen && (
                  <div className="absolute left-full top-0 -ml-px w-40 bg-white rounded-lg shadow-lg border border-slate-200 py-1 max-h-56 overflow-y-auto">
                    {users.map((u) => (
                      <button
                        key={u.id}
                        type="button"
                        disabled={u.id === task.user_id}
                        onClick={() => run(() => onReassign(u.id))}
                        className="w-full flex items-center px-3 py-1.5 text-xs font-medium text-left text-slate-700 hover:bg-slate-50 disabled:text-slate-300 disabled:cursor-default"
                      >
                        {toTitleCase(u.name)}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="my-1 border-t border-slate-100" />
              <MenuItem icon="fa-box-archive" label="Archive Task" onClick={() => run(onArchive)} />
            </>
          )}

          {isAdmin && <MenuItem icon="fa-trash" label="Delete Task" danger onClick={() => run(onDelete)} />}
        </div>
      )}
    </div>
  );
}
