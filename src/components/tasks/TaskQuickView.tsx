import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Task, taskDisplayId, taskKanbanStatus, TaskStatus, TASK_STATUSES, TASK_STATUS_LABELS, TASK_PRIORITIES, TaskPriority } from '../../types/task';
import { toTitleCase } from '../../utils/text';
import { useAuth } from '../../context/AuthContext';
import { useAddNote, useNotes } from '../../hooks/useNotes';
import { useSetTaskSubtasks, useUpdateTask } from '../../hooks/useTasks';
import { useUsers } from '../../hooks/useContacts';
import { DEFAULT_USER_COLOR, hexToRgba } from '../../utils/userColor';
import { startDm, sendMessage } from '../../api/chat';

interface Props {
  task: Task | null;
  canEdit: boolean;
  onClose: () => void;
  onEdit: (task: Task) => void;
  onOpenFullDetails: (task: Task) => void;
}

function currency(n?: number | null) {
  if (n === undefined || n === null) return '--';
  return `$${n.toLocaleString(undefined, { minimumFractionDigits: 2 })}`;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-[11px] font-medium text-slate-500 mb-0.5">{label}</label>
      {children}
    </div>
  );
}

export default function TaskQuickView({ task, canEdit, onClose, onEdit, onOpenFullDetails }: Props) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: users = [] } = useUsers();
  const updateTask = useUpdateTask();
  const setSubtasks = useSetTaskSubtasks();
  const { data: notes = [] } = useNotes('task', task?.id ?? null);
  const addNote = useAddNote('task', task?.id ?? null);

  const [newSubtask, setNewSubtask] = useState('');
  const [comment, setComment] = useState('');
  const [reassignOpen, setReassignOpen] = useState(false);

  const subtasks = useMemo(() => task?.subtasks ?? [], [task]);

  if (!task) return null;

  const ownerColor = task.assigned_user_name ? task.assigned_user_color || DEFAULT_USER_COLOR : undefined;

  function persistSubtasks(next: { title: string; is_completed: boolean }[]) {
    setSubtasks.mutate({ taskId: task!.id, subtasks: next });
  }

  function handleAddSubtask() {
    if (!newSubtask.trim()) return;
    persistSubtasks([...subtasks.map((s) => ({ title: s.title, is_completed: s.is_completed })), { title: newSubtask.trim(), is_completed: false }]);
    setNewSubtask('');
  }

  function toggleSubtask(id: number) {
    persistSubtasks(
      subtasks.map((s) => ({ title: s.title, is_completed: s.id === id ? !s.is_completed : s.is_completed }))
    );
  }

  function handleComplete() {
    updateTask.mutate({ id: task!.id, payload: { status: 'completed', is_completed: true, completed_at: new Date().toISOString() } });
  }

  function handleStatusChange(status: TaskStatus) {
    updateTask.mutate({
      id: task!.id,
      payload: { status, is_completed: status === 'completed', completed_at: status === 'completed' ? new Date().toISOString() : null },
    });
  }

  function handlePriorityChange(priority: TaskPriority) {
    updateTask.mutate({ id: task!.id, payload: { priority } });
  }

  function handleSnooze() {
    if (!task!.due_at) return;
    const next = new Date(task!.due_at);
    next.setHours(next.getHours() + 24);
    updateTask.mutate({ id: task!.id, payload: { due_at: next.toISOString() } });
  }

  async function handleReassign(newUserId: number) {
    setReassignOpen(false);
    updateTask.mutate({ id: task!.id, payload: { user_id: newUserId } });
    if (newUserId !== user?.id) {
      try {
        const { id: conversationId } = await startDm(newUserId);
        await sendMessage(conversationId, `Task reassigned to you: "${task!.subject}"`);
      } catch (err) {
        console.error('Failed to send reassignment DM:', err);
      }
    }
  }

  function handleLogCall() {
    const text = prompt('Log call notes:');
    if (!text?.trim()) return;
    addNote.mutate({ body: `📞 Call: ${text.trim()}`, requesterId: user?.id });
  }

  function handleAddComment() {
    if (!comment.trim()) return;
    addNote.mutate({ body: comment.trim(), requesterId: user?.id }, { onSuccess: () => setComment('') });
  }

  function goToContact() {
    if (!task!.contact_id) return;
    onClose();
    navigate(`/contacts?contactId=${task!.contact_id}`);
  }

  function goToAccount() {
    const accountId = task!.account_id ?? task!.company_id;
    if (!accountId) return;
    onClose();
    navigate(`/companies?companyId=${accountId}`);
  }

  function goToDeal() {
    if (!task!.opportunity_id) return;
    onClose();
    const params = new URLSearchParams();
    if (task!.opportunity_pipeline_id) params.set('pipeline', String(task!.opportunity_pipeline_id));
    params.set('highlight', String(task!.opportunity_id));
    navigate(`/pipeline?${params.toString()}`);
  }

  return (
    <>
      <div className="fixed inset-0 bg-slate-900/40 z-[95] animate-in fade-in duration-200" onClick={onClose} />
      <div className="fixed top-0 right-0 h-full w-full max-w-md bg-white shadow-2xl z-[100] flex flex-col animate-in slide-in-from-right duration-300">
        <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100 shrink-0">
          <h3 className="text-sm font-bold text-slate-800">Task {taskDisplayId(task)}</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <i className="fa-solid fa-xmark" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          <div className="px-5 py-4 border-b border-slate-100 space-y-2">
            <p className={`text-sm font-bold ${task.is_completed ? 'text-slate-400 line-through' : 'text-slate-800'}`}>
              {task.subject}
            </p>
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-1.5 text-xs text-slate-500">
                Status:
                <select
                  value={taskKanbanStatus(task)}
                  onChange={(e) => handleStatusChange(e.target.value as TaskStatus)}
                  disabled={!canEdit}
                  className="px-1.5 py-0.5 text-xs border border-slate-200 rounded-md disabled:bg-slate-50"
                >
                  {TASK_STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {TASK_STATUS_LABELS[s]}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex items-center gap-1.5 text-xs text-slate-500">
                Priority:
                <select
                  value={task.priority ?? 'Medium'}
                  onChange={(e) => handlePriorityChange(e.target.value as TaskPriority)}
                  disabled={!canEdit}
                  className="px-1.5 py-0.5 text-xs border border-slate-200 rounded-md disabled:bg-slate-50"
                >
                  {TASK_PRIORITIES.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </div>

          {canEdit && (
            <div className="px-5 py-4 border-b border-slate-100">
              <h4 className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2">Quick Actions</h4>
              <div className="flex flex-wrap gap-1.5">
                {!task.is_completed && (
                  <button
                    onClick={handleComplete}
                    className="px-2.5 py-1 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg"
                  >
                    Mark Complete
                  </button>
                )}
                <button
                  onClick={handleLogCall}
                  className="px-2.5 py-1 text-xs font-semibold border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-lg"
                >
                  Log Call
                </button>
                <div className="relative">
                  <button
                    onClick={() => setReassignOpen((v) => !v)}
                    className="px-2.5 py-1 text-xs font-semibold border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-lg"
                  >
                    Reassign
                  </button>
                  {reassignOpen && (
                    <>
                      <div className="fixed inset-0 z-10" onClick={() => setReassignOpen(false)} />
                      <div className="absolute top-full mt-1 left-0 w-40 bg-white border border-slate-200 rounded-lg shadow-lg z-20 py-1 max-h-40 overflow-y-auto">
                        {users.map((u) => (
                          <button
                            key={u.id}
                            onClick={() => handleReassign(u.id)}
                            className="w-full text-left px-2.5 py-1.5 text-xs hover:bg-slate-50 text-slate-700"
                          >
                            {toTitleCase(u.name)}
                          </button>
                        ))}
                      </div>
                    </>
                  )}
                </div>
                {task.due_at && (
                  <button
                    onClick={handleSnooze}
                    className="px-2.5 py-1 text-xs font-semibold border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-lg"
                  >
                    Snooze 24h
                  </button>
                )}
              </div>
            </div>
          )}

          <div className="px-5 py-4 border-b border-slate-100 space-y-3">
            <h4 className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Details</h4>
            {task.due_at && (
              <Field label="Due Date">
                <p className="text-sm text-slate-700">
                  {new Date(task.due_at).toLocaleDateString(undefined, { month: 'short', day: '2-digit', year: 'numeric' })} @{' '}
                  {new Date(task.due_at).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}
                </p>
              </Field>
            )}
            <Field label="Owner">
              {task.assigned_user_name ? (
                <span
                  className="inline-flex items-center gap-1.5 px-2 py-0.5 text-xs font-medium rounded-full"
                  style={{ backgroundColor: hexToRgba(ownerColor!, 0.14), color: ownerColor }}
                >
                  <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: ownerColor }} />
                  {toTitleCase(task.assigned_user_name)}
                </span>
              ) : (
                <p className="text-sm text-slate-700">Unassigned</p>
              )}
            </Field>
            {(task.account_name || task.company_name) && (
              <Field label="Account">
                <button onClick={goToAccount} className="text-sm text-indigo-600 hover:text-indigo-700 hover:underline text-left block">
                  {toTitleCase(task.account_name || task.company_name)}
                </button>
              </Field>
            )}
            {task.opportunity_name && (
              <Field label="Deal">
                <button onClick={goToDeal} className="text-sm text-indigo-600 hover:text-indigo-700 hover:underline text-left block">
                  {task.opportunity_name} ({currency(task.opportunity_value)})
                </button>
              </Field>
            )}
            {task.contact_name && (
              <Field label="Contact">
                <button onClick={goToContact} className="text-sm text-indigo-600 hover:text-indigo-700 hover:underline text-left block">
                  {toTitleCase(task.contact_name)}
                  {task.contact_email ? ` (${task.contact_email})` : ''}
                </button>
              </Field>
            )}
          </div>

          <div className="px-5 py-4 border-b border-slate-100 space-y-2">
            <h4 className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              Subtasks ({task.subtask_completed ?? 0}/{task.subtask_total ?? 0})
            </h4>
            <div className="space-y-1">
              {subtasks.map((s) => (
                <label key={s.id} className="flex items-center gap-2 text-sm cursor-pointer">
                  <input
                    type="checkbox"
                    checked={s.is_completed}
                    disabled={!canEdit}
                    onChange={() => toggleSubtask(s.id)}
                    className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  <span className={s.is_completed ? 'text-slate-400 line-through' : 'text-slate-700'}>{s.title}</span>
                </label>
              ))}
            </div>
            {canEdit && (
              <div className="flex gap-1.5 pt-1">
                <input
                  value={newSubtask}
                  onChange={(e) => setNewSubtask(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddSubtask()}
                  placeholder="Add subtask..."
                  className="flex-1 px-2 py-1 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
                <button onClick={handleAddSubtask} className="text-xs font-semibold text-indigo-600 hover:underline px-1">
                  + Add
                </button>
              </div>
            )}
          </div>

          <div className="px-5 py-4 space-y-3">
            <h4 className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Activity & Comments</h4>
            <div className="flex gap-1.5">
              <input
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddComment()}
                placeholder="Add a comment..."
                className="flex-1 px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
              <button onClick={handleAddComment} className="text-xs font-semibold text-indigo-600 hover:underline px-1 shrink-0">
                Post
              </button>
            </div>
            <div className="space-y-2">
              {notes.map((n) => (
                <div key={n.id} className="text-xs">
                  <span className="font-semibold text-slate-700">{n.created_by_name ? toTitleCase(n.created_by_name) : 'Unknown'}</span>
                  <span className="text-slate-400"> — {new Date(n.created_at).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}</span>
                  <p className="text-slate-600 whitespace-pre-wrap mt-0.5">{n.body}</p>
                </div>
              ))}
              {notes.length === 0 && <p className="text-xs text-slate-400 italic">No comments yet.</p>}
            </div>
          </div>
        </div>

        <div className="px-5 py-3 border-t border-slate-100 shrink-0 space-y-2">
          {canEdit && (
            <button
              onClick={() => onEdit(task)}
              className="w-full border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold py-2 rounded-lg"
            >
              Edit Task
            </button>
          )}
          <button
            onClick={() => onOpenFullDetails(task)}
            className="w-full text-indigo-600 hover:text-indigo-700 text-xs font-semibold py-1"
          >
            Open Full Page Details
          </button>
        </div>
      </div>
    </>
  );
}
