import { ActivityLogEntry } from '../../types/activity';
import { toTitleCase } from '../../utils/text';

// Full-message popup for a Telegram entry in the activity log — same look as the
// email popup, so a long message cut off on the timeline card can be read whole.
export default function TelegramMessageModal({
  entry,
  onClose,
}: {
  entry: ActivityLogEntry | null;
  onClose: () => void;
}) {
  if (!entry) return null;
  const inbound = entry.subtype === 'inbound';
  const text = typeof entry.detail?.text === 'string' ? entry.detail.text : '';

  return (
    <div className="fixed inset-0 bg-slate-900/75 z-[110] flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[80vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 px-5 py-4 border-b border-slate-100 shrink-0">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide">
              Telegram · {inbound ? 'Reply' : 'Sent'}
            </p>
            <h3 className="text-sm font-bold text-slate-800 break-words">{entry.summary}</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              {inbound
                ? 'From the contact'
                : entry.actor_name && entry.actor_name !== 'Telegram'
                  ? `By ${toTitleCase(entry.actor_name)}`
                  : ''}
            </p>
            <p className="text-[11px] text-slate-400 mt-0.5">{new Date(entry.created_at).toLocaleString()}</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 shrink-0">
            <i className="fa-solid fa-xmark text-lg" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          <p className="text-sm text-slate-700 whitespace-pre-wrap break-words">{text || '--'}</p>
        </div>
      </div>
    </div>
  );
}
