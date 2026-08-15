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
  VisibilityState,
} from '@tanstack/react-table';
import { Company } from '../../types/company';
import { useAllOpportunities, usePipelines } from '../../hooks/useOpportunities';
import { useUpdateCompany } from '../../hooks/useCompanies';
import { COMPANY_HEALTH_DISPLAY } from '../../utils/companyHealth';
import { toTitleCase } from '../../utils/text';
import Avatar from '../Avatar';

interface Props {
  companies: Company[];
  selectedIds: Set<number>;
  onToggleSelect: (id: number) => void;
  onToggleSelectAll: () => void;
  onRowClick: (company: Company) => void;
  onEdit: (company: Company) => void;
  onDelete: (company: Company) => void;
  isLoading: boolean;
  isAdmin: boolean;
  currentUserId?: number;
  users: { id: number; name: string }[];
  density?: 'comfortable' | 'compact';
  columnVisibility: VisibilityState;
  onColumnVisibilityChange: (updater: VisibilityState | ((old: VisibilityState) => VisibilityState)) => void;
}

const columnHelper = createColumnHelper<Company>();

function formatRelative(dateStr?: string) {
  if (!dateStr) return '--';
  const date = new Date(dateStr);
  const diffDays = Math.floor((Date.now() - date.getTime()) / 86400000);
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  return date.toLocaleDateString();
}

const OPTIONAL_COLUMNS = ['industry', 'contact_count', 'opportunity_count', 'location', 'updated_at'] as const;
export const DEFAULT_COMPANY_COLUMN_VISIBILITY: VisibilityState = Object.fromEntries(
  OPTIONAL_COLUMNS.map((id) => [id, false])
);

function RowActionsMenu({
  company,
  canEdit,
  onEdit,
  onDelete,
}: {
  company: Company;
  canEdit: boolean;
  onEdit: () => void;
  onDelete: () => void;
}) {
  // View All, Edit Owned Only, same as Contacts — including unassigned
  // companies: only an admin can edit those (canEdit already accounts for
  // that), everyone else just sees the lock, same as a company someone
  // else owns. Ownership itself is assigned from the Owner column, not here.
  if (!canEdit) {
    return (
      <div
        className="flex items-center justify-end"
        title={company.owner_id == null ? 'Unassigned — an admin can assign an owner' : 'View only — owned by another user'}
      >
        <i className="fa-solid fa-lock text-slate-300 text-[11px]" />
      </div>
    );
  }

  // Matches ContactsTable's actions cell exactly — inline pencil/trash, no
  // dropdown — for the same row-scanning affordance in both tables.
  return (
    <div className="flex items-center gap-3 justify-end">
      <button
        onClick={(e) => {
          e.stopPropagation();
          onEdit();
        }}
        className="text-slate-400 hover:text-indigo-600"
        title="Edit"
      >
        <i className="fa-solid fa-pen text-xs" />
      </button>
      <button
        onClick={(e) => {
          e.stopPropagation();
          onDelete();
        }}
        className="text-slate-400 hover:text-rose-600"
        title="Delete"
      >
        <i className="fa-solid fa-trash text-xs" />
      </button>
    </div>
  );
}

// Owner assignment lives here, not in row actions — admin-only, mirrors
// ContactsTable's OwnerCell exactly (same interaction, same permission
// model), including for currently-unassigned rows (no self-serve claim).
function CompanyOwnerCell({
  company,
  users,
  editable,
}: {
  company: Company;
  users: { id: number; name: string }[];
  editable: boolean;
}) {
  const [open, setOpen] = useState(false);
  const updateCompany = useUpdateCompany();
  const name = toTitleCase(company.owner_name);

  const label = name ? (
    <div className="flex items-center gap-1.5 min-w-0">
      <Avatar name={name} size="xs" />
      <span className="truncate">{name}</span>
    </div>
  ) : (
    <span className="text-slate-400">Unassigned</span>
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
        title="Click to assign owner"
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
                  if (u.id !== company.owner_id) {
                    updateCompany.mutate({ id: company.id, payload: { owner_id: u.id } });
                  }
                }}
                className={`w-full text-left px-3 py-1.5 hover:bg-slate-50 truncate ${
                  u.id === company.owner_id ? 'font-semibold text-slate-800' : 'text-slate-600'
                }`}
              >
                {toTitleCase(u.name)}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

export function CompaniesColumnsMenu({
  visibility,
  onToggle,
}: {
  visibility: VisibilityState;
  onToggle: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const LABELS: Record<string, string> = {
    industry: 'Industry',
    contact_count: 'Contacts',
    opportunity_count: 'Deals',
    location: 'Location',
    updated_at: 'Last Activity',
  };
  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-indigo-600 py-1.5 px-2.5 border border-slate-200 rounded-md bg-white transition-colors"
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
                  className="rounded border-slate-300 text-indigo-600 focus:ring-[var(--theme-accent)]"
                />
                {LABELS[id]}
              </label>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

export default function CompaniesTable({
  companies,
  selectedIds,
  onToggleSelect,
  onToggleSelectAll,
  onRowClick,
  onEdit,
  onDelete,
  isLoading,
  isAdmin,
  currentUserId,
  users,
  density = 'comfortable',
  columnVisibility,
  onColumnVisibilityChange,
}: Props) {
  const { data: pipelines = [] } = usePipelines();
  const pipelineIds = useMemo(() => pipelines.map((p) => p.id), [pipelines]);
  const { data: allOpportunities = [] } = useAllOpportunities(pipelineIds);
  const [sorting, setSorting] = useState<SortingState>([]);
  const [pagination, setPagination] = useState<PaginationState>({ pageIndex: 0, pageSize: 25 });

  // View All, Edit Owned Only: standard users can see every company but
  // only edit/delete/select the ones they own. Admins can act on anything.
  function canEdit(company: Company) {
    return isAdmin || company.owner_id === currentUserId;
  }

  const dealsByCompany = useMemo(() => {
    const map = new Map<number, { pipeline: number; arr: number }>();
    for (const d of allOpportunities) {
      if (!d.account_id) continue;
      const entry = map.get(d.account_id) ?? { pipeline: 0, arr: 0 };
      if (d.status === 'Open') entry.pipeline += Number(d.deal_value ?? 0);
      if (d.status === 'Won') entry.arr += Number(d.deal_value ?? 0);
      map.set(d.account_id, entry);
    }
    return map;
  }, [allOpportunities]);

  const selectableCompanies = useMemo(() => companies.filter(canEdit), [companies, isAdmin, currentUserId]);
  const allSelected =
    selectableCompanies.length > 0 && selectableCompanies.every((c) => selectedIds.has(c.id));

  const columns = useMemo(
    () => [
      columnHelper.display({
        id: 'select',
        enableSorting: false,
        header: () =>
          selectableCompanies.length > 0 ? (
            <input
              type="checkbox"
              checked={allSelected}
              onChange={onToggleSelectAll}
              className="rounded border-slate-300 text-indigo-600 focus:ring-[var(--theme-accent)]"
            />
          ) : null,
        cell: ({ row }) =>
          canEdit(row.original) ? (
            <input
              type="checkbox"
              checked={selectedIds.has(row.original.id)}
              onChange={() => onToggleSelect(row.original.id)}
              className="rounded border-slate-300 text-indigo-600 focus:ring-[var(--theme-accent)]"
            />
          ) : null,
        size: 36,
      }),
      columnHelper.accessor('name', {
        header: 'Company',
        cell: (info) => {
          const name = toTitleCase(info.getValue()) || info.getValue();
          return (
            <div className="flex items-center gap-2 min-w-0">
              <Avatar name={name} size={density === 'compact' ? 'xs' : 'sm'} />
              <span className="font-medium text-slate-800 truncate">{name}</span>
            </div>
          );
        },
      }),
      columnHelper.accessor('tier', {
        header: 'Tier',
        cell: (info) => info.getValue() || '--',
      }),
      columnHelper.accessor('parent_company_name', {
        header: 'Parent Account',
        cell: (info) => toTitleCase(info.getValue()) || '--',
      }),
      columnHelper.accessor('owner_name', {
        header: 'Owner',
        cell: (info) => <CompanyOwnerCell company={info.row.original} users={users} editable={isAdmin} />,
      }),
      columnHelper.display({
        id: 'open_pipeline',
        header: 'Open Pipeline',
        cell: ({ row }) => `$${(dealsByCompany.get(row.original.id)?.pipeline ?? 0).toLocaleString()}`,
      }),
      columnHelper.display({
        id: 'arr',
        header: 'ARR',
        cell: ({ row }) => `$${(dealsByCompany.get(row.original.id)?.arr ?? 0).toLocaleString()}`,
      }),
      columnHelper.accessor('account_health', {
        id: 'health',
        header: 'Health',
        cell: (info) => {
          const val = info.getValue();
          const display = val ? COMPANY_HEALTH_DISPLAY[val] : undefined;
          return display ? (
            <span>
              {display.emoji} {display.shortLabel}
            </span>
          ) : (
            '--'
          );
        },
      }),
      // Hidden by default (toggle via "Columns") — the mockup's core set
      // above covers what sales ops actually filters/scans by; these stay
      // available rather than being removed outright.
      columnHelper.accessor('industry', {
        header: 'Industry',
        cell: (info) => toTitleCase(info.getValue()) || '--',
      }),
      columnHelper.accessor('contact_count', {
        header: 'Contacts',
        cell: (info) => info.getValue() ?? 0,
      }),
      columnHelper.accessor('opportunity_count', {
        header: 'Deals',
        cell: (info) => info.getValue() ?? 0,
      }),
      columnHelper.accessor((row) => [row.city, row.state, row.country].filter(Boolean).join(', '), {
        id: 'location',
        header: 'Location',
        cell: (info) => toTitleCase(info.getValue()) || '--',
      }),
      columnHelper.accessor('updated_at', {
        header: 'Last Activity',
        cell: (info) => formatRelative(info.getValue()),
      }),
      columnHelper.display({
        id: 'actions',
        enableSorting: false,
        header: '',
        cell: ({ row }) => (
          <RowActionsMenu
            company={row.original}
            canEdit={canEdit(row.original)}
            onEdit={() => onEdit(row.original)}
            onDelete={() => onDelete(row.original)}
          />
        ),
      }),
    ],
    [selectedIds, allSelected, isAdmin, currentUserId, dealsByCompany, density, users]
  );

  const table = useReactTable({
    data: companies,
    columns,
    state: { columnVisibility, sorting, pagination },
    onColumnVisibilityChange,
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
  // change or a delete shrinking the list out from under it).
  useEffect(() => {
    if (pagination.pageIndex > 0 && pagination.pageIndex * pagination.pageSize >= companies.length) {
      setPagination((p) => ({ ...p, pageIndex: 0 }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [companies.length]);

  if (isLoading) {
    return (
      <div className="flex-1 px-4">
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

  return (
    <div className="flex-1 flex flex-col min-h-0">
      {companies.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-2 text-slate-400">
          <i className="fa-solid fa-building text-2xl text-slate-300" />
          <span className="text-sm">No companies found.</span>
        </div>
      ) : (
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
                    selectedIds.has(row.original.id) ? 'bg-indigo-50/40' : ''
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
                {companies.length === 0
                  ? '0 of 0'
                  : `${pagination.pageIndex * pagination.pageSize + 1}-${Math.min(
                      (pagination.pageIndex + 1) * pagination.pageSize,
                      companies.length
                    )} of ${companies.length}`}
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
      )}
    </div>
  );
}
