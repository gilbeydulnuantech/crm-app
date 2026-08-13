export const TASK_PRIORITIES = ['Low', 'Medium', 'High'] as const;
export type TaskPriority = (typeof TASK_PRIORITIES)[number];

export const TASK_TYPES = ['Follow-up', 'Call', 'Email', 'Meeting', 'Proposal', 'Other'] as const;
export type TaskType = (typeof TASK_TYPES)[number];

export const TASK_SLA_TIERS = ['Standard', 'Priority', 'Enterprise (24h)'] as const;
export type TaskSlaTier = (typeof TASK_SLA_TIERS)[number];

export const ESTIMATED_DURATION_OPTIONS = [
  { value: 15, label: '15 mins' },
  { value: 30, label: '30 mins' },
  { value: 45, label: '45 mins' },
  { value: 60, label: '1 hour' },
  { value: 120, label: '2 hours' },
  { value: 240, label: 'Half day' },
  { value: 480, label: 'Full day' },
] as const;

export const REMINDER_OPTIONS = [
  { value: 0, label: 'At due time' },
  { value: 10, label: '10 minutes before' },
  { value: 30, label: '30 minutes before' },
  { value: 60, label: '1 hour before' },
  { value: 1440, label: '1 day before' },
] as const;

// Kanban board columns — distinct from `is_completed` (a plain boolean).
// `is_completed`/`completed_at` are kept in sync whenever status moves to/
// from 'completed' (see useMoveTaskStatus) so the existing List view/stats,
// which key off `is_completed`, never contradict the Kanban board.
export const TASK_STATUSES = ['to_do', 'in_progress', 'waiting', 'completed'] as const;
export type TaskStatus = (typeof TASK_STATUSES)[number];
export const TASK_STATUS_LABELS: Record<TaskStatus, string> = {
  to_do: 'Not Started',
  in_progress: 'In Progress',
  waiting: 'Waiting on Client',
  completed: 'Completed',
};

export interface TaskSubtask {
  id: number;
  title: string;
  is_completed: boolean;
}

export interface TaskAttachment {
  id: number;
  name: string;
  url: string;
}

export interface TaskWatcher {
  id: number;
  name: string;
  color?: string;
}

export interface Task {
  id: number;
  contact_id?: number | null;
  contact_name?: string; // joined
  contact_email?: string; // joined
  company_id?: number | null; // joined via the linked contact's account_id
  company_name?: string; // joined via the linked contact's account_id
  account_id?: number | null; // direct Account linkage on the task itself
  account_name?: string; // joined
  opportunity_id?: number | null;
  opportunity_name?: string; // joined
  opportunity_value?: number | null; // joined
  opportunity_pipeline_id?: number | null; // joined
  user_id?: number | null;
  assigned_user_name?: string; // joined
  assigned_user_color?: string; // joined from users.color
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
  sla_tier?: TaskSlaTier | null;
  is_private?: boolean;
  reminder_minutes_before?: number | null;
  is_archived?: boolean;
  archived_at?: string | null;
  edit_reason?: string | null;
  estimated_minutes?: number | null;
  subtask_total?: number;
  subtask_completed?: number;
  subtasks?: TaskSubtask[];
  attachments?: TaskAttachment[];
  watchers?: TaskWatcher[];
}

export type TasksView = 'all' | 'mine' | 'completed' | 'archived';

// A short, human-readable id for display only (e.g. "TSK-8921") — not a
// stored column, just the row id formatted consistently across the UI.
export function taskDisplayId(task: Task): string {
  return `TSK-${task.id}`;
}

// Suggests an SLA tier from the linked deal's size — a lightweight stand-in
// for "account tier" auto-routing (no account-tier field exists yet). Purely
// a default the user can still override; nothing enforces it server-side.
export function suggestSlaTier(dealValue?: number | null): TaskSlaTier {
  if (dealValue != null && dealValue >= 50000) return 'Enterprise (24h)';
  if (dealValue != null && dealValue >= 10000) return 'Priority';
  return 'Standard';
}

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
