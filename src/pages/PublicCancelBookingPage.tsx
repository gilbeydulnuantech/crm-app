import { useSearchParams, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { cancelBooking } from '../api/booking';
import { toTitleCase } from '../utils/text';

// One-click cancel landing, same "the link itself is the action" pattern as
// PublicUnsubscribePage. Scoped to one specific appointment (activity_id +
// the contact's own unsubscribe_token as a lightweight auth check) rather
// than the whole contact, so cancelling one booking can't be confused with
// opting out of all email, and the token can't be reused to cancel a
// different contact's appointment.
export default function PublicCancelBookingPage() {
  const { activityId = '' } = useParams();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';

  const { data, isLoading } = useQuery({
    queryKey: ['cancel-booking', activityId, token],
    queryFn: () => cancelBooking(activityId, token),
    enabled: !!activityId && !!token,
    retry: false,
  });

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center py-10 px-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-lg border border-slate-200 p-8 text-center">
        {isLoading ? (
          <p className="text-sm text-slate-400">Processing...</p>
        ) : data?.success ? (
          <>
            <div className="w-14 h-14 mx-auto rounded-full bg-emerald-100 flex items-center justify-center mb-4">
              <i className="fa-solid fa-calendar-xmark text-2xl text-emerald-600" />
            </div>
            <h1 className="text-xl font-bold text-slate-800">
              Your appointment is cancelled{data.first_name ? `, ${toTitleCase(data.first_name)}` : ''}
            </h1>
            <p className="text-sm text-slate-500 mt-1.5">
              You won't receive any more reminders for this appointment. If you'd like to book a new time, just
              reach out to us.
            </p>
          </>
        ) : (
          <p className="text-sm text-rose-600">{data?.error || 'This cancellation link is invalid or has expired.'}</p>
        )}
      </div>
    </div>
  );
}
