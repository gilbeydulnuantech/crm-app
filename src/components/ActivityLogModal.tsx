import { ActivityLogEntry } from '../types/activity';
import { humanizeAuditSummary, toTitleCase } from '../utils/text';

const DETAIL_LABELS: Record<string, string> = {
  field: 'Field',
  old: 'Old Value',
  new: 'New Value',
  from: 'From',
  to: 'To',
  location: 'Location',
  due_at: 'Starts',
  end_at: 'Ends',
  is_all_day: 'All Day',
};

function formatDetailValue(key: string, value: unknown): string {
  if (value === null || value === undefined || value === '') return '--';
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (key.endsWith('_at') && typeof value === 'string') {
    const d = new Date(value);
    if (!isNaN(d.getTime())) return d.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
  }
  return String(value);
}

const ACTIVITY_CATEGORY_LABELS: Record<ActivityLogEntry['category'], string> = {
  call: 'Call',
  meeting: 'Meeting',
  system_audit: 'System Audit',
};

// Full-detail popup for an activity timeline entry — shared by
// ContactDetailModal and CompanyDetailModal so a meeting/system-audit/call
// summary (truncated to one line in the timeline) can be expanded to read
// the whole thing, same as clicking an email log opens its full body.
export default function ActivityLogModal({
  entry,
  onClose,
}: {
  entry: ActivityLogEntry | null;
  onClose: () => void;
}) {
  if (!entry) return null;
  const detailEntries = entry.detail
    ? Object.entries(entry.detail).filter(([, v]) => v !== null && v !== undefined && v !== '')
    : [];

  return (
    <div
      className="fixed inset-0 bg-slate-900/78 z-[110] flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[80vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 px-5 py-4 border-b border-slate-100 shrink-0">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide">
              {ACTIVITY_CATEGORY_LABELS[entry.category]}
              {entry.subtype ? ` · ${toTitleCase(entry.subtype.replace(/_/g, ' '))}` : ''}
            </p>
            <h3 className="text-sm font-bold text-slate-800 break-words">
              {entry.category === 'system_audit' ? humanizeAuditSummary(entry.summary) : entry.summary}
            </h3>
            {entry.actor_name && <p className="text-xs text-slate-500 mt-0.5">By {toTitleCase(entry.actor_name)}</p>}
            <p className="text-[11px] text-slate-400 mt-0.5">
              {new Date(entry.created_at).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}
            </p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 shrink-0">
            <i className="fa-solid fa-xmark text-lg" />
          </button>
        </div>

        {detailEntries.length > 0 && (
          <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
            {detailEntries.map(([key, value]) => (
              <div key={key}>
                <label className="block text-[11px] font-medium text-slate-500 mb-1">
                  {DETAIL_LABELS[key] ?? toTitleCase(key.replace(/_/g, ' '))}
                </label>
                <p className="text-sm text-slate-700 break-words">{formatDetailValue(key, value)}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
