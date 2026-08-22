import { useRef, useEffect, useImperativeHandle, forwardRef, useState } from 'react';

export interface SignaturePadHandle {
  isEmpty: () => boolean;
  toDataURL: () => string;
  clear: () => void;
}

interface Props {
  onChange?: (hasSignature: boolean) => void;
}

const SignaturePad = forwardRef<SignaturePadHandle, Props>(({ onChange }, ref) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawingRef = useRef(false);
  const hasDrawnRef = useRef(false);
  const [isEmpty, setIsEmpty] = useState(true);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    // Backing-store scale for crisp lines on high-DPI screens without
    // distorting the coordinate math used by the pointer handlers below.
    const ratio = window.devicePixelRatio || 1;
    canvas.width = canvas.clientWidth * ratio;
    canvas.height = canvas.clientHeight * ratio;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.scale(ratio, ratio);
      ctx.lineWidth = 2;
      ctx.lineCap = 'round';
      ctx.strokeStyle = '#1e293b';
    }
  }, []);

  useImperativeHandle(ref, () => ({
    isEmpty: () => !hasDrawnRef.current,
    toDataURL: () => canvasRef.current?.toDataURL('image/png') ?? '',
    clear: () => {
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext('2d');
      if (canvas && ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
      hasDrawnRef.current = false;
      setIsEmpty(true);
      onChange?.(false);
    },
  }));

  function getPos(e: React.PointerEvent<HTMLCanvasElement>) {
    const rect = canvasRef.current!.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }

  function handlePointerDown(e: React.PointerEvent<HTMLCanvasElement>) {
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;
    drawingRef.current = true;
    const { x, y } = getPos(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
  }

  function handlePointerMove(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!drawingRef.current) return;
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;
    const { x, y } = getPos(e);
    ctx.lineTo(x, y);
    ctx.stroke();
    if (!hasDrawnRef.current) onChange?.(true);
    hasDrawnRef.current = true;
    setIsEmpty(false);
  }

  function handlePointerUp() {
    drawingRef.current = false;
  }

  return (
    <div>
      <canvas
        ref={canvasRef}
        className="w-full h-32 bg-slate-50 border border-slate-200 rounded-lg touch-none cursor-crosshair"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
      />
      <div className="flex items-center justify-between mt-1">
        <p className="text-[11px] text-slate-400">Draw your signature above</p>
        {!isEmpty && (
          <button
            type="button"
            onClick={() => {
              const canvas = canvasRef.current;
              const ctx = canvas?.getContext('2d');
              if (canvas && ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
              hasDrawnRef.current = false;
              setIsEmpty(true);
              onChange?.(false);
            }}
            className="text-[11px] font-semibold text-slate-500 hover:text-rose-600"
          >
            Clear
          </button>
        )}
      </div>
    </div>
  );
});

SignaturePad.displayName = 'SignaturePad';
export default SignaturePad;
