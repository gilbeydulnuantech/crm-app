import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as api from '../api/taskStatuses';

export function useTaskStatuses() {
  return useQuery({
    queryKey: ['task-statuses'],
    queryFn: api.fetchTaskStatuses,
  });
}

function useInvalidateTaskStatuses() {
  const qc = useQueryClient();
  return () => {
    qc.invalidateQueries({ queryKey: ['task-statuses'] });
    // A rename/delete cascades onto existing tasks' status strings server
    // side, so the task list itself can go stale too.
    qc.invalidateQueries({ queryKey: ['tasks'] });
  };
}

export function useCreateTaskStatus() {
  const invalidate = useInvalidateTaskStatuses();
  return useMutation({
    mutationFn: (name: string) => api.createTaskStatus(name),
    onSuccess: invalidate,
  });
}

export function useRenameTaskStatus() {
  const invalidate = useInvalidateTaskStatuses();
  return useMutation({
    mutationFn: ({ id, name }: { id: number; name: string }) => api.renameTaskStatus(id, name),
    onSuccess: invalidate,
  });
}

export function useDeleteTaskStatus() {
  const invalidate = useInvalidateTaskStatuses();
  return useMutation({
    mutationFn: (id: number) => api.deleteTaskStatus(id),
    onSuccess: invalidate,
  });
}
