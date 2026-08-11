import { ReactNode } from 'react';
import { TeamUser } from '../../api/contacts';
import { TASK_PRIORITIES, TaskPriority } from '../../types/task';
import { useUpdateUserColor } from '../../hooks/useContacts';
import { toTitleCase } from '../../utils/text';
import { DEFAULT_USER_COLOR } from '../../utils/userColor';
import UserColorPicker from '../calendar/UserColorPicker';

export type TaskStatusFilter = 'open' | 'completed' | 'overdue';

const STATUS_OPTIONS: { key: TaskStatusFilter; label: string }[] = [
  { key: 'open', label: 'Open' },
  { key: 'completed', label: 'Completed' },
  { key: 'overdue', label: 'Overdue' },
];

interface Props {
  users: TeamUser[];
  currentUserId?: number;
  isAdmin: boolean;
  checkedUserIds: Set<number>;
  onToggleUser: (id: number) => void;
  onToggleAllUsers: () => void;
  statusFilters: Set<TaskStatusFilter>;
  onToggleStatus: (s: TaskStatusFilter) => void;
  priorityFilters: Set<TaskPriority>;
  onTogglePriority: (p: TaskPriority) => void;
  onClearFilters: () => void;
  collapsed: boolean;
  onToggleCollapsed: () => void;
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="border-t border-slate-100 pt-3 first:border-t-0 first:pt-0">
      <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-2">{title}</div>
      <div className="space-y-1.5">{children}</div>
    </div>
  );
}

function Row({
  dot,
  label,
  checked,
  onToggle,
}: {
  dot?: ReactNode;
  label: string;
  checked: boolean;
  onToggle: () => void;
}) {
  return (
    <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
      {dot}
      <span className="flex-1 truncate">{label}</span>
      <input
        type="checkbox"
        checked={checked}
        onChange={onToggle}
        className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
      />
    </label>
  );
}

const RAIL_ICONS: { icon: string; title: string }[] = [
  { icon: 'fa-users', title: 'Team Members' },
  { icon: 'fa-check', title: 'Status' },
  { icon: 'fa-flag', title: 'Priority' },
];

export default function TasksSidebar({
  users,
  currentUserId,
  isAdmin,
  checkedUserIds,
  onToggleUser,
  onToggleAllUsers,
  statusFilters,
  onToggleStatus,
  priorityFilters,
  onTogglePriority,
  onClearFilters,
  collapsed,
  onToggleCollapsed,
}: Props) {
  const updateUserColor = useUpdateUserColor();
  const allUsersChecked = users.length > 0 && users.every((u) => checkedUserIds.has(u.id));

  if (collapsed) {
    return (
      <div className="w-7 shrink-0 border-r border-slate-200 flex flex-col items-center pt-4 gap-1">
        <button
          onClick={onToggleCollapsed}
          title="Show filters"
          className="text-slate-400 hover:text-indigo-600 hover:bg-slate-100 rounded p-1.5"
        >
          <i className="fa-solid fa-chevron-right text-xs" />
        </button>
        <div className="w-full border-t border-slate-100 my-1" />
        {RAIL_ICONS.map((r) => (
          <button
            key={r.icon}
            onClick={onToggleCollapsed}
            title={r.title}
            className="text-slate-400 hover:text-indigo-600 hover:bg-slate-100 rounded p-1.5"
          >
            <i className={`fa-solid ${r.icon} text-xs`} />
          </button>
        ))}
      </div>
    );
  }

  return (
    <div className="w-60 shrink-0 border-r border-slate-200 overflow-y-auto p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-slate-800">Task Filters</h3>
        <button
          onClick={onToggleCollapsed}
          title="Hide filters"
          className="text-slate-400 hover:text-indigo-600 hover:bg-slate-100 rounded p-1 shrink-0"
        >
          <i className="fa-solid fa-chevron-left text-xs" />
        </button>
      </div>

      <Section title="Team Members">
        {users.length > 0 && (
          <Row
            dot={<span className="w-2.5 h-2.5 rounded-full bg-slate-300 shrink-0" />}
            label="All Members"
            checked={allUsersChecked}
            onToggle={onToggleAllUsers}
          />
        )}
        {users.map((u) => (
          <Row
            key={u.id}
            dot={
              <UserColorPicker
                color={u.color || DEFAULT_USER_COLOR}
                disabled={!isAdmin && u.id !== currentUserId}
                onChange={(hex) => updateUserColor.mutate({ userId: u.id, color: hex })}
              />
            }
            label={`${toTitleCase(u.name)}${u.id === currentUserId ? ' (Me)' : ''}`}
            checked={checkedUserIds.has(u.id)}
            onToggle={() => onToggleUser(u.id)}
          />
        ))}
        {users.length === 0 && <p className="text-xs text-slate-400">No team members.</p>}
      </Section>

      <Section title="Status">
        {STATUS_OPTIONS.map((s) => (
          <Row
            key={s.key}
            label={s.label}
            checked={statusFilters.has(s.key)}
            onToggle={() => onToggleStatus(s.key)}
          />
        ))}
      </Section>

      <Section title="Priority">
        {TASK_PRIORITIES.map((p) => (
          <Row key={p} label={p} checked={priorityFilters.has(p)} onToggle={() => onTogglePriority(p)} />
        ))}
      </Section>

      <button
        onClick={onClearFilters}
        className="w-full text-xs font-semibold text-slate-600 hover:text-indigo-600 border border-slate-200 rounded-lg py-1.5 hover:bg-slate-50"
      >
        Clear Filters
      </button>
    </div>
  );
}
