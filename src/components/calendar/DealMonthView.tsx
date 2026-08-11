import { useMemo } from 'react';
import { Opportunity } from '../../types/opportunity';
import { toTitleCase } from '../../utils/text';

interface Props {
  monthDate: Date;
  deals: Opportunity[];
  onDealClick: (deal: Opportunity) => void;
}

const WEEKDAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function isSameDay(a: Date, b: Date) {
  return a.toDateString() === b.toDateString();
}

export default function DealMonthView({ monthDate, deals, onDealClick }: Props) {
  const cells = useMemo(() => {
    const year = monthDate.getFullYear();
    const month = monthDate.getMonth();
    const firstOfMonth = new Date(year, month, 1);
    const startOffset = firstOfMonth.getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const days: (Date | null)[] = [];
    for (let i = 0; i < startOffset; i++) days.push(null);
    for (let d = 1; d <= daysInMonth; d++) days.push(new Date(year, month, d));
    while (days.length % 7 !== 0) days.push(null);
    return days;
  }, [monthDate]);

  const dealsByDay = useMemo(() => {
    const map = new Map<string, Opportunity[]>();
    deals.forEach((d) => {
      if (!d.expected_close) return;
      const key = new Date(d.expected_close).toDateString();
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(d);
    });
    return map;
  }, [deals]);

  const today = new Date();

  return (
    <div className="flex-1 overflow-auto p-4">
      <div className="grid grid-cols-7 border-t border-l border-slate-200">
        {WEEKDAY_LABELS.map((label) => (
          <div
            key={label}
            className="border-r border-b border-slate-200 bg-slate-50 py-1.5 text-center text-[11px] font-semibold text-slate-500 uppercase tracking-wide"
          >
            {label}
          </div>
        ))}

        {cells.map((date, i) => {
          const dayDeals = date ? dealsByDay.get(date.toDateString()) ?? [] : [];
          const isToday = date && isSameDay(date, today);

          return (
            <div
              key={i}
              className={`border-r border-b border-slate-200 min-h-[100px] p-1.5 ${date ? '' : 'bg-slate-50/40'}`}
            >
              {date && (
                <>
                  <div
                    className={`text-xs font-semibold mb-1 w-5 h-5 flex items-center justify-center rounded-full ${
                      isToday ? 'bg-indigo-600 text-white' : 'text-slate-600'
                    }`}
                  >
                    {date.getDate()}
                  </div>
                  <div className="space-y-0.5">
                    {dayDeals.slice(0, 3).map((d) => (
                      <div
                        key={d.id}
                        onClick={(ev) => {
                          ev.stopPropagation();
                          onDealClick(d);
                        }}
                        className="text-[10px] px-1 py-0.5 rounded truncate bg-indigo-100 text-indigo-800 cursor-pointer"
                        title={d.name}
                      >
                        {d.name}
                        {d.contact_name && ` · ${toTitleCase(d.contact_name)}`}
                      </div>
                    ))}
                    {dayDeals.length > 3 && (
                      <div className="text-[10px] text-slate-400 px-1">+{dayDeals.length - 3} more</div>
                    )}
                  </div>
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
