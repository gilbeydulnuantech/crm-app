import { ReactNode } from 'react';

// Owner-assignment notifications (sent by the assign-contact-owner,
// update-companies, and update-opportunity n8n flows) embed a machine-
// readable reference inside the otherwise plain-text message body so Team
// Chat can render it as a clickable link back to the record, e.g.:
//   You've been assigned as the owner of contact "[[ref:contact:123:-:John Smith]]".
// Shape: [[ref:<contact|company|deal>:<id>:<extra>:<label>]] — `extra` is
// "-" for contact/company and the deal's pipeline_id for deal (needed to
// deep-link into the right pipeline board).
const REF_TOKEN = /\[\[ref:(contact|company|deal):(-?\d+):(-|-?\d+):([^\]]+)\]\]/g;

function hrefFor(type: string, id: string, extra: string) {
  if (type === 'contact') return `/contacts?contactId=${id}`;
  if (type === 'company') return `/companies?companyId=${id}`;
  // Deal: Pipeline.tsx's ?pipeline=/?highlight= deep link switches to the
  // right board and rings the card for a few seconds.
  return `/pipeline?pipeline=${extra}&highlight=${id}`;
}

/** Plain-text preview (e.g. notification dropdowns) — tokens collapse to just their label. */
export function stripRefTokens(body: string): string {
  return body.replace(REF_TOKEN, (_m, _type, _id, _extra, label) => label);
}

/** Full render for the chat thread itself — tokens become clickable links. */
export function renderMessageBody(body: string, onNavigate: (href: string) => void, linkClassName: string): ReactNode[] {
  const parts: ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let key = 0;
  REF_TOKEN.lastIndex = 0;

  while ((match = REF_TOKEN.exec(body))) {
    if (match.index > lastIndex) {
      parts.push(body.slice(lastIndex, match.index));
    }
    const [full, type, id, extra, label] = match;
    parts.push(
      <button
        key={`ref-${key++}`}
        type="button"
        onClick={() => onNavigate(hrefFor(type, id, extra))}
        className={`font-semibold underline underline-offset-2 hover:opacity-80 ${linkClassName}`}
      >
        {label}
      </button>
    );
    lastIndex = match.index + full.length;
  }
  if (lastIndex < body.length) parts.push(body.slice(lastIndex));
  return parts;
}
