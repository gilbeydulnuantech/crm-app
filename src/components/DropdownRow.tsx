import { ReactNode } from 'react';

// Shared checkbox row for toolbar filter dropdowns — e.g. the "All Tasks"/
// "All Deals" team dropdowns and the Priority/Tags dropdowns next to them.
export default function DropdownRow({
  dot,
  label,
  checked,
  onToggle,
}: {
  dot?: ReactNode;
  label: string;
  checked: boolean;
  onToggle: () => void;
}) {
  return (
    <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer px-1 py-1 hover:bg-slate-50 rounded">
      {dot}
      <span className="flex-1 truncate">{label}</span>
      <input
        type="checkbox"
        checked={checked}
        onChange={onToggle}
        className="rounded border-slate-300 text-indigo-600 focus:ring-[var(--theme-accent)]"
      />
    </label>
  );
}
