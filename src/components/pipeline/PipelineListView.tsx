import { useMemo, useState } from 'react';
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  SortingState,
  VisibilityState,
  useReactTable,
} from '@tanstack/react-table';
import { Opportunity, Stage } from '../../types/opportunity';
import { toTitleCase } from '../../utils/text';

interface Props {
  opportunities: Opportunity[];
  stages: Stage[];
  onRowClick: (opportunity: Opportunity) => void;
  isLoading: boolean;
  columnVisibility: VisibilityState;
  onColumnVisibilityChange: (updater: VisibilityState | ((old: VisibilityState) => VisibilityState)) => void;
}

const columnHelper = createColumnHelper<Opportunity>();

// Opportunity (name) and Value stay mandatory — everything else is
// toggleable via PipelineColumnsMenu, mirroring CompaniesTable's convention.
const OPTIONAL_COLUMNS = ['company_name', 'contact_name', 'stage', 'assigned_user_name', 'expected_close'] as const;
const COLUMN_LABELS: Record<(typeof OPTIONAL_COLUMNS)[number], string> = {
  company_name: 'Company',
  contact_name: 'Contact',
  stage: 'Stage',
  assigned_user_name: 'Owner',
  expected_close: 'Due Date',
};

export function PipelineColumnsMenu({
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
                {COLUMN_LABELS[id]}
              </label>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function currency(val?: number | string | null) {
  if (val === undefined || val === null || val === '') return '--';

  const n = Number(val);
  if (isNaN(n)) return '--';

  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
  }).format(n);
}

export default function PipelineListView({
  opportunities,
  stages,
  onRowClick,
  isLoading,
  columnVisibility,
  onColumnVisibilityChange,
}: Props) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const stageName = (id: number) => stages.find((s) => s.id === id)?.name ?? '--';

  const columns = useMemo(
    () => [
      columnHelper.accessor('name', {
        header: 'Opportunity',
        cell: (info) => <span className="font-medium text-slate-800">{toTitleCase(info.getValue())}</span>,
      }),
      columnHelper.accessor('company_name', {
        header: 'Company',
        cell: (info) => toTitleCase(info.getValue()) || '--',
      }),
      columnHelper.accessor('contact_name', {
        header: 'Contact',
        cell: (info) => toTitleCase(info.getValue()) || '--',
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
        cell: (info) => toTitleCase(info.getValue()) || '--',
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
    state: { sorting, columnVisibility },
    onSortingChange: setSorting,
    onColumnVisibilityChange: onColumnVisibilityChange,
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
