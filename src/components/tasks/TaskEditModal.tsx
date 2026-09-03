import { FormEvent, useEffect, useMemo, useState } from 'react';
import {
  ESTIMATED_DURATION_OPTIONS,
  TASK_PRIORITIES,
  TASK_TYPES,
  Task,
  TaskPriority,
  TaskStatus,
  TaskType,
  taskDisplayId,
} from '../../types/task';
import { useSetTaskWatchers, useUpdateTask } from '../../hooks/useTasks';
import { useTaskStatuses } from '../../hooks/useTaskStatuses';
import { useContacts, useUsers } from '../../hooks/useContacts';
import { useAllOpportunities, usePipelines } from '../../hooks/useOpportunities';
import { useAuth } from '../../context/AuthContext';
import { toTitleCase } from '../../utils/text';
import ContactPicker from '../pipeline/ContactPicker';
import CompanyPicker from '../contacts/CompanyPicker';
import { startDm, sendMessage } from '../../api/chat';

interface Props {
  open: boolean;
  task: Task | null;
  onClose: () => void;
}

const EMPTY = {
  subject: '',
  body: '',
  status: '' as TaskStatus,
  priority: 'Medium' as TaskPriority,
  task_type: '' as TaskType | '',
  date: '',
  time: '09:00',
  estimated_minutes: '',
  assigned_user: '',
  contact_id: '',
  contact_name: '',
  account_id: '',
  account_name: '',
  opportunity_id: '',
  watcherIds: [] as number[],
  edit_reason: '',
};

// Accepts either an ISO timestamp or a plain Date and reads its LOCAL
// calendar date. `iso.slice(0, 10)` — the previous approach — reads the
// UTC calendar date instead: for any timezone ahead of UTC (e.g. UTC+8),
// local midnight on a given day is still the *previous* day in UTC.
function toDateInput(value: string | Date) {
  const d = typeof value === 'string' ? new Date(value) : value;
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
function toTimeInput(iso: string) {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}
function combineDateTime(date: string, time: string): string | null {
  if (!date) return null;
  return new Date(`${date}T${time || '09:00'}`).toISOString();
}

export default function TaskEditModal({ open, task, onClose }: Props) {
  const { user } = useAuth();
  const { data: users = [] } = useUsers();
  const { data: taskStatuses = [] } = useTaskStatuses();
  const completedStatus = taskStatuses.find((s) => s.is_completed_status);
  const defaultStatus = taskStatuses[0];
  const { data: contacts = [] } = useContacts();
  const { data: pipelines = [] } = usePipelines();
  const pipelineIds = useMemo(() => pipelines.map((p) => p.id), [pipelines]);
  const { data: allDeals = [] } = useAllOpportunities(pipelineIds);

  const [form, setForm] = useState(EMPTY);
  const [error, setError] = useState<string | null>(null);
  const [watcherPickerOpen, setWatcherPickerOpen] = useState(false);
  const updateTask = useUpdateTask();
  const setWatchers = useSetTaskWatchers();

  useEffect(() => {
    if (!open || !task) return;
    setForm({
      subject: task.subject ?? '',
      body: task.body ?? '',
      status: task.status ?? (task.is_completed ? completedStatus?.name : defaultStatus?.name) ?? '',
      priority: task.priority ?? 'Medium',
      task_type: task.task_type ?? '',
      date: task.due_at ? toDateInput(task.due_at) : '',
      time: task.due_at ? toTimeInput(task.due_at) : '09:00',
      estimated_minutes: task.estimated_minutes ? String(task.estimated_minutes) : '',
      assigned_user: task.user_id ? String(task.user_id) : '',
      contact_id: task.contact_id ? String(task.contact_id) : '',
      contact_name: task.contact_name ?? '',
      account_id: task.account_id ? String(task.account_id) : '',
      account_name: task.account_name ?? task.company_name ?? '',
      opportunity_id: task.opportunity_id ? String(task.opportunity_id) : '',
      watcherIds: task.watchers?.map((w) => w.id) ?? [],
      edit_reason: '',
    });
    setError(null);
  }, [open, task, completedStatus, defaultStatus]);

  const contactDeals = useMemo(
    () => (form.contact_id ? allDeals.filter((d) => d.contact_id === Number(form.contact_id)) : []),
    [allDeals, form.contact_id]
  );
  const relatedDealOptions = useMemo(() => {
    if (form.opportunity_id && !contactDeals.some((d) => String(d.id) === form.opportunity_id)) {
      const fallbackName = task?.opportunity_name;
      if (fallbackName) {
        return [{ id: Number(form.opportunity_id), name: fallbackName } as (typeof contactDeals)[number], ...contactDeals];
      }
    }
    return contactDeals;
  }, [contactDeals, form.opportunity_id, task]);

  if (!open || !task) return null;

  function update<K extends keyof typeof EMPTY>(key: K, value: (typeof EMPTY)[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function handleContactChange(id: number | null, name: string) {
    const matched = id ? contacts.find((c) => c.id === id) : undefined;
    setForm((f) => ({
      ...f,
      contact_id: id ? String(id) : '',
      contact_name: name,
      account_id: matched?.account_id ? String(matched.account_id) : f.account_id,
      account_name: matched?.company_name ?? f.account_name,
      opportunity_id: id !== (f.contact_id ? Number(f.contact_id) : null) ? '' : f.opportunity_id,
    }));
  }

  function toggleWatcher(id: number) {
    setForm((f) => ({
      ...f,
      watcherIds: f.watcherIds.includes(id) ? f.watcherIds.filter((w) => w !== id) : [...f.watcherIds, id],
    }));
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (!form.edit_reason.trim()) {
      setError('A reason for this edit is required for the audit log.');
      return;
    }

    const isCompletedStatus = taskStatuses.find((s) => s.name === form.status)?.is_completed_status ?? false;
    const payload = {
      subject: form.subject,
      body: form.body || undefined,
      status: form.status,
      is_completed: isCompletedStatus,
      completed_at: isCompletedStatus ? new Date().toISOString() : null,
      priority: form.priority,
      task_type: form.task_type || null,
      due_at: combineDateTime(form.date, form.time),
      estimated_minutes: form.estimated_minutes ? Number(form.estimated_minutes) : null,
      user_id: form.assigned_user ? Number(form.assigned_user) : null,
      contact_id: form.contact_id ? Number(form.contact_id) : null,
      account_id: form.account_id ? Number(form.account_id) : null,
      opportunity_id: form.opportunity_id ? Number(form.opportunity_id) : null,
      edit_reason: form.edit_reason.trim(),
    };

    const previousOwnerId = task!.user_id ?? null;

    updateTask.mutate(
      { id: task!.id, payload },
      {
        onSuccess: () => {
          setWatchers.mutate({ taskId: task!.id, watcherIds: form.watcherIds });
          if (payload.user_id && payload.user_id !== previousOwnerId && payload.user_id !== user?.id) {
            notifyNewOwner(payload.user_id);
          }
          onClose();
        },
        onError: (err) => setError(err instanceof Error ? err.message : 'Failed to update task.'),
      }
    );
  }

  // Fire-and-forget, matches the Reassign quick action — an assignment
  // change through the Owner field should notify the same way.
  async function notifyNewOwner(newOwnerId: number) {
    try {
      const { id: conversationId } = await startDm(newOwnerId);
      await sendMessage(conversationId, `Task reassigned to you: "[[ref:task:${task!.id}:-:${form.subject}]]"`);
    } catch (err) {
      console.error('Failed to send reassignment DM:', err);
    }
  }

  const inputClass =
    'w-full px-3 py-1.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--theme-accent)]';

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-slate-800">Edit Task: {taskDisplayId(task)}</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <i className="fa-solid fa-xmark" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Subject *</label>
            <input
              required
              value={form.subject}
              onChange={(e) => update('subject', e.target.value)}
              className={inputClass}
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Status</label>
              <select value={form.status} onChange={(e) => update('status', e.target.value as TaskStatus)} className={inputClass}>
                {taskStatuses.map((s) => (
                  <option key={s.id} value={s.name}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Priority</label>
              <select
                value={form.priority}
                onChange={(e) => update('priority', e.target.value as TaskPriority)}
                className={inputClass}
              >
                {TASK_PRIORITIES.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Type</label>
              <select
                value={form.task_type}
                onChange={(e) => update('task_type', e.target.value as TaskType)}
                className={inputClass}
              >
                <option value="">--</option>
                {TASK_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Due Date</label>
              <input required type="date" value={form.date} onChange={(e) => update('date', e.target.value)} className={inputClass} />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Due Time</label>
              <input type="time" value={form.time} onChange={(e) => update('time', e.target.value)} className={inputClass} />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Estimated Duration</label>
              <select
                value={form.estimated_minutes}
                onChange={(e) => update('estimated_minutes', e.target.value)}
                className={inputClass}
              >
                <option value="">--</option>
                {ESTIMATED_DURATION_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 items-start">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Owner</label>
              <select
                required
                value={form.assigned_user}
                onChange={(e) => update('assigned_user', e.target.value)}
                className={inputClass}
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
              <label className="block text-xs font-medium text-slate-600 mb-1">Watchers / Collaborators</label>
              <div className="flex flex-wrap items-center gap-1.5">
                {form.watcherIds.map((id) => {
                  const u = users.find((usr) => usr.id === id);
                  if (!u) return null;
                  return (
                    <span
                      key={id}
                      className="flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full bg-slate-100 text-slate-600"
                    >
                      {toTitleCase(u.name)}
                      <button type="button" onClick={() => toggleWatcher(id)} className="opacity-60 hover:opacity-100">
                        <i className="fa-solid fa-xmark text-[9px]" />
                      </button>
                    </span>
                  );
                })}
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setWatcherPickerOpen((v) => !v)}
                    className="flex items-center gap-1 px-2 py-0.5 text-xs font-medium text-slate-500 border border-dashed border-slate-300 rounded-full hover:border-[var(--theme-accent)] hover:text-[var(--theme-accent)]"
                  >
                    <i className="fa-solid fa-plus text-[9px]" />
                    Add
                  </button>
                  {watcherPickerOpen && (
                    <>
                      <div className="fixed inset-0 z-10" onClick={() => setWatcherPickerOpen(false)} />
                      <div className="absolute top-full mt-1 left-0 w-48 bg-white border border-slate-200 rounded-lg shadow-lg z-20 py-1 max-h-40 overflow-y-auto">
                        {users
                          .filter((u) => !form.watcherIds.includes(u.id))
                          .map((u) => (
                            <button
                              key={u.id}
                              type="button"
                              onClick={() => {
                                toggleWatcher(u.id);
                                setWatcherPickerOpen(false);
                              }}
                              className="w-full text-left px-2.5 py-1.5 text-xs hover:bg-slate-50 text-slate-700"
                            >
                              {toTitleCase(u.name)}
                            </button>
                          ))}
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="border border-slate-200 rounded-xl p-3 space-y-3">
            <h4 className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Associations</h4>
            <ContactPicker
              contactId={form.contact_id ? Number(form.contact_id) : null}
              contactName={form.contact_name}
              onChange={handleContactChange}
              accountId={form.account_id ? Number(form.account_id) : null}
            />
            <CompanyPicker
              accountId={form.account_id ? Number(form.account_id) : null}
              companyName={form.account_name}
              onChange={(accountId, name) =>
                setForm((f) => ({ ...f, account_id: accountId ? String(accountId) : '', account_name: name }))
              }
            />
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Deal</label>
              <select
                value={form.opportunity_id}
                onChange={(e) => update('opportunity_id', e.target.value)}
                disabled={!form.contact_id}
                className={`${inputClass} disabled:bg-slate-50 disabled:text-slate-400`}
              >
                <option value="">None</option>
                {relatedDealOptions.map((d) => (
                  <option key={d.id} value={d.id}>
                    {toTitleCase(d.name)}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Description</label>
            <textarea
              value={form.body}
              onChange={(e) => update('body', e.target.value)}
              rows={3}
              className={`${inputClass} resize-none`}
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">
              Reason for Edit <span className="text-slate-400 font-normal">(required for audit logging)</span>
            </label>
            <input
              required
              value={form.edit_reason}
              onChange={(e) => update('edit_reason', e.target.value)}
              placeholder="Updated due date to match customer schedule request"
              className={inputClass}
            />
          </div>

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
              disabled={updateTask.isPending}
              className="px-4 py-2 text-sm font-semibold bg-[var(--theme-accent)] hover:bg-[var(--theme-accent-hover)] disabled:opacity-60 text-white rounded-lg"
            >
              {updateTask.isPending ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
