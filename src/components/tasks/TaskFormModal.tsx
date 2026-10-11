import TimeInput from '../TimeInput';
import { FormEvent, useEffect, useMemo, useState } from 'react';
import {
  REMINDER_OPTIONS,
  TASK_PRIORITIES,
  TASK_SLA_TIERS,
  TASK_TYPES,
  TaskPriority,
  TaskSlaTier,
  TaskType,
  suggestSlaTier,
} from '../../types/task';
import { Opportunity } from '../../types/opportunity';
import { useAddTask, useSetTaskWatchers } from '../../hooks/useTasks';
import { useContacts, useUsers } from '../../hooks/useContacts';
import { useAllOpportunities, usePipelines } from '../../hooks/useOpportunities';
import { useAuth } from '../../context/AuthContext';
import { toTitleCase } from '../../utils/text';
import ContactPicker from '../pipeline/ContactPicker';
import CompanyPicker from '../contacts/CompanyPicker';
import { startDm, sendMessage } from '../../api/chat';

interface Props {
  open: boolean;
  defaultContactId?: number;
  defaultAccountId?: number;
  defaultCompanyName?: string;
  defaultOpportunity?: Opportunity | null;
  onClose: () => void;
}

const EMPTY = {
  subject: '',
  body: '',
  contact_id: '',
  contact_name: '',
  account_id: '',
  account_name: '',
  assigned_user: '',
  priority: 'Medium' as TaskPriority,
  date: '',
  time: '09:00',
  task_type: '' as TaskType | '',
  opportunity_id: '',
  sla_tier: 'Standard' as TaskSlaTier,
  watcherIds: [] as number[],
  is_private: false,
};

// Accepts either an ISO timestamp or a plain Date and reads its LOCAL
// calendar date. `iso.slice(0, 10)` — the previous approach — reads the
// UTC calendar date instead: for any timezone ahead of UTC (e.g. UTC+8),
// local midnight on a given day is still the *previous* day in UTC.
function toDateInput(value: string | Date) {
  const d = typeof value === 'string' ? new Date(value) : value;
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
function combineDateTime(date: string, time: string): string | null {
  if (!date) return null;
  return new Date(`${date}T${time || '09:00'}`).toISOString();
}

export default function TaskFormModal({
  open,
  defaultContactId,
  defaultAccountId,
  defaultCompanyName,
  defaultOpportunity,
  onClose,
}: Props) {
  const { user } = useAuth();
  const { data: users = [] } = useUsers();
  const { data: contacts = [] } = useContacts();
  const { data: pipelines = [] } = usePipelines();
  const pipelineIds = useMemo(() => pipelines.map((p) => p.id), [pipelines]);
  const { data: allDeals = [] } = useAllOpportunities(pipelineIds);

  const [form, setForm] = useState(EMPTY);
  const [error, setError] = useState<string | null>(null);
  const [sendReminder, setSendReminder] = useState(false);
  const [reminderMinutes, setReminderMinutes] = useState(30);
  const [watcherPickerOpen, setWatcherPickerOpen] = useState(false);
  const addTask = useAddTask();
  const setWatchers = useSetTaskWatchers();

  const isSaving = addTask.isPending;

  useEffect(() => {
    if (!open) return;

    if (defaultOpportunity) {
      setForm({
        ...EMPTY,
        contact_id: defaultOpportunity.contact_id ? String(defaultOpportunity.contact_id) : '',
        contact_name: defaultOpportunity.contact_name ?? '',
        account_id: defaultOpportunity.account_id ? String(defaultOpportunity.account_id) : '',
        account_name: defaultOpportunity.company_name ?? '',
        opportunity_id: String(defaultOpportunity.id),
        assigned_user: defaultOpportunity.assigned_user ? String(defaultOpportunity.assigned_user) : user ? String(user.id) : '',
        date: toDateInput(new Date()),
        sla_tier: suggestSlaTier(defaultOpportunity.deal_value),
      });
    } else {
      const defaultContact = defaultContactId ? contacts.find((c) => c.id === defaultContactId) : undefined;
      setForm({
        ...EMPTY,
        contact_id: defaultContactId ? String(defaultContactId) : '',
        contact_name: defaultContact ? `${defaultContact.first_name} ${defaultContact.last_name}`.trim() : '',
        account_id: defaultContact?.account_id
          ? String(defaultContact.account_id)
          : defaultAccountId
            ? String(defaultAccountId)
            : '',
        account_name: defaultContact?.company_name ?? defaultCompanyName ?? '',
        assigned_user: user ? String(user.id) : '',
        date: toDateInput(new Date()),
      });
    }
    setError(null);
    setSendReminder(false);
    setReminderMinutes(30);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, defaultContactId, defaultAccountId, defaultCompanyName, defaultOpportunity, user]);

  const contactDeals = useMemo(
    () => (form.contact_id ? allDeals.filter((d) => d.contact_id === Number(form.contact_id)) : []),
    [allDeals, form.contact_id]
  );

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
      account_id: matched?.account_id ? String(matched.account_id) : f.account_id,
      account_name: matched?.company_name ?? f.account_name,
      opportunity_id: id !== (f.contact_id ? Number(f.contact_id) : null) ? '' : f.opportunity_id,
    }));
  }

  function handleDealChange(dealId: string) {
    const deal = allDeals.find((d) => String(d.id) === dealId);
    setForm((f) => ({ ...f, opportunity_id: dealId, sla_tier: deal ? suggestSlaTier(deal.deal_value) : f.sla_tier }));
  }

  function toggleWatcher(id: number) {
    setForm((f) => ({
      ...f,
      watcherIds: f.watcherIds.includes(id) ? f.watcherIds.filter((w) => w !== id) : [...f.watcherIds, id],
    }));
  }

  // Fire-and-forget — a DM failure shouldn't block the task from being
  // created, so this never surfaces into the form's error state.
  async function sendTaskReminder(recipientId: number, taskId: number, subject: string, dueAt: string | null, label: string) {
    try {
      const dueText = dueAt
        ? new Date(dueAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
        : 'no due date';
      const { id: conversationId } = await startDm(recipientId);
      await sendMessage(conversationId, `${label}: "[[ref:task:${taskId}:-:${subject}]]" — due ${dueText}`);
    } catch (err) {
      console.error('Failed to send task reminder DM:', err);
    }
  }

  function buildPayload() {
    return {
      subject: form.subject,
      body: form.body || undefined,
      contact_id: form.contact_id ? Number(form.contact_id) : null,
      account_id: form.account_id ? Number(form.account_id) : null,
      opportunity_id: form.opportunity_id ? Number(form.opportunity_id) : null,
      user_id: form.assigned_user ? Number(form.assigned_user) : null,
      due_at: combineDateTime(form.date, form.time),
      type: 'task' as const,
      priority: form.priority,
      task_type: form.task_type || null,
      sla_tier: form.sla_tier,
      is_private: form.is_private,
      reminder_minutes_before: sendReminder ? reminderMinutes : null,
    };
  }

  function afterCreate(newTaskId: number | undefined) {
    const assignedUserId = form.assigned_user ? Number(form.assigned_user) : null;
    if (sendReminder && newTaskId) {
      const dueAt = buildPayload().due_at;
      // Owner and every watcher — "the owner and user linked to the task".
      if (assignedUserId && assignedUserId !== user?.id) {
        sendTaskReminder(assignedUserId, newTaskId, form.subject, dueAt, 'New task assigned');
      }
      form.watcherIds
        .filter((id) => id !== user?.id && id !== assignedUserId)
        .forEach((id) => sendTaskReminder(id, newTaskId, form.subject, dueAt, "You're linked to a new task"));
    }
    if (newTaskId && form.watcherIds.length > 0) {
      setWatchers.mutate({ taskId: newTaskId, watcherIds: form.watcherIds });
    }
  }

  function handleSubmit(e: FormEvent, createAnother: boolean) {
    e.preventDefault();
    setError(null);

    addTask.mutate(buildPayload(), {
      onSuccess: (result) => {
        afterCreate(result?.id);
        if (createAnother) {
          setForm((f) => ({ ...EMPTY, assigned_user: f.assigned_user, sla_tier: 'Standard' }));
          setSendReminder(false);
        } else {
          onClose();
        }
      },
      onError: (err) => setError(err instanceof Error ? err.message : 'Failed to add task.'),
    });
  }

  const inputClass =
    'w-full px-3 py-1.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--theme-accent)]';

  return (
    <div className="fixed inset-0 bg-slate-900/70 z-[100] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-slate-800">Create Task</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <i className="fa-solid fa-xmark" />
          </button>
        </div>

        <form onSubmit={(e) => handleSubmit(e, false)} className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Task Subject *</label>
            <input
              required
              autoFocus
              value={form.subject}
              onChange={(e) => update('subject', e.target.value)}
              placeholder="Follow up on Q3 Renewal Terms"
              className={inputClass}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Task Type</label>
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
              <label className="block text-xs font-medium text-slate-600 mb-1">Due Date</label>
              <input
                required
                type="date"
                value={form.date}
                onChange={(e) => update('date', e.target.value)}
                className={inputClass}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Due Time</label>
              <TimeInput label="Due time" value={form.time} onChange={(v) => update('time', v)} />
            </div>
          </div>

          <div className="border border-slate-200 rounded-xl p-3 space-y-3">
            <h4 className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              Associated To (Object Linkage)
            </h4>
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
              <label className="block text-xs font-medium text-slate-600 mb-1">Related Deal</label>
              <select
                value={form.opportunity_id}
                onChange={(e) => handleDealChange(e.target.value)}
                disabled={!form.contact_id}
                className={`${inputClass} disabled:bg-slate-50 disabled:text-slate-400`}
              >
                <option value="">None</option>
                {contactDeals.map((d) => (
                  <option key={d.id} value={d.id}>
                    {toTitleCase(d.name)}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="border border-slate-200 rounded-xl p-3 space-y-3">
            <h4 className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Assignment &amp; SLA</h4>
            <div className="grid grid-cols-2 gap-3">
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
                <label className="block text-xs font-medium text-slate-600 mb-1">SLA Tier</label>
                <select
                  value={form.sla_tier}
                  onChange={(e) => update('sla_tier', e.target.value as TaskSlaTier)}
                  className={inputClass}
                >
                  {TASK_SLA_TIERS.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Collaborators / Watchers</label>
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
                    Add Teammate
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

          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Description</label>
            <textarea
              value={form.body}
              onChange={(e) => update('body', e.target.value)}
              rows={3}
              placeholder="Review redlines on section 4.2 with legal team prior to call."
              className={`${inputClass} resize-none`}
            />
          </div>

          <div className="flex items-center flex-wrap gap-4 pt-1">
            <label className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer">
              <input
                type="checkbox"
                checked={sendReminder}
                onChange={(e) => setSendReminder(e.target.checked)}
                className="rounded border-slate-300 text-[var(--theme-accent)] focus:ring-[var(--theme-accent)]"
              />
              Reminder:
              <select
                value={reminderMinutes}
                onChange={(e) => setReminderMinutes(Number(e.target.value))}
                disabled={!sendReminder}
                className="px-2 py-1 text-xs border border-slate-200 rounded-lg disabled:bg-slate-50 disabled:text-slate-400"
              >
                {REMINDER_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer">
              <input
                type="checkbox"
                checked={form.is_private}
                onChange={(e) => update('is_private', e.target.checked)}
                className="rounded border-slate-300 text-[var(--theme-accent)] focus:ring-[var(--theme-accent)]"
              />
              Mark as Private
            </label>
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
              type="button"
              disabled={isSaving}
              onClick={(e) => handleSubmit(e, true)}
              className="px-4 py-2 text-sm font-semibold border border-slate-200 hover:bg-slate-50 text-slate-700 disabled:opacity-60 rounded-lg"
            >
              Save &amp; Create Another
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="px-4 py-2 text-sm font-semibold bg-[var(--theme-accent)] hover:bg-[var(--theme-accent-hover)] disabled:opacity-60 text-white rounded-lg"
            >
              {isSaving ? 'Saving...' : 'Save Task'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
