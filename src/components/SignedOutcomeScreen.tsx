import ThankYouScreen from './ThankYouScreen';
import { fillPageFields, MergeFieldValues } from '../utils/mergeFields';

interface Props {
  thankYouPageContentHtml: string | null;
  firstName: string | null;
  lastName: string | null;
  ownerName: string | null;
  signatureName: string | null;
  signedAt: string | null;
  mergeValues?: MergeFieldValues;
}

// Renders the contract's linked Thank You page (Documents > Pages, chosen
// on the Contract editor) when one's set, resolving its dynamic fields from
// the actual contact/signer — falls back to the generic ThankYouScreen when
// no page is linked, so this works the same whether or not a rep bothered
// to set one up. This is the end of the client-side flow — no download or
// resend buttons here; those live in the internal CRM view instead.
export default function SignedOutcomeScreen({
  thankYouPageContentHtml,
  firstName,
  lastName,
  ownerName,
  signatureName,
  signedAt,
  mergeValues,
}: Props) {
  if (!thankYouPageContentHtml) {
    return <ThankYouScreen signatureName={signatureName} signedAt={signedAt} />;
  }

  const resolvedHtml = fillPageFields(thankYouPageContentHtml, {
    contact_full_name: `${firstName || ''} ${lastName || ''}`.trim(),
    first_name: firstName,
    last_name: lastName,
    owner_name: ownerName,
    signature_name: signatureName,
    signed_at: signedAt,
    merge: mergeValues,
  });

  return <div className="rte-content" dangerouslySetInnerHTML={{ __html: resolvedHtml }} />;
}
