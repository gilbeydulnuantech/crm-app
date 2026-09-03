import { useState } from 'react';
import { DndContext, DragEndEvent, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { useCreateTaskStatus, useDeleteTaskStatus, useRenameTaskStatus } from '../../hooks/useTaskStatuses';
import { Task, TaskStatus, TaskStatusRow, taskKanbanStatus } from '../../types/task';
import TaskColumn from './TaskColumn';

interface Props {
  tasks: Task[];
  users: { id: number; name: string }[];
  statuses: TaskStatusRow[];
  visibleStatusIds: Set<number>;
  onMoveStatus: (task: Task, status: TaskStatus, isCompletedStatus: boolean) => void;
  onCardClick: (task: Task) => void;
  onViewDetails: (task: Task) => void;
  onEdit: (task: Task) => void;
  onReassign: (task: Task, userId: number) => void;
  onMarkComplete: (task: Task) => void;
  onArchive: (task: Task) => void;
  onDelete: (task: Task) => void;
  canEditTask: (task: Task) => boolean;
  isAdmin: boolean;
  highlightTaskId?: number | null;
}

// Board-view counterpart to TasksColumnsMenu (which manages List's table
// columns) — this manages the board's own status columns. Visibility is a
// local per-viewer toggle (everyone gets one); add/rename/delete are real
// admin-only mutations against task_statuses, since a column is shared
// across the whole team.
export function TaskColumnsManager({
  statuses,
  visibleStatusIds,
  onToggleVisibility,
  isAdmin,
}: {
  statuses: TaskStatusRow[];
  visibleStatusIds: Set<number>;
  onToggleVisibility: (id: number) => void;
  isAdmin: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [renamingId, setRenamingId] = useState<number | null>(null);
  const [renameDraft, setRenameDraft] = useState('');
  const [error, setError] = useState<string | null>(null);

  const createStatus = useCreateTaskStatus();
  const renameStatus = useRenameTaskStatus();
  const deleteStatus = useDeleteTaskStatus();

  function handleAdd() {
    const name = newName.trim();
    if (!name) return;
    setError(null);
    createStatus.mutate(name, {
      onSuccess: () => setNewName(''),
      onError: (err) => setError(err instanceof Error ? err.message : 'Failed to add column.'),
    });
  }

  function startRename(s: TaskStatusRow) {
    setError(null);
    setRenamingId(s.id);
    setRenameDraft(s.name);
  }

  function commitRename() {
    const name = renameDraft.trim();
    if (!name || renamingId == null) {
      setRenamingId(null);
      return;
    }
    setError(null);
    renameStatus.mutate(
      { id: renamingId, name },
      {
        onSuccess: () => setRenamingId(null),
        onError: (err) => setError(err instanceof Error ? err.message : 'Failed to rename column.'),
      }
    );
  }

  function handleDelete(id: number) {
    setError(null);
    deleteStatus.mutate(id, {
      onError: (err) => setError(err instanceof Error ? err.message : 'Failed to delete column.'),
    });
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-[var(--theme-accent)] py-1.5 px-2.5 border border-slate-200 rounded-md bg-white transition-colors"
      >
        <span>Columns</span>
        <i className="fa-solid fa-gear text-[10px]" />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-1 w-64 bg-white border border-slate-200 rounded-lg shadow-lg z-20 py-1.5">
            {statuses.map((s) => (
              <div key={s.id} className="flex items-center gap-2 px-3 py-1 group">
                <input
                  type="checkbox"
                  checked={visibleStatusIds.has(s.id)}
                  onChange={() => onToggleVisibility(s.id)}
                  className="rounded border-slate-300 text-[var(--theme-accent)] focus:ring-[var(--theme-accent)] shrink-0"
                />
                {renamingId === s.id ? (
                  <input
                    autoFocus
                    value={renameDraft}
                    onChange={(e) => setRenameDraft(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') commitRename();
                      if (e.key === 'Escape') setRenamingId(null);
                    }}
                    onBlur={commitRename}
                    className="flex-1 min-w-0 text-xs border border-slate-200 rounded px-1.5 py-0.5 focus:outline-none focus:ring-1 focus:ring-[var(--theme-accent)]"
                  />
                ) : (
                  <span className="flex-1 min-w-0 truncate text-xs text-slate-600">{s.name}</span>
                )}
                {isAdmin && renamingId !== s.id && (
                  <div className="hidden group-hover:flex items-center gap-1.5 shrink-0">
                    <button
                      onClick={() => startRename(s)}
                      title="Rename"
                      className="text-slate-300 hover:text-[var(--theme-accent)]"
                    >
                      <i className="fa-solid fa-pen text-[10px]" />
                    </button>
                    <button
                      onClick={() => handleDelete(s.id)}
                      disabled={deleteStatus.isPending}
                      title="Delete"
                      className="text-slate-300 hover:text-rose-600 disabled:opacity-50"
                    >
                      <i className="fa-solid fa-trash text-[10px]" />
                    </button>
                  </div>
                )}
              </div>
            ))}

            {isAdmin && (
              <div className="px-3 pt-1.5 mt-1 border-t border-slate-100">
                <div className="flex gap-1.5">
                  <input
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
                    placeholder="New column..."
                    className="flex-1 min-w-0 text-xs border border-slate-200 rounded px-1.5 py-1 focus:outline-none focus:ring-1 focus:ring-[var(--theme-accent)]"
                  />
                  <button
                    onClick={handleAdd}
                    disabled={!newName.trim() || createStatus.isPending}
                    className="text-xs font-semibold text-[var(--theme-accent)] hover:underline disabled:opacity-50 shrink-0"
                  >
                    Add
                  </button>
                </div>
                {error && <p className="text-[10px] text-rose-600 mt-1">{error}</p>}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

export default function TasksKanbanBoard({
  tasks,
  users,
  statuses = [],
  visibleStatusIds,
  onMoveStatus,
  onCardClick,
  onViewDetails,
  onEdit,
  onReassign,
  onMarkComplete,
  onArchive,
  onDelete,
  canEditTask,
  isAdmin,
  highlightTaskId,
}: Props) {
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  const tasksByStatus = new Map<string, Task[]>();
  statuses.forEach((s) => tasksByStatus.set(s.name, []));
  tasks.forEach((t) => {
    const status = taskKanbanStatus(t);
    if (!tasksByStatus.has(status)) tasksByStatus.set(status, []);
    tasksByStatus.get(status)!.push(t);
  });

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over) return;
    const taskId = active.id as number;
    const targetStatus = over.id as TaskStatus;
    const current = tasks.find((t) => t.id === taskId);
    if (current && canEditTask(current) && taskKanbanStatus(current) !== targetStatus) {
      const targetRow = statuses.find((s) => s.name === targetStatus);
      onMoveStatus(current, targetStatus, targetRow?.is_completed_status ?? false);
    }
  }

  const visibleColumns = statuses.filter((s) => visibleStatusIds.has(s.id));

  return (
    <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
      <div className="flex-1 overflow-x-auto overflow-y-hidden p-4">
        <div className="flex gap-4 h-full">
          {visibleColumns.map((s) => (
            <TaskColumn
              key={s.id}
              status={s.name}
              label={s.name}
              tasks={tasksByStatus.get(s.name) ?? []}
              users={users}
              statuses={statuses}
              onCardClick={onCardClick}
              onViewDetails={onViewDetails}
              onEdit={onEdit}
              onReassign={onReassign}
              onMoveStatus={(task, status) => {
                const targetRow = statuses.find((row) => row.name === status);
                onMoveStatus(task, status, targetRow?.is_completed_status ?? false);
              }}
              onMarkComplete={onMarkComplete}
              onArchive={onArchive}
              onDelete={onDelete}
              canEditTask={canEditTask}
              isAdmin={isAdmin}
              highlightTaskId={highlightTaskId}
            />
          ))}
        </div>
      </div>
    </DndContext>
  );
}
