import { ContactsView } from '../../types/contact';

interface Props {
  view: ContactsView;
  onChange: (view: ContactsView) => void;
}

const TABS: { key: ContactsView; label: string }[] = [
  { key: 'all', label: 'All Contacts' },
  { key: 'mine', label: 'My Contacts' },
  { key: 'archived', label: 'Archived' },
];

export default function ContactsTabs({ view, onChange }: Props) {
  return (
    <div className="px-4 pt-3 pb-3 flex items-center gap-2 shrink-0 border-b border-slate-200">
      {TABS.map((tab) => (
        <button
          key={tab.key}
          onClick={() => onChange(tab.key)}
          className={`px-3 py-1.5 text-sm font-semibold rounded-lg transition-colors ${
            view === tab.key
              ? 'bg-indigo-600 text-white'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
