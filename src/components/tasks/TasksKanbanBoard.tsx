import { DndContext, DragEndEvent, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { Task, TASK_STATUSES, TASK_STATUS_LABELS, TaskStatus, taskKanbanStatus } from '../../types/task';
import TaskColumn from './TaskColumn';

interface Props {
  tasks: Task[];
  users: { id: number; name: string }[];
  onMoveStatus: (task: Task, status: TaskStatus) => void;
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

export default function TasksKanbanBoard({
  tasks,
  users,
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

  const tasksByStatus = new Map<TaskStatus, Task[]>();
  TASK_STATUSES.forEach((s) => tasksByStatus.set(s, []));
  tasks.forEach((t) => tasksByStatus.get(taskKanbanStatus(t))!.push(t));

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over) return;
    const taskId = active.id as number;
    const targetStatus = over.id as TaskStatus;
    const current = tasks.find((t) => t.id === taskId);
    if (current && canEditTask(current) && taskKanbanStatus(current) !== targetStatus) {
      onMoveStatus(current, targetStatus);
    }
  }

  return (
    <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
      <div className="flex-1 overflow-x-auto overflow-y-hidden p-4">
        <div className="flex gap-4 h-full">
          {TASK_STATUSES.map((s) => (
            <TaskColumn
              key={s}
              status={s}
              label={TASK_STATUS_LABELS[s]}
              tasks={tasksByStatus.get(s) ?? []}
              users={users}
              onCardClick={onCardClick}
              onViewDetails={onViewDetails}
              onEdit={onEdit}
              onReassign={onReassign}
              onMoveStatus={onMoveStatus}
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
