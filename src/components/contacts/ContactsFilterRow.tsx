interface Option {
  value: string;
  label: string;
}

interface Props {
  tags: Option[];
  owners: Option[];
  companies: Option[];
  statuses: Option[];
  value: { tag: string; owner: string; company: string; status: string };
  onChange: (next: Props['value']) => void;
}

export default function ContactsFilterRow({
  tags,
  owners,
  companies,
  statuses,
  value,
  onChange,
}: Props) {
  const field = (
    label: string,
    key: keyof Props['value'],
    options: Option[],
    anyLabel: string
  ) => (
    <div className="flex items-center gap-1.5 text-xs font-medium text-slate-600">
      <span>{label}:</span>
      <select
        value={value[key]}
        onChange={(e) => onChange({ ...value, [key]: e.target.value })}
        className="border border-slate-200 rounded-md text-xs py-1 px-1.5 focus:outline-none focus:ring-2 focus:ring-[var(--theme-accent)]"
      >
        <option value="">{anyLabel}</option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );

  return (
    <div className="px-4 py-3 border-b border-slate-200 flex items-center gap-4 shrink-0">
      {field('Tags', 'tag', tags, 'Any')}
      {field('Owner', 'owner', owners, 'All')}
      {field('Company', 'company', companies, 'All')}
      {field('Status', 'status', statuses, 'All')}
    </div>
  );
}
