import { forwardRef, RefObject, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import SignatureField, { SignatureFieldHandle } from '../SignatureField';

export type FieldValue = string | boolean;

export interface FillableFieldsRendererHandle {
  // Signature pads aren't controlled inputs (no onChange from SignaturePad) —
  // pull their current drawn/typed value on demand, same way the primary
  // sign-at-the-bottom flow already does via padRef.current.toDataURL().
  collectSignatureValues: () => Record<string, string>;
}

interface FieldNode {
  el: HTMLElement;
  fieldId: string;
  fieldType: string;
  label: string;
}

interface Props {
  containerRef: RefObject<HTMLElement>;
  contentHtml: string;
  values: Record<string, FieldValue>;
  onChange: (fieldId: string, value: FieldValue) => void;
  readOnly?: boolean;
}

// Mounts a real, interactive control into every `[data-fillable-field]`
// placeholder left behind by the FillableField Tiptap node (see
// components/richtext/extensions/FillableField.ts) — via portal, since the
// surrounding rich content is otherwise static dangerouslySetInnerHTML.
const FillableFieldsRenderer = forwardRef<FillableFieldsRendererHandle, Props>(
  ({ containerRef, contentHtml, values, onChange, readOnly }, ref) => {
    const [nodes, setNodes] = useState<FieldNode[]>([]);
    const signatureRefs = useRef<Map<string, SignatureFieldHandle | null>>(new Map());

    useEffect(() => {
      if (!containerRef.current) return;
      const els = Array.from(containerRef.current.querySelectorAll<HTMLElement>('[data-fillable-field]'));
      const found = els.map((el) => ({
        el,
        fieldId: el.dataset.fieldId || '',
        fieldType: el.dataset.fieldType || 'text',
        label: el.dataset.label || '',
      }));
      // The raw HTML (from FillableField's renderHTML) leaves the literal
      // "[Signature]"-style text inside each span, and the .fillable-field-
      // placeholder class styles it as a small dashed chip — both make
      // sense as a static fallback, but createPortal appends into this same
      // element rather than replacing it, so left alone they'd render
      // alongside the real interactive control instead of being replaced
      // by it. Clear both before portaling in — guarded by a marker so a
      // later effect re-run (e.g. React StrictMode's dev double-invoke)
      // never re-clears an element that's already had its real control
      // portaled into it, which would wipe that control out instead.
      for (const { el } of found) {
        if (el.dataset.fillableFieldCleared === 'true') continue;
        el.textContent = '';
        el.classList.remove('fillable-field-placeholder');
        el.dataset.fillableFieldCleared = 'true';
      }
      setNodes(found);
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [contentHtml, containerRef.current]);

    useImperativeHandle(ref, () => ({
      collectSignatureValues: () => {
        const result: Record<string, string> = {};
        signatureRefs.current.forEach((handle, fieldId) => {
          if (handle && !handle.isEmpty()) result[fieldId] = handle.toDataURL();
        });
        return result;
      },
    }));

    return (
      <>
        {nodes.map((n) =>
          createPortal(
            n.fieldType === 'signature' ? (
              <InlineSignature
                key={n.fieldId || n.el.outerHTML}
                value={(values[n.fieldId] as string) || ''}
                readOnly={readOnly}
                registerRef={(h) => signatureRefs.current.set(n.fieldId, h)}
              />
            ) : (
              <FillableFieldControl
                key={n.fieldId || n.el.outerHTML}
                fieldType={n.fieldType}
                label={n.label}
                value={values[n.fieldId]}
                onChange={(v) => onChange(n.fieldId, v)}
                readOnly={readOnly}
              />
            ),
            n.el
          )
        )}
      </>
    );
  }
);

FillableFieldsRenderer.displayName = 'FillableFieldsRenderer';
export default FillableFieldsRenderer;

function FillableFieldControl({
  fieldType,
  label,
  value,
  onChange,
  readOnly,
}: {
  fieldType: string;
  label: string;
  value: FieldValue | undefined;
  onChange: (v: FieldValue) => void;
  readOnly?: boolean;
}) {
  if (fieldType === 'checkbox') {
    return (
      <label className="inline-flex items-center gap-1.5 align-middle mx-0.5 text-sm">
        <input
          type="checkbox"
          checked={Boolean(value)}
          disabled={readOnly}
          onChange={(e) => onChange(e.target.checked)}
          className="w-4 h-4"
        />
        {label && <span className="text-slate-600">{label}</span>}
      </label>
    );
  }

  if (fieldType === 'date') {
    return (
      <input
        type="date"
        value={(value as string) || ''}
        disabled={readOnly}
        onChange={(e) => onChange(e.target.value)}
        className="inline-block align-middle mx-0.5 px-2 py-0.5 text-sm border border-slate-300 rounded focus:outline-none focus:ring-1 focus:ring-[var(--theme-accent)] disabled:bg-slate-50"
      />
    );
  }

  if (fieldType === 'initials') {
    return (
      <input
        type="text"
        value={(value as string) || ''}
        disabled={readOnly}
        onChange={(e) => onChange(e.target.value.slice(0, 6))}
        placeholder={label || 'Initials'}
        className="inline-block align-middle mx-0.5 w-16 px-1.5 py-0.5 text-sm text-center border border-slate-300 rounded focus:outline-none focus:ring-1 focus:ring-[var(--theme-accent)] disabled:bg-slate-50"
      />
    );
  }

  // text
  return (
    <input
      type="text"
      value={(value as string) || ''}
      disabled={readOnly}
      onChange={(e) => onChange(e.target.value)}
      placeholder={label || 'Type here'}
      className="inline-block align-middle mx-0.5 min-w-[140px] px-2 py-0.5 text-sm border border-slate-300 rounded focus:outline-none focus:ring-1 focus:ring-[var(--theme-accent)] disabled:bg-slate-50"
    />
  );
}

function InlineSignature({
  value,
  readOnly,
  registerRef,
}: {
  value: string;
  readOnly?: boolean;
  registerRef: (h: SignatureFieldHandle | null) => void;
}) {
  if (readOnly) {
    return value ? (
      <img src={value} alt="Signature" className="inline-block align-middle mx-0.5 h-10" />
    ) : (
      <span className="text-slate-400 text-sm italic mx-0.5">Not signed</span>
    );
  }

  return (
    <span className="block w-full max-w-sm my-1">
      <SignatureField ref={registerRef} />
    </span>
  );
}
