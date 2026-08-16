import { PointerEvent, useEffect, useRef, useState } from 'react';

interface Props {
  file: File | null;
  onCancel: () => void;
  onConfirm: (croppedFile: File) => void;
  isSaving?: boolean;
}

const VIEWPORT = 240;
const OUTPUT_SIZE = 400;

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

export default function AvatarCropModal({ file, onCancel, onConfirm, isSaving }: Props) {
  const imgRef = useRef<HTMLImageElement>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [natural, setNatural] = useState({ w: 0, h: 0 });
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const dragState = useRef<{ startX: number; startY: number; startOffset: { x: number; y: number } } | null>(null);

  useEffect(() => {
    if (!file) {
      setImageUrl(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setImageUrl(url);
    setZoom(1);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  if (!file || !imageUrl) return null;

  const baseScale = natural.w && natural.h ? VIEWPORT / Math.min(natural.w, natural.h) : 1;
  const scale = baseScale * zoom;
  const displayedW = natural.w * scale;
  const displayedH = natural.h * scale;

  function clampOffset(o: { x: number; y: number }, w: number, h: number) {
    return {
      x: clamp(o.x, Math.min(VIEWPORT - w, 0), 0),
      y: clamp(o.y, Math.min(VIEWPORT - h, 0), 0),
    };
  }

  function handleImageLoad() {
    const img = imgRef.current;
    if (!img) return;
    const w = img.naturalWidth;
    const h = img.naturalHeight;
    setNatural({ w, h });
    const initialScale = VIEWPORT / Math.min(w, h);
    setOffset(clampOffset({ x: (VIEWPORT - w * initialScale) / 2, y: (VIEWPORT - h * initialScale) / 2 }, w * initialScale, h * initialScale));
  }

  function handleZoomChange(newZoom: number) {
    // Keep whatever point is currently at the viewport's center still
    // centered after the scale changes, instead of zooming from the
    // top-left corner.
    const fracX = displayedW ? (VIEWPORT / 2 - offset.x) / displayedW : 0.5;
    const fracY = displayedH ? (VIEWPORT / 2 - offset.y) / displayedH : 0.5;
    const newScale = baseScale * newZoom;
    const newW = natural.w * newScale;
    const newH = natural.h * newScale;
    setZoom(newZoom);
    setOffset(
      clampOffset({ x: VIEWPORT / 2 - fracX * newW, y: VIEWPORT / 2 - fracY * newH }, newW, newH)
    );
  }

  function handlePointerDown(e: PointerEvent<HTMLDivElement>) {
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    dragState.current = { startX: e.clientX, startY: e.clientY, startOffset: offset };
  }

  function handlePointerMove(e: PointerEvent<HTMLDivElement>) {
    if (!dragState.current) return;
    const dx = e.clientX - dragState.current.startX;
    const dy = e.clientY - dragState.current.startY;
    setOffset(
      clampOffset(
        { x: dragState.current.startOffset.x + dx, y: dragState.current.startOffset.y + dy },
        displayedW,
        displayedH
      )
    );
  }

  function handlePointerUp() {
    dragState.current = null;
  }

  function handleSave() {
    const img = imgRef.current;
    if (!img) return;
    const canvas = document.createElement('canvas');
    canvas.width = OUTPUT_SIZE;
    canvas.height = OUTPUT_SIZE;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const sx = -offset.x / scale;
    const sy = -offset.y / scale;
    const sSize = VIEWPORT / scale;
    ctx.drawImage(img, sx, sy, sSize, sSize, 0, 0, OUTPUT_SIZE, OUTPUT_SIZE);

    canvas.toBlob(
      (blob) => {
        if (!blob) return;
        onConfirm(new File([blob], file.name.replace(/\.\w+$/, '') + '.jpg', { type: 'image/jpeg' }));
      },
      'image/jpeg',
      0.9
    );
  }

  return (
    <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm z-[110] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
        <h3 className="text-base font-bold text-slate-800 mb-1">Adjust Photo</h3>
        <p className="text-xs text-slate-500 mb-4">Drag to reposition, use the slider to zoom.</p>

        <div
          className="relative mx-auto rounded-full overflow-hidden bg-slate-100 cursor-grab active:cursor-grabbing touch-none select-none"
          style={{ width: VIEWPORT, height: VIEWPORT }}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
        >
          <img
            ref={imgRef}
            src={imageUrl}
            alt="Selected"
            onLoad={handleImageLoad}
            draggable={false}
            className="absolute top-0 left-0 pointer-events-none"
            style={{
              width: displayedW || undefined,
              height: displayedH || undefined,
              transform: `translate(${offset.x}px, ${offset.y}px)`,
            }}
          />
        </div>

        <div className="flex items-center gap-2 mt-4">
          <i className="fa-solid fa-image text-slate-300 text-xs" />
          <input
            type="range"
            min={1}
            max={3}
            step={0.01}
            value={zoom}
            onChange={(e) => handleZoomChange(Number(e.target.value))}
            className="flex-1 accent-[var(--theme-accent)]"
          />
          <i className="fa-solid fa-image text-slate-400 text-sm" />
        </div>

        <div className="flex justify-end gap-2 pt-6">
          <button
            type="button"
            onClick={onCancel}
            disabled={isSaving}
            className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 rounded-lg disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className="px-4 py-2 text-sm font-semibold text-white bg-[var(--theme-accent)] hover:opacity-90 rounded-lg disabled:opacity-50 flex items-center gap-2"
          >
            {isSaving && <i className="fa-solid fa-spinner fa-spin" />}
            Save Photo
          </button>
        </div>
      </div>
    </div>
  );
}
