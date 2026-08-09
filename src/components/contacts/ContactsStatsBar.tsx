interface Props {
  total: number;
  mine: number;
  archived: number;
  newToday: number;
}

export default function ContactsStatsBar({ total, mine, archived, newToday }: Props) {
  const cards = [
    { label: 'Total', value: total },
    { label: 'My Contacts', value: mine },
    { label: 'Archived', value: archived },
    { label: 'New Today', value: newToday },
  ];

  return (
    <div className="px-4 pt-4 grid grid-cols-4 gap-3 shrink-0">
      {cards.map((c) => (
        <div key={c.label} className="border border-slate-200 rounded-lg p-3 text-center">
          <div className="text-xl font-bold text-slate-800">{c.value}</div>
          <div className="text-[11px] text-slate-500 uppercase tracking-wide">{c.label}</div>
        </div>
      ))}
    </div>
  );
}
