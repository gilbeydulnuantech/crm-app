import { useState } from 'react';
import { useEnrichContact } from '../../hooks/useEnrichContact';

// Shown next to a contact's missing email — pulls a real email/phone (and,
// when confidently parseable, a real name) off the contact's linked
// company website via Apify. See the "Enrich Contact From Website" n8n
// workflow. Mainly useful for Google Maps-imported leads, which only start
// with a business name/phone, but works for any contact with a linked
// company + website.
export default function EnrichContactButton({ contactId }: { contactId: number }) {
  const enrich = useEnrichContact();
  const [message, setMessage] = useState<string | null>(null);

  function handleClick() {
    setMessage(null);
    enrich.mutate(contactId, {
      onSuccess: (res) => {
        if (!res.found_email && !res.found_phone) {
          setMessage('No contact info found on their website.');
        } else {
          setMessage(null);
        }
      },
      onError: (err) => setMessage(err instanceof Error ? err.message : 'Enrichment failed.'),
    });
  }

  if (enrich.isSuccess && (enrich.data.found_email || enrich.data.found_phone)) return null;

  return (
    <span className="inline-flex items-center gap-1">
      <button
        type="button"
        onClick={handleClick}
        disabled={enrich.isPending}
        title="Look up a real email/phone from their website"
        className="text-[10px] font-semibold text-[var(--theme-accent)] hover:underline disabled:opacity-50"
      >
        {enrich.isPending ? 'Looking up...' : 'Enrich'}
      </button>
      {message && <span className="text-[10px] text-slate-400">{message}</span>}
    </span>
  );
}
