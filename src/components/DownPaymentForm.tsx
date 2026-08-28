import { useEffect, useMemo, useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { loadStripe, Stripe } from '@stripe/stripe-js';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { createPaymentIntent, fetchDownPayment, fetchStripeConfig } from '../api/payments';

function money(n: number) {
  return `$${Number(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

interface Props {
  token: string;
  // Fires once the client confirms the charge locally — the deal-stage move
  // and matching tag are applied server-side by the Stripe webhook
  // (Payments.json), not by this callback; this just lets the parent page
  // swap to its own thank-you state without waiting on that.
  onPaid: () => void;
  // Reused for both the down-payment (inline after contract signing) and
  // the final-invoice (standalone pay page) flows — only the label differs.
  title?: string;
  description?: (amount: number, dealName: string | null) => string;
}

// Inner form — needs to run inside <Elements> since useStripe/useElements
// only work in a descendant of the Elements provider.
function CheckoutForm({ amount, onPaid }: { amount: number; onPaid: () => void }) {
  const stripe = useStripe();
  const elements = useElements();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handlePay() {
    if (!stripe || !elements) return;
    setSubmitting(true);
    setError(null);
    const { error: confirmError, paymentIntent } = await stripe.confirmPayment({
      elements,
      redirect: 'if_required',
    });
    setSubmitting(false);
    if (confirmError) {
      setError(confirmError.message || 'Payment failed. Please try again.');
      return;
    }
    if (paymentIntent && (paymentIntent.status === 'succeeded' || paymentIntent.status === 'processing')) {
      onPaid();
    }
  }

  return (
    <div className="space-y-4">
      <PaymentElement />
      {error && <p className="text-xs text-rose-600">{error}</p>}
      <button
        type="button"
        onClick={handlePay}
        disabled={!stripe || submitting}
        className="w-full px-6 py-2.5 text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg disabled:opacity-50"
      >
        {submitting ? 'Processing...' : `Pay ${money(amount)}`}
      </button>
    </div>
  );
}

// Down-payment collection step shown inline on the same page right after a
// contract is signed (mirrors the proposal → contract inline handoff). Only
// renders anything once a genuine Stripe publishable key is configured
// (Settings → integration_secrets); until then it shows a plain "not
// configured yet" notice instead of a broken payment form.
const DEFAULT_TITLE = 'Down Payment';
const DEFAULT_DESCRIPTION = (amount: number, dealName: string | null) =>
  `A down payment of ${money(amount)} is due to get ${dealName || 'your project'} started.`;

export default function DownPaymentForm({ token, onPaid, title = DEFAULT_TITLE, description = DEFAULT_DESCRIPTION }: Props) {
  const { data: config } = useQuery({ queryKey: ['stripe-config'], queryFn: fetchStripeConfig });
  const { data: invoice, isLoading: invoiceLoading } = useQuery({
    queryKey: ['public-down-payment', token],
    queryFn: () => fetchDownPayment(token),
    enabled: !!token,
    retry: false,
  });

  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const createIntent = useMutation({
    mutationFn: () => createPaymentIntent(token),
    onSuccess: (res) => {
      if (res.success && res.client_secret) setClientSecret(res.client_secret);
      else setError(res.error || 'Could not start payment.');
    },
    onError: (err) => setError(err instanceof Error ? err.message : 'Could not start payment.'),
  });

  const isConfigured = !!config?.publishable_key && !config.publishable_key.includes('REPLACE_WITH_REAL');

  useEffect(() => {
    if (isConfigured && invoice?.success && !invoice.is_paid && !clientSecret && !createIntent.isPending) {
      createIntent.mutate();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isConfigured, invoice?.success, invoice?.is_paid]);

  const stripePromise = useMemo<Promise<Stripe | null> | null>(
    () => (isConfigured ? loadStripe(config!.publishable_key) : null),
    [isConfigured, config?.publishable_key]
  );

  if (invoiceLoading) return <p className="text-sm text-slate-400 text-center py-6">Loading payment details...</p>;
  if (!invoice || !invoice.success) return null;
  if (invoice.is_paid) return null; // parent already shows the thank-you state in this case

  return (
    <div className="mt-8 pt-6 border-t border-slate-100">
      <h2 className="text-sm font-semibold text-slate-800 mb-1">{title}</h2>
      <p className="text-xs text-slate-500 mb-4">{description(invoice.total, invoice.deal_name)}</p>

      {!isConfigured ? (
        <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
          Online payment isn't set up yet. Please reach out and we'll arrange the down payment directly.
        </p>
      ) : error ? (
        <p className="text-xs text-rose-600">{error}</p>
      ) : !clientSecret || !stripePromise ? (
        <p className="text-sm text-slate-400 text-center py-4">Preparing payment form...</p>
      ) : (
        <Elements stripe={stripePromise} options={{ clientSecret }}>
          <CheckoutForm amount={invoice.total} onPaid={onPaid} />
        </Elements>
      )}
    </div>
  );
}
