interface Option {
  value: string;
  label: string;
}

export interface CompaniesFilterValue {
  industry: string;
  owner: string;
  tag: string;
}

interface Props {
  industries: Option[];
  owners: Option[];
  tags: Option[];
  value: CompaniesFilterValue;
  onChange: (next: CompaniesFilterValue) => void;
}

export default function CompaniesFilterRow({ industries, owners, tags, value, onChange }: Props) {
  const field = (
    label: string,
    key: keyof CompaniesFilterValue,
    options: Option[],
    anyLabel: string
  ) => (
    <div className="flex items-center gap-1.5 text-xs font-medium text-slate-600">
      <span>{label}:</span>
      <select
        value={value[key]}
        onChange={(e) => onChange({ ...value, [key]: e.target.value })}
        className="border border-slate-200 rounded-md text-xs py-1 px-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-500"
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
      {field('Industry', 'industry', industries, 'All')}
      {field('Owner', 'owner', owners, 'All')}
      {field('Tags', 'tag', tags, 'Any')}
    </div>
  );
}
