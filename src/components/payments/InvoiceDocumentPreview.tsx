import { InvoiceLineItemInput } from '../../api/payments';
import { DEFAULT_INVOICE_TEMPLATE_SETTINGS, InvoiceTemplateSettings } from '../../api/invoiceTemplates';
import { invoiceTotals } from './InvoiceLineItemsEditor';

function money(n: number) {
  return `$${Number(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export interface InvoiceDocumentData {
  invoiceNumber: string;
  issueDate: string;
  dueDate: string;
  customerName: string;
  customerAddress?: string;
  customerEmail?: string;
  customerPhone?: string;
  shipTo?: string;
  paymentInstructions?: string;
  notes?: string;
  terms?: string;
  amountPaid?: number;
}

interface CompanyInfo {
  company_name: string;
  email: string;
  phone: string;
  logo_url: string | null;
}

// Shared, actual-document rendering of an invoice — used both as the live
// preview in the template editor (with placeholder sample data) and as the
// real print/preview view on an actual invoice, so "what you see in the
// editor" and "what a rep/customer actually sees" never drift apart.
export default function InvoiceDocumentPreview({
  settings,
  company,
  lineItems,
  data,
}: {
  settings: Partial<InvoiceTemplateSettings>;
  company?: CompanyInfo | null;
  lineItems: InvoiceLineItemInput[];
  data: InvoiceDocumentData;
}) {
  const s = { ...DEFAULT_INVOICE_TEMPLATE_SETTINGS, ...settings };
  const totals = invoiceTotals(lineItems);
  const balanceDue = totals.total - (data.amountPaid || 0);
  const companyName = company?.company_name || 'YOUR COMPANY';

  return (
    <div
      className="bg-white shadow-sm border border-slate-200 mx-auto"
      style={{
        fontFamily: s.font_family,
        fontSize: `${s.font_size}px`,
        padding: `${s.page_margin}px`,
        maxWidth: s.orientation === 'landscape' ? '842px' : '595px',
        color: '#1e293b',
      }}
    >
      <div className="flex items-start justify-between" style={{ marginBottom: s.section_spacing }}>
        <div>
          {company?.logo_url ? (
            <img src={company.logo_url} alt="" className="h-10 mb-1 object-contain" />
          ) : (
            <div
              className="h-10 w-10 rounded-lg mb-1 flex items-center justify-center text-white font-bold"
              style={{ backgroundColor: s.primary_color }}
            >
              <i className="fa-solid fa-cube" />
            </div>
          )}
          <p className="font-bold text-base" style={{ color: s.primary_color }}>{companyName}</p>
          {company?.email && <p className="text-[11px] text-slate-500 mt-1">{company.email}</p>}
          {company?.phone && <p className="text-[11px] text-slate-500">{company.phone}</p>}
        </div>

        <div className="text-right">
          <p className="text-xl font-bold tracking-wide mb-2">INVOICE</p>
          <table className="text-[11px] ml-auto">
            <tbody>
              <tr>
                <td className="pr-3 text-slate-500 text-left">Invoice Number</td>
                <td className="font-medium">{data.invoiceNumber}</td>
              </tr>
              <tr>
                <td className="pr-3 text-slate-500 text-left">Issue Date</td>
                <td className="font-medium">{data.issueDate}</td>
              </tr>
              <tr>
                <td className="pr-3 text-slate-500 text-left">Due Date</td>
                <td className="font-medium">{data.dueDate}</td>
              </tr>
              <tr>
                <td className="pr-3 pt-1 font-semibold text-left" style={{ color: s.primary_color }}>
                  Amount Due
                </td>
                <td className="pt-1 font-bold" style={{ color: s.primary_color }}>
                  {money(totals.total)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {(s.show_bill_to || s.show_ship_to) && (
        <div className="grid grid-cols-2 gap-4" style={{ marginBottom: s.section_spacing }}>
          {s.show_bill_to && (
            <div>
              <p className="font-semibold text-[11px] mb-1" style={{ color: s.primary_color }}>Bill To</p>
              <p className="text-[11px] text-slate-600 whitespace-pre-line">{data.customerName}</p>
              {data.customerAddress && <p className="text-[11px] text-slate-500 whitespace-pre-line">{data.customerAddress}</p>}
              {data.customerEmail && <p className="text-[11px] text-slate-500">{data.customerEmail}</p>}
              {data.customerPhone && <p className="text-[11px] text-slate-500">{data.customerPhone}</p>}
            </div>
          )}
          {s.show_ship_to && data.shipTo && (
            <div>
              <p className="font-semibold text-[11px] mb-1" style={{ color: s.primary_color }}>Ship To</p>
              <p className="text-[11px] text-slate-600 whitespace-pre-line">{data.shipTo}</p>
            </div>
          )}
        </div>
      )}

      <table className="w-full text-[11px]" style={{ marginBottom: s.section_spacing }}>
        <thead>
          <tr style={{ backgroundColor: s.table_header_bg, color: s.table_header_text }}>
            <th className="text-left font-semibold px-2 py-1.5">#</th>
            <th className="text-left font-semibold px-2 py-1.5">Item / Description</th>
            <th className="text-right font-semibold px-2 py-1.5">Qty</th>
            <th className="text-right font-semibold px-2 py-1.5">Unit Price</th>
            <th className="text-right font-semibold px-2 py-1.5">Tax</th>
            <th className="text-right font-semibold px-2 py-1.5">Amount</th>
          </tr>
        </thead>
        <tbody>
          {lineItems.map((it, i) => (
            <tr key={i} style={{ backgroundColor: i % 2 === 1 ? s.table_alt_row_bg : s.table_row_bg }}>
              <td className="px-2 py-1.5 align-top text-slate-500">{i + 1}</td>
              <td className="px-2 py-1.5 align-top">{it.product || '—'}</td>
              <td className="px-2 py-1.5 align-top text-right">{it.qty}</td>
              <td className="px-2 py-1.5 align-top text-right">{money(it.unit_price)}</td>
              <td className="px-2 py-1.5 align-top text-right">{money(it.tax || 0)}</td>
              <td className="px-2 py-1.5 align-top text-right font-medium">
                {money(it.qty * it.unit_price - (it.discount || 0) + (it.tax || 0))}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="flex justify-end" style={{ marginBottom: s.section_spacing }}>
        <table className="text-[11px] w-56">
          <tbody>
            <tr>
              <td className="py-0.5 text-slate-500">Subtotal</td>
              <td className="py-0.5 text-right">{money(totals.amount)}</td>
            </tr>
            <tr>
              <td className="py-0.5 text-slate-500">Discount</td>
              <td className="py-0.5 text-right">{money(totals.discount)}</td>
            </tr>
            <tr>
              <td className="py-0.5 text-slate-500">Tax</td>
              <td className="py-0.5 text-right">{money(totals.tax)}</td>
            </tr>
            <tr style={{ backgroundColor: s.table_header_bg }}>
              <td className="py-1 px-1 font-bold" style={{ color: s.table_header_text }}>Total</td>
              <td className="py-1 px-1 text-right font-bold" style={{ color: s.table_header_text }}>{money(totals.total)}</td>
            </tr>
            {data.amountPaid ? (
              <tr>
                <td className="py-0.5 text-slate-500">Amount Paid</td>
                <td className="py-0.5 text-right">{money(data.amountPaid)}</td>
              </tr>
            ) : null}
            <tr style={{ backgroundColor: s.table_header_bg }}>
              <td className="py-1 px-1 font-bold" style={{ color: s.table_header_text }}>Balance Due</td>
              <td className="py-1 px-1 text-right font-bold" style={{ color: s.table_header_text }}>{money(balanceDue)}</td>
            </tr>
          </tbody>
        </table>
      </div>

      {(s.show_payment_instructions || s.show_notes) && (
        <div className="grid grid-cols-2 gap-4" style={{ marginBottom: s.section_spacing }}>
          {s.show_payment_instructions && data.paymentInstructions && (
            <div>
              <p className="font-semibold text-[11px] mb-1" style={{ color: s.primary_color }}>Payment Instructions</p>
              <p className="text-[11px] text-slate-500 whitespace-pre-line">{data.paymentInstructions}</p>
            </div>
          )}
          {s.show_notes && data.notes && (
            <div>
              <p className="font-semibold text-[11px] mb-1" style={{ color: s.primary_color }}>Notes</p>
              <p className="text-[11px] text-slate-500 whitespace-pre-line">{data.notes}</p>
            </div>
          )}
        </div>
      )}

      {s.show_footer && (
        <div className="pt-3 border-t border-slate-100 flex items-end justify-between">
          <div>
            <p className="font-semibold text-[11px]">Thank you for your business!</p>
            {s.show_company_info && (
              <div className="text-[10px] text-slate-500 mt-1 space-y-0.5">
                {company?.email && <p>{company.email}</p>}
                {company?.phone && <p>{company.phone}</p>}
              </div>
            )}
          </div>
          {s.show_terms && data.terms && (
            <div className="text-right max-w-[45%]">
              <p className="font-semibold text-[11px]" style={{ color: s.primary_color }}>Terms & Conditions</p>
              <p className="text-[10px] text-slate-500 whitespace-pre-line">{data.terms}</p>
            </div>
          )}
          {s.show_page_number && <p className="text-[10px] text-slate-400 shrink-0 ml-2">Page 1</p>}
        </div>
      )}
    </div>
  );
}
