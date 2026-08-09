/*
import { useMemo } from 'react';
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  SortingState,
  useReactTable,
} from '@tanstack/react-table';
import { useState } from 'react';
import { Opportunity, Stage } from '../../types/opportunity';

interface Props {
  opportunities: Opportunity[];
  stages: Stage[];
  onRowClick: (opportunity: Opportunity) => void;
  isLoading: boolean;
}

const columnHelper = createColumnHelper<Opportunity>();

function currency(n?: number | null) {
  if (n === undefined || n === null) return '--';
  return `$${n.toLocaleString()}`;
}

export default function PipelineListView({ opportunities, stages, onRowClick, isLoading }: Props) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const stageName = (id: number) => stages.find((s) => s.id === id)?.name ?? '--';

  const columns = useMemo(
    () => [
      columnHelper.accessor('name', {
        header: 'Opportunity',
        cell: (info) => <span className="font-medium text-slate-800">{info.getValue()}</span>,
      }),
      columnHelper.accessor('company_name', {
        header: 'Company',
        cell: (info) => info.getValue() || '--',
      }),
      columnHelper.accessor('contact_name', {
        header: 'Contact',
        cell: (info) => info.getValue() || '--',
      }),
      columnHelper.accessor((row) => stageName(row.stage_id), {
        id: 'stage',
        header: 'Stage',
        cell: (info) => (
          <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-indigo-50 text-indigo-700">
            {info.getValue()}
          </span>
        ),
      }),
      columnHelper.accessor('deal_value', {
        header: 'Value',
        cell: (info) => currency(info.getValue()),
      }),
      columnHelper.accessor('assigned_user_name', {
        header: 'Owner',
        cell: (info) => info.getValue() || '--',
      }),
      columnHelper.accessor('expected_close', {
        header: 'Due Date',
        cell: (info) => (info.getValue() ? new Date(info.getValue()!).toLocaleDateString() : '--'),
      }),
    ],
    [stages]
  );

  const table = useReactTable({
    data: opportunities,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center text-sm text-slate-400">
        Loading pipeline...
      </div>
    );
  }

  if (opportunities.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center text-sm text-slate-400">
        No opportunities found.
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
                  onClick={h.column.getToggleSortingHandler()}
                  className="text-left font-semibold text-slate-500 text-xs uppercase tracking-wide py-2 px-2 cursor-pointer select-none"
                >
                  {flexRender(h.column.columnDef.header, h.getContext())}
                  {{ asc: ' ▲', desc: ' ▼' }[h.column.getIsSorted() as string] ?? ''}
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
              className="border-b border-slate-100 cursor-pointer hover:bg-slate-50"
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
  */
 import { useMemo, useState } from 'react';
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  SortingState,
  useReactTable,
} from '@tanstack/react-table';
import { Opportunity, Stage } from '../../types/opportunity';

interface Props {
  opportunities: Opportunity[];
  stages: Stage[];
  onRowClick: (opportunity: Opportunity) => void;
  isLoading: boolean;
}

const columnHelper = createColumnHelper<Opportunity>();

// FIX: Robust currency formatter that handles strings, numbers, and nulls
function currency(val?: number | string | null) {
  if (val === undefined || val === null || val === '') return '--';
  
  // Convert to number to fix the "0800" leading zero issue
  const n = Number(val);
  
  // Check if the conversion resulted in a valid number
  if (isNaN(n)) return '--';

  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
  }).format(n);
}

export default function PipelineListView({ opportunities, stages, onRowClick, isLoading }: Props) {
  const [sorting, setSorting] = useState<SortingState>([]);
  
  // Memoize stage lookup for performance
  const stageName = (id: number) => stages.find((s) => s.id === id)?.name ?? '--';

  const columns = useMemo(
    () => [
      columnHelper.accessor('name', {
        header: 'Opportunity',
        cell: (info) => <span className="font-medium text-slate-800">{info.getValue()}</span>,
      }),
      columnHelper.accessor('company_name', {
        header: 'Company',
        cell: (info) => info.getValue() || '--',
      }),
      columnHelper.accessor('contact_name', {
        header: 'Contact',
        cell: (info) => info.getValue() || '--',
      }),
      columnHelper.accessor((row) => stageName(row.stage_id), {
        id: 'stage',
        header: 'Stage',
        cell: (info) => (
          <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-indigo-50 text-indigo-700">
            {info.getValue()}
          </span>
        ),
      }),
      columnHelper.accessor('deal_value', {
        header: 'Value',
        // FIX: The currency function now handles the formatting correctly
        cell: (info) => currency(info.getValue()),
      }),
      columnHelper.accessor('assigned_user_name', {
        header: 'Owner',
        cell: (info) => info.getValue() || '--',
      }),
      columnHelper.accessor('expected_close', {
        header: 'Due Date',
        cell: (info) => (info.getValue() ? new Date(info.getValue()!).toLocaleDateString() : '--'),
      }),
    ],
    [stages]
  );

  const table = useReactTable({
    data: opportunities,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center text-sm text-slate-400">
        Loading pipeline...
      </div>
    );
  }

  if (opportunities.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center text-sm text-slate-400">
        No opportunities found.
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
                  onClick={h.column.getToggleSortingHandler()}
                  className="text-left font-semibold text-slate-500 text-xs uppercase tracking-wide py-2 px-2 cursor-pointer select-none"
                >
                  <div className="flex items-center gap-1">
                    {flexRender(h.column.columnDef.header, h.getContext())}
                    <span className="text-[10px]">
                      {{ asc: ' ▲', desc: ' ▼' }[h.column.getIsSorted() as string] ?? ''}
                    </span>
                  </div>
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
              className="border-b border-slate-100 cursor-pointer hover:bg-slate-50 transition-colors"
            >
              {row.getVisibleCells().map((cell) => (
                <td key={cell.id} className="py-2.5 px-2 align-middle">
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
