import { ReportTab } from '../../types/report';

interface Props {
  tab: ReportTab;
  onChange: (tab: ReportTab) => void;
  isAdmin: boolean;
}

const TABS: { key: ReportTab; label: string; adminOnly?: boolean }[] = [
  { key: 'overview', label: 'Overview' },
  { key: 'sales', label: 'Sales' },
  { key: 'pipeline', label: 'Pipeline' },
  { key: 'contacts', label: 'Contacts' },
  { key: 'team', label: 'Team', adminOnly: true },
  { key: 'activities', label: 'Activities' },
];

export default function ReportTabs({ tab, onChange, isAdmin }: Props) {
  const visible = TABS.filter((t) => !t.adminOnly || isAdmin);

  return (
    <div className="px-4 pt-3 pb-3 flex items-center gap-2 shrink-0 border-b border-slate-200">
      {visible.map((t) => (
        <button
          key={t.key}
          onClick={() => onChange(t.key)}
          className={`px-3 py-1.5 text-sm font-semibold rounded-lg transition-colors ${
            tab === t.key ? 'bg-indigo-600 text-white' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}
