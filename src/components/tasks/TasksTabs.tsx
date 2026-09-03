import { useEffect, useRef, useState } from 'react';
import { TeamUser } from '../../api/contacts';
import { TASK_PRIORITIES, TaskPriority, TasksView } from '../../types/task';
import { toTitleCase } from '../../utils/text';
import { DEFAULT_USER_COLOR } from '../../utils/userColor';
import DropdownRow from '../DropdownRow';

interface Props {
  view: TasksView;
  onChange: (view: TasksView) => void;
  users: TeamUser[];
  currentUserId?: number;
  checkedUserIds: Set<number>;
  onToggleUser: (id: number) => void;
  onToggleAllUsers: () => void;
  priorityFilters: Set<TaskPriority>;
  onTogglePriority: (p: TaskPriority) => void;
}

// Split at "overdue" so the Priority dropdown can sit immediately after it,
// before Archived.
const TABS_BEFORE_PRIORITY: { key: TasksView; label: string }[] = [
  { key: 'mine', label: 'My Tasks' },
  { key: 'completed', label: 'Completed' },
  { key: 'overdue', label: 'Overdue' },
];
const TABS_AFTER_PRIORITY: { key: TasksView; label: string }[] = [{ key: 'archived', label: 'Archived' }];

// Split button — clicking "All Tasks" itself switches the view like any
// other tab; the chevron opens a separate dropdown to narrow which
// teammates' tasks "All Tasks" includes. Two different jobs (which records
// vs. which people) sharing one control instead of two side-by-side ones.
function AllTasksTab({
  active,
  onSelect,
  users,
  currentUserId,
  checkedUserIds,
  onToggleUser,
  onToggleAllUsers,
}: {
  active: boolean;
  onSelect: () => void;
} & Pick<Props, 'users' | 'currentUserId' | 'checkedUserIds' | 'onToggleUser' | 'onToggleAllUsers'>) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const allUsersChecked = users.length > 0 && users.every((u) => checkedUserIds.has(u.id));

  useEffect(() => {
    if (!open) return;
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <div
        className={`flex items-center rounded-lg overflow-hidden transition-colors ${
          active ? 'bg-[var(--theme-accent)] text-white' : 'text-slate-600 hover:bg-slate-100'
        }`}
      >
        <button onClick={onSelect} className="pl-3 pr-1.5 py-1.5 text-sm font-semibold">
          All Tasks
        </button>
        <button
          onClick={() => setOpen((v) => !v)}
          className={`pr-2.5 pl-1 py-1.5 ${active ? 'hover:bg-[var(--theme-accent-hover)]' : 'hover:bg-slate-200'}`}
          title="Filter by team member"
        >
          <i className="fa-solid fa-chevron-down text-[10px]" />
        </button>
      </div>
      {open && (
        <div className="absolute top-full mt-1 left-0 w-52 bg-white border border-slate-200 rounded-lg shadow-lg z-20 py-1.5 px-2 max-h-64 overflow-y-auto">
          {users.length > 0 && (
            <DropdownRow
              dot={<span className="w-2.5 h-2.5 rounded-full bg-slate-300 shrink-0" />}
              label="All Members"
              checked={allUsersChecked}
              onToggle={onToggleAllUsers}
            />
          )}
          {users.map((u) => (
            <DropdownRow
              key={u.id}
              dot={
                <span
                  className="w-2.5 h-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: u.color || DEFAULT_USER_COLOR }}
                />
              }
              label={`${toTitleCase(u.name)}${u.id === currentUserId ? ' (Me)' : ''}`}
              checked={checkedUserIds.has(u.id)}
              onToggle={() => onToggleUser(u.id)}
            />
          ))}
          {users.length === 0 && <p className="text-xs text-slate-400 px-1 py-1">No team members.</p>}
        </div>
      )}
    </div>
  );
}

// Same pill look as the plain tab buttons (and the "All Tasks" split
// button) — active means "at least one priority checked", not "currently
// selected view", but the visual language matches so it reads as part of
// the same row instead of a differently-styled toolbar control.
function PriorityTab({
  priorityFilters,
  onTogglePriority,
}: Pick<Props, 'priorityFilters' | 'onTogglePriority'>) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const active = priorityFilters.size > 0;

  useEffect(() => {
    if (!open) return;
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className={`flex items-center gap-1.5 px-3 py-1.5 text-sm font-semibold rounded-lg transition-colors ${
          active ? 'bg-[var(--theme-accent)] text-white' : 'text-slate-600 hover:bg-slate-100'
        }`}
      >
        Priority
        {active && (
          <span className="w-4 h-4 flex items-center justify-center rounded-full bg-white/25 text-[10px] font-bold">
            {priorityFilters.size}
          </span>
        )}
        <i className="fa-solid fa-chevron-down text-[10px]" />
      </button>
      {open && (
        <div className="absolute top-full mt-1 left-0 w-44 bg-white border border-slate-200 rounded-lg shadow-lg z-20 py-1.5 px-2">
          {TASK_PRIORITIES.map((p) => (
            <DropdownRow key={p} label={p} checked={priorityFilters.has(p)} onToggle={() => onTogglePriority(p)} />
          ))}
        </div>
      )}
    </div>
  );
}

export default function TasksTabs({
  view,
  onChange,
  users,
  currentUserId,
  checkedUserIds,
  onToggleUser,
  onToggleAllUsers,
  priorityFilters,
  onTogglePriority,
}: Props) {
  return (
    <div className="px-4 pt-3 pb-3 flex items-center gap-2 shrink-0 border-b border-slate-200">
      <AllTasksTab
        active={view === 'all'}
        onSelect={() => onChange('all')}
        users={users}
        currentUserId={currentUserId}
        checkedUserIds={checkedUserIds}
        onToggleUser={onToggleUser}
        onToggleAllUsers={onToggleAllUsers}
      />
      {TABS_BEFORE_PRIORITY.map((t) => (
        <button
          key={t.key}
          onClick={() => onChange(t.key)}
          className={`px-3 py-1.5 text-sm font-semibold rounded-lg transition-colors ${
            view === t.key ? 'bg-[var(--theme-accent)] text-white' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          {t.label}
        </button>
      ))}

      <PriorityTab priorityFilters={priorityFilters} onTogglePriority={onTogglePriority} />

      {TABS_AFTER_PRIORITY.map((t) => (
        <button
          key={t.key}
          onClick={() => onChange(t.key)}
          className={`px-3 py-1.5 text-sm font-semibold rounded-lg transition-colors ${
            view === t.key ? 'bg-[var(--theme-accent)] text-white' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}
