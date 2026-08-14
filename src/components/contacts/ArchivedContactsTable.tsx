import { useMemo } from 'react';
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from '@tanstack/react-table';
import { ArchivedContact } from '../../types/contact';
import { toTitleCase } from '../../utils/text';

interface Props {
  contacts: ArchivedContact[];
  selectedIds: Set<number>;
  onToggleSelect: (id: number) => void;
  onToggleSelectAll: () => void;
  isLoading: boolean;
}

const columnHelper = createColumnHelper<ArchivedContact>();

export default function ArchivedContactsTable({
  contacts,
  selectedIds,
  onToggleSelect,
  onToggleSelectAll,
  isLoading,
}: Props) {
  const allSelected = contacts.length > 0 && contacts.every((c) => selectedIds.has(c.id));

  const columns = useMemo(
    () => [
      columnHelper.display({
        id: 'select',
        header: () => (
          <input
            type="checkbox"
            checked={allSelected}
            onChange={onToggleSelectAll}
            className="rounded border-slate-300 text-indigo-600 focus:ring-[var(--theme-accent)]"
          />
        ),
        cell: ({ row }) => (
          <input
            type="checkbox"
            checked={selectedIds.has(row.original.id)}
            onChange={() => onToggleSelect(row.original.id)}
            className="rounded border-slate-300 text-indigo-600 focus:ring-[var(--theme-accent)]"
          />
        ),
        size: 36,
      }),
      columnHelper.accessor((row) => `${row.first_name} ${row.last_name}`.trim(), {
        id: 'name',
        header: 'Name',
        cell: (info) => (
          <span className="font-medium text-slate-800">{toTitleCase(info.getValue()) || 'No Name'}</span>
        ),
      }),
      columnHelper.accessor('company_name', {
        header: 'Company',
        cell: (info) => info.getValue() || '--',
      }),
      columnHelper.accessor('owner_name', {
        header: 'Owner',
        cell: (info) => toTitleCase(info.getValue()) || '--',
      }),
      columnHelper.accessor('archived_by_name', {
        header: 'Archived By',
        cell: (info) => info.getValue() || '--',
      }),
      columnHelper.accessor('archived_at', {
        header: 'Archived Date',
        cell: (info) => {
          const raw = info.getValue();
          if (!raw) return '--';
          return new Date(raw).toLocaleDateString();
        },
      }),
      columnHelper.accessor('archive_reason', {
        header: 'Reason',
        cell: (info) => info.getValue() || '--',
      }),
    ],
    [selectedIds, allSelected]
  );

  const table = useReactTable({
    data: contacts,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center text-sm text-slate-400">
        Loading archived contacts...
      </div>
    );
  }

  if (contacts.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center text-sm text-slate-400">
        No archived contacts.
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
            <tr key={row.id} className="border-b border-slate-100 hover:bg-slate-50">
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
