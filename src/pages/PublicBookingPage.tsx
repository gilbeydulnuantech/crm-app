import { useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { fetchBookingAvailability, bookInspection, BookingDay, BookingSlot } from '../api/booking';

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

export default function PublicBookingPage() {
  const { token = '' } = useParams();
  const [selectedDate, setSelectedDate] = useState<BookingDay | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<BookingSlot | null>(null);
  const [booked, setBooked] = useState(false);
  const [viewOffset, setViewOffset] = useState(0); // months forward from today

  const { data, isLoading } = useQuery({
    queryKey: ['booking-availability', token],
    queryFn: () => fetchBookingAvailability(token),
    enabled: !!token,
    retry: false,
  });

  const daysByDate = useMemo(() => {
    const map = new Map<string, BookingDay>();
    (data?.days || []).forEach((d) => map.set(d.date, d));
    return map;
  }, [data]);

  const today = new Date();
  const viewYear = today.getFullYear();
  const viewMonth = today.getMonth() + viewOffset;
  const grid = useMemo(() => buildMonthGrid(viewYear, viewMonth), [viewYear, viewMonth]);
  const displayedMonthIndex = ((viewMonth % 12) + 12) % 12;
  const displayedYear = viewYear + Math.floor(viewMonth / 12);

  const book = useMutation({
    mutationFn: () => bookInspection(token, selectedSlot!.start_at),
    onSuccess: (res) => {
      if (res.success) setBooked(true);
    },
  });

  function pickDate(dateKey: string) {
    const day = daysByDate.get(dateKey);
    if (!day) return;
    setSelectedDate(day);
    setSelectedSlot(null);
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center py-10 px-4">
      <div className="w-full max-w-lg bg-white rounded-2xl shadow-lg border border-slate-200 p-8">
        {isLoading ? (
          <p className="text-sm text-slate-400 text-center">Loading available times...</p>
        ) : !data?.success ? (
          <p className="text-sm text-rose-600 text-center">
            {data?.error || 'This booking link is invalid or has expired.'}
          </p>
        ) : booked ? (
          <div className="text-center">
            <div className="w-14 h-14 mx-auto rounded-full bg-emerald-100 flex items-center justify-center mb-4">
              <i className="fa-solid fa-circle-check text-2xl text-emerald-600" />
            </div>
            <h1 className="text-xl font-bold text-slate-800">You're all set{data.contact_first_name ? `, ${data.contact_first_name}` : ''}!</h1>
            <p className="text-sm text-slate-500 mt-1.5">
              Your inspection is confirmed. We've sent a confirmation to your email with the details.
            </p>
          </div>
        ) : (
          <>
            <h1 className="text-xl font-bold text-slate-800">
              Book your inspection{data.contact_first_name ? `, ${data.contact_first_name}` : ''}
            </h1>
            <p className="text-sm text-slate-500 mt-1.5 mb-5">
              Pick a day that works for you{data.owner_name ? ` with ${data.owner_name}` : ''}. All times shown in{' '}
              <span className="font-medium text-slate-700">{data.timezone}</span>.
            </p>

            {(!data.days || data.days.length === 0) ? (
              <p className="text-sm text-slate-400 italic">No open times in the next two weeks — please reply to your email instead.</p>
            ) : (
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
                                ? 'bg-indigo-600 text-white font-semibold'
                                : 'text-slate-700 font-medium hover:bg-indigo-50 border border-indigo-200'
                        }`}
                      >
                        {date.getDate()}
                      </button>
                    );
                  })}
                </div>

                {selectedDate && (
                  <div className="border-t border-slate-100 pt-4">
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
                      {selectedDate.label}
                    </p>
                    <div className="grid grid-cols-3 gap-2">
                      {selectedDate.slots.map((slot) => (
                        <button
                          key={slot.start_at}
                          type="button"
                          onClick={() => setSelectedSlot(slot)}
                          className={`px-2 py-2 text-sm font-medium rounded-lg border transition-colors ${
                            selectedSlot?.start_at === slot.start_at
                              ? 'bg-indigo-600 border-indigo-600 text-white'
                              : 'border-slate-200 text-slate-700 hover:border-indigo-400'
                          }`}
                        >
                          {slot.label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}

            {book.isError && (
              <p className="text-xs text-rose-600 mt-4">
                {book.error instanceof Error ? book.error.message : 'That time was just booked by someone else. Please pick another.'}
              </p>
            )}

            <button
              type="button"
              disabled={!selectedSlot || book.isPending}
              onClick={() => book.mutate()}
              className="w-full mt-6 py-2.5 text-sm font-semibold bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg disabled:opacity-40"
            >
              {book.isPending ? 'Booking...' : selectedSlot ? `Confirm ${selectedSlot.label}` : 'Select a date and time above'}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
