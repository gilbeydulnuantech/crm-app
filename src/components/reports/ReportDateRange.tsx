interface Props {
  days: number;
  onChange: (days: number) => void;
}

const OPTIONS = [
  { label: 'Last 7 days', value: 7 },
  { label: 'Last 30 days', value: 30 },
  { label: 'Last 90 days', value: 90 },
  { label: 'Last 12 months', value: 365 },
];

export default function ReportDateRange({ days, onChange }: Props) {
  return (
    <div className="px-4 py-3 flex items-center gap-1.5 shrink-0 border-b border-slate-200">
      <span className="text-xs font-medium text-slate-500 mr-1">Range:</span>
      {OPTIONS.map((o) => (
        <button
          key={o.value}
          onClick={() => onChange(o.value)}
          className={`px-2.5 py-1 text-xs font-semibold rounded-md border ${
            days === o.value
              ? 'bg-[var(--theme-accent-tint)] border-[var(--theme-accent-tint)] text-[var(--theme-accent-hover)]'
              : 'border-slate-200 text-slate-600 hover:bg-slate-50'
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
