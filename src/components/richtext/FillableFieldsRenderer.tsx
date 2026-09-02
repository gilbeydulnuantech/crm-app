import { forwardRef, RefObject, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import SignatureField, { SignatureFieldHandle } from '../SignatureField';
import { SignerRole } from './extensions/FillableField';

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
  signerRole: string;
}

interface Props {
  containerRef: RefObject<HTMLElement>;
  contentHtml: string;
  values: Record<string, FieldValue>;
  onChange: (fieldId: string, value: FieldValue) => void;
  readOnly?: boolean;
  // When set, any field (of ANY type — signature, text, date, initials,
  // checkbox) whose signerRole doesn't match the viewer is ALWAYS rendered
  // muted (non-interactive, regardless of `readOnly`) — e.g. the client's
  // public page passes viewerSignerRole="client" so an owner-role field can
  // never be filled from there, and vice versa for the internal co-sign
  // view. Omit to keep every field governed purely by `readOnly`, same as
  // before this prop existed.
  viewerSignerRole?: SignerRole;
  // Display name used in the muted placeholder's "Awaiting X's signature"
  // message. Falls back to a generic phrase if omitted.
  otherPartyName?: string;
  // For the internal co-sign review (SignedContractViewModal): the document
  // is otherwise fully locked (`readOnly`), but non-signature fields (date/
  // text/initials/checkbox) matching this role stay interactive so the
  // countersigning owner can fill in "their" fields — e.g. a date next to
  // the contractor signature — the same way the client filled theirs in
  // before signing. Deliberately does NOT affect signature-type fields: the
  // owner's actual signature is still captured through the dedicated pad in
  // the co-sign section, not inline here, so this never opens a second,
  // confusing way to draw it. Distinct from `viewerSignerRole`: that one is
  // for the *signing* flow (mutes the other party's not-yet-filled field
  // with an "Awaiting" placeholder); this one is for the *review* flow,
  // where every other field is already filled and should just display
  // normally, not as an "awaiting" placeholder.
  editableSignerRole?: SignerRole;
}

// Mounts a real, interactive control into every `[data-fillable-field]`
// placeholder left behind by the FillableField Tiptap node (see
// components/richtext/extensions/FillableField.ts) — via portal, since the
// surrounding rich content is otherwise static dangerouslySetInnerHTML.
const FillableFieldsRenderer = forwardRef<FillableFieldsRendererHandle, Props>(
  ({ containerRef, contentHtml, values, onChange, readOnly, viewerSignerRole, otherPartyName, editableSignerRole }, ref) => {
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
        signerRole: el.dataset.signerRole || 'client',
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
        {nodes.map((n) => {
          const isMuted = !!viewerSignerRole && n.signerRole !== viewerSignerRole;
          return createPortal(
            n.fieldType === 'signature' ? (
              isMuted ? (
                <MutedSignature key={n.fieldId || n.el.outerHTML} otherPartyName={otherPartyName} />
              ) : (
                <InlineSignature
                  key={n.fieldId || n.el.outerHTML}
                  value={(values[n.fieldId] as string) || ''}
                  readOnly={readOnly}
                  registerRef={(h) => signatureRefs.current.set(n.fieldId, h)}
                />
              )
            ) : (
              <FillableFieldControl
                key={n.fieldId || n.el.outerHTML}
                fieldType={n.fieldType}
                label={n.label}
                value={values[n.fieldId]}
                onChange={(v) => onChange(n.fieldId, v)}
                readOnly={editableSignerRole ? n.signerRole !== editableSignerRole : readOnly || isMuted}
                muted={isMuted}
                otherPartyName={otherPartyName}
              />
            ),
            n.el
          );
        })}
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
  muted,
  otherPartyName,
}: {
  fieldType: string;
  label: string;
  value: FieldValue | undefined;
  onChange: (v: FieldValue) => void;
  readOnly?: boolean;
  // Not this viewer's field to fill (wrong signerRole) — distinct from a
  // plain read-only render (e.g. a fully-signed document): still disabled,
  // but visibly greyed and titled so it reads as "not yours" rather than
  // "already submitted".
  muted?: boolean;
  otherPartyName?: string;
}) {
  const mutedTitle = muted ? `Reserved for ${otherPartyName || 'the other party'}` : undefined;
  const mutedClass = muted ? 'opacity-50' : '';

  if (fieldType === 'checkbox') {
    return (
      <label className={`inline-flex items-center gap-1.5 align-middle mx-0.5 text-sm ${mutedClass}`} title={mutedTitle}>
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
        title={mutedTitle}
        onChange={(e) => onChange(e.target.value)}
        className={`inline-block align-middle mx-0.5 px-2 py-0.5 text-sm border border-slate-300 rounded focus:outline-none focus:ring-1 focus:ring-[var(--theme-accent)] disabled:bg-slate-50 ${mutedClass}`}
      />
    );
  }

  if (fieldType === 'initials') {
    return (
      <input
        type="text"
        value={(value as string) || ''}
        disabled={readOnly}
        title={mutedTitle}
        onChange={(e) => onChange(e.target.value.slice(0, 6))}
        placeholder={muted ? mutedTitle : label || 'Initials'}
        className={`inline-block align-middle mx-0.5 w-16 px-1.5 py-0.5 text-sm text-center border border-slate-300 rounded focus:outline-none focus:ring-1 focus:ring-[var(--theme-accent)] disabled:bg-slate-50 ${mutedClass}`}
      />
    );
  }

  // text
  return (
    <input
      type="text"
      value={(value as string) || ''}
      disabled={readOnly}
      title={mutedTitle}
      onChange={(e) => onChange(e.target.value)}
      placeholder={muted ? mutedTitle : label || 'Type here'}
      className={`inline-block align-middle mx-0.5 min-w-[140px] px-2 py-0.5 text-sm border border-slate-300 rounded focus:outline-none focus:ring-1 focus:ring-[var(--theme-accent)] disabled:bg-slate-50 ${mutedClass}`}
    />
  );
}

// Not this viewer's field to fill — shown regardless of `readOnly` so it
// can never be drawn into from here. Sized to roughly match SignatureField's
// own pad (h-32) so the document doesn't visibly reflow once the real
// signature lands.
function MutedSignature({ otherPartyName }: { otherPartyName?: string }) {
  return (
    <span className="block w-full max-w-sm my-1 h-32 rounded-lg border border-dashed border-slate-200 bg-slate-50 flex items-center justify-center px-4 text-center">
      <span className="text-xs text-slate-400 italic">
        Awaiting {otherPartyName || 'the other party'}&rsquo;s signature
      </span>
    </span>
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
