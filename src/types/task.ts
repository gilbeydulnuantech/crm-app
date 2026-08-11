export const TASK_PRIORITIES = ['Low', 'Medium', 'High'] as const;
export type TaskPriority = (typeof TASK_PRIORITIES)[number];

export const TASK_TYPES = ['Follow-up', 'Call', 'Email', 'Meeting', 'Proposal', 'Other'] as const;
export type TaskType = (typeof TASK_TYPES)[number];

// Kanban board columns — distinct from `is_completed` (a plain boolean).
// `is_completed`/`completed_at` are kept in sync whenever status moves to/
// from 'completed' (see useMoveTaskStatus) so the existing List view/stats,
// which key off `is_completed`, never contradict the Kanban board.
export const TASK_STATUSES = ['to_do', 'in_progress', 'waiting', 'completed'] as const;
export type TaskStatus = (typeof TASK_STATUSES)[number];
export const TASK_STATUS_LABELS: Record<TaskStatus, string> = {
  to_do: 'To Do',
  in_progress: 'In Progress',
  waiting: 'Waiting',
  completed: 'Completed',
};

export interface Task {
  id: number;
  contact_id?: number | null;
  contact_name?: string; // joined
  company_name?: string; // joined via the linked contact's account_id
  opportunity_id?: number | null;
  opportunity_name?: string; // joined
  user_id?: number | null;
  assigned_user_name?: string; // joined
  type: 'task';
  subject: string;
  body?: string;
  is_completed: boolean;
  due_at?: string | null;
  completed_at?: string | null;
  created_at?: string;
  priority?: TaskPriority | null;
  task_type?: TaskType | null;
  status?: TaskStatus | null;
}

export type TasksView = 'all' | 'mine' | 'completed';

// Legacy tasks (written before the `status` column existed) fall back to
// is_completed so they still land in a sensible Kanban column.
export function taskKanbanStatus(task: Task): TaskStatus {
  if (task.status) return task.status;
  return task.is_completed ? 'completed' : 'to_do';
}

export function taskStatus(task: Task): 'Completed' | 'Overdue' | 'Due Today' | 'Upcoming' {
  if (task.is_completed) return 'Completed';
  if (!task.due_at) return 'Upcoming';
  const due = new Date(task.due_at);
  const now = new Date();
  const dueDay = due.toDateString();
  const today = now.toDateString();
  if (dueDay === today) return 'Due Today';
  if (due.getTime() < now.getTime()) return 'Overdue';
  return 'Upcoming';
}
