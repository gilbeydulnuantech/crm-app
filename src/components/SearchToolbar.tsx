import { ReactNode } from 'react';

interface Props {
  search: string;
  onSearchChange: (value: string) => void;
  placeholder?: string;
  onFiltersClick?: () => void;
  onColumnsClick?: () => void;
  rightExtra?: ReactNode;
}

export default function SearchToolbar({
  search,
  onSearchChange,
  placeholder = 'Search...',
  onFiltersClick,
  onColumnsClick,
  rightExtra,
}: Props) {
  return (
    <div className="p-4 border-b border-slate-200 flex items-center justify-between gap-4 shrink-0">
      <div className="relative flex-1 max-w-sm">
        <i className="fa-solid fa-magnifying-glass absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs" />
        <input
          type="text"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder={placeholder}
          className="w-full pl-8 pr-3 py-1.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--theme-accent)]"
        />
      </div>

      <div className="flex items-center gap-2">
        {rightExtra}

        {onFiltersClick && (
          <button
            onClick={onFiltersClick}
            className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-indigo-600 py-1.5 px-2.5 border border-slate-200 rounded-md bg-white transition-colors"
          >
            <span>Filters</span>
            <i className="fa-solid fa-chevron-down text-[10px]" />
          </button>
        )}

        {onColumnsClick && (
          <button
            onClick={onColumnsClick}
            className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-indigo-600 py-1.5 px-2.5 border border-slate-200 rounded-md bg-white transition-colors"
          >
            <span>Columns</span>
            <i className="fa-solid fa-gear text-[10px]" />
          </button>
        )}
      </div>
    </div>
  );
}
