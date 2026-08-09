export interface ColumnDef {
  key: string;
  label: string;
  locked?: boolean; // always visible, no checkbox
}

export const CONTACT_COLUMNS: ColumnDef[] = [
  { key: 'id', label: 'ID' },
  { key: 'name', label: 'Name', locked: true },
  { key: 'company_name', label: 'Company' },
  { key: 'email', label: 'Email' },
  { key: 'phone', label: 'Phone' },
  { key: 'job_title', label: 'Job Title' },
  { key: 'owner_name', label: 'Owner' },
  { key: 'tags', label: 'Tags' },
  { key: 'lead_status', label: 'Status' },
  { key: 'lead_source', label: 'Lead Source' },
  { key: 'location', label: 'Location' },
  { key: 'created_at', label: 'Created At' },
];

export const DEFAULT_VISIBLE_COLUMNS: Record<string, boolean> = {
  id: true,
  name: true,
  company_name: true,
  email: false,
  phone: true,
  job_title: false,
  owner_name: true,
  tags: true,
  lead_status: true,
  lead_source: false,
  location: false,
  created_at: false,
};

interface Props {
  open: boolean;
  visible: Record<string, boolean>;
  onChange: (next: Record<string, boolean>) => void;
  onClose: () => void;
}

export default function ManageColumnsModal({ open, visible, onChange, onClose }: Props) {
  if (!open) return null;

  function toggle(key: string) {
    onChange({ ...visible, [key]: !visible[key] });
  }

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-slate-800">Manage Columns</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <i className="fa-solid fa-xmark" />
          </button>
        </div>

        <div className="space-y-1 max-h-[60vh] overflow-y-auto">
          {CONTACT_COLUMNS.map((col) => (
            <label
              key={col.key}
              className={`flex items-center gap-2.5 px-2 py-1.5 rounded-lg text-sm ${
                col.locked ? 'text-slate-400' : 'text-slate-700 hover:bg-slate-50 cursor-pointer'
              }`}
            >
              <input
                type="checkbox"
                checked={col.locked ? true : !!visible[col.key]}
                disabled={col.locked}
                onChange={() => toggle(col.key)}
                className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 disabled:opacity-50"
              />
              {col.label}
              {col.locked && <span className="text-[10px] text-slate-400 ml-auto">always shown</span>}
            </label>
          ))}
        </div>

        <button
          onClick={onClose}
          className="w-full mt-5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold py-2 rounded-lg"
        >
          Done
        </button>
      </div>
    </div>
  );
}
