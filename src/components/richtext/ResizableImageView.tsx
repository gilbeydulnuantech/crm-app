import { CSSProperties, PointerEvent, useRef, useState } from 'react';
import { NodeViewWrapper, NodeViewProps } from '@tiptap/react';

export default function ResizableImageView({ node, updateAttributes, selected }: NodeViewProps) {
  const sizerRef = useRef<HTMLSpanElement>(null);
  const [resizing, setResizing] = useState(false);

  function startResize(e: PointerEvent) {
    e.preventDefault();
    e.stopPropagation();
    const startX = e.clientX;
    const startWidth = sizerRef.current?.offsetWidth || 200;
    setResizing(true);

    function onMove(ev: globalThis.PointerEvent) {
      const next = Math.max(60, startWidth + (ev.clientX - startX));
      if (sizerRef.current) sizerRef.current.style.width = `${next}px`;
    }
    function onUp() {
      setResizing(false);
      const finalWidth = sizerRef.current?.offsetWidth;
      if (finalWidth) updateAttributes({ width: `${finalWidth}px` });
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    }
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  }

  // Left/right float the whole node view so surrounding paragraphs wrap
  // around it live, matching the float style ResizableImage.ts renders into
  // the saved/sent HTML. Center has no wrap — same non-floated, centered
  // block as before.
  const align = (node.attrs.align as string) || 'left';
  const wrapperStyle: CSSProperties =
    align === 'center'
      ? { textAlign: 'center' }
      : align === 'right'
        ? { float: 'right', margin: '0 0 0.5em 1em' }
        : { float: 'left', margin: '0 1em 0.5em 0' };

  return (
    <NodeViewWrapper as="div" style={wrapperStyle}>
      <span
        ref={sizerRef}
        style={{
          display: 'inline-block',
          position: 'relative',
          width: (node.attrs.width as string) || 'auto',
          maxWidth: '100%',
          lineHeight: 0,
        }}
        className={selected ? 'ring-2 ring-[var(--theme-accent)] rounded-sm' : ''}
      >
        <img
          src={node.attrs.src}
          alt={node.attrs.alt || ''}
          style={{ width: '100%', display: 'block' }}
          draggable={false}
        />
        <span
          onPointerDown={startResize}
          title="Drag to resize"
          style={{
            position: 'absolute',
            right: -5,
            bottom: -5,
            width: 12,
            height: 12,
            background: 'var(--theme-accent, #6366f1)',
            border: '2px solid white',
            borderRadius: '50%',
            cursor: 'nwse-resize',
            opacity: resizing ? 1 : 0.85,
            boxShadow: '0 1px 2px rgba(0,0,0,0.3)',
          }}
        />
      </span>
    </NodeViewWrapper>
  );
}
