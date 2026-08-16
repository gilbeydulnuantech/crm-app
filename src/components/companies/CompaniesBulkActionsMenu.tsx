import { useState } from 'react';
import { CompaniesView } from '../../types/company';

interface Props {
  view: CompaniesView;
  selectedCount: number;
  onArchiveSelected: () => void;
  onRestoreSelected: () => void;
  onDeleteSelected: () => void;
  onExport: () => void;
}

export default function CompaniesBulkActionsMenu({
  view,
  selectedCount,
  onArchiveSelected,
  onRestoreSelected,
  onDeleteSelected,
  onExport,
}: Props) {
  const [open, setOpen] = useState(false);

  const run = (fn: () => void) => {
    fn();
    setOpen(false);
  };

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-indigo-600 py-1.5 px-2.5 border border-slate-200 rounded-md bg-white transition-colors"
      >
        <span>Bulk Actions</span>
        <i className="fa-solid fa-chevron-down text-[10px]" />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute bottom-full mb-1 left-0 w-48 bg-white border border-slate-200 rounded-lg shadow-lg z-20 py-1 text-xs">
            {view === 'archived' ? (
              <button
                disabled={selectedCount === 0}
                onClick={() => run(onRestoreSelected)}
                className="w-full text-left px-3 py-1.5 hover:bg-slate-50 text-slate-700 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Restore Selected
              </button>
            ) : (
              <button
                disabled={selectedCount === 0}
                onClick={() => run(onArchiveSelected)}
                className="w-full text-left px-3 py-1.5 hover:bg-slate-50 text-slate-700 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Archive Selected
              </button>
            )}
            <button
              disabled={selectedCount === 0}
              onClick={() => run(onDeleteSelected)}
              className="w-full text-left px-3 py-1.5 hover:bg-rose-50 text-rose-600 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Delete Permanently
            </button>
            <div className="border-t border-slate-100 my-1" />
            <button onClick={() => run(onExport)} className="w-full text-left px-3 py-1.5 hover:bg-slate-50 text-slate-700">
              Export
            </button>
          </div>
        </>
      )}
    </div>
  );
}
