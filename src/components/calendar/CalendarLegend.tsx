import { EVENT_TYPE_META, EVENT_TYPES, EventType } from '../../types/event';

interface Props {
  visibleTypes: EventType[];
  onToggle: (type: EventType) => void;
}

export default function CalendarLegend({ visibleTypes, onToggle }: Props) {
  return (
    <div className="flex flex-wrap items-center gap-3 px-4 py-2 text-[11px] text-slate-500">
      {EVENT_TYPES.map((t) => {
        const active = visibleTypes.includes(t);
        return (
          <button
            key={t}
            onClick={() => onToggle(t)}
            title={active ? `Hide ${EVENT_TYPE_META[t].label}` : `Show ${EVENT_TYPE_META[t].label}`}
            className={`flex items-center gap-1.5 px-1.5 py-0.5 rounded-full transition-opacity hover:bg-slate-100 ${
              active ? '' : 'opacity-40'
            }`}
          >
            <span className={`w-2 h-2 rounded-full ${EVENT_TYPE_META[t].dot}`} />
            {EVENT_TYPE_META[t].label}
          </button>
        );
      })}
    </div>
  );
}
