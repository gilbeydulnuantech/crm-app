import { FormEvent, useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { fetchGenericBookingAvailability, bookGenericInspection, BookingDay, BookingSlot } from '../api/booking';
import BookingCalendarPicker from '../components/booking/BookingCalendarPicker';

const inputClass =
  'w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--theme-accent)]';

export default function GenericBookingPage() {
  const [step, setStep] = useState<'details' | 'time'>('details');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [websiteHp, setWebsiteHp] = useState(''); // honeypot, hidden from real visitors
  const [formError, setFormError] = useState<string | null>(null);

  const [selectedDate, setSelectedDate] = useState<BookingDay | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<BookingSlot | null>(null);
  const [booked, setBooked] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['booking-availability-generic'],
    queryFn: fetchGenericBookingAvailability,
    enabled: step === 'time',
    retry: false,
  });

  const book = useMutation({
    mutationFn: () =>
      bookGenericInspection({
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        email: email.trim(),
        phone: phone.trim(),
        start_at: selectedSlot!.start_at,
        website_hp: websiteHp,
      }),
    onSuccess: (res) => {
      if (res.success) setBooked(true);
    },
  });

  function selectDate(day: BookingDay) {
    setSelectedDate(day);
    setSelectedSlot(null);
  }

  function handleDetailsSubmit(e: FormEvent) {
    e.preventDefault();
    setFormError(null);
    if (!firstName.trim()) return setFormError('Please enter your first name.');
    if (!email.trim().includes('@')) return setFormError('Please enter a valid email.');
    setStep('time');
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center py-10 px-4">
      <div className="w-full max-w-lg bg-white rounded-2xl shadow-lg border border-slate-200 p-8">
        {booked ? (
          <div className="text-center">
            <div className="w-14 h-14 mx-auto rounded-full bg-emerald-100 flex items-center justify-center mb-4">
              <i className="fa-solid fa-circle-check text-2xl text-emerald-600" />
            </div>
            <h1 className="text-xl font-bold text-slate-800">You're all set, {firstName}!</h1>
            <p className="text-sm text-slate-500 mt-1.5">
              Your inspection is confirmed. We've sent a confirmation to your email with the details.
            </p>
          </div>
        ) : step === 'details' ? (
          <form onSubmit={handleDetailsSubmit}>
            <h1 className="text-xl font-bold text-slate-800">Book a free inspection</h1>
            <p className="text-sm text-slate-500 mt-1.5 mb-5">Tell us a bit about yourself and we'll show you open times.</p>

            <div className="grid grid-cols-2 gap-3 mb-3">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">First name</label>
                <input className={inputClass} value={firstName} onChange={(e) => setFirstName(e.target.value)} required />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Last name</label>
                <input className={inputClass} value={lastName} onChange={(e) => setLastName(e.target.value)} />
              </div>
            </div>
            <div className="mb-3">
              <label className="block text-xs font-medium text-slate-600 mb-1">Email</label>
              <input type="email" className={inputClass} value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>
            <div className="mb-3">
              <label className="block text-xs font-medium text-slate-600 mb-1">Phone (optional)</label>
              <input type="tel" className={inputClass} value={phone} onChange={(e) => setPhone(e.target.value)} />
            </div>

            {/* Honeypot: hidden from real visitors via CSS, a bot filling every field will trip it. */}
            <div className="absolute -left-[9999px]" aria-hidden="true">
              <label htmlFor="website">Website</label>
              <input
                id="website"
                tabIndex={-1}
                autoComplete="off"
                value={websiteHp}
                onChange={(e) => setWebsiteHp(e.target.value)}
              />
            </div>

            {formError && <p className="text-xs text-rose-600 mb-3">{formError}</p>}

            <button
              type="submit"
              className="w-full mt-2 py-2.5 text-sm font-semibold bg-[var(--theme-accent)] hover:bg-[var(--theme-accent-hover)] text-white rounded-lg"
            >
              Continue to pick a time
            </button>
          </form>
        ) : (
          <>
            {isLoading ? (
              <p className="text-sm text-slate-400 text-center">Loading available times...</p>
            ) : !data?.success ? (
              <p className="text-sm text-rose-600 text-center">{data?.error || 'Something went wrong. Please try again.'}</p>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => setStep('details')}
                  className="text-xs text-slate-400 hover:text-slate-600 mb-3"
                >
                  <i className="fa-solid fa-arrow-left mr-1" /> Back
                </button>
                <h1 className="text-xl font-bold text-slate-800">Pick a time, {firstName}</h1>
                <p className="text-sm text-slate-500 mt-1.5 mb-5">
                  All times shown in <span className="font-medium text-slate-700">{data.timezone}</span>.
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
          </>
        )}
      </div>
    </div>
  );
}
