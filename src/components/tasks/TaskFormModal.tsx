import { FormEvent, useEffect, useState } from 'react';
import { Task } from '../../types/task';
import { useAddTask, useUpdateTask } from '../../hooks/useTasks';

interface Props {
  open: boolean;
  task: Task | null; // null = add mode
  defaultContactId?: number;
  onClose: () => void;
}

const EMPTY = {
  subject: '',
  body: '',
  contact_id: '',
  opportunity_id: '',
  due_at: '',
};

export default function TaskFormModal({ open, task, defaultContactId, onClose }: Props) {
  const [form, setForm] = useState(EMPTY);
  const [error, setError] = useState<string | null>(null);
  const addTask = useAddTask();
  const updateTask = useUpdateTask();

  const isEdit = !!task;
  const isSaving = addTask.isPending || updateTask.isPending;

  useEffect(() => {
    if (task) {
      setForm({
        subject: task.subject ?? '',
        body: task.body ?? '',
        contact_id: task.contact_id ? String(task.contact_id) : '',
        opportunity_id: task.opportunity_id ? String(task.opportunity_id) : '',
        due_at: task.due_at?.slice(0, 16) ?? '',
      });
    } else {
      setForm({ ...EMPTY, contact_id: defaultContactId ? String(defaultContactId) : '' });
    }
    setError(null);
  }, [task, open, defaultContactId]);

  if (!open) return null;

  function update<K extends keyof typeof EMPTY>(key: K, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    const payload = {
      subject: form.subject,
      body: form.body || undefined,
      contact_id: form.contact_id ? Number(form.contact_id) : null,
      opportunity_id: form.opportunity_id ? Number(form.opportunity_id) : null,
      due_at: form.due_at || null,
      type: 'task' as const,
    };

    if (isEdit && task) {
      updateTask.mutate(
        { id: task.id, payload },
        {
          onSuccess: () => onClose(),
          onError: (err) => setError(err instanceof Error ? err.message : 'Failed to update task.'),
        }
      );
    } else {
      addTask.mutate(payload, {
        onSuccess: () => {
          setForm(EMPTY);
          onClose();
        },
        onError: (err) => setError(err instanceof Error ? err.message : 'Failed to add task.'),
      });
    }
  }

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-slate-800">{isEdit ? 'Edit Task' : 'Add Task'}</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <i className="fa-solid fa-xmark" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Task</label>
            <input
              required
              value={form.subject}
              onChange={(e) => update('subject', e.target.value)}
              className="w-full px-3 py-1.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Notes</label>
            <textarea
              value={form.body}
              onChange={(e) => update('body', e.target.value)}
              rows={3}
              className="w-full px-3 py-1.5 text-sm border border-slate-200 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Contact ID</label>
              <input
                type="number"
                value={form.contact_id}
                onChange={(e) => update('contact_id', e.target.value)}
                className="w-full px-3 py-1.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="optional"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Deal ID</label>
              <input
                type="number"
                value={form.opportunity_id}
                onChange={(e) => update('opportunity_id', e.target.value)}
                className="w-full px-3 py-1.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="optional"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Due Date</label>
            <input
              type="datetime-local"
              value={form.due_at}
              onChange={(e) => update('due_at', e.target.value)}
              className="w-full px-3 py-1.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {error && (
            <div className="p-2.5 text-xs rounded-lg text-center bg-rose-50 text-rose-700 border border-rose-200">
              {error}
            </div>
          )}

          <p className="text-[11px] text-slate-400 italic">
            No `priority` field exists on the `activities` table — dropped from this form rather
            than shipping a field the backend can't store. Add a column if you want it back.
          </p>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 rounded-lg"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="px-4 py-2 text-sm font-semibold bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white rounded-lg"
            >
              {isSaving ? 'Saving...' : isEdit ? 'Save Changes' : 'Add Task'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
