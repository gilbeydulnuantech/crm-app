export interface Task {
  id: number;
  contact_id?: number | null;
  contact_name?: string; // joined
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
}

export type TasksView = 'all' | 'mine' | 'completed';

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
