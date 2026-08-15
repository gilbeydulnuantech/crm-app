import { ReactNode } from 'react';

interface Props {
  search: string;
  onSearchChange: (value: string) => void;
  placeholder?: string;
  onFiltersClick?: () => void;
  filterCount?: number;
  onColumnsClick?: () => void;
  rightExtra?: ReactNode;
  density?: 'comfortable' | 'compact';
  onDensityChange?: (density: 'comfortable' | 'compact') => void;
  // Renders at the very end of the far-right button group (after Filters/
  // Columns) — for a control that needs to sit at the far right of the row
  // rather than next to the search box, unlike `rightExtra`.
  endExtra?: ReactNode;
}

export default function SearchToolbar({
  search,
  onSearchChange,
  placeholder = 'Search...',
  onFiltersClick,
  filterCount,
  onColumnsClick,
  rightExtra,
  density,
  onDensityChange,
  endExtra,
}: Props) {
  return (
    <div className="p-4 border-b border-slate-200 flex items-center justify-between gap-4 shrink-0">
      <div className="flex items-center gap-2 flex-1">
        <div className="relative flex-1 max-w-sm">
          <i className="fa-solid fa-magnifying-glass absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs" />
          <input
            type="text"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={placeholder}
            className="w-full pl-8 pr-8 py-1.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--theme-accent)]"
          />
          {search && (
            <button
              type="button"
              onClick={() => onSearchChange('')}
              title="Clear search"
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-300 hover:text-slate-500"
            >
              <i className="fa-solid fa-xmark text-xs" />
            </button>
          )}
        </div>
        {rightExtra}
      </div>

      <div className="flex items-center gap-2">
        {onDensityChange && (
          <div className="flex items-center border border-slate-200 rounded-md overflow-hidden text-xs font-semibold">
            <button
              onClick={() => onDensityChange('comfortable')}
              title="Comfortable rows"
              className={`px-2 py-1.5 transition-colors ${
                density === 'comfortable'
                  ? 'bg-[var(--theme-accent-tint)] text-[var(--theme-accent)]'
                  : 'bg-white text-slate-500 hover:bg-slate-50'
              }`}
            >
              <i className="fa-solid fa-bars text-[10px]" />
            </button>
            <button
              onClick={() => onDensityChange('compact')}
              title="Compact rows"
              className={`px-2 py-1.5 border-l border-slate-200 transition-colors ${
                density === 'compact'
                  ? 'bg-[var(--theme-accent-tint)] text-[var(--theme-accent)]'
                  : 'bg-white text-slate-500 hover:bg-slate-50'
              }`}
            >
              <i className="fa-solid fa-list text-[10px]" />
            </button>
          </div>
        )}

        {onFiltersClick && (
          <button
            onClick={onFiltersClick}
            className="relative flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-indigo-600 py-1.5 px-2.5 border border-slate-200 rounded-md bg-white transition-colors"
          >
            <span>Filters</span>
            {!!filterCount && (
              <span className="w-4 h-4 flex items-center justify-center rounded-full bg-indigo-600 text-white text-[9px] font-bold">
                {filterCount}
              </span>
            )}
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

        {endExtra}
      </div>
    </div>
  );
}
