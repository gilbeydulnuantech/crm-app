import { apiFetch } from './client';
import { TaskStatusRow } from '../types/task';

export function fetchTaskStatuses() {
  return apiFetch<TaskStatusRow[]>('/webhook/get-task-statuses');
}

export function createTaskStatus(name: string) {
  return apiFetch<{ success: boolean; error?: string } & Partial<TaskStatusRow>>('/webhook/create-task-status', {
    method: 'POST',
    body: JSON.stringify({ name }),
  });
}

// Renaming cascades server-side onto every task currently using the old
// name (see Postgres: Cascade Rename On Tasks) — existing tasks keep
// pointing at the same column instead of becoming orphaned.
export function renameTaskStatus(id: number, name: string) {
  return apiFetch<{ success: boolean; error?: string }>('/webhook/update-task-status', {
    method: 'POST',
    body: JSON.stringify({ id, name }),
  });
}

// Rejected server-side if any non-archived task still uses this column.
export function deleteTaskStatus(id: number) {
  return apiFetch<{ success: boolean; error?: string }>('/webhook/delete-task-status', {
    method: 'POST',
    body: JSON.stringify({ id }),
  });
}
