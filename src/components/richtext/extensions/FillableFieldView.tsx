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
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(node.attrs.label || meta.label);

  function commit() {
    updateAttributes({ label: draft.trim() || meta.label });
    setEditing(false);
  }

  return (
    <NodeViewWrapper
      as="span"
      contentEditable={false}
      className={`inline-flex items-center gap-1.5 align-middle mx-0.5 px-2 py-1 rounded-md border text-xs font-medium ${
        selected ? 'border-[var(--theme-accent)] bg-[var(--theme-accent-tint)]' : 'border-dashed border-slate-300 bg-slate-50'
      } text-slate-600`}
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
          {node.attrs.label || meta.label}
        </button>
      )}
    </NodeViewWrapper>
  );
}
