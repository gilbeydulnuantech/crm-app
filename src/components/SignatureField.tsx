import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import SignaturePad, { SignaturePadHandle } from './SignaturePad';

export interface SignatureFieldHandle {
  isEmpty: () => boolean;
  toDataURL: () => string;
}

const CURSIVE_FONT = "'Brush Script MT', 'Segoe Script', cursive";

interface Props {
  onChange?: (hasSignature: boolean) => void;
}

const SignatureField = forwardRef<SignatureFieldHandle, Props>(({ onChange }, ref) => {
  const [mode, setMode] = useState<'type' | 'draw'>('draw');
  const [text, setText] = useState('');
  const padRef = useRef<SignaturePadHandle>(null);

  // Switching mode re-derives whether a signature is currently present —
  // draw mode's own strokes report through SignaturePad's onChange instead.
  useEffect(() => {
    if (mode === 'type') onChange?.(!!text.trim());
    else onChange?.(!(padRef.current?.isEmpty() ?? true));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);

  useImperativeHandle(ref, () => ({
    isEmpty: () => (mode === 'draw' ? !padRef.current || padRef.current.isEmpty() : !text.trim()),
    toDataURL: () => {
      if (mode === 'draw') return padRef.current?.toDataURL() ?? '';

      // Type mode still needs to end up as a PNG image, since the signature
      // is embedded into the PDF the same way regardless of input method.
      const canvas = document.createElement('canvas');
      canvas.width = 600;
      canvas.height = 150;
      const ctx = canvas.getContext('2d');
      if (!ctx) return '';
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = '#1e293b';
      ctx.font = `48px ${CURSIVE_FONT}`;
      ctx.textBaseline = 'middle';
      ctx.fillText(text, 20, canvas.height / 2, canvas.width - 40);
      return canvas.toDataURL('image/png');
    },
  }));

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <label className="text-xs font-medium text-slate-600">Signature</label>
        <div className="flex text-[11px] font-semibold rounded-md border border-slate-200 overflow-hidden">
          <button
            type="button"
            onClick={() => setMode('type')}
            className={`px-2.5 py-1 ${mode === 'type' ? 'bg-emerald-600 text-white' : 'text-slate-500 hover:bg-slate-50'}`}
          >
            Type
          </button>
          <button
            type="button"
            onClick={() => setMode('draw')}
            className={`px-2.5 py-1 ${mode === 'draw' ? 'bg-emerald-600 text-white' : 'text-slate-500 hover:bg-slate-50'}`}
          >
            Draw
          </button>
        </div>
      </div>
      {mode === 'type' ? (
        <input
          type="text"
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            onChange?.(!!e.target.value.trim());
          }}
          placeholder="Type your name to sign"
          style={{ fontFamily: CURSIVE_FONT }}
          className="w-full h-32 px-4 text-3xl bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
        />
      ) : (
        <SignaturePad ref={padRef} onChange={onChange} />
      )}
    </div>
  );
});

SignatureField.displayName = 'SignatureField';
export default SignatureField;
