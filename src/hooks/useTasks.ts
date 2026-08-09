import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as api from '../api/tasks';
import { Task } from '../types/task';

export function useTasks() {
  return useQuery({
    queryKey: ['tasks'],
    queryFn: api.fetchTasks,
  });
}

function useInvalidateTasks() {
  const qc = useQueryClient();
  return () => qc.invalidateQueries({ queryKey: ['tasks'] });
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
    mutationFn: ({ id, is_completed }: { id: number; is_completed: boolean }) =>
      api.toggleTaskComplete(id, is_completed),
    // Optimistic checkbox toggle so it feels instant.
    onMutate: async ({ id, is_completed }) => {
      await qc.cancelQueries({ queryKey: ['tasks'] });
      const previous = qc.getQueryData<Task[]>(['tasks']);
      qc.setQueryData<Task[]>(['tasks'], (old) =>
        old?.map((t) =>
          t.id === id
            ? { ...t, is_completed, completed_at: is_completed ? new Date().toISOString() : null }
            : t
        )
      );
      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) qc.setQueryData(['tasks'], context.previous);
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ['tasks'] }),
  });
}

export function useDeleteTasks() {
  const invalidate = useInvalidateTasks();
  return useMutation({
    mutationFn: (ids: number[]) => api.deleteTasks(ids),
    onSuccess: invalidate,
  });
}
