interface Props {
  signatureName: string | null;
  signedAt: string | null;
}

// Replaces the whole card once a contract is signed — a distinct landing
// state for the client, not just another section stacked under the document.
// Deliberately has no buttons/links below it — this is the end of the
// client-side flow; any further action (resending a copy, downloading the
// signed PDF) happens from the internal CRM view, not here.
export default function ThankYouScreen({ signatureName, signedAt }: Props) {
  return (
    <div className="text-center py-10">
      <div className="w-14 h-14 mx-auto rounded-full bg-emerald-100 flex items-center justify-center mb-4">
        <i className="fa-solid fa-circle-check text-2xl text-emerald-600" />
      </div>
      <h1 className="text-xl font-bold text-slate-800">Thank you{signatureName ? `, ${signatureName}` : ''}!</h1>
      <p className="text-sm text-slate-500 mt-1.5">
        Your contract has been signed{signedAt ? ` on ${new Date(signedAt).toLocaleDateString()}` : ''}. We'll be in
        touch shortly with next steps.
      </p>
    </div>
  );
}
