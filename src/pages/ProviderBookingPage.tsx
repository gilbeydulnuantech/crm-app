import { FormEvent, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { BookingDay, BookingOptions, BookingSlot, bookWithProvider, fetchProviderAvailability } from '../api/booking';
import BookingCalendarPicker from '../components/booking/BookingCalendarPicker';

const inputClass =
  'w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--theme-accent)]';

function Choice({ active, onClick, title, sub }: { active: boolean; onClick: () => void; title: string; sub?: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`text-left px-3 py-2.5 rounded-lg border transition-colors ${
        active ? 'border-[var(--theme-accent)] bg-[var(--theme-accent-tint)]' : 'border-slate-200 hover:bg-slate-50'
      }`}
    >
      <div className="text-sm font-medium text-slate-800">{title}</div>
      {sub && <div className="text-xs text-slate-500">{sub}</div>}
    </button>
  );
}

// A spa opens on its most common treatment so most visitors only have to confirm it; other industries ask them to choose.
const DEFAULT_SERVICE_NAME: Record<string, string> = { spa_salon: 'oil massage' };

const money = (n: number) => `$${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const lengthLabel = (m: number) => (m % 60 === 0 ? `${m / 60} hour${m === 60 ? '' : 's'}` : `${m} min`);

// A service with several lengths opens on the 60-minute one (or the shortest when there is no 60), so most visitors only confirm it.
function defaultDuration(s?: BookingOptions['services'][number]): number | null {
  const d = s?.durations ?? [];
  if (d.length === 0) return null;
  return (d.find((x) => x.minutes === 60) ?? d[0]).minutes;
}

function initialService(options: BookingOptions): number | null {
  if (options.services.length === 1) return options.services[0].id;
  const wanted = options.industry ? DEFAULT_SERVICE_NAME[options.industry] : undefined;
  const hit = wanted ? options.services.find((s) => s.name.trim().toLowerCase() === wanted) : undefined;
  return hit ? hit.id : null;
}

// Public booking when the business lets clients choose a service and a staff member (Settings > Industry & features).
export default function ProviderBookingPage({ options }: { options: BookingOptions }) {
  const label = options.staff_label || 'Therapist';
  const [step, setStep] = useState<'details' | 'time'>('details');
  const [serviceId, setServiceId] = useState<number | null>(() => initialService(options));
  const [duration, setDuration] = useState<number | null>(() => defaultDuration(options.services.find((s) => s.id === initialService(options))));
  const [staffId, setStaffId] = useState<string>('any');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [websiteHp, setWebsiteHp] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<BookingDay | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<BookingSlot | null>(null);
  const [booked, setBooked] = useState<{ provider?: string } | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['provider-availability', staffId, duration],
    queryFn: () => fetchProviderAvailability(staffId, duration),
    enabled: step === 'time',
    retry: false,
    refetchInterval: false,
  });

  const book = useMutation({
    mutationFn: async () => {
      const res = await bookWithProvider({
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        email: email.trim(),
        phone: phone.trim(),
        staff_id: staffId,
        service_id: serviceId,
        duration,
        start_at: selectedSlot!.start_at,
        website_hp: websiteHp,
      });
      if (!res.success) throw new Error(res.error || 'That time is no longer available. Please pick another.');
      return res;
    },
    onSuccess: (res) => setBooked({ provider: res.provider }),
    onError: () => {
      // The slot list is stale after a clash; reload it.
      setSelectedSlot(null);
    },
  });

  function handleDetails(e: FormEvent) {
    e.preventDefault();
    setFormError(null);
    if (options.services.length > 0 && serviceId === null) return setFormError('Please choose a service.');
    if (!firstName.trim()) return setFormError('Please enter your first name.');
    if (!email.trim().includes('@')) return setFormError('Please enter a valid email.');
    setSelectedDate(null);
    setSelectedSlot(null);
    setStep('time');
  }

  const service = options.services.find((s) => s.id === serviceId);
  const providerName = staffId === 'any' ? null : options.providers.find((p) => String(p.id) === staffId)?.name;

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center py-10 px-4">
      <div className="w-full max-w-lg bg-white rounded-2xl shadow-lg border border-slate-200 p-8">
        {booked ? (
          <div className="text-center">
            <div className="w-14 h-14 mx-auto rounded-full bg-emerald-100 flex items-center justify-center mb-4">
              <i className="fa-solid fa-circle-check text-2xl text-emerald-600" />
            </div>
            <h1 className="text-xl font-bold text-slate-800">You're booked, {firstName}!</h1>
            <p className="text-sm text-slate-500 mt-1.5">
              {service ? `${service.name}${duration ? ` (${lengthLabel(duration)})` : ''} ` : 'Your appointment '}
              {booked.provider ? `with ${booked.provider} ` : ''}
              {selectedSlot ? `at ${selectedSlot.label}` : ''} is confirmed. We'll email you the details.
            </p>
          </div>
        ) : step === 'details' ? (
          <form onSubmit={handleDetails}>
            <h1 className="text-xl font-bold text-slate-800">{options.company_name ? `Book with ${options.company_name}` : 'Book an appointment'}</h1>
            <p className="text-sm text-slate-500 mt-1.5 mb-5">Choose what you'd like, then pick a time.</p>

            {options.services.length > 0 && (
              <div className="mb-4">
                <div className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1.5">Service</div>
                <select
                  className={inputClass}
                  value={serviceId ?? ''}
                  onChange={(e) => {
                    const id = e.target.value ? Number(e.target.value) : null;
                    setServiceId(id);
                    setDuration(defaultDuration(options.services.find((s) => s.id === id)));
                  }}
                  aria-label="Service"
                >
                  <option value="">Choose a service...</option>
                  {options.services.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                      {s.durations && s.durations.length > 0
                        ? ` — from ${money(Math.min(...s.durations.map((d) => d.price)))}`
                        : s.price > 0
                          ? ` — ${money(s.price)}`
                          : ''}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {service && service.durations && service.durations.length > 0 && (
              <div className="mb-4">
                <div className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1.5">How long</div>
                <div className="grid grid-cols-2 gap-2">
                  {service.durations.map((d) => (
                    <Choice key={d.minutes} active={duration === d.minutes} onClick={() => setDuration(d.minutes)} title={lengthLabel(d.minutes)} sub={money(d.price)} />
                  ))}
                </div>
              </div>
            )}

            <div className="mb-4">
              <div className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1.5">{label}</div>
              <div className="grid grid-cols-2 gap-2">
                <Choice active={staffId === 'any'} onClick={() => setStaffId('any')} title="Any available" sub="First free time" />
                {options.providers.map((p) => (
                  <Choice key={p.id} active={staffId === String(p.id)} onClick={() => setStaffId(String(p.id))} title={p.name} />
                ))}
              </div>
            </div>

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

            {/* Honeypot: hidden from real visitors, a bot filling every field trips it. */}
            <div className="absolute -left-[9999px]" aria-hidden="true">
              <label htmlFor="website">Website</label>
              <input id="website" tabIndex={-1} autoComplete="off" value={websiteHp} onChange={(e) => setWebsiteHp(e.target.value)} />
            </div>

            {formError && <p className="text-xs text-rose-600 mb-3">{formError}</p>}
            <button type="submit" className="w-full mt-2 py-2.5 text-sm font-semibold bg-[var(--theme-accent)] hover:bg-[var(--theme-accent-hover)] text-white rounded-lg">
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
                <button type="button" onClick={() => setStep('details')} className="text-xs text-slate-400 hover:text-slate-600 mb-3">
                  <i className="fa-solid fa-arrow-left mr-1" /> Back
                </button>
                <h1 className="text-xl font-bold text-slate-800">Pick a time, {firstName}</h1>
                <p className="text-sm text-slate-500 mt-1.5 mb-5">
                  {service ? `${service.name} · ` : ''}
                  {duration ? `${lengthLabel(duration)} · ` : ''}
                  {providerName ? `with ${providerName} · ` : ''}
                  times in <span className="font-medium text-slate-700">{data.timezone}</span>.
                </p>
                {(data.days || []).length === 0 ? (
                  <p className="text-sm text-slate-500 text-center py-6">No times are open right now. Please check back soon or try another {label.toLowerCase()}.</p>
                ) : (
                  <BookingCalendarPicker
                    days={data.days || []}
                    selectedDate={selectedDate}
                    selectedSlot={selectedSlot}
                    onSelectDate={(d) => {
                      setSelectedDate(d);
                      setSelectedSlot(null);
                    }}
                    onSelectSlot={setSelectedSlot}
                  />
                )}
                {book.isError && (
                  <p className="text-xs text-rose-600 mt-4">{book.error instanceof Error ? book.error.message : 'That time was just booked. Please pick another.'}</p>
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
