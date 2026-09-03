import { useMemo, useState } from 'react';
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  useReactTable,
  VisibilityState,
} from '@tanstack/react-table';
import { Task, taskStatus } from '../../types/task';
import { toTitleCase } from '../../utils/text';

interface Props {
  tasks: Task[];
  selectedIds: Set<number>;
  onToggleSelect: (id: number) => void;
  onToggleSelectAll: () => void;
  onRowClick: (task: Task) => void;
  isLoading: boolean;
  isAdmin: boolean;
  currentUserId?: number;
  columnVisibility: VisibilityState;
  onColumnVisibilityChange: (updater: VisibilityState | ((old: VisibilityState) => VisibilityState)) => void;
}

const columnHelper = createColumnHelper<Task>();

const STATUS_COLORS: Record<string, string> = {
  Completed: 'bg-emerald-100 text-emerald-800',
  Overdue: 'bg-rose-100 text-rose-700',
  'Due Today': 'bg-amber-100 text-amber-800',
  Upcoming: 'bg-slate-100 text-slate-800',
};

// Select and Task stay mandatory — everything else is toggleable via
// TasksColumnsMenu, mirroring CompaniesTable's convention.
const OPTIONAL_COLUMNS = ['related_to', 'assigned_user_name', 'due_at', 'status'] as const;
const COLUMN_LABELS: Record<(typeof OPTIONAL_COLUMNS)[number], string> = {
  related_to: 'Related To',
  assigned_user_name: 'Assigned',
  due_at: 'Due Date',
  status: 'Status',
};

export function TasksColumnsMenu({
  visibility,
  onToggle,
}: {
  visibility: VisibilityState;
  onToggle: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-[var(--theme-accent)] py-1.5 px-2.5 border border-slate-200 rounded-md bg-white transition-colors"
      >
        <span>Columns</span>
        <i className="fa-solid fa-gear text-[10px]" />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-1 w-44 bg-white border border-slate-200 rounded-lg shadow-lg z-20 py-1.5">
            {OPTIONAL_COLUMNS.map((id) => (
              <label
                key={id}
                className="flex items-center gap-2 px-3 py-1 text-xs text-slate-600 cursor-pointer hover:bg-slate-50"
              >
                <input
                  type="checkbox"
                  checked={visibility[id] !== false}
                  onChange={() => onToggle(id)}
                  className="rounded border-slate-300 text-[var(--theme-accent)] focus:ring-[var(--theme-accent)]"
                />
                {COLUMN_LABELS[id]}
              </label>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

export default function TasksTable({
  tasks,
  selectedIds,
  onToggleSelect,
  onToggleSelectAll,
  onRowClick,
  isLoading,
  isAdmin,
  currentUserId,
  columnVisibility,
  onColumnVisibilityChange,
}: Props) {
  // View All, Edit Owned Only: standard users can see every task but only
  // select/edit the ones assigned to them. Admins can act on anything.
  function canEdit(task: Task) {
    return isAdmin || task.user_id === currentUserId;
  }

  const selectableTasks = useMemo(() => tasks.filter(canEdit), [tasks, isAdmin, currentUserId]);
  const allSelected = selectableTasks.length > 0 && selectableTasks.every((t) => selectedIds.has(t.id));

  const columns = useMemo(
    () => [
      columnHelper.display({
        id: 'select',
        header: () =>
          selectableTasks.length > 0 ? (
            <input
              type="checkbox"
              checked={allSelected}
              onChange={onToggleSelectAll}
              className="rounded border-slate-300 text-[var(--theme-accent)] focus:ring-[var(--theme-accent)]"
            />
          ) : null,
        cell: ({ row }) =>
          canEdit(row.original) ? (
            <input
              type="checkbox"
              checked={selectedIds.has(row.original.id)}
              onChange={(e) => {
                e.stopPropagation();
                onToggleSelect(row.original.id);
              }}
              onClick={(e) => e.stopPropagation()}
              className="rounded border-slate-300 text-[var(--theme-accent)] focus:ring-[var(--theme-accent)]"
            />
          ) : (
            <i className="fa-solid fa-lock text-slate-300 text-xs" title="Not assigned to you" />
          ),
        size: 36,
      }),
      columnHelper.accessor('subject', {
        header: 'Task',
        cell: (info) => (
          <span
            className={`font-medium ${
              info.row.original.is_completed ? 'text-slate-400 line-through' : 'text-slate-800'
            }`}
          >
            {info.getValue()}
          </span>
        ),
      }),
      columnHelper.accessor(
        (row) => row.contact_name || row.opportunity_name || '--',
        {
          id: 'related_to',
          header: 'Related To',
          cell: (info) => {
            const row = info.row.original;
            return row.contact_name ? toTitleCase(row.contact_name) : row.opportunity_name || '--';
          },
        }
      ),
      columnHelper.accessor('assigned_user_name', {
        header: 'Assigned',
        cell: (info) => info.getValue() || '--',
      }),
      columnHelper.accessor('due_at', {
        header: 'Due Date',
        cell: (info) => (info.getValue() ? new Date(info.getValue()!).toLocaleDateString() : '--'),
      }),
      columnHelper.display({
        id: 'status',
        header: 'Status',
        cell: ({ row }) => {
          const status = taskStatus(row.original);
          return (
            <span
              className={`px-2 py-0.5 text-xs font-medium rounded-full ${STATUS_COLORS[status]}`}
            >
              {status}
            </span>
          );
        },
      }),
    ],
    [selectedIds, allSelected, isAdmin, currentUserId]
  );

  const table = useReactTable({
    data: tasks,
    columns,
    state: { columnVisibility },
    onColumnVisibilityChange: onColumnVisibilityChange,
    getCoreRowModel: getCoreRowModel(),
  });

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center text-sm text-slate-400">
        Loading tasks...
      </div>
    );
  }

  if (tasks.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center text-sm text-slate-400">
        No tasks found.
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-auto px-4">
      <table className="w-full text-sm border-collapse">
        <thead className="sticky top-0 bg-white z-10">
          {table.getHeaderGroups().map((hg) => (
            <tr key={hg.id} className="border-b border-slate-200">
              {hg.headers.map((h) => (
                <th
                  key={h.id}
                  className="text-left font-semibold text-slate-500 text-xs uppercase tracking-wide py-2 px-2"
                >
                  {flexRender(h.column.columnDef.header, h.getContext())}
                </th>
              ))}
            </tr>
          ))}
        </thead>
        <tbody>
          {table.getRowModel().rows.map((row) => (
            <tr
              key={row.id}
              onClick={() => onRowClick(row.original)}
              className={`border-b border-slate-100 hover:bg-slate-50 cursor-pointer ${
                selectedIds.has(row.original.id) ? 'bg-[var(--theme-accent-tint)]' : ''
              }`}
            >
              {row.getVisibleCells().map((cell) => (
                <td key={cell.id} className="py-2 px-2 align-middle">
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
