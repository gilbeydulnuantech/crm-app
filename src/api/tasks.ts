import { apiFetch } from './client';
import { Task, TaskAttachment, TaskSubtask } from '../types/task';

export function fetchTasks() {
  return apiFetch<Task[]>('/webhook/get-tasks');
}

export function fetchArchivedTasks() {
  return apiFetch<Task[]>('/webhook/get-archived-tasks');
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

// `statusName` is the actual task_statuses row name to move the task to —
// the "Completed" column when checking, or the caller-chosen "not complete"
// column when unchecking. Keeps the board column in sync — otherwise a task
// marked complete from the List view stays parked in its old column.
export function toggleTaskComplete(id: number, is_completed: boolean, statusName: string) {
  return apiFetch<{ success: boolean; error?: string }>('/webhook/update-task', {
    method: 'POST',
    body: JSON.stringify({
      id,
      is_completed,
      completed_at: is_completed ? new Date().toISOString() : null,
      status: statusName,
    }),
  });
}

export function deleteTasks(ids: number[]) {
  return apiFetch<{ success: boolean; error?: string }>('/webhook/delete-tasks', {
    method: 'POST',
    body: JSON.stringify({ ids }),
  });
}

export function archiveTasks(ids: number[]) {
  return apiFetch<{ success: boolean; error?: string }>('/webhook/archive-tasks', {
    method: 'POST',
    body: JSON.stringify({ ids }),
  });
}

export function restoreTasks(ids: number[]) {
  return apiFetch<{ success: boolean; error?: string }>('/webhook/restore-tasks', {
    method: 'POST',
    body: JSON.stringify({ ids }),
  });
}

// These three replace the whole list in one call — subtasks/attachments/
// watchers are small (a handful of rows), so full-replace on every change
// is simpler and cheap enough vs. individual add/remove endpoints.
export function setTaskSubtasks(
  taskId: number,
  subtasks: Pick<TaskSubtask, 'title' | 'is_completed'>[],
  requesterId?: number | null
) {
  return apiFetch<{ success: boolean; error?: string; subtasks?: TaskSubtask[] }>('/webhook/set-task-subtasks', {
    method: 'POST',
    body: JSON.stringify({ task_id: taskId, subtasks, requester_id: requesterId ?? null }),
  });
}

export function setTaskAttachments(taskId: number, attachments: Pick<TaskAttachment, 'name' | 'url'>[]) {
  return apiFetch<{ success: boolean; error?: string; attachments?: TaskAttachment[] }>(
    '/webhook/set-task-attachments',
    {
      method: 'POST',
      body: JSON.stringify({ task_id: taskId, attachments }),
    }
  );
}

export function setTaskWatchers(taskId: number, watcherIds: number[]) {
  return apiFetch<{ success: boolean; error?: string }>('/webhook/set-task-watchers', {
    method: 'POST',
    body: JSON.stringify({ task_id: taskId, watcher_ids: watcherIds }),
  });
}
