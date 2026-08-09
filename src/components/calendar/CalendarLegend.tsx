import { EVENT_TYPE_META, EVENT_TYPES } from '../../types/event';

export default function CalendarLegend() {
  return (
    <div className="flex flex-wrap items-center gap-3 px-4 py-2 text-[11px] text-slate-500">
      {EVENT_TYPES.map((t) => (
        <span key={t} className="flex items-center gap-1.5">
          <span className={`w-2 h-2 rounded-full ${EVENT_TYPE_META[t].dot}`} />
          {EVENT_TYPE_META[t].label}
        </span>
      ))}
    </div>
  );
}
