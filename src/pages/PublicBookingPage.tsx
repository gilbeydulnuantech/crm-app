import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { fetchBookingAvailability, bookInspection, BookingDay, BookingSlot } from '../api/booking';
import BookingCalendarPicker from '../components/booking/BookingCalendarPicker';
import { toTitleCase } from '../utils/text';

export default function PublicBookingPage() {
  const { token = '' } = useParams();
  const [selectedDate, setSelectedDate] = useState<BookingDay | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<BookingSlot | null>(null);
  const [booked, setBooked] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['booking-availability', token],
    queryFn: () => fetchBookingAvailability(token),
    enabled: !!token,
    retry: false,
  });

  const book = useMutation({
    mutationFn: () => bookInspection(token, selectedSlot!.start_at),
    onSuccess: (res) => {
      if (res.success) setBooked(true);
    },
  });

  function selectDate(day: BookingDay) {
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
            <h1 className="text-xl font-bold text-slate-800">You're all set{data.contact_first_name ? `, ${toTitleCase(data.contact_first_name)}` : ''}!</h1>
            <p className="text-sm text-slate-500 mt-1.5">
              Your inspection is confirmed. We've sent a confirmation to your email with the details.
            </p>
          </div>
        ) : (
          <>
            <h1 className="text-xl font-bold text-slate-800">
              Book your inspection{data.contact_first_name ? `, ${toTitleCase(data.contact_first_name)}` : ''}
            </h1>
            <p className="text-sm text-slate-500 mt-1.5 mb-5">
              Pick a day that works for you{data.owner_name ? ` with ${toTitleCase(data.owner_name)}` : ''}. All times shown in{' '}
              <span className="font-medium text-slate-700">{data.timezone}</span>.
            </p>

            <BookingCalendarPicker
              days={data.days || []}
              selectedDate={selectedDate}
              selectedSlot={selectedSlot}
              onSelectDate={selectDate}
              onSelectSlot={setSelectedSlot}
            />

            {book.isError && (
              <p className="text-xs text-rose-600 mt-4">
                {book.error instanceof Error ? book.error.message : 'That time was just booked by someone else. Please pick another.'}
              </p>
            )}

            <button
              type="button"
              disabled={!selectedSlot || book.isPending}
              onClick={() => book.mutate()}
              className="w-full mt-6 py-2.5 text-sm font-semibold bg-[var(--theme-accent)] hover:bg-[var(--theme-accent-hover)] text-white rounded-lg disabled:opacity-40"
            >
              {book.isPending ? 'Booking...' : selectedSlot ? `Confirm ${selectedSlot.label}` : 'Select a date and time above'}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
