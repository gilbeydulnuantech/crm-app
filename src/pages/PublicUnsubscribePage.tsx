import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { confirmUnsubscribe } from '../api/unsubscribe';
import { syncContactStatus } from '../api/contacts';
import { toTitleCase } from '../utils/text';

// One-click unsubscribe landing — the link itself is the action (matches
// CAN-SPAM's "clear and conspicuous" opt-out requirement); this page just
// confirms it happened. Sets dnc_email specifically, not do_not_contact —
// a rep can still call/text if the deal is active, this only stops the
// automated marketing-style emails (nurture, win-back, birthday, reviews).
export default function PublicUnsubscribePage() {
  const { token = '' } = useParams();
  const [ran, setRan] = useState(false);
  const { data, isLoading } = useQuery({
    queryKey: ['unsubscribe', token],
    queryFn: () => confirmUnsubscribe(token),
    enabled: !!token,
    retry: false,
  });

  useEffect(() => {
    if (data) setRan(true);
    // Best-effort — unsubscribing recomputes lead_status to Unqualified.
    if (data?.success && data.contact_id) syncContactStatus({ contact_id: data.contact_id });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data]);

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center py-10 px-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-lg border border-slate-200 p-8 text-center">
        {isLoading && !ran ? (
          <p className="text-sm text-slate-400">Processing...</p>
        ) : data?.success ? (
          <>
            <div className="w-14 h-14 mx-auto rounded-full bg-emerald-100 flex items-center justify-center mb-4">
              <i className="fa-solid fa-circle-check text-2xl text-emerald-600" />
            </div>
            <h1 className="text-xl font-bold text-slate-800">
              You're unsubscribed{data.first_name ? `, ${toTitleCase(data.first_name)}` : ''}
            </h1>
            <p className="text-sm text-slate-500 mt-1.5">
              You won't receive any more marketing emails from us. If you have an active project with us, we may
              still reach out directly about it.
            </p>
          </>
        ) : (
          <p className="text-sm text-rose-600">{data?.error || 'This unsubscribe link is invalid or has expired.'}</p>
        )}
      </div>
    </div>
  );
}
