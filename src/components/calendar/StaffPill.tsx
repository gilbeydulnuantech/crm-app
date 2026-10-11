import { toTitleCase } from '../../utils/text';
import { formatMoney } from '../../utils/eventPrice';

// The therapist / staff member on an event card: a light green capsule, with their commission for the visit once the
// booking is confirmed. Sized in em so it follows the card's text size.
export default function StaffPill({ name, commission }: { name: string; commission?: number | null }) {
  const money = formatMoney(commission);
  return (
    <span
      className="inline-flex max-w-full items-center gap-1 rounded-full bg-emerald-100 px-2 py-px font-medium text-emerald-800 leading-tight"
      style={{ fontSize: '0.9em' }}
      title={`${toTitleCase(name)}${money ? ` — commission ${money}` : ''}`}
    >
      <i className="fa-solid fa-user-nurse text-[0.85em] shrink-0" />
      <span className="truncate">{toTitleCase(name)}</span>
      {money && <span className="shrink-0 font-semibold">· {money}</span>}
    </span>
  );
}
