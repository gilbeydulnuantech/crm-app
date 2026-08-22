export const DYNAMIC_FIELDS: { token: string; label: string }[] = [
  { token: '{{first_name}}', label: 'First Name' },
  { token: '{{last_name}}', label: 'Last Name' },
  { token: '{{deal_name}}', label: 'Deal Name' },
  { token: '{{proposal_link}}', label: 'Proposal Link' },
  { token: '{{owner_name}}', label: 'Owner' },
];

export function insertAtCursor(
  el: HTMLInputElement | HTMLTextAreaElement | null,
  current: string,
  token: string,
  onChange: (value: string) => void
) {
  if (!el) {
    onChange(current + token);
    return;
  }
  const start = el.selectionStart ?? current.length;
  const end = el.selectionEnd ?? current.length;
  const next = current.slice(0, start) + token + current.slice(end);
  onChange(next);
  requestAnimationFrame(() => {
    el.focus();
    const pos = start + token.length;
    el.setSelectionRange(pos, pos);
  });
}

export default function DynamicFieldDropdown({
  onInsert,
  fields = DYNAMIC_FIELDS,
}: {
  onInsert: (token: string) => void;
  fields?: { token: string; label: string }[];
}) {
  return (
    <select
      value=""
      onChange={(e) => {
        if (e.target.value) onInsert(e.target.value);
        e.target.value = '';
      }}
      className="text-[11px] border border-slate-200 rounded-md px-1.5 py-0.5 text-slate-500 focus:outline-none focus:ring-2 focus:ring-[var(--theme-accent)]"
    >
      <option value="">Insert field...</option>
      {fields.map((f) => (
        <option key={f.token} value={f.token}>
          {f.label}
        </option>
      ))}
    </select>
  );
}
