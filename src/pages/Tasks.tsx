import { useEffect, useMemo, useState } from 'react';
import { VisibilityState } from '@tanstack/react-table';
import { useSearchParams } from 'react-router-dom';
import { Task, TaskPriority, TaskStatus, taskStatus, TasksView } from '../types/task';
import { useAuth } from '../context/AuthContext';
import { useUsers } from '../hooks/useContacts';
import {
  useArchivedTasks,
  useArchiveTasks,
  useDeleteTasks,
  useMoveTaskStatus,
  useTasks,
  useToggleTaskComplete,
  useUpdateTask,
} from '../hooks/useTasks';
import { useTaskStatuses } from '../hooks/useTaskStatuses';
import { startDm, sendMessage } from '../api/chat';
import TasksStatsBar, { TaskStatFilter } from '../components/tasks/TasksStatsBar';
import TasksTabs from '../components/tasks/TasksTabs';
import TasksTable, { TasksColumnsMenu } from '../components/tasks/TasksTable';
import TasksKanbanBoard, { TaskColumnsManager } from '../components/tasks/TasksKanbanBoard';
import ArchivedTasksList from '../components/tasks/ArchivedTasksList';
import TasksBulkActionsMenu from '../components/tasks/TasksBulkActionsMenu';
import TaskFormModal from '../components/tasks/TaskFormModal';
import TaskEditModal from '../components/tasks/TaskEditModal';
import TaskQuickView from '../components/tasks/TaskQuickView';
import TaskDetailModal from '../components/tasks/TaskDetailModal';
import SearchToolbar from '../components/SearchToolbar';
import ConfirmDialog from '../components/ConfirmDialog';

type BoardView = 'list' | 'board';

function isOverdue(task: Task): boolean {
  return !task.is_completed && taskStatus(task) === 'Overdue';
}

function applyStatFilter(list: Task[], statFilter: TaskStatFilter | null): Task[] {
  if (!statFilter) return list;
  if (statFilter === 'open') return list.filter((t) => !t.is_completed);
  if (statFilter === 'dueToday') return list.filter((t) => taskStatus(t) === 'Due Today');
  if (statFilter === 'overdue') return list.filter(isOverdue);
  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);
  return list.filter((t) => t.is_completed && t.completed_at && new Date(t.completed_at) >= weekAgo);
}

export default function Tasks() {
  const { user, isAdmin } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();

  const [view, setView] = useState<TasksView>('all');
  const [boardView, setBoardView] = useState<BoardView>('board');
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
  const [visibleStatusIds, setVisibleStatusIds] = useState<Set<number>>(new Set());
  const [statusesInitialized, setStatusesInitialized] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [addOpen, setAddOpen] = useState(false);
  const [highlightTaskId, setHighlightTaskId] = useState<number | null>(null);
  // Store just the id and re-derive the live Task object from the query
  // data below — otherwise a subtask/attachment/watcher edit invalidates
  // ['tasks'] and refetches, but these modals would keep rendering the
  // stale snapshot object they were opened with instead of picking up the
  // change (matches Contacts.tsx's activeContact pattern).
  const [editingTaskId, setEditingTaskId] = useState<number | null>(null);
  const [quickViewTaskId, setQuickViewTaskId] = useState<number | null>(null);
  const [detailTaskId, setDetailTaskId] = useState<number | null>(null);

  // Additional narrowing on top of the All/Mine/Completed/Overdue/Archived
  // tabs, not a replacement for them.
  const [checkedUserIds, setCheckedUserIds] = useState<Set<number>>(new Set());
  const [usersInitialized, setUsersInitialized] = useState(false);
  const [priorityFilters, setPriorityFilters] = useState<Set<TaskPriority>>(new Set());
  const [statFilter, setStatFilter] = useState<TaskStatFilter | null>(null);
  const [deleteConfirmTask, setDeleteConfirmTask] = useState<Task | null>(null);
  const [bulkDeleteConfirmOpen, setBulkDeleteConfirmOpen] = useState(false);

  const { data: allTasks = [], isLoading } = useTasks();
  const { data: archivedTasks = [], isLoading: isLoadingArchived } = useArchivedTasks(view === 'archived');
  const { data: users = [] } = useUsers();
  const { data: taskStatuses = [] } = useTaskStatuses();
  const completedStatusName = taskStatuses.find((s) => s.is_completed_status)?.name ?? 'Completed';
  const deleteTasks = useDeleteTasks();
  const archiveTasks = useArchiveTasks();
  const toggleComplete = useToggleTaskComplete();
  const moveTaskStatus = useMoveTaskStatus();
  const updateTask = useUpdateTask();

  // Default to everyone checked once the team list loads — "All Members"
  // means unrestricted, not "hide everyone until you opt in".
  useEffect(() => {
    if (!usersInitialized && users.length > 0) {
      setCheckedUserIds(new Set(users.map((u) => u.id)));
      setUsersInitialized(true);
    }
  }, [users, usersInitialized]);

  // Default to every board column visible once the (admin-managed) status
  // list loads.
  useEffect(() => {
    if (!statusesInitialized && taskStatuses.length > 0) {
      setVisibleStatusIds(new Set(taskStatuses.map((s) => s.id)));
      setStatusesInitialized(true);
    }
  }, [taskStatuses, statusesInitialized]);

  // Deep link from Team Chat notifications — ?highlight=<taskId> switches to
  // the Kanban board and rings that card for a few seconds, once its data
  // has loaded. Same pattern as Pipeline.tsx's ?highlight= for deal cards.
  useEffect(() => {
    const param = searchParams.get('highlight');
    if (!param) return;
    const id = Number(param);
    if (!allTasks.some((t) => t.id === id)) return;
    setHighlightTaskId(id);
    setBoardView('board');
    const next = new URLSearchParams(searchParams);
    next.delete('highlight');
    setSearchParams(next, { replace: true });
  }, [searchParams, allTasks, setSearchParams]);

  useEffect(() => {
    if (highlightTaskId == null) return;
    document
      .getElementById(`task-card-${highlightTaskId}`)
      ?.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
    const t = setTimeout(() => setHighlightTaskId(null), 3000);
    return () => clearTimeout(t);
  }, [highlightTaskId]);

  function changeView(next: TasksView) {
    setView(next);
    setSelectedIds(new Set());
    setStatFilter(null);
  }

  const taskById = useMemo(() => {
    const map = new Map<number, Task>();
    allTasks.forEach((t) => map.set(t.id, t));
    archivedTasks.forEach((t) => map.set(t.id, t));
    return map;
  }, [allTasks, archivedTasks]);
  const editingTask = editingTaskId != null ? taskById.get(editingTaskId) ?? null : null;
  const quickViewTask = quickViewTaskId != null ? taskById.get(quickViewTaskId) ?? null : null;
  const detailTask = detailTaskId != null ? taskById.get(detailTaskId) ?? null : null;

  function openAddModal() {
    setAddOpen(true);
  }

  function openEditModal(task: Task) {
    setQuickViewTaskId(null);
    setDetailTaskId(null);
    setEditingTaskId(task.id);
  }

  function openDetailModal(task: Task) {
    setQuickViewTaskId(null);
    setDetailTaskId(task.id);
  }

  function openQuickView(task: Task) {
    setQuickViewTaskId(task.id);
  }

  function toggleUser(id: number) {
    setCheckedUserIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function toggleAllUsers() {
    setCheckedUserIds((prev) =>
      users.length > 0 && users.every((u) => prev.has(u.id)) ? new Set() : new Set(users.map((u) => u.id))
    );
  }

  function togglePriority(p: TaskPriority) {
    setPriorityFilters((prev) => {
      const next = new Set(prev);
      next.has(p) ? next.delete(p) : next.add(p);
      return next;
    });
  }

  function toggleStatusColumn(id: number) {
    setVisibleStatusIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  const visibleTasks = useMemo(() => {
    let list = view === 'archived' ? archivedTasks : allTasks;
    if (view === 'mine') list = list.filter((t) => t.user_id === user?.id);
    if (view === 'completed') list = list.filter((t) => t.is_completed);
    else if (view === 'overdue') list = list.filter(isOverdue);
    else if (view === 'all' || view === 'mine') list = list.filter((t) => !t.is_completed); // All/Mine default to open tasks

    if (users.length > 0 && checkedUserIds.size < users.length) {
      list = list.filter((t) => t.user_id == null || checkedUserIds.has(t.user_id));
    }

    if (priorityFilters.size > 0) {
      list = list.filter((t) => t.priority && priorityFilters.has(t.priority));
    }

    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter((t) => t.subject.toLowerCase().includes(q));
    }
    return applyStatFilter(list, statFilter);
  }, [allTasks, archivedTasks, view, user, search, users, checkedUserIds, priorityFilters, statFilter]);

  // Same All/Mine/Completed/Overdue/Archived tabs as the List view, but
  // unlike visibleTasks this never auto-hides completed tasks under
  // "All"/"Mine" — Kanban's whole point is seeing every stage (including the
  // Completed column) at once, so that default would just empty a column for
  // no reason a List row doesn't have.
  const kanbanTasks = useMemo(() => {
    let list = view === 'archived' ? archivedTasks : allTasks;
    if (view === 'mine') list = list.filter((t) => t.user_id === user?.id);
    if (view === 'completed') list = list.filter((t) => t.is_completed);
    else if (view === 'overdue') list = list.filter(isOverdue);

    if (users.length > 0 && checkedUserIds.size < users.length) {
      list = list.filter((t) => t.user_id == null || checkedUserIds.has(t.user_id));
    }
    if (priorityFilters.size > 0) {
      list = list.filter((t) => t.priority && priorityFilters.has(t.priority));
    }
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter((t) => t.subject.toLowerCase().includes(q));
    }
    return applyStatFilter(list, statFilter);
  }, [allTasks, archivedTasks, view, user, users, checkedUserIds, priorityFilters, search, statFilter]);

  function selectStatFilter(filter: TaskStatFilter) {
    setStatFilter((prev) => (prev === filter ? null : filter));
  }

  function handleMoveTaskStatus(task: Task, status: TaskStatus, isCompletedStatus: boolean) {
    moveTaskStatus.mutate({ id: task.id, status, isCompletedStatus });
  }

  async function handleReassignTask(task: Task, userId: number) {
    updateTask.mutate({ id: task.id, payload: { user_id: userId } });
    if (userId !== user?.id) {
      try {
        const { id: conversationId } = await startDm(userId);
        await sendMessage(conversationId, `Task reassigned to you: "[[ref:task:${task.id}:-:${task.subject}]]"`);
      } catch (err) {
        console.error('Failed to send reassignment DM:', err);
      }
    }
  }

  function handleMarkCompleteTask(task: Task) {
    toggleComplete.mutate({ id: task.id, is_completed: true, statusName: completedStatusName });
  }

  function handleArchiveTask(task: Task) {
    archiveTasks.mutate([task.id]);
  }

  function handleDeleteTask(task: Task) {
    setDeleteConfirmTask(task);
  }

  function confirmDeleteTask() {
    if (!deleteConfirmTask) return;
    deleteTasks.mutate([deleteConfirmTask.id], { onSuccess: () => setDeleteConfirmTask(null) });
  }

  // View All, Edit Owned Only: standard users can see every task but only
  // edit/complete/archive/drag the ones assigned to them. Admins can act on
  // anything; only admins can permanently delete. Backend enforces this too
  // (Tasks.json), this just keeps the UI from offering actions that would
  // be rejected.
  function canEditTask(task: Task) {
    return isAdmin || task.user_id === user?.id;
  }

  function toggleSelect(id: number) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function toggleSelectAll() {
    setSelectedIds((prev) =>
      visibleTasks.every((t) => prev.has(t.id)) ? new Set() : new Set(visibleTasks.map((t) => t.id))
    );
  }

  function handleCompleteSelected() {
    if (selectedIds.size === 0) return;
    Array.from(selectedIds).forEach((id) =>
      toggleComplete.mutate({ id, is_completed: true, statusName: completedStatusName })
    );
    setSelectedIds(new Set());
  }

  function handleArchiveSelected() {
    if (selectedIds.size === 0) return;
    archiveTasks.mutate(Array.from(selectedIds), { onSuccess: () => setSelectedIds(new Set()) });
  }

  function handleDeleteSelected() {
    if (selectedIds.size === 0) return;
    setBulkDeleteConfirmOpen(true);
  }

  function confirmDeleteSelected() {
    deleteTasks.mutate(Array.from(selectedIds), {
      onSuccess: () => {
        setSelectedIds(new Set());
        setBulkDeleteConfirmOpen(false);
      },
    });
  }

  return (
    <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
      <div className="px-4 py-3 flex items-center gap-4 shrink-0 border-b border-slate-200">
        <h1 className="text-lg font-bold text-slate-800 shrink-0">Tasks</h1>
        <div className="flex-1 flex justify-center min-w-0">
          <TasksStatsBar tasks={allTasks} activeFilter={statFilter} onSelect={selectStatFilter} />
        </div>
        <button
          onClick={openAddModal}
          className="bg-[var(--theme-accent)] hover:bg-[var(--theme-accent-hover)] text-white text-sm font-medium px-3 py-1.5 rounded-lg flex items-center space-x-2 shadow-sm transition-all shrink-0"
        >
          <i className="fa-solid fa-plus text-xs" />
          <span>Add Task</span>
        </button>
      </div>

      <TasksTabs
        view={view}
        onChange={changeView}
        users={users}
        currentUserId={user?.id}
        checkedUserIds={checkedUserIds}
        onToggleUser={toggleUser}
        onToggleAllUsers={toggleAllUsers}
        priorityFilters={priorityFilters}
        onTogglePriority={togglePriority}
      />

      <SearchToolbar
        search={search}
        onSearchChange={setSearch}
        placeholder="Search tasks..."
        endExtra={
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 border border-slate-200 rounded-md p-0.5 bg-slate-50">
              <button
                onClick={() => setBoardView('board')}
                className={`px-2.5 py-1 text-xs font-semibold rounded ${
                  boardView === 'board' ? 'bg-white shadow-sm text-slate-700' : 'text-slate-500'
                }`}
              >
                <i className="fa-solid fa-table-columns text-[10px] mr-1" />
                Board
              </button>
              <button
                onClick={() => setBoardView('list')}
                className={`px-2.5 py-1 text-xs font-semibold rounded ${
                  boardView === 'list' ? 'bg-white shadow-sm text-slate-700' : 'text-slate-500'
                }`}
              >
                <i className="fa-solid fa-list text-[10px] mr-1" />
                List
              </button>
            </div>
            {view !== 'archived' &&
              (boardView === 'list' ? (
                <TasksColumnsMenu
                  visibility={columnVisibility}
                  onToggle={(id) => setColumnVisibility((v) => ({ ...v, [id]: v[id] === false }))}
                />
              ) : (
                <TaskColumnsManager
                  statuses={taskStatuses}
                  visibleStatusIds={visibleStatusIds}
                  onToggleVisibility={toggleStatusColumn}
                  isAdmin={isAdmin}
                />
              ))}
          </div>
        }
      />

      {view === 'archived' ? (
        <ArchivedTasksList tasks={visibleTasks} isLoading={isLoadingArchived} />
      ) : boardView === 'list' ? (
        <>
          <TasksTable
            tasks={visibleTasks}
            selectedIds={selectedIds}
            onToggleSelect={toggleSelect}
            onToggleSelectAll={toggleSelectAll}
            onRowClick={openQuickView}
            isLoading={isLoading}
            isAdmin={isAdmin}
            currentUserId={user?.id}
            columnVisibility={columnVisibility}
            onColumnVisibilityChange={setColumnVisibility}
          />

          <div className="px-4 py-2.5 border-t border-slate-200 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-3">
              {selectedIds.size > 0 && (
                <span className="text-[11px] text-slate-400 font-medium">
                  {selectedIds.size} selected
                </span>
              )}
              <TasksBulkActionsMenu
                selectedCount={selectedIds.size}
                isAdmin={isAdmin}
                onCompleteSelected={handleCompleteSelected}
                onArchiveSelected={handleArchiveSelected}
                onDeleteSelected={handleDeleteSelected}
              />
            </div>
            <span className="text-xs text-slate-500">
              Showing {visibleTasks.length} of {allTasks.length} Tasks
            </span>
          </div>
        </>
      ) : (
        <TasksKanbanBoard
          tasks={kanbanTasks}
          users={users}
          statuses={taskStatuses}
          visibleStatusIds={visibleStatusIds}
          onMoveStatus={handleMoveTaskStatus}
          onCardClick={openQuickView}
          onViewDetails={openDetailModal}
          onEdit={openEditModal}
          onReassign={handleReassignTask}
          onMarkComplete={handleMarkCompleteTask}
          onArchive={handleArchiveTask}
          onDelete={handleDeleteTask}
          canEditTask={canEditTask}
          isAdmin={isAdmin}
          highlightTaskId={highlightTaskId}
        />
      )}

      <TaskQuickView
        task={quickViewTask}
        canEdit={quickViewTask ? canEditTask(quickViewTask) : false}
        onClose={() => setQuickViewTaskId(null)}
        onEdit={openEditModal}
        onOpenFullDetails={openDetailModal}
      />

      <TaskDetailModal
        task={detailTask}
        isAdmin={isAdmin}
        currentUserId={user?.id}
        onClose={() => setDetailTaskId(null)}
        onEdit={openEditModal}
      />

      <TaskFormModal open={addOpen} onClose={() => setAddOpen(false)} />
      <TaskEditModal open={!!editingTask} task={editingTask} onClose={() => setEditingTaskId(null)} />

      <ConfirmDialog
        open={deleteConfirmTask !== null}
        title="Permanently delete this task?"
        body={deleteConfirmTask ? `Permanently delete "${deleteConfirmTask.subject}"? This cannot be undone.` : undefined}
        confirmLabel="Delete"
        isSubmitting={deleteTasks.isPending}
        onConfirm={confirmDeleteTask}
        onCancel={() => setDeleteConfirmTask(null)}
      />
      <ConfirmDialog
        open={bulkDeleteConfirmOpen}
        title="Delete tasks?"
        body={`Delete ${selectedIds.size} task(s)? This cannot be undone.`}
        confirmLabel="Delete"
        isSubmitting={deleteTasks.isPending}
        onConfirm={confirmDeleteSelected}
        onCancel={() => setBulkDeleteConfirmOpen(false)}
      />
    </div>
  );
}
