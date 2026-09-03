import { useState } from 'react';

interface Props {
  color: string;
  onChange: (hex: string) => void;
  disabled?: boolean;
}

const PRESETS = ['#7C9CBF', '#86B89A', '#D9B477', '#A78BFA', '#F472B6', '#F87171', '#60A5FA', '#34D399'];

export default function UserColorPicker({ color, onChange, disabled }: Props) {
  const [open, setOpen] = useState(false);

  if (disabled) {
    return <span className="w-4 h-4 rounded-full ring-1 ring-black/10 shrink-0" style={{ backgroundColor: color }} />;
  }

  return (
    <div className="relative shrink-0">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        title="Change color"
        className="w-4 h-4 rounded-full ring-1 ring-black/10 hover:ring-2 hover:ring-[var(--theme-accent)] transition-all"
        style={{ backgroundColor: color }}
      />
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute top-full mt-1 left-0 z-20 bg-white border border-slate-200 rounded-lg shadow-lg p-3 w-48">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-slate-600">Choose Color</span>
              <button
                type="button"
                onClick={() => setOpen(false)}
                title="Close"
                className="w-5 h-5 flex items-center justify-center rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100"
              >
                <i className="fa-solid fa-xmark text-xs" />
              </button>
            </div>
            <div className="grid grid-cols-4 gap-1.5 mb-2">
              {PRESETS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => {
                    onChange(c);
                    setOpen(false);
                  }}
                  className={`w-6 h-6 rounded-full ring-1 ring-black/10 ${c === color ? 'ring-2 ring-[var(--theme-accent)]' : ''}`}
                  style={{ backgroundColor: c }}
                  title={c}
                />
              ))}
            </div>
            <input
              type="color"
              value={color}
              onChange={(e) => onChange(e.target.value)}
              className="w-full h-7 rounded cursor-pointer border border-slate-200"
            />
          </div>
        </>
      )}
    </div>
  );
}
