import { CompaniesView } from '../../types/company';

interface Props {
  view: CompaniesView;
  onChange: (view: CompaniesView) => void;
}

const TABS: { key: CompaniesView; label: string }[] = [
  { key: 'all', label: 'All Companies' },
  { key: 'mine', label: 'My Companies' },
  { key: 'archived', label: 'Archived' },
];

export default function CompaniesTabs({ view, onChange }: Props) {
  return (
    <div className="flex items-center gap-2 shrink-0">
      {TABS.map((t) => (
        <button
          key={t.key}
          onClick={() => onChange(t.key)}
          className={`px-3 py-1.5 text-sm font-semibold rounded-lg transition-colors ${
            view === t.key ? 'bg-[var(--theme-accent)] text-white' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}
