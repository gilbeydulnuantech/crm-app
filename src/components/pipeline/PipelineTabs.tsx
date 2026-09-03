import { useEffect, useRef, useState } from 'react';
import { TeamUser } from '../../api/contacts';
import { toTitleCase } from '../../utils/text';
import { DEFAULT_USER_COLOR } from '../../utils/userColor';
import DropdownRow from '../DropdownRow';

export type PipelineTabView = 'all' | 'mine' | 'overdue' | 'archived';

interface Tag {
  id: number;
  name: string;
}

interface Props {
  view: PipelineTabView;
  onChange: (view: PipelineTabView) => void;
  users: TeamUser[];
  currentUserId?: number;
  checkedUserIds: Set<number>;
  onToggleUser: (id: number) => void;
  onToggleAllUsers: () => void;
  tags: Tag[];
  tagFilters: Set<number>;
  onToggleTag: (id: number) => void;
}

// Split button — clicking "All Deals" itself switches the view like any
// other tab; the chevron opens a separate dropdown to narrow which
// teammates' deals "All Deals" includes. Mirrors TasksTabs' AllTasksTab.
function AllDealsTab({
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
          All Deals
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

// Same pill look as the plain tab buttons — active means "at least one tag
// checked", not "currently selected view", matching TasksTabs' PriorityTab.
function TagsTab({ tags, tagFilters, onToggleTag }: Pick<Props, 'tags' | 'tagFilters' | 'onToggleTag'>) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const active = tagFilters.size > 0;

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
        Tags
        {active && (
          <span className="w-4 h-4 flex items-center justify-center rounded-full bg-white/25 text-[10px] font-bold">
            {tagFilters.size}
          </span>
        )}
        <i className="fa-solid fa-chevron-down text-[10px]" />
      </button>
      {open && (
        <div className="absolute top-full mt-1 left-0 w-48 bg-white border border-slate-200 rounded-lg shadow-lg z-20 py-1.5 px-2 max-h-64 overflow-y-auto">
          {tags.map((t) => (
            <DropdownRow key={t.id} label={`#${t.name}`} checked={tagFilters.has(t.id)} onToggle={() => onToggleTag(t.id)} />
          ))}
          {tags.length === 0 && <p className="text-xs text-slate-400 px-1 py-1">No tags yet.</p>}
        </div>
      )}
    </div>
  );
}

const PLAIN_TABS: { key: PipelineTabView; label: string }[] = [{ key: 'mine', label: 'My Deals' }];
const TABS_AFTER_TAGS: { key: PipelineTabView; label: string }[] = [
  { key: 'overdue', label: 'Overdue' },
  { key: 'archived', label: 'Archived' },
];

export default function PipelineTabs({
  view,
  onChange,
  users,
  currentUserId,
  checkedUserIds,
  onToggleUser,
  onToggleAllUsers,
  tags,
  tagFilters,
  onToggleTag,
}: Props) {
  return (
    <div className="px-4 pt-3 pb-3 flex items-center gap-2 shrink-0 border-b border-slate-200">
      <AllDealsTab
        active={view === 'all'}
        onSelect={() => onChange('all')}
        users={users}
        currentUserId={currentUserId}
        checkedUserIds={checkedUserIds}
        onToggleUser={onToggleUser}
        onToggleAllUsers={onToggleAllUsers}
      />
      {PLAIN_TABS.map((t) => (
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

      <TagsTab tags={tags} tagFilters={tagFilters} onToggleTag={onToggleTag} />

      {TABS_AFTER_TAGS.map((t) => (
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
