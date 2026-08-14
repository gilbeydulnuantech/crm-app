import { useMemo, useRef, useState } from 'react';
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  useReactTable,
  VisibilityState,
} from '@tanstack/react-table';
import { Company } from '../../types/company';
import { useAllOpportunities, usePipelines } from '../../hooks/useOpportunities';
import { useUpdateCompany } from '../../hooks/useCompanies';
import { COMPANY_HEALTH_DISPLAY } from '../../utils/companyHealth';

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
  onExport: () => void;
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
const DEFAULT_VISIBILITY: VisibilityState = Object.fromEntries(OPTIONAL_COLUMNS.map((id) => [id, false]));

function RowActionsMenu({
  company,
  canEdit,
  onEdit,
  onDelete,
  onClaim,
}: {
  company: Company;
  canEdit: boolean;
  onEdit: () => void;
  onDelete: () => void;
  onClaim: () => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Unowned companies get a one-click "Claim" instead of the Edit/Delete
  // menu — matches the mockup's row action for the "Unassigned" row.
  if (!company.owner_id) {
    return (
      <div className="flex justify-end">
        <button
          onClick={(e) => {
            e.stopPropagation();
            onClaim();
          }}
          className="px-2.5 py-1 text-xs font-semibold text-indigo-600 border border-indigo-200 rounded-lg hover:bg-indigo-50"
        >
          Claim
        </button>
      </div>
    );
  }

  if (!canEdit) {
    return (
      <div className="flex items-center justify-end" title="You can only edit companies you own">
        <i className="fa-solid fa-lock text-slate-300 text-xs" />
      </div>
    );
  }

  return (
    <div ref={ref} className="relative flex justify-end">
      <button
        onClick={(e) => {
          e.stopPropagation();
          setOpen((v) => !v);
        }}
        className="px-2.5 py-1 text-xs font-semibold text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50 flex items-center gap-1"
      >
        Edit
        <i className="fa-solid fa-chevron-down text-[9px]" />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={(e) => { e.stopPropagation(); setOpen(false); }} />
          <div className="absolute right-0 top-full mt-1 w-32 bg-white border border-slate-200 rounded-lg shadow-lg z-20 py-1">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setOpen(false);
                onEdit();
              }}
              className="w-full text-left px-3 py-1.5 text-xs text-slate-700 hover:bg-slate-50"
            >
              Edit
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setOpen(false);
                onDelete();
              }}
              className="w-full text-left px-3 py-1.5 text-xs text-rose-600 hover:bg-rose-50"
            >
              Delete
            </button>
          </div>
        </>
      )}
    </div>
  );
}

function ColumnsMenu({
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
        className="px-2.5 py-1.5 text-xs font-medium text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50 flex items-center gap-1.5"
      >
        Columns
        <i className="fa-solid fa-chevron-down text-[9px]" />
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
  onExport,
}: Props) {
  const { data: pipelines = [] } = usePipelines();
  const pipelineIds = useMemo(() => pipelines.map((p) => p.id), [pipelines]);
  const { data: allOpportunities = [] } = useAllOpportunities(pipelineIds);
  const updateCompany = useUpdateCompany();
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>(DEFAULT_VISIBILITY);

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

  function handleClaim(company: Company) {
    if (!currentUserId) return;
    updateCompany.mutate({ id: company.id, payload: { owner_id: currentUserId } });
  }

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
        cell: (info) => <span className="font-medium text-slate-800">{info.getValue()}</span>,
      }),
      columnHelper.accessor('tier', {
        header: 'Tier',
        cell: (info) => info.getValue() || '--',
      }),
      columnHelper.accessor('parent_company_name', {
        header: 'Parent Account',
        cell: (info) => info.getValue() || '--',
      }),
      columnHelper.accessor('owner_name', {
        header: 'Owner',
        cell: (info) => info.getValue() || 'Unassigned',
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
      columnHelper.accessor('updated_at', {
        header: 'Last Activity',
        cell: (info) => formatRelative(info.getValue()),
      }),
      columnHelper.display({
        id: 'actions',
        header: '',
        cell: ({ row }) => (
          <RowActionsMenu
            company={row.original}
            canEdit={canEdit(row.original)}
            onEdit={() => onEdit(row.original)}
            onDelete={() => onDelete(row.original)}
            onClaim={() => handleClaim(row.original)}
          />
        ),
      }),
    ],
    [selectedIds, allSelected, isAdmin, currentUserId, dealsByCompany]
  );

  const table = useReactTable({
    data: companies,
    columns,
    state: { columnVisibility },
    onColumnVisibilityChange: setColumnVisibility,
    getCoreRowModel: getCoreRowModel(),
  });

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center text-sm text-slate-400">
        Loading companies...
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <div className="px-4 py-2 flex justify-end gap-2 shrink-0">
        <ColumnsMenu
          visibility={columnVisibility}
          onToggle={(id) => setColumnVisibility((v) => ({ ...v, [id]: v[id] === false }))}
        />
        <button
          onClick={onExport}
          className="px-2.5 py-1.5 text-xs font-medium text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50 flex items-center gap-1.5"
        >
          <i className="fa-solid fa-file-export text-[10px]" />
          Export CSV
        </button>
      </div>

      {companies.length === 0 ? (
        <div className="flex-1 flex items-center justify-center text-sm text-slate-400">
          No companies found.
        </div>
      ) : (
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
      )}
    </div>
  );
}
