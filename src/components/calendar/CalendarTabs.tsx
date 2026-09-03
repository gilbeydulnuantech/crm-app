import { ReactNode, useEffect, useRef, useState } from 'react';
import { TeamUser } from '../../api/contacts';
import { Resource } from '../../types/resource';
import { useUpdateUserColor } from '../../hooks/useContacts';
import { toTitleCase } from '../../utils/text';
import DropdownRow from '../DropdownRow';
import UserColorPicker from './UserColorPicker';

const DEFAULT_USER_COLOR = '#94A3B8';
const DEFAULT_RESOURCE_COLOR = '#CBD5E1';

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
  onSelectAllUsers: () => void;
  onSelectOnlyMe: () => void;
  endExtra?: ReactNode;
}

// Split button — clicking "All Events" checks every team member (the
// broadest overlay); the chevron opens a checkbox dropdown for a custom
// subset. Mirrors TasksTabs' AllTasksTab / PipelineTabs' AllDealsTab.
function AllEventsTab({
  active,
  onSelectAll,
  users,
  currentUserId,
  isAdmin,
  checkedUserIds,
  onToggleUser,
  onToggleAllUsers,
}: {
  active: boolean;
  onSelectAll: () => void;
} & Pick<Props, 'users' | 'currentUserId' | 'isAdmin' | 'checkedUserIds' | 'onToggleUser' | 'onToggleAllUsers'>) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const updateUserColor = useUpdateUserColor();
  const allChecked = users.length > 0 && users.every((u) => checkedUserIds.has(u.id));

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
        <button onClick={onSelectAll} className="pl-3 pr-1.5 py-1.5 text-sm font-semibold">
          All Events
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
        <div className="absolute top-full mt-1 left-0 w-56 bg-white border border-slate-200 rounded-lg shadow-lg z-20 py-1.5 px-2 max-h-64 overflow-y-auto">
          {users.length > 0 && (
            <DropdownRow
              dot={<span className="w-2.5 h-2.5 rounded-full bg-slate-300 shrink-0" />}
              label="All Team Members"
              checked={allChecked}
              onToggle={onToggleAllUsers}
            />
          )}
          {users.map((u) => (
            <DropdownRow
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
          {users.length === 0 && <p className="text-xs text-slate-400 px-1 py-1">No team members.</p>}
        </div>
      )}
    </div>
  );
}

// Same pill look as the plain tab buttons — active means "at least one
// resource checked", not "currently selected view". Mirrors TasksTabs'
// PriorityTab / PipelineTabs' TagsTab.
function ResourcesTab({
  resources,
  checkedResourceIds,
  onToggleResource,
  onToggleAllResources,
}: Pick<Props, 'resources' | 'checkedResourceIds' | 'onToggleResource' | 'onToggleAllResources'>) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const active = checkedResourceIds.size > 0;
  const allChecked = resources.length > 0 && resources.every((r) => checkedResourceIds.has(r.id));

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
        Resources
        {active && (
          <span className="w-4 h-4 flex items-center justify-center rounded-full bg-white/25 text-[10px] font-bold">
            {checkedResourceIds.size}
          </span>
        )}
        <i className="fa-solid fa-chevron-down text-[10px]" />
      </button>
      {open && (
        <div className="absolute top-full mt-1 left-0 w-52 bg-white border border-slate-200 rounded-lg shadow-lg z-20 py-1.5 px-2 max-h-64 overflow-y-auto">
          {resources.length > 0 && (
            <DropdownRow
              dot={<span className="w-2.5 h-2.5 rounded-full bg-slate-300 shrink-0" />}
              label="All Resources"
              checked={allChecked}
              onToggle={onToggleAllResources}
            />
          )}
          {resources.map((r) => (
            <DropdownRow
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
          {resources.length === 0 && <p className="text-xs text-slate-400 px-1 py-1">No resources configured.</p>}
        </div>
      )}
    </div>
  );
}

export default function CalendarTabs({
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
  onSelectAllUsers,
  onSelectOnlyMe,
  endExtra,
}: Props) {
  const allChecked = users.length > 0 && users.every((u) => checkedUserIds.has(u.id));
  const onlyMeChecked = checkedUserIds.size === 1 && !!currentUserId && checkedUserIds.has(currentUserId);

  return (
    <div className="px-4 pt-3 pb-3 flex items-center gap-2 shrink-0 border-b border-slate-200">
      <AllEventsTab
        active={allChecked}
        onSelectAll={onSelectAllUsers}
        users={users}
        currentUserId={currentUserId}
        isAdmin={isAdmin}
        checkedUserIds={checkedUserIds}
        onToggleUser={onToggleUser}
        onToggleAllUsers={onToggleAllUsers}
      />
      <button
        onClick={onSelectOnlyMe}
        className={`px-3 py-1.5 text-sm font-semibold rounded-lg transition-colors ${
          onlyMeChecked ? 'bg-[var(--theme-accent)] text-white' : 'text-slate-600 hover:bg-slate-100'
        }`}
      >
        My Events
      </button>
      <ResourcesTab
        resources={resources}
        checkedResourceIds={checkedResourceIds}
        onToggleResource={onToggleResource}
        onToggleAllResources={onToggleAllResources}
      />
      {endExtra && <div className="ml-auto flex items-center gap-2 shrink-0">{endExtra}</div>}
    </div>
  );
}
