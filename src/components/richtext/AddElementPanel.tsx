import { useState } from 'react';

export type AddElementType =
  | 'text'
  | 'image'
  | 'video'
  | 'table'
  | 'productList'
  | 'pageBreak'
  | 'signature'
  | 'textField'
  | 'date'
  | 'initials'
  | 'checkbox';

const BLOCKS: { type: AddElementType; icon: string; label: string }[] = [
  { type: 'text', icon: 'fa-font', label: 'Text' },
  { type: 'image', icon: 'fa-image', label: 'Image' },
  { type: 'video', icon: 'fa-video', label: 'Video' },
  { type: 'table', icon: 'fa-table-cells', label: 'Table' },
  { type: 'productList', icon: 'fa-receipt', label: 'Product list' },
  { type: 'pageBreak', icon: 'fa-grip-lines', label: 'Page break' },
];

const FILLABLE_FIELDS: { type: AddElementType; icon: string; label: string }[] = [
  { type: 'signature', icon: 'fa-signature', label: 'Signature' },
  { type: 'textField', icon: 'fa-i-cursor', label: 'Text Field' },
  { type: 'date', icon: 'fa-calendar-day', label: 'Date' },
  { type: 'initials', icon: 'fa-pen-nib', label: 'Initials' },
  { type: 'checkbox', icon: 'fa-square-check', label: 'Checkbox' },
];

function ElementTile({ icon, label, onClick }: { icon: string; label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      className="flex flex-col items-center justify-center gap-1.5 py-3 px-2 border border-slate-200 rounded-lg hover:border-[var(--theme-accent)] hover:bg-[var(--theme-accent-tint)] transition-colors"
    >
      <i className={`fa-solid ${icon} text-slate-500 text-base`} />
      <span className="text-[11px] font-medium text-slate-600">{label}</span>
    </button>
  );
}

export default function AddElementPanel({
  onSelect,
  onClose,
  layout = 'top',
}: {
  onSelect: (type: AddElementType) => void;
  onClose: () => void;
  layout?: 'top' | 'right';
}) {
  const [tab, setTab] = useState<'blocks' | 'fillable'>('blocks');

  return (
    <div
      className={`absolute z-20 w-80 bg-white border border-slate-200 rounded-xl shadow-xl p-4 ${
        layout === 'right' ? 'right-full top-0 mr-1' : 'top-full left-0 mt-1'
      }`}
    >
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-slate-700">Add an Element</h3>
        <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={onClose} className="text-slate-400 hover:text-slate-600">
          <i className="fa-solid fa-xmark" />
        </button>
      </div>

      <div className="flex items-center gap-1 mb-3 border-b border-slate-200">
        <button
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => setTab('blocks')}
          className={`px-3 py-1.5 text-xs font-semibold border-b-2 -mb-px ${
            tab === 'blocks' ? 'border-[var(--theme-accent)] text-slate-800' : 'border-transparent text-slate-400 hover:text-slate-600'
          }`}
        >
          Blocks
        </button>
        <button
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => setTab('fillable')}
          className={`px-3 py-1.5 text-xs font-semibold border-b-2 -mb-px ${
            tab === 'fillable' ? 'border-[var(--theme-accent)] text-slate-800' : 'border-transparent text-slate-400 hover:text-slate-600'
          }`}
        >
          Fillable Fields
        </button>
      </div>

      {tab === 'blocks' ? (
        <div className="grid grid-cols-3 gap-2">
          {BLOCKS.map((b) => (
            <ElementTile key={b.type} icon={b.icon} label={b.label} onClick={() => onSelect(b.type)} />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-2">
          {FILLABLE_FIELDS.map((f) => (
            <ElementTile key={f.type} icon={f.icon} label={f.label} onClick={() => onSelect(f.type)} />
          ))}
        </div>
      )}
    </div>
  );
}
