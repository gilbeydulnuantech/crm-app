import { ReactNode, useState } from 'react';
import { TeamUser } from '../../api/contacts';
import { Resource } from '../../types/resource';
import { useUpdateUserColor } from '../../hooks/useContacts';
import { toTitleCase } from '../../utils/text';
import UserColorPicker from './UserColorPicker';

interface Props {
  users: TeamUser[];
  resources: Resource[];
  currentUserId?: number;
  isAdmin: boolean;
  checkedUserIds: Set<number>;
  checkedResourceIds: Set<number>;
  onToggleUser: (id: number) => void;
  onToggleResource: (id: number) => void;
  onToggleAllUsers: () => void;
  onToggleAllResources: () => void;
  collapsed: boolean;
  onToggleCollapsed: () => void;
}

const DEFAULT_USER_COLOR = '#94A3B8';
const DEFAULT_RESOURCE_COLOR = '#CBD5E1';

function Section({ title, children }: { title: string; children: ReactNode }) {
  const [open, setOpen] = useState(true);
  return (
    <div className="border-t border-slate-100 pt-3 first:border-t-0 first:pt-0">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-1.5 text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-2"
      >
        <i className={`fa-solid fa-chevron-down text-[9px] transition-transform ${open ? '' : '-rotate-90'}`} />
        {title}
      </button>
      {open && <div className="space-y-1.5">{children}</div>}
    </div>
  );
}

function Row({
  dot,
  label,
  checked,
  onToggle,
  disabled,
}: {
  dot: ReactNode;
  label: string;
  checked: boolean;
  onToggle: () => void;
  disabled?: boolean;
}) {
  return (
    <label
      className={`flex items-center gap-2 text-sm ${
        disabled ? 'text-slate-400 cursor-not-allowed' : 'text-slate-700 cursor-pointer'
      }`}
    >
      {dot}
      <span className="flex-1 truncate">{label}</span>
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={onToggle}
        className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 disabled:opacity-50"
      />
    </label>
  );
}

export default function CalendarSidebar({
  users,
  resources,
  currentUserId,
  isAdmin,
  checkedUserIds,
  checkedResourceIds,
  onToggleUser,
  onToggleResource,
  onToggleAllUsers,
  onToggleAllResources,
  collapsed,
  onToggleCollapsed,
}: Props) {
  const updateUserColor = useUpdateUserColor();
  const allUsersChecked = users.length > 0 && users.every((u) => checkedUserIds.has(u.id));
  const allResourcesChecked = resources.length > 0 && resources.every((r) => checkedResourceIds.has(r.id));

  if (collapsed) {
    return (
      <div className="w-7 shrink-0 border-r border-slate-200 flex flex-col items-center pt-4">
        <button
          onClick={onToggleCollapsed}
          title="Show sidebar"
          className="text-slate-400 hover:text-indigo-600 hover:bg-slate-100 rounded p-1.5"
        >
          <i className="fa-solid fa-chevron-right text-xs" />
        </button>
      </div>
    );
  }

  return (
    <div className="w-64 shrink-0 border-r border-slate-200 overflow-y-auto p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-slate-800">Shared Calendars &amp; Teams</h3>
        <button
          onClick={onToggleCollapsed}
          title="Hide sidebar"
          className="text-slate-400 hover:text-indigo-600 hover:bg-slate-100 rounded p-1 shrink-0"
        >
          <i className="fa-solid fa-chevron-left text-xs" />
        </button>
      </div>

      <Section title="Team Members">
        {users.length > 0 && (
          <Row
            dot={<span className="w-2.5 h-2.5 rounded-full bg-slate-300 shrink-0" />}
            label="All Team Members"
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

      <Section title="Resources">
        {resources.length > 0 && (
          <Row
            dot={<span className="w-2.5 h-2.5 rounded-full bg-slate-300 shrink-0" />}
            label="All Resources"
            checked={allResourcesChecked}
            onToggle={onToggleAllResources}
          />
        )}
        {resources.map((r) => (
          <Row
            key={r.id}
            dot={
              <span
                className="w-2.5 h-2.5 rounded-full ring-1 ring-black/10 shrink-0"
                style={{ backgroundColor: r.color || DEFAULT_RESOURCE_COLOR }}
              />
            }
            label={r.name}
            checked={checkedResourceIds.has(r.id)}
            onToggle={() => onToggleResource(r.id)}
          />
        ))}
        {resources.length === 0 && <p className="text-xs text-slate-400">No resources configured.</p>}
      </Section>

      <Section title="External Integrations">
        <Row dot={<span className="w-2.5 h-2.5 rounded-full bg-slate-200 shrink-0" />} label="Google Cal Sync" checked={false} onToggle={() => {}} disabled />
        <Row dot={<span className="w-2.5 h-2.5 rounded-full bg-slate-200 shrink-0" />} label="Outlook Sync" checked={false} onToggle={() => {}} disabled />
        <p className="text-[11px] text-slate-400 mt-1">Not connected yet.</p>
      </Section>
    </div>
  );
}
