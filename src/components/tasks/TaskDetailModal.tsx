import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Task, TaskStatus, taskDisplayId, taskKanbanStatus } from '../../types/task';
import { toTitleCase } from '../../utils/text';
import { useNotes, useAddNote } from '../../hooks/useNotes';
import { startDm, sendMessage } from '../../api/chat';
import { DEFAULT_USER_COLOR, hexToRgba } from '../../utils/userColor';
import {
  useAddTask,
  useArchiveTasks,
  useDeleteTasks,
  useSetTaskAttachments,
  useSetTaskSubtasks,
  useSetTaskWatchers,
  useUpdateTask,
} from '../../hooks/useTasks';
import { useTaskStatuses } from '../../hooks/useTaskStatuses';
import { useUsers } from '../../hooks/useContacts';
import ConfirmDialog from '../ConfirmDialog';

interface Props {
  task: Task | null;
  isAdmin: boolean;
  currentUserId?: number;
  onClose: () => void;
  onEdit: (task: Task) => void;
}

function currency(n?: number | null) {
  if (n === undefined || n === null) return '--';
  return `$${n.toLocaleString(undefined, { minimumFractionDigits: 2 })}`;
}

function formatDateTime(value?: string | null) {
  if (!value) return '--';
  return `${new Date(value).toLocaleDateString(undefined, { month: 'short', day: '2-digit', year: 'numeric' })}, ${new Date(
    value
  ).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}`;
}

export default function TaskDetailModal({ task, isAdmin, currentUserId, onClose, onEdit }: Props) {
  const navigate = useNavigate();
  const { data: users = [] } = useUsers();
  const { data: taskStatuses = [] } = useTaskStatuses();
  const { data: notes = [] } = useNotes('task', task?.id ?? null);
  const addNote = useAddNote('task', task?.id ?? null);
  const updateTask = useUpdateTask();
  const addTask = useAddTask();
  const deleteTasks = useDeleteTasks();
  const archiveTasks = useArchiveTasks();
  const setSubtasks = useSetTaskSubtasks();
  const setAttachments = useSetTaskAttachments();
  const setWatchers = useSetTaskWatchers();

  const [comment, setComment] = useState('');
  const [reassignOpen, setReassignOpen] = useState(false);
  const [watcherPickerOpen, setWatcherPickerOpen] = useState(false);
  const [newSubtask, setNewSubtask] = useState('');
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [archiveConfirmOpen, setArchiveConfirmOpen] = useState(false);
  const [attachmentFormOpen, setAttachmentFormOpen] = useState(false);
  const [attachmentName, setAttachmentName] = useState('');
  const [attachmentUrl, setAttachmentUrl] = useState('');
  const [logCallOpen, setLogCallOpen] = useState(false);
  const [callNotes, setCallNotes] = useState('');

  const subtasks = useMemo(() => task?.subtasks ?? [], [task]);
  const attachments = useMemo(() => task?.attachments ?? [], [task]);
  const watchers = useMemo(() => task?.watchers ?? [], [task]);

  if (!task) return null;

  const canEdit = isAdmin || task.user_id === currentUserId;
  const canArchive = canEdit; // owner or admin
  const canDelete = isAdmin;
  const currentStageIndex = taskStatuses.findIndex((s) => s.name === taskKanbanStatus(task));

  function persistSubtasks(next: { title: string; is_completed: boolean }[]) {
    setSubtasks.mutate({ taskId: task!.id, subtasks: next, requesterId: currentUserId });
  }

  function handleAddSubtask() {
    if (!newSubtask.trim()) return;
    persistSubtasks([
      ...subtasks.map((s) => ({ title: s.title, is_completed: s.is_completed })),
      { title: newSubtask.trim(), is_completed: false },
    ]);
    setNewSubtask('');
  }

  function toggleSubtask(id: number) {
    persistSubtasks(subtasks.map((s) => ({ title: s.title, is_completed: s.id === id ? !s.is_completed : s.is_completed })));
  }

  function handleAddAttachment() {
    const url = attachmentUrl.trim();
    if (!url) return;
    const name = attachmentName.trim() || url.split('/').pop() || 'Attachment';
    setAttachments.mutate({
      taskId: task!.id,
      attachments: [...attachments.map((a) => ({ name: a.name, url: a.url })), { name, url }],
    });
    setAttachmentName('');
    setAttachmentUrl('');
    setAttachmentFormOpen(false);
  }

  function handleStatusStep(status: TaskStatus) {
    if (!canEdit) return;
    const isCompletedStatus = taskStatuses.find((s) => s.name === status)?.is_completed_status ?? false;
    updateTask.mutate({
      id: task!.id,
      payload: { status, is_completed: isCompletedStatus, completed_at: isCompletedStatus ? new Date().toISOString() : null },
    });
  }

  function handleComplete() {
    const completedStatus = taskStatuses.find((s) => s.is_completed_status);
    if (completedStatus) handleStatusStep(completedStatus.name);
  }

  async function handleReassign(userId: number) {
    setReassignOpen(false);
    updateTask.mutate({ id: task!.id, payload: { user_id: userId } });
    if (userId !== currentUserId) {
      try {
        const { id: conversationId } = await startDm(userId);
        await sendMessage(conversationId, `Task reassigned to you: "[[ref:task:${task!.id}:-:${task!.subject}]]"`);
      } catch (err) {
        console.error('Failed to send reassignment DM:', err);
      }
    }
  }

  function toggleWatcher(id: number) {
    const next = watchers.some((w) => w.id === id) ? watchers.filter((w) => w.id !== id).map((w) => w.id) : [...watchers.map((w) => w.id), id];
    setWatchers.mutate({ taskId: task!.id, watcherIds: next });
  }

  function handleClone() {
    addTask.mutate({
      subject: `${task!.subject} (Copy)`,
      body: task!.body,
      contact_id: task!.contact_id,
      account_id: task!.account_id,
      opportunity_id: task!.opportunity_id,
      user_id: task!.user_id,
      due_at: task!.due_at,
      type: 'task',
      priority: task!.priority,
      task_type: task!.task_type,
      sla_tier: task!.sla_tier,
    });
  }

  function handleDelete() {
    deleteTasks.mutate([task!.id], { onSuccess: onClose });
  }

  function handleArchive() {
    archiveTasks.mutate([task!.id], { onSuccess: onClose });
  }

  function handleAddComment() {
    if (!comment.trim()) return;
    addNote.mutate({ body: comment.trim(), requesterId: currentUserId }, { onSuccess: () => setComment('') });
  }

  function handleLogCall() {
    if (!callNotes.trim()) return;
    addNote.mutate(
      { body: `📞 Call: ${callNotes.trim()}`, requesterId: currentUserId },
      { onSuccess: () => { setCallNotes(''); setLogCallOpen(false); } }
    );
  }

  function handleSnooze() {
    if (!task!.due_at) return;
    const next = new Date(task!.due_at);
    next.setHours(next.getHours() + 24);
    updateTask.mutate({ id: task!.id, payload: { due_at: next.toISOString() } });
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

  const activity = [
    ...notes.map((n) => ({ date: n.created_at, label: `${n.created_by_name ? toTitleCase(n.created_by_name) : 'Unknown'}: ${n.body}` })),
    ...(task.created_at
      ? [{ date: task.created_at, label: `Task created${task.assigned_user_name ? ` and assigned to ${toTitleCase(task.assigned_user_name)}` : ''}.` }]
      : []),
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[110] flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-6 py-4 border-b border-slate-200 shrink-0">
          <div className="flex items-start justify-between">
            <div className="min-w-0">
              <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide">
                Tasks / {taskDisplayId(task)}
              </p>
              <h2 className="text-lg font-bold text-slate-800 truncate">{toTitleCase(task.subject)}</h2>
            </div>
            <button onClick={onClose} className="text-slate-400 hover:text-slate-600 shrink-0">
              <i className="fa-solid fa-xmark text-lg" />
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-2 mt-3">
            {canEdit && !task.is_completed && (
              <button
                onClick={handleComplete}
                className="px-3 py-1.5 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg"
              >
                Complete Task
              </button>
            )}
            {canEdit && (
              <button
                onClick={() => onEdit(task)}
                className="px-3 py-1.5 text-xs font-semibold border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-lg"
              >
                Edit
              </button>
            )}
            {canEdit && (
              <button
                onClick={() => setLogCallOpen((v) => !v)}
                className="px-3 py-1.5 text-xs font-semibold border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-lg"
              >
                Log Call
              </button>
            )}
            {canEdit && task.due_at && (
              <button
                onClick={handleSnooze}
                className="px-3 py-1.5 text-xs font-semibold border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-lg"
              >
                Snooze 24h
              </button>
            )}
            {canEdit && (
              <div className="relative">
                <button
                  onClick={() => setReassignOpen((v) => !v)}
                  className="px-3 py-1.5 text-xs font-semibold border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-lg"
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
            )}
            <button
              onClick={handleClone}
              className="px-3 py-1.5 text-xs font-semibold border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-lg"
            >
              Clone
            </button>
            {canArchive && (
              <button
                onClick={() => setArchiveConfirmOpen(true)}
                className="px-3 py-1.5 text-xs font-semibold border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-lg"
              >
                Archive
              </button>
            )}
            {canDelete && (
              <button
                onClick={() => setDeleteConfirmOpen(true)}
                className="px-3 py-1.5 text-xs font-semibold border border-rose-100 hover:bg-rose-50 text-rose-600 rounded-lg"
              >
                Delete
              </button>
            )}
          </div>

          {logCallOpen && (
            <div className="mt-3 space-y-1.5 max-w-md">
              <textarea
                autoFocus
                value={callNotes}
                onChange={(e) => setCallNotes(e.target.value)}
                placeholder="Call notes..."
                rows={2}
                className="w-full px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg resize-none focus:outline-none focus:ring-1 focus:ring-[var(--theme-accent)]"
              />
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => { setLogCallOpen(false); setCallNotes(''); }}
                  className="text-[11px] font-medium text-slate-500 hover:text-slate-700"
                >
                  Cancel
                </button>
                <button
                  onClick={handleLogCall}
                  disabled={!callNotes.trim() || addNote.isPending}
                  className="text-[11px] font-semibold text-[var(--theme-accent)] hover:text-[var(--theme-accent-hover)] disabled:opacity-50"
                >
                  Save
                </button>
              </div>
            </div>
          )}

          <div className="flex items-center gap-1 mt-4 overflow-x-auto">
            {taskStatuses.map((s, i) => (
              <div key={s.id} className="flex items-center">
                <button
                  onClick={() => handleStatusStep(s.name)}
                  disabled={!canEdit}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold whitespace-nowrap ${
                    i === currentStageIndex
                      ? 'bg-indigo-600 text-white'
                      : i < currentStageIndex
                        ? 'bg-emerald-100 text-emerald-700'
                        : 'bg-slate-100 text-slate-500'
                  } ${canEdit ? 'cursor-pointer' : 'cursor-default'}`}
                >
                  <i className={`fa-solid ${i <= currentStageIndex ? 'fa-circle-check' : 'fa-circle'} text-[9px]`} />
                  {s.name}
                </button>
                {i < taskStatuses.length - 1 && <i className="fa-solid fa-chevron-right text-[9px] text-slate-300 mx-1.5" />}
              </div>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto grid grid-cols-1 md:grid-cols-[65%_35%]">
          {/* Left column */}
          <div className="p-6 space-y-6 md:border-r border-slate-100">
            <div>
              <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">Description</h3>
              <p className="text-sm text-slate-700 whitespace-pre-wrap">{task.body || '--'}</p>
            </div>

            <div>
              <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">
                Subtasks ({task.subtask_completed ?? 0}/{task.subtask_total ?? 0})
              </h3>
              <div className="space-y-1.5">
                {subtasks.map((s) => (
                  <label key={s.id} className="flex items-center gap-2 text-sm cursor-pointer">
                    <input
                      type="checkbox"
                      checked={s.is_completed}
                      disabled={!canEdit}
                      onChange={() => toggleSubtask(s.id)}
                      className="rounded border-slate-300 text-indigo-600 focus:ring-[var(--theme-accent)]"
                    />
                    <span className={s.is_completed ? 'text-slate-400 line-through' : 'text-slate-700'}>{s.title}</span>
                  </label>
                ))}
              </div>
              {canEdit && (
                <div className="flex gap-1.5 pt-2">
                  <input
                    value={newSubtask}
                    onChange={(e) => setNewSubtask(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAddSubtask()}
                    placeholder="Add subtask..."
                    className="flex-1 px-2 py-1 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[var(--theme-accent)]"
                  />
                  <button onClick={handleAddSubtask} className="text-xs font-semibold text-indigo-600 hover:underline px-1">
                    + Add
                  </button>
                </div>
              )}
            </div>

            <div>
              <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">Activity Feed &amp; Audit Trail</h3>
              <div className="flex gap-1.5 mb-3">
                <input
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddComment()}
                  placeholder="Add a comment or update..."
                  className="flex-1 px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[var(--theme-accent)]"
                />
                <button onClick={handleAddComment} className="text-xs font-semibold text-indigo-600 hover:underline px-1 shrink-0">
                  Post
                </button>
              </div>
              <div className="space-y-3">
                {activity.map((a, i) => (
                  <div key={i} className="text-xs">
                    <span className="text-slate-400">
                      {new Date(a.date).toLocaleDateString(undefined, { month: 'short', day: '2-digit' })},{' '}
                      {new Date(a.date).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}
                    </span>
                    <p className="text-slate-700 mt-0.5">{a.label}</p>
                  </div>
                ))}
                {activity.length === 0 && <p className="text-xs text-slate-400 italic">No activity recorded yet.</p>}
              </div>
            </div>
          </div>

          {/* Right column */}
          <div className="p-6 space-y-6 bg-slate-50/50">
            <div>
              <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">Associated Records</h3>
              <div className="space-y-1.5 text-sm">
                {(task.account_name || task.company_name) && (
                  <p>
                    <span className="text-slate-500">Account: </span>
                    <button onClick={goToAccount} className="text-indigo-600 hover:underline font-medium">
                      {toTitleCase(task.account_name || task.company_name)}
                    </button>
                  </p>
                )}
                {task.opportunity_name && (
                  <p>
                    <span className="text-slate-500">Deal: </span>
                    <button onClick={goToDeal} className="text-indigo-600 hover:underline font-medium">
                      {toTitleCase(task.opportunity_name)} ({currency(task.opportunity_value)})
                    </button>
                  </p>
                )}
                {task.contact_name && (
                  <p>
                    <span className="text-slate-500">Contact: </span>
                    <button onClick={goToContact} className="text-indigo-600 hover:underline font-medium">
                      {toTitleCase(task.contact_name)}
                    </button>
                  </p>
                )}
                {!task.account_name && !task.company_name && !task.opportunity_name && !task.contact_name && (
                  <p className="text-slate-400 italic">No linked records.</p>
                )}
              </div>
            </div>

            <div>
              <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">Task Metadata</h3>
              <div className="space-y-1.5 text-sm">
                <p className="flex items-center gap-1.5">
                  <span className="text-slate-500">Assigned To: </span>
                  {task.assigned_user_name ? (
                    <span
                      className="inline-flex items-center gap-1.5 px-2 py-0.5 text-xs font-medium rounded-full"
                      style={{
                        backgroundColor: hexToRgba(task.assigned_user_color || DEFAULT_USER_COLOR, 0.14),
                        color: task.assigned_user_color || DEFAULT_USER_COLOR,
                      }}
                    >
                      <span
                        className="w-1.5 h-1.5 rounded-full"
                        style={{ backgroundColor: task.assigned_user_color || DEFAULT_USER_COLOR }}
                      />
                      {toTitleCase(task.assigned_user_name)}
                    </span>
                  ) : (
                    <span className="font-medium text-slate-800">Unassigned</span>
                  )}
                </p>
                <p>
                  <span className="text-slate-500">Priority: </span>
                  <span className="font-medium text-slate-800">{task.priority ?? '--'}</span>
                </p>
                <p>
                  <span className="text-slate-500">Type: </span>
                  <span className="font-medium text-slate-800">{task.task_type ?? '--'}</span>
                </p>
                {task.sla_tier && (
                  <p>
                    <span className="text-slate-500">SLA Tier: </span>
                    <span className="font-medium text-slate-800">{task.sla_tier}</span>
                  </p>
                )}
                {task.due_at && (
                  <p>
                    <span className="text-slate-500">Due: </span>
                    <span className="font-medium text-slate-800">{formatDateTime(task.due_at)}</span>
                  </p>
                )}
                {task.created_at && (
                  <p>
                    <span className="text-slate-500">Created: </span>
                    <span className="font-medium text-slate-800">
                      {new Date(task.created_at).toLocaleDateString(undefined, { month: 'short', day: '2-digit' })}
                    </span>
                  </p>
                )}
                {task.edit_reason && (
                  <p>
                    <span className="text-slate-500">Last Edit Reason: </span>
                    <span className="font-medium text-slate-800">{task.edit_reason}</span>
                  </p>
                )}
              </div>
            </div>

            <div>
              <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">
                Attachments ({attachments.length})
              </h3>
              <div className="flex flex-wrap gap-1.5 mb-2">
                {attachments.map((a) => (
                  <a
                    key={a.id}
                    href={a.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 px-2 py-1 text-xs font-medium bg-white text-slate-600 border border-slate-200 rounded-full hover:border-indigo-300 hover:text-indigo-600"
                  >
                    <i className="fa-solid fa-paperclip text-[10px]" />
                    <span className="max-w-[160px] truncate">{a.name}</span>
                  </a>
                ))}
                {attachments.length === 0 && <p className="text-xs text-slate-400 italic">No attachments.</p>}
              </div>
              {canEdit && (
                attachmentFormOpen ? (
                  <div className="space-y-1.5">
                    <input
                      autoFocus
                      value={attachmentUrl}
                      onChange={(e) => setAttachmentUrl(e.target.value)}
                      placeholder="File URL"
                      className="w-full px-2 py-1 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[var(--theme-accent)]"
                    />
                    <input
                      value={attachmentName}
                      onChange={(e) => setAttachmentName(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleAddAttachment()}
                      placeholder="Display name (optional)"
                      className="w-full px-2 py-1 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[var(--theme-accent)]"
                    />
                    <div className="flex justify-end gap-3">
                      <button
                        onClick={() => {
                          setAttachmentFormOpen(false);
                          setAttachmentName('');
                          setAttachmentUrl('');
                        }}
                        className="text-[11px] font-medium text-slate-500 hover:text-slate-700"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleAddAttachment}
                        disabled={!attachmentUrl.trim()}
                        className="text-[11px] font-semibold text-[var(--theme-accent)] hover:text-[var(--theme-accent-hover)] disabled:opacity-50"
                      >
                        Add
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => setAttachmentFormOpen(true)}
                    className="text-xs font-semibold text-indigo-600 hover:underline"
                  >
                    + Upload File
                  </button>
                )
              )}
            </div>

            <div>
              <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">Watchers</h3>
              <div className="flex flex-wrap items-center gap-1.5">
                {watchers.map((w) => (
                  <span
                    key={w.id}
                    className="flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full bg-white border border-slate-200 text-slate-600"
                  >
                    {toTitleCase(w.name)}
                    {canEdit && (
                      <button onClick={() => toggleWatcher(w.id)} className="opacity-60 hover:opacity-100">
                        <i className="fa-solid fa-xmark text-[9px]" />
                      </button>
                    )}
                  </span>
                ))}
                {canEdit && (
                  <div className="relative">
                    <button
                      onClick={() => setWatcherPickerOpen((v) => !v)}
                      className="flex items-center gap-1 px-2 py-0.5 text-xs font-medium text-slate-500 border border-dashed border-slate-300 rounded-full hover:border-indigo-400 hover:text-indigo-600"
                    >
                      <i className="fa-solid fa-plus text-[9px]" />
                      Add
                    </button>
                    {watcherPickerOpen && (
                      <>
                        <div className="fixed inset-0 z-10" onClick={() => setWatcherPickerOpen(false)} />
                        <div className="absolute top-full mt-1 left-0 w-40 bg-white border border-slate-200 rounded-lg shadow-lg z-20 py-1 max-h-40 overflow-y-auto">
                          {users
                            .filter((u) => !watchers.some((w) => w.id === u.id))
                            .map((u) => (
                              <button
                                key={u.id}
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
                )}
                {watchers.length === 0 && !canEdit && <p className="text-xs text-slate-400 italic">No watchers.</p>}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* stopPropagation here — this modal's own backdrop closes on click,
          and without this a click landing on ConfirmDialog's backdrop/
          buttons would bubble up and close the task modal underneath it. */}
      <div onClick={(e) => e.stopPropagation()}>
        <ConfirmDialog
          open={deleteConfirmOpen}
          title="Permanently delete this task?"
          body={`"${task.subject}" and its subtasks, attachments, and comments will be permanently removed. This cannot be undone.`}
          confirmLabel="Delete"
          isSubmitting={deleteTasks.isPending}
          onConfirm={handleDelete}
          onCancel={() => setDeleteConfirmOpen(false)}
        />
        <ConfirmDialog
          open={archiveConfirmOpen}
          title="Archive this task?"
          body={`"${task.subject}" will be moved out of your active task list.`}
          confirmLabel="Archive"
          danger={false}
          isSubmitting={archiveTasks.isPending}
          onConfirm={handleArchive}
          onCancel={() => setArchiveConfirmOpen(false)}
        />
      </div>
    </div>
  );
}
