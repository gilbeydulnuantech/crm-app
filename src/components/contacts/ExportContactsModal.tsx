import { useState } from 'react';
import { Contact } from '../../types/contact';
import { toTitleCase } from '../../utils/text';

interface FieldDef {
  key: string;
  label: string;
  get: (c: Contact) => string;
}

const FIELDS: FieldDef[] = [
  { key: 'id', label: 'ID', get: (c) => String(c.id) },
  { key: 'name', label: 'Name', get: (c) => `${c.first_name} ${c.last_name}`.trim() },
  { key: 'company_name', label: 'Company', get: (c) => c.company_name ?? '' },
  { key: 'email', label: 'Email', get: (c) => c.email ?? '' },
  { key: 'phone', label: 'Phone', get: (c) => c.phone ?? '' },
  { key: 'job_title', label: 'Job Title', get: (c) => c.job_title ?? '' },
  { key: 'owner_name', label: 'Owner', get: (c) => toTitleCase(c.owner_name) },
  { key: 'lead_status', label: 'Status', get: (c) => c.lead_status ?? '' },
  { key: 'lead_source', label: 'Lead Source', get: (c) => c.lead_source ?? '' },
  { key: 'tags', label: 'Tags', get: (c) => (c.tags ?? []).map((t) => t.name).join('; ') },
  {
    key: 'location',
    label: 'Location',
    get: (c) => [c.city, c.state, c.country].filter(Boolean).join(', '),
  },
  { key: 'created_at', label: 'Created At', get: (c) => (c.created_at ? new Date(c.created_at).toLocaleDateString() : '') },
  {
    key: 'last_activity_at',
    label: 'Last Activity',
    get: (c) => (c.last_activity_at ? new Date(c.last_activity_at).toLocaleDateString() : ''),
  },
];

const DEFAULT_FIELDS = new Set(['name', 'company_name', 'email', 'phone', 'lead_status']);

// CSV cells with a comma, quote, or newline need quoting/escaping — the old
// export just joined raw values with commas, which silently corrupted any
// row where e.g. a company name contained a comma.
function csvCell(value: string): string {
  if (/[",\n]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
  return value;
}

interface Props {
  open: boolean;
  contacts: Contact[];
  onClose: () => void;
}

export default function ExportContactsModal({ open, contacts, onClose }: Props) {
  const [selected, setSelected] = useState<Set<string>>(new Set(DEFAULT_FIELDS));

  if (!open) return null;

  function toggle(key: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  }

  function handleExport() {
    const fields = FIELDS.filter((f) => selected.has(f.key));
    if (fields.length === 0 || contacts.length === 0) return;

    const header = fields.map((f) => csvCell(f.label)).join(',');
    const rows = contacts.map((c) => fields.map((f) => csvCell(f.get(c))).join(','));
    const csv = [header, ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `contacts-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    onClose();
  }

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[110] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
        <h3 className="text-lg font-bold text-slate-800 mb-1">Export Contacts</h3>
        <p className="text-xs text-slate-500 mb-4">
          Choose which fields to include for {contacts.length} contact{contacts.length === 1 ? '' : 's'}.
        </p>

        <div className="grid grid-cols-2 gap-x-3 gap-y-2 max-h-64 overflow-y-auto pr-1 mb-5">
          {FIELDS.map((f) => (
            <label key={f.key} className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
              <input
                type="checkbox"
                checked={selected.has(f.key)}
                onChange={() => toggle(f.key)}
                className="rounded border-slate-300 text-indigo-600 focus:ring-[var(--theme-accent)]"
              />
              {f.label}
            </label>
          ))}
        </div>

        <div className="flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50 rounded-lg"
          >
            Cancel
          </button>
          <button
            onClick={handleExport}
            disabled={selected.size === 0}
            className="px-4 py-2 text-sm font-semibold bg-[var(--theme-accent)] hover:bg-[var(--theme-accent-hover)] text-white rounded-lg disabled:opacity-50"
          >
            Export CSV
          </button>
        </div>
      </div>
    </div>
  );
}
