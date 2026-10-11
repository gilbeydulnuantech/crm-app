import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';

interface Props {
  onAddContact: () => void;
  onImportCsv: () => void;
  onFindLeads: () => void;
}

export default function AddContactDropdown({ onAddContact, onImportCsv, onFindLeads }: Props) {
  const { isAdmin } = useAuth();
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const run = (fn: () => void) => {
    fn();
    setOpen(false);
  };

  function copyBookingLink() {
    navigator.clipboard.writeText(`${window.location.origin}/book`);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
    setTimeout(() => setOpen(false), 600);
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="bg-[var(--theme-accent)] hover:bg-[var(--theme-accent-hover)] text-white text-sm font-medium px-3 py-1.5 rounded-lg flex items-center gap-2 shadow-sm transition-all"
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
            {/* The Maps import adds many contacts and sends outreach email, so the server only allows admins. */}
            {isAdmin && (
            <button
              onClick={() => run(onFindLeads)}
              className="w-full text-left px-3 py-2 hover:bg-slate-50 text-slate-700 flex items-center gap-2"
            >
              <i className="fa-solid fa-map-location-dot text-xs w-4 text-slate-400" />
              Find Leads (Google Maps)
            </button>
            )}
            <div className="my-1 border-t border-slate-100" />
            <button
              onClick={copyBookingLink}
              className="w-full text-left px-3 py-2 hover:bg-slate-50 text-slate-700 flex items-center gap-2"
            >
              <i className={`fa-solid ${copied ? 'fa-check text-emerald-500' : 'fa-link text-slate-400'} text-xs w-4`} />
              {copied ? 'Link copied!' : 'Copy Booking Link'}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
