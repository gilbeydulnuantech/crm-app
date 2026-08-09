import { apiFetch } from './client';
import { Task } from '../types/task';

export function fetchTasks() {
  return apiFetch<Task[]>('/webhook/get-tasks');
}

export function addTask(payload: Partial<Task>) {
  return apiFetch<{ success: boolean; error?: string; id?: number }>('/webhook/add-task', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function updateTask(id: number, payload: Partial<Task>) {
  return apiFetch<{ success: boolean; error?: string }>('/webhook/update-task', {
    method: 'POST',
    body: JSON.stringify({ id, ...payload }),
  });
}

export function toggleTaskComplete(id: number, is_completed: boolean) {
  return apiFetch<{ success: boolean; error?: string }>('/webhook/update-task', {
    method: 'POST',
    body: JSON.stringify({
      id,
      is_completed,
      completed_at: is_completed ? new Date().toISOString() : null,
    }),
  });
}

export function deleteTasks(ids: number[]) {
  return apiFetch<{ success: boolean; error?: string }>('/webhook/delete-tasks', {
    method: 'POST',
    body: JSON.stringify({ ids }),
  });
}
