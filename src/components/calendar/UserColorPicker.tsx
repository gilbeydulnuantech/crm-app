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
    return <span className="w-2.5 h-2.5 rounded-full ring-1 ring-black/10 shrink-0" style={{ backgroundColor: color }} />;
  }

  return (
    <div className="relative shrink-0">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        title="Change color"
        className="w-2.5 h-2.5 rounded-full ring-1 ring-black/10 hover:ring-2 hover:ring-indigo-400 transition-all"
        style={{ backgroundColor: color }}
      />
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute top-full mt-1 left-0 z-20 bg-white border border-slate-200 rounded-lg shadow-lg p-2.5 w-36">
            <div className="grid grid-cols-4 gap-1.5 mb-2">
              {PRESETS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => {
                    onChange(c);
                    setOpen(false);
                  }}
                  className={`w-6 h-6 rounded-full ring-1 ring-black/10 ${c === color ? 'ring-2 ring-indigo-500' : ''}`}
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
