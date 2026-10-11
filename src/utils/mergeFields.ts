import { toTitleCase } from './text';

// One itemised line on a proposal/invoice — structurally the same as
// InvoiceLineItemInput, kept local so this util has no API dependency.
export interface LineItemRow {
  product: string;
  qty: number;
  unit_price: number;
  discount?: number;
  tax?: number;
}

function money(n: number) {
  return `$${Number(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
function escapeHtml(s: string) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
const lineTotalOf = (it: LineItemRow) => it.qty * it.unit_price - (it.discount || 0) + (it.tax || 0);

// {{product_<slug>}} -> the product's description with its price on the same line (no name). Mirrors the
// server's resolve_product_tokens() (n8n-workflows/products_tokens.sql) so
// editor previews and typed emails match what recipients get.
export interface ProductRow {
  slug: string;
  name: string;
  unit: string;
  unit_price: number;
  description_html: string;
  is_active?: boolean;
}

export function resolveProductTokens(text: string, products: ProductRow[], asText = false): string {
  if (!text || !products.length || !text.includes('{{')) return text;
  return text.replace(/\{\{\s*product_([a-z0-9_]+)\s*\}\}/gi, (whole, slug: string) => {
    const p = products.find((x) => x.slug === slug.toLowerCase() && x.is_active !== false);
    if (!p) return whole;
    const price = `${money(p.unit_price)} / ${p.unit}`;
    if (asText) {
      const plain = p.description_html
        .replace(/<\/(p|div|li)>|<br\s*\/?>/gi, '\n')
        .replace(/<[^>]*>/g, '')
        .replace(/\n{2,}/g, '\n')
        .trim();
      return `${plain ? `${plain} - ` : ''}${price}`;
    }
    // Inline only: the token already sits inside the author's own paragraph, so the description's <p> wrappers
    // are dropped (paragraph breaks become <br>); otherwise nested <p> tags add large gaps between products.
    const desc = (p.description_html || '')
      .replace(/<\/p>\s*<p[^>]*>/gi, '<br>')
      .replace(/<\/?p[^>]*>/gi, '')
      .trim();
    const priceHtml = `<strong>${escapeHtml(price)}</strong>`;
    return desc ? `${desc} &mdash; ${priceHtml}` : priceHtml;
  });
}

// {{line_items}} in a document: an itemised table with a totals row.
export function renderLineItemsTable(items: LineItemRow[] | null | undefined): string {
  if (!items || items.length === 0) return '';
  const th = 'text-align:left;padding:6px 8px;border-bottom:2px solid #cbd5e1;font-size:12px;color:#475569;';
  const thr = th.replace('left', 'right');
  const td = 'padding:6px 8px;border-bottom:1px solid #e2e8f0;font-size:13px;';
  const tdr = td + 'text-align:right;';
  const rows = items
    .map(
      (it) =>
        `<tr><td style="${td}">${escapeHtml(it.product)}</td><td style="${tdr}">${it.qty}</td><td style="${tdr}">${money(it.unit_price)}</td><td style="${tdr}">${money(lineTotalOf(it))}</td></tr>`
    )
    .join('');
  const total = items.reduce((s, it) => s + lineTotalOf(it), 0);
  return (
    `<table style="width:100%;border-collapse:collapse;margin:12px 0;"><thead><tr>` +
    `<th style="${th}">Item</th><th style="${thr}">Qty</th><th style="${thr}">Price</th><th style="${thr}">Total</th></tr></thead>` +
    `<tbody>${rows}</tbody>` +
    `<tfoot><tr><td colspan="3" style="${tdr}font-weight:bold;">Total</td><td style="${tdr}font-weight:bold;">${money(total)}</td></tr></tfoot></table>`
  );
}

// Same lines as plain text, for emails (which are sent as text, not HTML).
export function renderLineItemsText(items: LineItemRow[] | null | undefined): string {
  if (!items || items.length === 0) return '';
  const total = items.reduce((s, it) => s + lineTotalOf(it), 0);
  return [...items.map((it) => `- ${it.product} x ${it.qty} @ ${money(it.unit_price)} = ${money(lineTotalOf(it))}`), `Total: ${money(total)}`].join('\n');
}

// Dynamic-field tokens a rep can drag into a proposal/contract document
// (see DealFieldsPanel) instead of the literal value — keeps the document
// reusable as a template (e.g. via "Save as template") since the token
// resolves per-recipient at view/preview time instead of being baked in.
export interface MergeFieldValues {
  client_name?: string | null;
  // Separate from client_name — {{contact.first_name}}/{{contact.last_name}}
  // resolve on their own too (e.g. for "Dear {{contact.first_name}},"), not
  // just as part of the combined {{contact.full_name}} token.
  first_name?: string | null;
  last_name?: string | null;
  client_company_name?: string | null;
  client_address?: string | null;
  client_email?: string | null;
  client_phone?: string | null;
  owner_name?: string | null;
  owner_email?: string | null;
  owner_phone?: string | null;
  company_name?: string | null;
  // Raw ISO timestamp from activities.due_at (the deal's booked "meeting"-
  // type activity whose subject contains "inspection" — see the Proposals
  // workflow's Look Up Proposal Public/Approved queries) — formatted for
  // display in fillMergeFields below, not shown as the raw ISO string.
  inspection_date?: string | null;
  // opportunities.deal_value — comes back from Postgres as a numeric string
  // (same as total_amount elsewhere in the app), formatted as currency in
  // fillMergeFields below.
  deal_value?: string | number | null;
  deal_name?: string | null;
  deal_created_at?: string | null;
  // opportunities.expected_close — a plain DATE column, not a timestamp, so
  // it's formatted date-only below (no time component to show).
  deal_due_at?: string | null;
  // The deal's down_payment/final invoices and their most recent 'paid'
  // payment — see the Proposals workflow's Look Up Proposal Public/Approved
  // queries for the exact invoices/payments join.
  down_payment_amount?: string | number | null;
  down_payment_paid_at?: string | null;
  balance_amount?: string | number | null;
  balance_paid_at?: string | null;
  // Itemised lines for {{line_items}} (see renderLineItemsTable).
  line_items?: LineItemRow[] | null;
}

export const MERGE_FIELD_TOKENS: { token: string; label: string; key: keyof MergeFieldValues }[] = [
  // Namespaced tokens (AUTOMATION_DYNAMIC_FIELDS) — {{contact.x}}-style
  // naming only; legacy flat/client_-prefixed tokens were removed.
  { token: '{{contact.first_name}}', label: 'First Name', key: 'first_name' },
  { token: '{{contact.last_name}}', label: 'Last Name', key: 'last_name' },
  { token: '{{contact.full_name}}', label: 'Full Name', key: 'client_name' },
  { token: '{{contact.email}}', label: 'Email', key: 'client_email' },
  { token: '{{contact.phone}}', label: 'Phone', key: 'client_phone' },
  { token: '{{contact.address}}', label: 'City, State', key: 'client_address' },
  { token: '{{company.name}}', label: 'Company Name', key: 'client_company_name' },
  { token: '{{user.full_name}}', label: 'Full Name', key: 'owner_name' },
  { token: '{{user.email}}', label: 'Email', key: 'owner_email' },
  { token: '{{user.phone}}', label: 'Phone', key: 'owner_phone' },
  { token: '{{user.company_name}}', label: 'Company Name', key: 'company_name' },
  { token: '{{opportunity.name}}', label: 'Name', key: 'deal_name' },
  { token: '{{opportunity.value}}', label: 'Value', key: 'deal_value' },
  { token: '{{opportunity.created_at}}', label: 'Created At', key: 'deal_created_at' },
  { token: '{{opportunity.due_at}}', label: 'Due At', key: 'deal_due_at' },
  { token: '{{appointment.start_time}}', label: 'Start Time', key: 'inspection_date' },
  { token: '{{payment.down_payment_amount}}', label: 'Down Payment Amount', key: 'down_payment_amount' },
  { token: '{{payment.down_payment_paid_at}}', label: 'Down Payment Paid At', key: 'down_payment_paid_at' },
  { token: '{{payment.balance_amount}}', label: 'Balance Amount', key: 'balance_amount' },
  { token: '{{payment.balance_paid_at}}', label: 'Balance Paid At', key: 'balance_paid_at' },
];

// Contact/user/company names — not emails/phones/addresses, which shouldn't
// be reformatted (same convention as the rest of the CRM, see utils/text.ts).
const TITLE_CASE_KEYS: ReadonlySet<keyof MergeFieldValues> = new Set(['client_name', 'owner_name', 'first_name', 'last_name', 'client_company_name']);

// Raw ISO timestamps that should render as a human date/time, not the raw
// string — same "date, time" shape used in the booking confirmation emails
// (e.g. "Sep 4, 2026, 9:00 AM").
const DATE_KEYS: ReadonlySet<keyof MergeFieldValues> = new Set([
  'inspection_date',
  'deal_created_at',
  'down_payment_paid_at',
  'balance_paid_at',
]);

// Plain DATE columns (no time component) — date-only display.
const DATE_ONLY_KEYS: ReadonlySet<keyof MergeFieldValues> = new Set(['deal_due_at']);

// Numeric columns (arrive as a numeric string from Postgres, same as
// total_amount elsewhere) rendered as currency, e.g. "$5,000.00".
const MONEY_KEYS: ReadonlySet<keyof MergeFieldValues> = new Set(['deal_value', 'down_payment_amount', 'balance_amount']);

export function fillMergeFields(html: string, values: MergeFieldValues): string {
  let result = (html || '').replace(/\{\{\s*line_items\s*\}\}/gi, () => renderLineItemsTable(values.line_items));
  for (const { token, key } of MERGE_FIELD_TOKENS) {
    const escaped = token.replace(/[{}]/g, '\\$&');
    const raw = values[key];
    let value = raw != null ? String(raw) : '';
    if (value && TITLE_CASE_KEYS.has(key)) value = toTitleCase(value);
    if (value && DATE_KEYS.has(key)) {
      const parsed = new Date(value);
      value = isNaN(parsed.getTime()) ? value : parsed.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
    }
    if (value && DATE_ONLY_KEYS.has(key)) {
      const parsed = new Date(value);
      value = isNaN(parsed.getTime()) ? value : parsed.toLocaleDateString(undefined, { dateStyle: 'medium' });
    }
    if (value && MONEY_KEYS.has(key)) {
      const num = Number(value);
      value = isNaN(num) ? value : `$${num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }
    result = result.replace(new RegExp(escaped, 'gi'), value);
  }
  return result;
}

// Separate token set for standalone Pages (see PageEditorPage) — these
// resolve from whoever actually signed, not from a proposal's saved client
// snapshot, so they need their own values object (signature_name/signed_at
// only exist post-sign; the rest come from the contract's linked contact).
export interface PageFieldValues {
  contact_full_name?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  owner_name?: string | null;
  signature_name?: string | null;
  signed_at?: string | null;
  // Contact/company/deal/payment values for the same tokens a proposal
  // resolves — whatever the caller has on hand; blanks resolve to empty.
  merge?: MergeFieldValues;
}

export function fillPageFields(html: string, values: PageFieldValues): string {
  let result = values.merge ? fillMergeFields(html || '', values.merge) : html || '';
  const fullName = values.contact_full_name ? toTitleCase(values.contact_full_name) : '';
  const firstName = values.first_name ? toTitleCase(values.first_name) : '';
  const lastName = values.last_name ? toTitleCase(values.last_name) : '';
  const ownerName = values.owner_name ? toTitleCase(values.owner_name) : '';
  const signatureName = values.signature_name ? toTitleCase(values.signature_name) : '';
  const signedAt = values.signed_at ? new Date(values.signed_at).toLocaleDateString() : '';
  const map: Record<string, string> = {
    // Namespaced tokens only — {{contact.x}}-style naming.
    'contact.first_name': firstName,
    'contact.last_name': lastName,
    'contact.full_name': fullName,
    'user.full_name': ownerName,
    'contract.signature_name': signatureName,
    'contract.signed_at': signedAt,
  };
  for (const [key, value] of Object.entries(map)) {
    result = result.replace(new RegExp(`\\{\\{\\s*${key.replace('.', '\\.')}\\s*\\}\\}`, 'gi'), value);
  }
  return result;
}
