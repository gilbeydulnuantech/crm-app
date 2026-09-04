import { useEffect, useMemo, useState } from 'react';
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  PaginationState,
  SortingState,
  useReactTable,
} from '@tanstack/react-table';
import { Contact, LEAD_STATUS_OPTIONS } from '../../types/contact';
import { useAuth } from '../../context/AuthContext';
import { useAssignOwner, useUpdateContact } from '../../hooks/useContacts';
import { getTagColorClasses } from '../../utils/tagColors';
import { formatPhone, formatRelativeTime, toTitleCase } from '../../utils/text';
import Avatar from '../Avatar';
import LeadScoreBadge from './LeadScoreBadge';

const STATUS_COLORS: Record<string, string> = {
  New: 'bg-slate-100 text-slate-800',
  Active: 'bg-blue-100 text-blue-800',
  Customer: 'bg-emerald-100 text-emerald-800',
  Inactive: 'bg-slate-200 text-slate-600',
  Unqualified: 'bg-rose-100 text-rose-700',
  'Do Not Contact': 'bg-red-100 text-red-800',
};

interface Props {
  contacts: Contact[];
  selectedIds: Set<number>;
  visibleColumns: Record<string, boolean>;
  columnOrder: string[];
  onToggleSelect: (id: number) => void;
  onToggleSelectAll: () => void;
  onRowClick: (contact: Contact) => void;
  onEdit: (contact: Contact) => void;
  onDelete: (contact: Contact) => void;
  isLoading: boolean;
  density?: 'comfortable' | 'compact';
  users: { id: number; name: string; avatar_url?: string | null }[];
}

const columnHelper = createColumnHelper<Contact>();

// Click-to-edit status badge — avoids forcing a full edit-modal round trip
// for the single most commonly changed field on a contact.
function StatusCell({
  contact,
  editable,
}: {
  contact: Contact;
  editable: boolean;
}) {
  const [open, setOpen] = useState(false);
  const updateContact = useUpdateContact();
  const val = contact.lead_status || 'New';
  const badge = (
    <span
      className={`px-2 py-0.5 text-xs font-medium rounded-full ${
        STATUS_COLORS[val] ?? 'bg-slate-100 text-slate-800'
      }`}
    >
      {val}
    </span>
  );

  if (!editable) return badge;

  return (
    <div className="relative inline-block">
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setOpen((v) => !v);
        }}
        className="hover:ring-2 hover:ring-[var(--theme-accent)] rounded-full transition-shadow"
        title="Click to change status"
      >
        {badge}
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={(e) => { e.stopPropagation(); setOpen(false); }} />
          <div
            className="absolute left-0 top-full mt-1 w-40 bg-white border border-slate-200 rounded-lg shadow-lg z-20 py-1 text-xs"
            onClick={(e) => e.stopPropagation()}
          >
            {LEAD_STATUS_OPTIONS.map((status) => (
              <button
                key={status}
                onClick={() => {
                  setOpen(false);
                  if (status !== contact.lead_status) {
                    updateContact.mutate({ id: contact.id, payload: { lead_status: status } });
                  }
                }}
                className={`w-full text-left px-3 py-1.5 hover:bg-slate-50 ${
                  status === val ? 'font-semibold text-slate-800' : 'text-slate-600'
                }`}
              >
                {status}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// Reassigning ownership is admin-only — reps shouldn't be able to hand their
// own contacts off to someone else from a table cell.
function OwnerCell({
  contact,
  users,
  editable,
}: {
  contact: Contact;
  users: { id: number; name: string; avatar_url?: string | null }[];
  editable: boolean;
}) {
  const [open, setOpen] = useState(false);
  const assignOwner = useAssignOwner();
  const name = toTitleCase(contact.owner_name);
  const ownerAvatarUrl = users.find((u) => u.id === contact.owner_id)?.avatar_url;

  const label = name ? (
    <div className="flex items-center gap-1.5 min-w-0">
      <Avatar name={name} size="xs" avatarUrl={ownerAvatarUrl} />
      <span className="truncate">{name}</span>
    </div>
  ) : (
    <span className="text-slate-400">--</span>
  );

  if (!editable) return label;

  return (
    <div className="relative inline-block w-full">
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setOpen((v) => !v);
        }}
        className="hover:ring-2 hover:ring-[var(--theme-accent)] rounded transition-shadow w-full text-left"
        title="Click to reassign owner"
      >
        {label}
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={(e) => { e.stopPropagation(); setOpen(false); }} />
          <div
            className="absolute left-0 top-full mt-1 w-44 max-h-56 overflow-y-auto bg-white border border-slate-200 rounded-lg shadow-lg z-20 py-1 text-xs"
            onClick={(e) => e.stopPropagation()}
          >
            {users.map((u) => (
              <button
                key={u.id}
                onClick={() => {
                  setOpen(false);
                  if (u.id !== contact.owner_id) {
                    assignOwner.mutate({ contactId: contact.id, ownerId: u.id });
                  }
                }}
                className={`w-full flex items-center gap-1.5 text-left px-3 py-1.5 hover:bg-slate-50 truncate ${
                  u.id === contact.owner_id ? 'font-semibold text-slate-800' : 'text-slate-600'
                }`}
              >
                <Avatar name={u.name} size="xs" avatarUrl={u.avatar_url} />
                <span className="truncate">{toTitleCase(u.name)}</span>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

export default function ContactsTable({
  contacts,
  selectedIds,
  visibleColumns,
  columnOrder,
  onToggleSelect,
  onToggleSelectAll,
  onRowClick,
  onEdit,
  onDelete,
  isLoading,
  density = 'comfortable',
  users,
}: Props) {
  const { user, isAdmin } = useAuth();
  const allSelected = contacts.length > 0 && contacts.every((c) => selectedIds.has(c.id));

  // View All, Edit Owned Only: standard users can see every contact but
  // only edit/delete the ones they own. Admins can edit/delete anything.
  function canEdit(contact: Contact) {
    return isAdmin || contact.owner_id === user?.id;
  }

  const columns = useMemo(() => {
    const cols = [
      columnHelper.display({
        id: 'select',
        enableSorting: false,
        header: () => (
          <input
            type="checkbox"
            checked={allSelected}
            onChange={onToggleSelectAll}
            className="rounded border-slate-300 text-[var(--theme-accent)] focus:ring-[var(--theme-accent)]"
          />
        ),
        cell: ({ row }) => (
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
        ),
        size: 36,
      }),
    ];

    const columnBuilders: Record<string, () => any> = {
      id: () =>
        columnHelper.accessor('id', {
          header: 'ID',
          cell: (info) => <span className="text-slate-400">{info.getValue()}</span>,
        }),
      name: () =>
        columnHelper.accessor((row) => `${row.first_name} ${row.last_name}`.trim(), {
          id: 'name',
          header: 'Name',
          cell: (info) => {
            const displayName = toTitleCase(info.getValue()) || 'No Name';
            return (
              <div className="flex items-center gap-2 min-w-0">
                <Avatar name={displayName} size={density === 'compact' ? 'xs' : 'sm'} />
                <span className="font-medium text-slate-800 truncate">{displayName}</span>
              </div>
            );
          },
        }),
      company_name: () =>
        columnHelper.accessor('company_name', {
          header: 'Company',
          cell: (info) => toTitleCase(info.getValue()) || '--',
        }),
      email: () =>
        columnHelper.accessor('email', {
          header: 'Email',
          cell: (info) => info.getValue() || '--',
        }),
      phone: () =>
        columnHelper.accessor('phone', {
          header: 'Phone',
          cell: (info) => formatPhone(info.getValue()) || '--',
        }),
      job_title: () =>
        columnHelper.accessor('job_title', {
          header: 'Job Title',
          cell: (info) => toTitleCase(info.getValue()) || '--',
        }),
      owner_name: () =>
        columnHelper.accessor('owner_name', {
          header: 'Owner',
          cell: (info) => <OwnerCell contact={info.row.original} users={users} editable={isAdmin} />,
        }),
      tags: () =>
        columnHelper.accessor('tags', {
          header: 'Tags',
          enableSorting: false,
          cell: (info) => {
            const tags = info.getValue();
            if (!tags || tags.length === 0) return <span className="text-slate-400">--</span>;
            const [first, ...rest] = tags;
            return (
              <div className="flex items-center gap-1 flex-nowrap">
                <span
                  className={`px-2 py-0.5 text-[10px] font-medium rounded-full truncate max-w-[120px] ${getTagColorClasses(
                    first.name
                  )}`}
                  title={first.name}
                >
                  {first.name}
                </span>
                {rest.length > 0 && (
                  <span
                    className="px-1.5 py-0.5 text-[10px] font-semibold bg-slate-100 text-slate-600 rounded-full shrink-0"
                    title={rest.map((t) => t.name).join(', ')}
                  >
                    +{rest.length}
                  </span>
                )}
              </div>
            );
          },
        }),
      lead_status: () =>
        columnHelper.accessor('lead_status', {
          header: 'Status',
          cell: (info) => <StatusCell contact={info.row.original} editable={canEdit(info.row.original)} />,
        }),
      lead_score: () =>
        columnHelper.accessor('lead_score', {
          header: 'Lead Score',
          cell: (info) => <LeadScoreBadge score={info.getValue()} />,
        }),
      lead_source: () =>
        columnHelper.accessor('lead_source', {
          header: 'Lead Source',
          cell: (info) => info.getValue() || '--',
        }),
      location: () =>
        columnHelper.accessor(
          (row) => [row.city, row.state, row.country].filter(Boolean).join(', '),
          {
            id: 'location',
            header: 'Location',
            cell: (info) => info.getValue() || '--',
          }
        ),
      created_at: () =>
        columnHelper.accessor('created_at', {
          header: 'Created At',
          cell: (info) => (info.getValue() ? new Date(info.getValue()!).toLocaleDateString() : '--'),
        }),
      last_activity_at: () =>
        columnHelper.accessor('last_activity_at', {
          header: 'Last Activity',
          cell: (info) => {
            const value = info.getValue();
            if (!value) return <span className="text-slate-400">--</span>;
            // Flag anything untouched for 30+ days — the whole point of this
            // column is spotting contacts a rep has let go cold.
            const days = Math.floor((Date.now() - new Date(value).getTime()) / 86400000);
            return (
              <span className={days >= 30 ? 'text-amber-600 font-medium' : 'text-slate-600'}>
                {formatRelativeTime(value)}
              </span>
            );
          },
        }),
    };

    // "name" is always shown regardless of visibleColumns (it's the locked
    // column in ManageColumnsModal) — everything else follows the user's
    // configurable order + visibility.
    columnOrder
      .filter((key) => key === 'name' || visibleColumns[key])
      .forEach((key) => {
        const build = columnBuilders[key];
        if (build) cols.push(build());
      });

    // Actions column — pen (edit) and trash (delete), always last.
    // Hidden entirely for contacts the current user doesn't own (unless
    // admin) — "View All, Edit Owned Only".
    cols.push(
      columnHelper.display({
        id: 'actions',
        enableSorting: false,
        header: '',
        cell: ({ row }) => {
          if (!canEdit(row.original)) {
            return (
              <div className="flex items-center justify-end" title="View only — owned by another user">
                <i className="fa-solid fa-lock text-slate-300 text-[11px]" />
              </div>
            );
          }
          return (
            <div className="flex items-center gap-3 justify-end">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit(row.original);
                }}
                className="text-slate-400 hover:text-[var(--theme-accent)]"
                title="Edit"
              >
                <i className="fa-solid fa-pen text-xs" />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(row.original);
                }}
                className="text-slate-400 hover:text-rose-600"
                title={isAdmin ? 'Delete' : 'Archive'}
              >
                <i className={isAdmin ? 'fa-solid fa-trash text-xs' : 'fa-solid fa-box-archive text-xs'} />
              </button>
            </div>
          );
        },
      }) as any
    );

    return cols;
  }, [selectedIds, allSelected, visibleColumns, columnOrder, user, isAdmin, density, users]);

  const [sorting, setSorting] = useState<SortingState>([]);
  const [pagination, setPagination] = useState<PaginationState>({ pageIndex: 0, pageSize: 25 });

  const table = useReactTable({
    data: contacts,
    columns,
    state: { sorting, pagination },
    onSortingChange: setSorting,
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    enableMultiSort: true,
    isMultiSortEvent: (e) => (e as unknown as MouseEvent).shiftKey,
  });

  const cellPad = density === 'compact' ? 'py-1 px-2' : 'py-2 px-2';

  // Snap back to a valid page if the current one would be empty (a filter
  // change or a delete shrinking the list out from under it) — but don't
  // reset on every background poll, which would fight anyone paging
  // forward on a list that just happens to re-fetch every 15s.
  useEffect(() => {
    if (pagination.pageIndex > 0 && pagination.pageIndex * pagination.pageSize >= contacts.length) {
      setPagination((p) => ({ ...p, pageIndex: 0 }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contacts.length]);

  if (isLoading) {
    return (
      <div className="flex-1 overflow-hidden px-4">
        <div className="animate-pulse mt-3 space-y-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 py-1.5">
              <div className="w-4 h-4 rounded bg-slate-100 shrink-0" />
              <div className="w-7 h-7 rounded-full bg-slate-100 shrink-0" />
              <div className="h-3 rounded bg-slate-100 w-40" />
              <div className="h-3 rounded bg-slate-100 w-28" />
              <div className="h-3 rounded bg-slate-100 w-24" />
              <div className="h-3 rounded bg-slate-100 flex-1" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (contacts.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-2 text-slate-400">
        <i className="fa-solid fa-address-card text-2xl text-slate-300" />
        <span className="text-sm">No contacts found.</span>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-auto px-4">
      <table className="w-full text-sm border-collapse">
        <thead className="sticky top-0 bg-white z-10">
          {table.getHeaderGroups().map((hg) => (
            <tr key={hg.id} className="border-b border-slate-200">
              {hg.headers.map((h) => {
                const sortable = h.column.getCanSort();
                const sortState = h.column.getIsSorted();
                return (
                  <th
                    key={h.id}
                    onClick={sortable ? h.column.getToggleSortingHandler() : undefined}
                    title={sortable ? 'Click to sort, shift-click to sort by multiple columns' : undefined}
                    className={`text-left font-semibold text-slate-500 text-xs uppercase tracking-wide py-2 px-2 ${
                      sortable ? 'cursor-pointer select-none hover:text-slate-700' : ''
                    }`}
                  >
                    <span className="inline-flex items-center gap-1">
                      {flexRender(h.column.columnDef.header, h.getContext())}
                      {sortable && (
                        <i
                          className={`fa-solid ${
                            sortState === 'asc'
                              ? 'fa-arrow-up-short-wide'
                              : sortState === 'desc'
                                ? 'fa-arrow-down-wide-short'
                                : 'fa-sort text-slate-300'
                          } text-[10px]`}
                        />
                      )}
                      {sortState && (h.column.getSortIndex() ?? 0) >= 0 && sorting.length > 1 && (
                        <span className="text-[9px] text-slate-400">{h.column.getSortIndex() + 1}</span>
                      )}
                    </span>
                  </th>
                );
              })}
            </tr>
          ))}
        </thead>
        <tbody>
          {table.getRowModel().rows.map((row) => (
            <tr
              key={row.id}
              onClick={() => onRowClick(row.original)}
              className={`border-b border-slate-100 cursor-pointer hover:bg-slate-50 ${
                selectedIds.has(row.original.id) ? 'bg-[var(--theme-accent-tint)]' : ''
              }`}
            >
              {row.getVisibleCells().map((cell) => (
                <td key={cell.id} className={`${cellPad} align-middle`}>
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>

      <div className="flex items-center justify-between py-3 sticky bottom-0 bg-white border-t border-slate-100 -mx-4 px-4">
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <span>Rows per page:</span>
          <select
            value={pagination.pageSize}
            onChange={(e) => setPagination({ pageIndex: 0, pageSize: Number(e.target.value) })}
            className="border border-slate-200 rounded-md text-xs py-1 px-1.5 focus:outline-none focus:ring-2 focus:ring-[var(--theme-accent)]"
          >
            {[25, 50, 100, 200].map((size) => (
              <option key={size} value={size}>
                {size}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-xs text-slate-500">
            {contacts.length === 0
              ? '0 of 0'
              : `${pagination.pageIndex * pagination.pageSize + 1}-${Math.min(
                  (pagination.pageIndex + 1) * pagination.pageSize,
                  contacts.length
                )} of ${contacts.length}`}
          </span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => table.setPageIndex(0)}
              disabled={!table.getCanPreviousPage()}
              className="w-7 h-7 flex items-center justify-center rounded text-slate-500 hover:bg-slate-100 disabled:opacity-30 disabled:hover:bg-transparent"
              title="First page"
            >
              <i className="fa-solid fa-angles-left text-[11px]" />
            </button>
            <button
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
              className="w-7 h-7 flex items-center justify-center rounded text-slate-500 hover:bg-slate-100 disabled:opacity-30 disabled:hover:bg-transparent"
              title="Previous page"
            >
              <i className="fa-solid fa-angle-left text-[11px]" />
            </button>
            <button
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
              className="w-7 h-7 flex items-center justify-center rounded text-slate-500 hover:bg-slate-100 disabled:opacity-30 disabled:hover:bg-transparent"
              title="Next page"
            >
              <i className="fa-solid fa-angle-right text-[11px]" />
            </button>
            <button
              onClick={() => table.setPageIndex(table.getPageCount() - 1)}
              disabled={!table.getCanNextPage()}
              className="w-7 h-7 flex items-center justify-center rounded text-slate-500 hover:bg-slate-100 disabled:opacity-30 disabled:hover:bg-transparent"
              title="Last page"
            >
              <i className="fa-solid fa-angles-right text-[11px]" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
