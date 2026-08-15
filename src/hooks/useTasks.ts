import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as api from '../api/tasks';
import { Task, TaskAttachment, TaskStatus, TaskSubtask } from '../types/task';

export function useTasks() {
  return useQuery({
    queryKey: ['tasks'],
    queryFn: api.fetchTasks,
  });
}

export function useArchivedTasks(enabled: boolean) {
  return useQuery({
    queryKey: ['tasks', 'archived'],
    queryFn: api.fetchArchivedTasks,
    enabled,
  });
}

// Tasks and Calendar events are the same `activities` rows (any activity
// with a due_at set shows on the Calendar, task or not) — but they're
// fetched under separate query keys (['tasks'] vs ['events', start, end]).
// Without invalidating both, deleting/completing a task here leaves the
// Calendar showing stale data (including its stats) until the next
// background poll.
function useInvalidateTasks() {
  const qc = useQueryClient();
  return () => {
    qc.invalidateQueries({ queryKey: ['tasks'] });
    qc.invalidateQueries({ queryKey: ['events'] });
  };
}

export function useAddTask() {
  const invalidate = useInvalidateTasks();
  return useMutation({
    mutationFn: (payload: Partial<Task>) => api.addTask(payload),
    onSuccess: invalidate,
  });
}

export function useUpdateTask() {
  const invalidate = useInvalidateTasks();
  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: Partial<Task> }) =>
      api.updateTask(id, payload),
    onSuccess: invalidate,
  });
}

export function useToggleTaskComplete() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, is_completed, statusName }: { id: number; is_completed: boolean; statusName: string }) =>
      api.toggleTaskComplete(id, is_completed, statusName),
    // Optimistic checkbox toggle so it feels instant.
    onMutate: async ({ id, is_completed, statusName }) => {
      await qc.cancelQueries({ queryKey: ['tasks'] });
      const previous = qc.getQueryData<Task[]>(['tasks']);
      qc.setQueryData<Task[]>(['tasks'], (old) =>
        old?.map((t) =>
          t.id === id
            ? {
                ...t,
                is_completed,
                completed_at: is_completed ? new Date().toISOString() : null,
                status: statusName,
              }
            : t
        )
      );
      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) qc.setQueryData(['tasks'], context.previous);
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ['tasks'] });
      qc.invalidateQueries({ queryKey: ['events'] });
    },
  });
}

// Drag-and-drop across Kanban columns — keeps is_completed/completed_at in
// sync with status so the List view/stats (which key off is_completed)
// never contradict the board. `isCompletedStatus` is looked up by the
// caller from useTaskStatuses() (whichever column has is_completed_status
// = true), since "which status counts as done" is now admin-configurable,
// not a fixed 'completed' string. Optimistic update mirrors
// useMoveOpportunityStage's pattern for the Pipeline Kanban board.
export function useMoveTaskStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status, isCompletedStatus }: { id: number; status: TaskStatus; isCompletedStatus: boolean }) =>
      api.updateTask(id, {
        status,
        is_completed: isCompletedStatus,
        completed_at: isCompletedStatus ? new Date().toISOString() : null,
      }),
    onMutate: async ({ id, status, isCompletedStatus }) => {
      await qc.cancelQueries({ queryKey: ['tasks'] });
      const previous = qc.getQueryData<Task[]>(['tasks']);
      qc.setQueryData<Task[]>(['tasks'], (old) =>
        old?.map((t) =>
          t.id === id
            ? {
                ...t,
                status,
                is_completed: isCompletedStatus,
                completed_at: isCompletedStatus ? new Date().toISOString() : null,
              }
            : t
        )
      );
      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) qc.setQueryData(['tasks'], context.previous);
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ['tasks'] });
      qc.invalidateQueries({ queryKey: ['events'] });
    },
  });
}

export function useDeleteTasks() {
  const invalidate = useInvalidateTasks();
  return useMutation({
    mutationFn: (ids: number[]) => api.deleteTasks(ids),
    onSuccess: invalidate,
  });
}

function useInvalidateArchivedTasks() {
  const qc = useQueryClient();
  return () => qc.invalidateQueries({ queryKey: ['tasks'] });
}

export function useArchiveTasks() {
  const invalidate = useInvalidateArchivedTasks();
  return useMutation({
    mutationFn: (ids: number[]) => api.archiveTasks(ids),
    onSuccess: invalidate,
  });
}

export function useRestoreTasks() {
  const invalidate = useInvalidateArchivedTasks();
  return useMutation({
    mutationFn: (ids: number[]) => api.restoreTasks(ids),
    onSuccess: invalidate,
  });
}

export function useSetTaskSubtasks() {
  const invalidate = useInvalidateTasks();
  return useMutation({
    mutationFn: ({ taskId, subtasks }: { taskId: number; subtasks: Pick<TaskSubtask, 'title' | 'is_completed'>[] }) =>
      api.setTaskSubtasks(taskId, subtasks),
    onSuccess: invalidate,
  });
}

export function useSetTaskAttachments() {
  const invalidate = useInvalidateTasks();
  return useMutation({
    mutationFn: ({
      taskId,
      attachments,
    }: {
      taskId: number;
      attachments: Pick<TaskAttachment, 'name' | 'url'>[];
    }) => api.setTaskAttachments(taskId, attachments),
    onSuccess: invalidate,
  });
}

export function useSetTaskWatchers() {
  const invalidate = useInvalidateTasks();
  return useMutation({
    mutationFn: ({ taskId, watcherIds }: { taskId: number; watcherIds: number[] }) =>
      api.setTaskWatchers(taskId, watcherIds),
    onSuccess: invalidate,
  });
}
