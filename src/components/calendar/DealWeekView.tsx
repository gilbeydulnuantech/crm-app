import { useMemo } from 'react';
import { Opportunity, Stage } from '../../types/opportunity';
import { toTitleCase } from '../../utils/text';

interface Props {
  weekStart: Date;
  deals: Opportunity[];
  stagesById: Map<number, Stage>;
  onDealClick: (deal: Opportunity) => void;
}

function currency(n?: number | null) {
  if (n === undefined || n === null) return '--';
  return `$${n.toLocaleString()}`;
}

export default function DealWeekView({ weekStart, deals, stagesById, onDealClick }: Props) {
  const days = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(weekStart);
      d.setDate(weekStart.getDate() + i);
      return d;
    });
  }, [weekStart]);

  const dealsByDay = useMemo(() => {
    const map = new Map<string, Opportunity[]>();
    deals.forEach((d) => {
      if (!d.expected_close) return;
      const key = new Date(d.expected_close).toDateString();
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(d);
    });
    map.forEach((list) =>
      list.sort((a, b) => new Date(a.expected_close!).getTime() - new Date(b.expected_close!).getTime())
    );
    return map;
  }, [deals]);

  return (
    <div className="flex-1 overflow-auto p-4">
      <div className="grid grid-cols-7 gap-3">
        {days.map((day) => {
          const dayDeals = dealsByDay.get(day.toDateString()) ?? [];
          const isToday = day.toDateString() === new Date().toDateString();
          return (
            <div key={day.toISOString()} className="border border-slate-200 rounded-lg p-2 min-h-[300px]">
              <div className={`text-xs font-semibold mb-2 ${isToday ? 'text-indigo-600' : 'text-slate-600'}`}>
                {day.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric' })}
              </div>
              <div className="space-y-1.5">
                {dayDeals.map((d) => (
                  <div
                    key={d.id}
                    onClick={() => onDealClick(d)}
                    className="text-[11px] px-1.5 py-1.5 rounded cursor-pointer bg-indigo-50 hover:bg-indigo-100 text-indigo-900 border border-indigo-100"
                  >
                    <div className="font-semibold truncate">{d.name}</div>
                    {d.contact_name && <div className="truncate text-indigo-700">{toTitleCase(d.contact_name)}</div>}
                    <div className="mt-1 inline-block px-1.5 py-0.5 rounded-full bg-white text-indigo-700 text-[9px] font-medium truncate">
                      {stagesById.get(d.stage_id)?.name ?? '--'}
                    </div>
                    <div className="font-bold text-emerald-700">{currency(d.deal_value)}</div>
                  </div>
                ))}
                {dayDeals.length === 0 && (
                  <div className="text-[10px] text-slate-300 text-center pt-4">No deals</div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
