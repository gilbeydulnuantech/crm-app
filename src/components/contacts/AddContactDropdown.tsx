import { useState } from 'react';

interface Props {
  onAddContact: () => void;
  onImportCsv: () => void;
}

export default function AddContactDropdown({ onAddContact, onImportCsv }: Props) {
  const [open, setOpen] = useState(false);

  const run = (fn: () => void) => {
    fn();
    setOpen(false);
  };

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium px-3 py-1.5 rounded-lg flex items-center gap-2 shadow-sm transition-all"
      >
        <i className="fa-solid fa-plus text-xs" />
        <span>Add Contact</span>
        <i className={`fa-solid fa-chevron-down text-[10px] transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute top-full mt-1 right-0 w-48 bg-white border border-slate-200 rounded-lg shadow-lg z-20 py-1 text-sm">
            <button
              onClick={() => run(onAddContact)}
              className="w-full text-left px-3 py-2 hover:bg-slate-50 text-slate-700 flex items-center gap-2"
            >
              <i className="fa-solid fa-plus text-xs w-4 text-slate-400" />
              Create New
            </button>
            <button
              onClick={() => run(onImportCsv)}
              className="w-full text-left px-3 py-2 hover:bg-slate-50 text-slate-700 flex items-center gap-2"
            >
              <i className="fa-solid fa-file-csv text-xs w-4 text-slate-400" />
              Import CSV
            </button>
          </div>
        </>
      )}
    </div>
  );
}
