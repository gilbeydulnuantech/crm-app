import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { fetchDownPayment } from '../api/payments';
import DownPaymentForm from '../components/DownPaymentForm';
import ChatWidget from '../components/ChatWidget';
import { toTitleCase } from '../utils/text';

function money(n: number) {
  return `$${Number(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

// Standalone pay page for an emailed invoice link (final-balance invoice
// today; works for any invoice with a public_token since
// get-down-payment-public/create-payment-intent-public no longer filter by
// invoice_type). Distinct from the inline down-payment step on
// PublicContractPage/PublicProposalPage, which isn't reached via its own
// link — this is.
export default function PublicPayInvoicePage() {
  const { token = '' } = useParams();
  const [paidLocally, setPaidLocally] = useState(false);
  const { data, isLoading } = useQuery({
    queryKey: ['public-down-payment', token],
    queryFn: () => fetchDownPayment(token),
    enabled: !!token,
    retry: false,
  });

  return (
    <div className="min-h-screen bg-slate-50 flex items-start justify-center py-10 px-4">
      <div className="w-full max-w-lg bg-white rounded-2xl shadow-lg border border-slate-200 p-8">
        {isLoading ? (
          <p className="text-sm text-slate-400 text-center py-10">Loading...</p>
        ) : !data || !data.success ? (
          <p className="text-sm text-rose-600 text-center py-10">This payment link is invalid or has expired.</p>
        ) : data.is_paid || paidLocally ? (
          <div className="text-center py-10">
            <div className="w-14 h-14 mx-auto rounded-full bg-emerald-100 flex items-center justify-center mb-4">
              <i className="fa-solid fa-circle-check text-2xl text-emerald-600" />
            </div>
            <h1 className="text-xl font-bold text-slate-800">Thank you{data.first_name ? `, ${toTitleCase(data.first_name)}` : ''}!</h1>
            <p className="text-sm text-slate-500 mt-1.5">
              Your payment of {money(data.total)} has been received.
            </p>
          </div>
        ) : (
          <>
            <h1 className="text-lg font-bold text-slate-800">{data.deal_name || 'Invoice'}</h1>
            <p className="text-sm text-slate-500 mt-1">Balance due: {money(data.total)}</p>
            <DownPaymentForm
              token={token}
              onPaid={() => setPaidLocally(true)}
              title="Pay Invoice"
              description={(amount, dealName) => `${money(amount)} is due for ${dealName || 'your project'}.`}
            />
          </>
        )}
      </div>
      <ChatWidget />
    </div>
  );
}
