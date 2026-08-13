import { FormEvent, useEffect, useMemo, useState } from 'react';
import { Task, TASK_PRIORITIES, TASK_TYPES, TaskPriority, TaskType } from '../../types/task';
import { Opportunity } from '../../types/opportunity';
import { useAddTask, useUpdateTask } from '../../hooks/useTasks';
import { useContacts, useUsers } from '../../hooks/useContacts';
import { useAllOpportunities, usePipelines } from '../../hooks/useOpportunities';
import { useAuth } from '../../context/AuthContext';
import { toTitleCase } from '../../utils/text';
import ContactPicker from '../pipeline/ContactPicker';
import { startDm, sendMessage } from '../../api/chat';

interface Props {
  open: boolean;
  task: Task | null; // null = add mode
  defaultContactId?: number;
  defaultOpportunity?: Opportunity | null;
  onClose: () => void;
}

const EMPTY = {
  subject: '',
  body: '',
  contact_id: '',
  contact_name: '',
  company_name: '',
  assigned_user: '',
  priority: 'Medium' as TaskPriority,
  date: '',
  time: '09:00',
  task_type: '' as TaskType | '',
  opportunity_id: '',
};

function toDateInput(iso: string) {
  return iso.slice(0, 10);
}
function toTimeInput(iso: string) {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}
function combineDateTime(date: string, time: string): string | null {
  if (!date) return null;
  return new Date(`${date}T${time || '09:00'}`).toISOString();
}

export default function TaskFormModal({ open, task, defaultContactId, defaultOpportunity, onClose }: Props) {
  const { user } = useAuth();
  const { data: users = [] } = useUsers();
  const { data: contacts = [] } = useContacts();
  const { data: pipelines = [] } = usePipelines();
  const pipelineIds = useMemo(() => pipelines.map((p) => p.id), [pipelines]);
  const { data: allDeals = [] } = useAllOpportunities(pipelineIds);

  const [form, setForm] = useState(EMPTY);
  const [error, setError] = useState<string | null>(null);
  const [sendReminder, setSendReminder] = useState(false);
  const addTask = useAddTask();
  const updateTask = useUpdateTask();

  const isEdit = !!task;
  const isSaving = addTask.isPending || updateTask.isPending;

  useEffect(() => {
    if (!open) return;

    if (task) {
      const matched = task.contact_id ? contacts.find((c) => c.id === task.contact_id) : undefined;
      setForm({
        subject: task.subject ?? '',
        body: task.body ?? '',
        contact_id: task.contact_id ? String(task.contact_id) : '',
        contact_name: task.contact_name ?? '',
        company_name: matched?.company_name ?? '',
        assigned_user: task.user_id ? String(task.user_id) : '',
        priority: task.priority ?? 'Medium',
        date: task.due_at ? toDateInput(task.due_at) : '',
        time: task.due_at ? toTimeInput(task.due_at) : '09:00',
        task_type: task.task_type ?? '',
        opportunity_id: task.opportunity_id ? String(task.opportunity_id) : '',
      });
    } else if (defaultOpportunity) {
      setForm({
        ...EMPTY,
        contact_id: defaultOpportunity.contact_id ? String(defaultOpportunity.contact_id) : '',
        contact_name: defaultOpportunity.contact_name ?? '',
        company_name: defaultOpportunity.company_name ?? '',
        opportunity_id: String(defaultOpportunity.id),
        assigned_user: defaultOpportunity.assigned_user ? String(defaultOpportunity.assigned_user) : user ? String(user.id) : '',
        date: toDateInput(new Date().toISOString()),
      });
    } else {
      const defaultContact = defaultContactId ? contacts.find((c) => c.id === defaultContactId) : undefined;
      setForm({
        ...EMPTY,
        contact_id: defaultContactId ? String(defaultContactId) : '',
        contact_name: defaultContact ? `${defaultContact.first_name} ${defaultContact.last_name}`.trim() : '',
        company_name: defaultContact?.company_name ?? '',
        assigned_user: user ? String(user.id) : '',
        date: toDateInput(new Date().toISOString()),
      });
    }
    setError(null);
    setSendReminder(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [task, open, defaultContactId, defaultOpportunity, user]);

  const contactDeals = useMemo(
    () => (form.contact_id ? allDeals.filter((d) => d.contact_id === Number(form.contact_id)) : []),
    [allDeals, form.contact_id]
  );

  // If the currently-linked deal isn't in the contact's deal list yet (still
  // loading, or the contact was just changed), keep it selectable so editing
  // doesn't silently drop the existing link.
  const relatedDealOptions = useMemo(() => {
    if (form.opportunity_id && !contactDeals.some((d) => String(d.id) === form.opportunity_id)) {
      const fallbackName = task?.opportunity_name;
      if (fallbackName) {
        return [{ id: Number(form.opportunity_id), name: fallbackName } as Opportunity, ...contactDeals];
      }
    }
    return contactDeals;
  }, [contactDeals, form.opportunity_id, task]);

  if (!open) return null;

  function update<K extends keyof typeof EMPTY>(key: K, value: (typeof EMPTY)[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function handleContactChange(id: number | null, name: string) {
    const matched = id ? contacts.find((c) => c.id === id) : undefined;
    setForm((f) => ({
      ...f,
      contact_id: id ? String(id) : '',
      contact_name: name,
      company_name: matched?.company_name ?? (id ? f.company_name : ''),
      // A deal tied to the previous contact no longer applies once the
      // contact changes.
      opportunity_id: id !== (f.contact_id ? Number(f.contact_id) : null) ? '' : f.opportunity_id,
    }));
  }

  // Fire-and-forget — a DM failure shouldn't block the task from being
  // created, so this never surfaces into the form's error state.
  async function sendTaskReminder(assignedUserId: number, subject: string, dueAt: string | null) {
    try {
      const dueText = dueAt
        ? new Date(dueAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
        : 'no due date';
      const { id: conversationId } = await startDm(assignedUserId);
      await sendMessage(conversationId, `New task assigned: "${subject}" — due ${dueText}`);
    } catch (err) {
      console.error('Failed to send task reminder DM:', err);
    }
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    const payload = {
      subject: form.subject,
      body: form.body || undefined,
      contact_id: form.contact_id ? Number(form.contact_id) : null,
      opportunity_id: form.opportunity_id ? Number(form.opportunity_id) : null,
      user_id: form.assigned_user ? Number(form.assigned_user) : null,
      due_at: combineDateTime(form.date, form.time),
      type: 'task' as const,
      priority: form.priority,
      task_type: form.task_type || null,
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
          const assignedUserId = form.assigned_user ? Number(form.assigned_user) : null;
          if (sendReminder && assignedUserId && assignedUserId !== user?.id) {
            sendTaskReminder(assignedUserId, form.subject, payload.due_at);
          }
          setForm(EMPTY);
          onClose();
        },
        onError: (err) => setError(err instanceof Error ? err.message : 'Failed to add task.'),
      });
    }
  }

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-slate-800">{isEdit ? 'Edit Task' : 'Create Task'}</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <i className="fa-solid fa-xmark" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Task Title</label>
            <input
              required
              value={form.subject}
              onChange={(e) => update('subject', e.target.value)}
              placeholder="Follow up with John Smith"
              className="w-full px-3 py-1.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Description</label>
            <textarea
              value={form.body}
              onChange={(e) => update('body', e.target.value)}
              rows={3}
              placeholder="Follow up regarding the roofing proposal sent yesterday."
              className="w-full px-3 py-1.5 text-sm border border-slate-200 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <ContactPicker
              contactId={form.contact_id ? Number(form.contact_id) : null}
              contactName={form.contact_name}
              onChange={handleContactChange}
            />
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Company</label>
              <div className="px-3 py-1.5 text-sm border border-slate-200 rounded-lg bg-slate-50 text-slate-500 truncate">
                {toTitleCase(form.company_name) || '--'}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Assigned To</label>
              <select
                required
                value={form.assigned_user}
                onChange={(e) => update('assigned_user', e.target.value)}
                className="w-full px-3 py-1.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="" disabled>
                  Select a user...
                </option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>
                    {toTitleCase(u.name)}
                    {u.id === user?.id ? ' (Me)' : ''}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Priority</label>
              <select
                value={form.priority}
                onChange={(e) => update('priority', e.target.value as TaskPriority)}
                className="w-full px-3 py-1.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                {TASK_PRIORITIES.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Due Date</label>
              <input
                required
                type="date"
                value={form.date}
                onChange={(e) => update('date', e.target.value)}
                className="w-full px-3 py-1.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Due Time</label>
              <input
                type="time"
                value={form.time}
                onChange={(e) => update('time', e.target.value)}
                className="w-full px-3 py-1.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Task Type</label>
              <select
                value={form.task_type}
                onChange={(e) => update('task_type', e.target.value as TaskType)}
                className="w-full px-3 py-1.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">--</option>
                {TASK_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Related Deal</label>
              <select
                value={form.opportunity_id}
                onChange={(e) => update('opportunity_id', e.target.value)}
                disabled={!form.contact_id}
                className="w-full px-3 py-1.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-slate-50 disabled:text-slate-400"
              >
                <option value="">None</option>
                {relatedDealOptions.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {!isEdit && (
            <label className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer pt-1">
              <input
                type="checkbox"
                checked={sendReminder}
                onChange={(e) => setSendReminder(e.target.checked)}
                className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
              />
              Create reminder
              <span className="text-[10px] text-slate-400">
                (sends the assignee a Team Chat DM when this task is created)
              </span>
            </label>
          )}

          {error && (
            <div className="p-2.5 text-xs rounded-lg text-center bg-rose-50 text-rose-700 border border-rose-200">
              {error}
            </div>
          )}

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
              {isSaving ? 'Saving...' : isEdit ? 'Save Changes' : 'Create Task'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
