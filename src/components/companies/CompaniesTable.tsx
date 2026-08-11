import { useMemo } from 'react';
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from '@tanstack/react-table';
import { Company } from '../../types/company';

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
}: Props) {
  // View All, Edit Owned Only: standard users can see every company but
  // only edit/delete/select the ones they own. Admins can act on anything.
  function canEdit(company: Company) {
    return isAdmin || company.owner_id === currentUserId;
  }

  const selectableCompanies = useMemo(() => companies.filter(canEdit), [companies, isAdmin, currentUserId]);
  const allSelected =
    selectableCompanies.length > 0 && selectableCompanies.every((c) => selectedIds.has(c.id));

  const columns = useMemo(
    () => [
      columnHelper.display({
        id: 'select',
        header: () =>
          selectableCompanies.length > 0 ? (
            <input
              type="checkbox"
              checked={allSelected}
              onChange={onToggleSelectAll}
              className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
            />
          ) : null,
        cell: ({ row }) =>
          canEdit(row.original) ? (
            <input
              type="checkbox"
              checked={selectedIds.has(row.original.id)}
              onChange={() => onToggleSelect(row.original.id)}
              className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
            />
          ) : null,
        size: 36,
      }),
      columnHelper.accessor('name', {
        header: 'Company',
        cell: (info) => <span className="font-medium text-slate-800">{info.getValue()}</span>,
      }),
      columnHelper.accessor('industry', {
        header: 'Industry',
        cell: (info) => info.getValue() || '--',
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
        cell: (info) => info.getValue() || '--',
      }),
      columnHelper.accessor('owner_name', {
        header: 'Owner',
        cell: (info) => info.getValue() || '--',
      }),
      columnHelper.accessor('updated_at', {
        header: 'Last Activity',
        cell: (info) => formatRelative(info.getValue()),
      }),
      columnHelper.display({
        id: 'actions',
        header: '',
        cell: ({ row }) =>
          canEdit(row.original) ? (
            <div className="flex items-center gap-2 justify-end">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit(row.original);
                }}
                className="text-slate-400 hover:text-indigo-600"
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
                title="Delete"
              >
                <i className="fa-solid fa-trash text-xs" />
              </button>
            </div>
          ) : (
            <div className="flex items-center justify-end" title="You can only edit companies you own">
              <i className="fa-solid fa-lock text-slate-300 text-xs" />
            </div>
          ),
      }),
    ],
    [selectedIds, allSelected, isAdmin, currentUserId]
  );

  const table = useReactTable({
    data: companies,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center text-sm text-slate-400">
        Loading companies...
      </div>
    );
  }

  if (companies.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center text-sm text-slate-400">
        No companies found.
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
              className={`border-b border-slate-100 cursor-pointer hover:bg-slate-50 ${
                selectedIds.has(row.original.id) ? 'bg-indigo-50/40' : ''
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
