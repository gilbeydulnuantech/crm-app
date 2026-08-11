import { useEffect, useMemo, useState } from 'react';
import { Task, TaskPriority, taskStatus, TasksView } from '../types/task';
import { useAuth } from '../context/AuthContext';
import { useUsers } from '../hooks/useContacts';
import { useDeleteTasks, useTasks, useToggleTaskComplete } from '../hooks/useTasks';
import TasksStatsBar from '../components/tasks/TasksStatsBar';
import TasksTabs from '../components/tasks/TasksTabs';
import TasksSidebar, { TaskStatusFilter } from '../components/tasks/TasksSidebar';
import TasksTable from '../components/tasks/TasksTable';
import TasksBulkActionsMenu from '../components/tasks/TasksBulkActionsMenu';
import TaskFormModal from '../components/tasks/TaskFormModal';
import SearchToolbar from '../components/SearchToolbar';

export default function Tasks() {
  const { user } = useAuth();

  const [view, setView] = useState<TasksView>('all');
  const [search, setSearch] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [formOpen, setFormOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // Sidebar filters — additional narrowing on top of the All/Mine/Completed
  // tabs, not a replacement for them.
  const [checkedUserIds, setCheckedUserIds] = useState<Set<number>>(new Set());
  const [usersInitialized, setUsersInitialized] = useState(false);
  const [statusFilters, setStatusFilters] = useState<Set<TaskStatusFilter>>(new Set(['open']));
  const [priorityFilters, setPriorityFilters] = useState<Set<TaskPriority>>(new Set());

  const { data: allTasks = [], isLoading } = useTasks();
  const { data: users = [] } = useUsers();
  const deleteTasks = useDeleteTasks();
  const toggleComplete = useToggleTaskComplete();

  // Default to everyone checked once the team list loads — "All Members"
  // means unrestricted, not "hide everyone until you opt in".
  useEffect(() => {
    if (!usersInitialized && users.length > 0) {
      setCheckedUserIds(new Set(users.map((u) => u.id)));
      setUsersInitialized(true);
    }
  }, [users, usersInitialized]);

  function changeView(next: TasksView) {
    setView(next);
    setSelectedIds(new Set());
  }

  function openAddModal() {
    setEditingTask(null);
    setFormOpen(true);
  }

  function openEditModal(task: Task) {
    setEditingTask(task);
    setFormOpen(true);
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
    let list = allTasks;
    if (view === 'mine') list = list.filter((t) => t.user_id === user?.id);
    if (view === 'completed') list = list.filter((t) => t.is_completed);
    else list = list.filter((t) => !t.is_completed); // All/Mine default to open tasks

    if (users.length > 0 && checkedUserIds.size < users.length) {
      list = list.filter((t) => t.user_id == null || checkedUserIds.has(t.user_id));
    }

    if (statusFilters.size > 0) {
      list = list.filter((t) => {
        const isOverdue = !t.is_completed && taskStatus(t) === 'Overdue';
        return (
          (statusFilters.has('open') && !t.is_completed) ||
          (statusFilters.has('completed') && t.is_completed) ||
          (statusFilters.has('overdue') && isOverdue)
        );
      });
    }

    if (priorityFilters.size > 0) {
      list = list.filter((t) => t.priority && priorityFilters.has(t.priority));
    }

    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter((t) => t.subject.toLowerCase().includes(q));
    }
    return list;
  }, [allTasks, view, user, search, users, checkedUserIds, statusFilters, priorityFilters]);

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
            className="bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium px-3 py-1.5 rounded-lg flex items-center space-x-2 shadow-sm transition-all"
          >
            <i className="fa-solid fa-plus text-xs" />
            <span>Add Task</span>
          </button>
        </div>

        <TasksStatsBar tasks={allTasks} />
        <TasksTabs view={view} onChange={changeView} />

        <SearchToolbar
          search={search}
          onSearchChange={setSearch}
          placeholder="Search tasks..."
          onFiltersClick={() => setSidebarOpen((v) => !v)}
        />

        <TasksTable
          tasks={visibleTasks}
          selectedIds={selectedIds}
          onToggleSelect={toggleSelect}
          onToggleSelectAll={toggleSelectAll}
          onRowClick={openEditModal}
          isLoading={isLoading}
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
              onCompleteSelected={handleCompleteSelected}
              onDeleteSelected={handleDeleteSelected}
            />
          </div>
          <span className="text-xs text-slate-500">
            Showing {visibleTasks.length} of {allTasks.length} Tasks
          </span>
        </div>

        <TaskFormModal open={formOpen} task={editingTask} onClose={() => setFormOpen(false)} />
      </div>
    </div>
  );
}
