import { useState } from 'react';
import { ContactsView } from '../../types/contact';

interface Props {
  view: ContactsView;
  selectedCount: number;
  isAdmin: boolean;
  onArchive: () => void;
  onRestore: () => void;
  onDeletePermanently: () => void;
  onExport: () => void;
  onEnrich: () => void;
}

export default function BulkActionsMenu({
  view,
  selectedCount,
  isAdmin,
  onArchive,
  onRestore,
  onDeletePermanently,
  onExport,
  onEnrich,
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
        className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-[var(--theme-accent)] py-1.5 px-2.5 border border-slate-200 rounded-md bg-white transition-colors"
      >
        <span>Bulk Actions</span>
        <i className="fa-solid fa-chevron-down text-[10px]" />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute bottom-full mb-1 left-0 w-48 bg-white border border-slate-200 rounded-lg shadow-lg z-20 py-1 text-xs">
            {view === 'archived' ? (
              <>
                <button
                  disabled={selectedCount === 0}
                  onClick={() => run(onRestore)}
                  className="w-full text-left px-3 py-1.5 hover:bg-slate-50 text-slate-700 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Restore Contacts
                </button>
                {isAdmin && (
                  <button
                    disabled={selectedCount === 0}
                    onClick={() => run(onDeletePermanently)}
                    className="w-full text-left px-3 py-1.5 hover:bg-rose-50 text-rose-600 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    Delete Permanently
                  </button>
                )}
                <div className="border-t border-slate-100 my-1" />
                <button onClick={() => run(onExport)} className="w-full text-left px-3 py-1.5 hover:bg-slate-50 text-slate-700">
                  Export
                </button>
              </>
            ) : (
              <>
                <button
                  disabled={selectedCount === 0}
                  onClick={() => run(onArchive)}
                  className="w-full text-left px-3 py-1.5 hover:bg-slate-50 text-slate-700 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Archive Contacts
                </button>
                <button
                  disabled={selectedCount === 0 || selectedCount > 25}
                  onClick={() => run(onEnrich)}
                  title={selectedCount > 25 ? 'Enrich at most 25 at a time' : 'Look up missing emails/phones from each linked website'}
                  className="w-full text-left px-3 py-1.5 hover:bg-slate-50 text-slate-700 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Enrich Contacts
                </button>
                {isAdmin && (
                  <button
                    disabled={selectedCount === 0}
                    onClick={() => run(onDeletePermanently)}
                    className="w-full text-left px-3 py-1.5 hover:bg-rose-50 text-rose-600 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    Delete Permanently
                  </button>
                )}
                <div className="border-t border-slate-100 my-1" />
                <button onClick={() => run(onExport)} className="w-full text-left px-3 py-1.5 hover:bg-slate-50 text-slate-700">
                  Export
                </button>
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
}
