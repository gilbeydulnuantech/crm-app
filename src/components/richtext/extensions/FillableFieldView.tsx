import { useState } from 'react';
import { NodeViewWrapper, NodeViewProps } from '@tiptap/react';

const FIELD_META: Record<string, { icon: string; label: string }> = {
  signature: { icon: 'fa-signature', label: 'Signature' },
  text: { icon: 'fa-i-cursor', label: 'Text Field' },
  date: { icon: 'fa-calendar-day', label: 'Date' },
  initials: { icon: 'fa-pen-nib', label: 'Initials' },
  checkbox: { icon: 'fa-square-check', label: 'Checkbox' },
};

// Editor-side representation only — a non-fillable chip showing what kind of
// field this is and its label. The client fills the real thing in on the
// public proposal/contract page (see components/richtext/FillableFieldsRenderer).
export default function FillableFieldView({ node, updateAttributes, selected }: NodeViewProps) {
  const fieldType = (node.attrs.fieldType as string) || 'text';
  const meta = FIELD_META[fieldType] || FIELD_META.text;
  const isSignature = fieldType === 'signature';
  // Every field type carries a signerRole now (not just signature) — a rep
  // can reserve a date/text/checkbox field for "the owner" too (e.g. an
  // internal-only approval date), muted from the client on the public page
  // exactly like an owner signature pad is. Defaults to 'client' so fields
  // placed before this concept existed keep behaving exactly as they did.
  const signerRole = (node.attrs.signerRole as string) || 'client';
  // Distinct default label + accent color per role so two signature fields
  // in the same document are easy to tell apart at a glance while editing —
  // this is purely a builder-side cue, not stored/read anywhere else.
  const defaultLabel = signerRole === 'owner' ? 'Owner Signature' : isSignature ? 'Client Signature' : meta.label;
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(node.attrs.label || defaultLabel);

  function commit() {
    updateAttributes({ label: draft.trim() || defaultLabel });
    setEditing(false);
  }

  const roleAccentClass =
    signerRole === 'owner'
      ? 'border-amber-300 bg-amber-50 text-amber-700'
      : isSignature
        ? 'border-indigo-300 bg-indigo-50 text-indigo-700'
        : 'border-dashed border-slate-300 bg-slate-50 text-slate-600';

  return (
    <NodeViewWrapper
      as="span"
      contentEditable={false}
      className={`inline-flex items-center gap-1.5 align-middle mx-0.5 px-2 py-1 rounded-md border text-xs font-medium ${
        selected ? 'border-[var(--theme-accent)] bg-[var(--theme-accent-tint)] text-slate-600' : roleAccentClass
      }`}
    >
      <i className={`fa-solid ${meta.icon} text-[11px]`} />
      {editing ? (
        <input
          autoFocus
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => e.key === 'Enter' && commit()}
          className="bg-white border border-slate-200 rounded px-1 text-xs w-28 focus:outline-none"
        />
      ) : (
        <button type="button" onClick={() => setEditing(true)} className="hover:underline">
          {node.attrs.label || defaultLabel}
        </button>
      )}
      <button
        type="button"
        title="Who this field is for — click to switch"
        onClick={() => updateAttributes({ signerRole: signerRole === 'owner' ? 'client' : 'owner' })}
        className={`text-[10px] font-semibold px-1 rounded ${
          signerRole === 'owner' ? 'bg-amber-200/70 text-amber-800' : 'bg-slate-200/70 text-slate-600'
        } hover:opacity-80`}
      >
        {signerRole === 'owner' ? 'Owner' : 'Client'}
      </button>
    </NodeViewWrapper>
  );
}
