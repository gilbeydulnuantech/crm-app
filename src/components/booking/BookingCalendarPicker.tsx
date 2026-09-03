import { useMemo, useState } from 'react';
import { BookingDay, BookingSlot } from '../../api/booking';

function monthLabel(year: number, month: number) {
  return new Date(year, month, 1).toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
}

// Builds a Sun-Sat grid of Date objects covering the given month, padded
// with the trailing days of the previous/next month so every week is full.
function buildMonthGrid(year: number, month: number): Date[] {
  const firstOfMonth = new Date(year, month, 1);
  const startOffset = firstOfMonth.getDay(); // 0=Sun
  const gridStart = new Date(year, month, 1 - startOffset);
  return Array.from({ length: 42 }, (_, i) => new Date(gridStart.getFullYear(), gridStart.getMonth(), gridStart.getDate() + i));
}

function toDateKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

interface Props {
  days: BookingDay[];
  selectedDate: BookingDay | null;
  selectedSlot: BookingSlot | null;
  onSelectDate: (day: BookingDay) => void;
  onSelectSlot: (slot: BookingSlot) => void;
}

export default function BookingCalendarPicker({ days, selectedDate, selectedSlot, onSelectDate, onSelectSlot }: Props) {
  const [viewOffset, setViewOffset] = useState(0); // months forward from today

  const daysByDate = useMemo(() => {
    const map = new Map<string, BookingDay>();
    days.forEach((d) => map.set(d.date, d));
    return map;
  }, [days]);

  const today = new Date();
  const viewYear = today.getFullYear();
  const viewMonth = today.getMonth() + viewOffset;
  const grid = useMemo(() => buildMonthGrid(viewYear, viewMonth), [viewYear, viewMonth]);
  const displayedMonthIndex = ((viewMonth % 12) + 12) % 12;
  const displayedYear = viewYear + Math.floor(viewMonth / 12);

  function pickDate(dateKey: string) {
    const day = daysByDate.get(dateKey);
    if (day) onSelectDate(day);
  }

  if (days.length === 0) {
    return (
      <p className="text-sm text-slate-400 italic">
        No open times in the next two weeks — please check back soon or contact us directly.
      </p>
    );
  }

  return (
    <>
      <div className="flex items-center justify-between mb-3">
        <button
          type="button"
          onClick={() => setViewOffset((v) => Math.max(0, v - 1))}
          disabled={viewOffset === 0}
          className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-50 disabled:opacity-30 disabled:hover:bg-transparent"
        >
          <i className="fa-solid fa-chevron-left text-xs" />
        </button>
        <p className="text-sm font-semibold text-slate-800">{monthLabel(displayedYear, displayedMonthIndex)}</p>
        <button
          type="button"
          onClick={() => setViewOffset((v) => v + 1)}
          className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-50"
        >
          <i className="fa-solid fa-chevron-right text-xs" />
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1 mb-1">
        {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
          <div key={i} className="text-center text-[10px] font-semibold text-slate-400 uppercase py-1">
            {d}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1 mb-5">
        {grid.map((date) => {
          const key = toDateKey(date);
          const day = daysByDate.get(key);
          const inMonth = date.getMonth() === displayedMonthIndex;
          const isSelected = selectedDate?.date === key;
          return (
            <button
              key={key}
              type="button"
              disabled={!day}
              onClick={() => pickDate(key)}
              className={`aspect-square text-sm rounded-lg flex items-center justify-center transition-colors ${
                !inMonth
                  ? 'text-slate-200'
                  : !day
                    ? 'text-slate-300 cursor-default'
                    : isSelected
                      ? 'bg-[var(--theme-accent)] text-white font-semibold'
                      : 'text-slate-700 font-medium hover:bg-[var(--theme-accent-tint)] border border-[var(--theme-accent-tint)]'
              }`}
            >
              {date.getDate()}
            </button>
          );
        })}
      </div>

      {selectedDate && (
        <div className="border-t border-slate-100 pt-4">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">{selectedDate.label}</p>
          <div className="grid grid-cols-3 gap-2">
            {selectedDate.slots.map((slot) => (
              <button
                key={slot.start_at}
                type="button"
                onClick={() => onSelectSlot(slot)}
                className={`px-2 py-2 text-sm font-medium rounded-lg border transition-colors ${
                  selectedSlot?.start_at === slot.start_at
                    ? 'bg-[var(--theme-accent)] border-[var(--theme-accent)] text-white'
                    : 'border-slate-200 text-slate-700 hover:border-[var(--theme-accent)]'
                }`}
              >
                {slot.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </>
  );
}
