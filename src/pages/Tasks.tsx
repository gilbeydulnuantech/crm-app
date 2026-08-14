import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Task, TaskPriority, TaskStatus, taskStatus, TasksView } from '../types/task';
import { useAuth } from '../context/AuthContext';
import { useUsers } from '../hooks/useContacts';
import {
  useArchivedTasks,
  useArchiveTasks,
  useDeleteTasks,
  useMoveTaskStatus,
  useRestoreTasks,
  useTasks,
  useToggleTaskComplete,
} from '../hooks/useTasks';
import TasksStatsBar from '../components/tasks/TasksStatsBar';
import TasksTabs from '../components/tasks/TasksTabs';
import TasksSidebar, { TaskStatusFilter } from '../components/tasks/TasksSidebar';
import TasksTable from '../components/tasks/TasksTable';
import TasksKanbanBoard from '../components/tasks/TasksKanbanBoard';
import TasksBulkActionsMenu from '../components/tasks/TasksBulkActionsMenu';
import TaskFormModal from '../components/tasks/TaskFormModal';
import TaskEditModal from '../components/tasks/TaskEditModal';
import TaskQuickView from '../components/tasks/TaskQuickView';
import TaskDetailModal from '../components/tasks/TaskDetailModal';
import SearchToolbar from '../components/SearchToolbar';

type BoardView = 'list' | 'kanban';

function matchesStatusFilters(task: Task, statusFilters: Set<TaskStatusFilter>): boolean {
  if (statusFilters.size === 0) return true;
  const isOverdue = !task.is_completed && taskStatus(task) === 'Overdue';
  return (
    (statusFilters.has('open') && !task.is_completed) ||
    (statusFilters.has('completed') && task.is_completed) ||
    (statusFilters.has('overdue') && isOverdue)
  );
}

export default function Tasks() {
  const { user, isAdmin } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();

  const [view, setView] = useState<TasksView>('all');
  const [boardView, setBoardView] = useState<BoardView>('kanban');
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
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // Sidebar filters — additional narrowing on top of the All/Mine/Completed
  // tabs, not a replacement for them.
  const [checkedUserIds, setCheckedUserIds] = useState<Set<number>>(new Set());
  const [usersInitialized, setUsersInitialized] = useState(false);
  const [statusFilters, setStatusFilters] = useState<Set<TaskStatusFilter>>(new Set(['open']));
  const [priorityFilters, setPriorityFilters] = useState<Set<TaskPriority>>(new Set());

  const { data: allTasks = [], isLoading } = useTasks();
  const { data: archivedTasks = [], isLoading: isLoadingArchived } = useArchivedTasks(view === 'archived');
  const { data: users = [] } = useUsers();
  const deleteTasks = useDeleteTasks();
  const archiveTasks = useArchiveTasks();
  const restoreTasks = useRestoreTasks();
  const toggleComplete = useToggleTaskComplete();
  const moveTaskStatus = useMoveTaskStatus();

  // Default to everyone checked once the team list loads — "All Members"
  // means unrestricted, not "hide everyone until you opt in".
  useEffect(() => {
    if (!usersInitialized && users.length > 0) {
      setCheckedUserIds(new Set(users.map((u) => u.id)));
      setUsersInitialized(true);
    }
  }, [users, usersInitialized]);

  // Deep link from Team Chat notifications — ?highlight=<taskId> switches to
  // the Kanban board and rings that card for a few seconds, once its data
  // has loaded. Same pattern as Pipeline.tsx's ?highlight= for deal cards.
  useEffect(() => {
    const param = searchParams.get('highlight');
    if (!param) return;
    const id = Number(param);
    if (!allTasks.some((t) => t.id === id)) return;
    setHighlightTaskId(id);
    setBoardView('kanban');
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

  function toggleStatus(s: TaskStatusFilter) {
    setStatusFilters((prev) => {
      const next = new Set(prev);
      next.has(s) ? next.delete(s) : next.add(s);
      return next;
    });
  }

  function togglePriority(p: TaskPriority) {
    setPriorityFilters((prev) => {
      const next = new Set(prev);
      next.has(p) ? next.delete(p) : next.add(p);
      return next;
    });
  }

  function clearFilters() {
    setCheckedUserIds(new Set(users.map((u) => u.id)));
    setStatusFilters(new Set());
    setPriorityFilters(new Set());
  }

  const visibleTasks = useMemo(() => {
    let list = view === 'archived' ? archivedTasks : allTasks;
    if (view === 'mine') list = list.filter((t) => t.user_id === user?.id);
    if (view === 'completed') list = list.filter((t) => t.is_completed);
    else if (view === 'all' || view === 'mine') list = list.filter((t) => !t.is_completed); // All/Mine default to open tasks

    if (users.length > 0 && checkedUserIds.size < users.length) {
      list = list.filter((t) => t.user_id == null || checkedUserIds.has(t.user_id));
    }

    if (view !== 'archived') {
      list = list.filter((t) => matchesStatusFilters(t, statusFilters));
    }

    if (priorityFilters.size > 0) {
      list = list.filter((t) => t.priority && priorityFilters.has(t.priority));
    }

    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter((t) => t.subject.toLowerCase().includes(q));
    }
    return list;
  }, [allTasks, archivedTasks, view, user, search, users, checkedUserIds, statusFilters, priorityFilters]);

  // Kanban groups by status across the whole board, so it bypasses the
  // All/Mine/Completed tabs (is_completed-based, would permanently empty 3
  // of the 4 columns) — but the sidebar's Status section still applies, so
  // checking e.g. only "Completed" narrows the board down to just that.
  const kanbanTasks = useMemo(() => {
    let list = allTasks;
    if (users.length > 0 && checkedUserIds.size < users.length) {
      list = list.filter((t) => t.user_id == null || checkedUserIds.has(t.user_id));
    }
    list = list.filter((t) => matchesStatusFilters(t, statusFilters));
    if (priorityFilters.size > 0) {
      list = list.filter((t) => t.priority && priorityFilters.has(t.priority));
    }
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter((t) => t.subject.toLowerCase().includes(q));
    }
    return list;
  }, [allTasks, users, checkedUserIds, statusFilters, priorityFilters, search]);

  function handleMoveTaskStatus(taskId: number, status: TaskStatus) {
    moveTaskStatus.mutate({ id: taskId, status });
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
    Array.from(selectedIds).forEach((id) => toggleComplete.mutate({ id, is_completed: true }));
    setSelectedIds(new Set());
  }

  function handleArchiveSelected() {
    if (selectedIds.size === 0) return;
    archiveTasks.mutate(Array.from(selectedIds), { onSuccess: () => setSelectedIds(new Set()) });
  }

  function handleRestoreSelected() {
    if (selectedIds.size === 0) return;
    restoreTasks.mutate(Array.from(selectedIds), { onSuccess: () => setSelectedIds(new Set()) });
  }

  function handleDeleteSelected() {
    if (selectedIds.size === 0) return;
    if (!confirm(`Delete ${selectedIds.size} task(s)? This cannot be undone.`)) return;
    deleteTasks.mutate(Array.from(selectedIds), { onSuccess: () => setSelectedIds(new Set()) });
  }

  return (
    <div className="flex-1 flex min-h-0 overflow-hidden">
      <TasksSidebar
        users={users}
        currentUserId={user?.id}
        isAdmin={isAdmin}
        checkedUserIds={checkedUserIds}
        onToggleUser={toggleUser}
        onToggleAllUsers={toggleAllUsers}
        statusFilters={statusFilters}
        onToggleStatus={toggleStatus}
        priorityFilters={priorityFilters}
        onTogglePriority={togglePriority}
        onClearFilters={clearFilters}
        collapsed={!sidebarOpen}
        onToggleCollapsed={() => setSidebarOpen((v) => !v)}
      />

      <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
        <div className="px-4 py-4 flex items-center justify-between shrink-0 border-b border-slate-200">
          <h1 className="text-lg font-bold text-slate-800">Tasks</h1>
          <button
            onClick={openAddModal}
            className="bg-[var(--theme-accent)] hover:bg-[var(--theme-accent-hover)] text-white text-sm font-medium px-3 py-1.5 rounded-lg flex items-center space-x-2 shadow-sm transition-all"
          >
            <i className="fa-solid fa-plus text-xs" />
            <span>Add Task</span>
          </button>
        </div>

        <TasksStatsBar tasks={allTasks} />
        {boardView === 'list' && <TasksTabs view={view} onChange={changeView} />}

        <SearchToolbar
          search={search}
          onSearchChange={setSearch}
          placeholder="Search tasks..."
          onFiltersClick={() => setSidebarOpen((v) => !v)}
          rightExtra={
            <div className="flex items-center gap-1 border border-slate-200 rounded-md p-0.5 bg-slate-50">
              {(['kanban', 'list'] as BoardView[]).map((v) => (
                <button
                  key={v}
                  onClick={() => setBoardView(v)}
                  className={`px-2.5 py-1 text-xs font-semibold rounded capitalize ${
                    boardView === v ? 'bg-white shadow-sm text-slate-700' : 'text-slate-500'
                  }`}
                >
                  {v}
                </button>
              ))}
            </div>
          }
        />

        {boardView === 'list' ? (
          <>
            <TasksTable
              tasks={visibleTasks}
              selectedIds={selectedIds}
              onToggleSelect={toggleSelect}
              onToggleSelectAll={toggleSelectAll}
              onRowClick={openQuickView}
              isLoading={view === 'archived' ? isLoadingArchived : isLoading}
              isAdmin={isAdmin}
              currentUserId={user?.id}
            />

            <div className="px-4 py-2.5 border-t border-slate-200 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                {selectedIds.size > 0 && (
                  <span className="text-[11px] text-slate-400 font-medium">
                    {selectedIds.size} selected
                  </span>
                )}
                {view === 'archived' ? (
                  <button
                    disabled={selectedIds.size === 0}
                    onClick={handleRestoreSelected}
                    className="text-xs font-semibold text-slate-600 hover:text-indigo-600 py-1.5 px-2.5 border border-slate-200 rounded-md bg-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    Restore Selected
                  </button>
                ) : (
                  <TasksBulkActionsMenu
                    selectedCount={selectedIds.size}
                    isAdmin={isAdmin}
                    onCompleteSelected={handleCompleteSelected}
                    onArchiveSelected={handleArchiveSelected}
                    onDeleteSelected={handleDeleteSelected}
                  />
                )}
              </div>
              <span className="text-xs text-slate-500">
                Showing {visibleTasks.length} of {(view === 'archived' ? archivedTasks : allTasks).length} Tasks
              </span>
            </div>
          </>
        ) : (
          <TasksKanbanBoard
            tasks={kanbanTasks}
            onMoveStatus={handleMoveTaskStatus}
            onCardClick={openQuickView}
            canEditTask={canEditTask}
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
      </div>
    </div>
  );
}
