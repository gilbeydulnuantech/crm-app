import CardDisplayPanel from '../CardDisplayPanel';

interface Props {
  open: boolean;
  onClose: () => void;
}

export default function CardDisplayModal({ open, onClose }: Props) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 bg-slate-900/70 z-[100] flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-1">
          <h3 className="text-lg font-bold text-slate-800">Card display</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600" aria-label="Close">
            <i className="fa-solid fa-xmark" />
          </button>
        </div>
        <p className="text-xs text-slate-500 mb-4">
          How event cards and deal cards look for you: text size and which details show. It applies on the Calendar and the Sales Pipeline.
        </p>
        <CardDisplayPanel />
        <div className="flex justify-end pt-5">
          <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 rounded-lg">
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
