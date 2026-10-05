import { useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { fetchPublicInvoicePrint } from '../api/payments';
import { InvoiceTemplateSettings } from '../api/invoiceTemplates';
import InvoiceDocumentPreview from '../components/payments/InvoiceDocumentPreview';
import { toTitleCase } from '../utils/text';

function formatDate(iso: string | null | undefined) {
  if (!iso) return '--';
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

// Print-only rendering of an invoice — no page chrome, no buttons. Fetched via
// the invoice's public token, so no auth is needed. Exists purely as a
// navigation target for Puppeteer (the PDF server) so the emailed invoice
// attachment is the exact same document the in-app preview shows.
export default function PrintInvoicePage() {
  const { token = '' } = useParams();

  const { data, isLoading } = useQuery({
    queryKey: ['public-invoice-print', token],
    queryFn: () => fetchPublicInvoicePrint(token),
    enabled: !!token,
    retry: false,
    // One-shot render for Puppeteer to snapshot — a background refetch would
    // keep its networkidle0 wait from ever settling (see PrintContractPage).
    refetchInterval: false,
  });

  // The app's themed body background would otherwise show as a grey page
  // behind/below the document in the PDF — this page should print on white.
  useEffect(() => {
    const prev = document.body.style.background;
    document.body.style.background = '#ffffff';
    return () => {
      document.body.style.background = prev;
    };
  }, []);

  if (isLoading) return null;
  if (!data || !data.success) return <p className="p-8 text-sm text-rose-600">This invoice link is invalid or has expired.</p>;

  const customerName = data.contact_first_name
    ? toTitleCase(`${data.contact_first_name} ${data.contact_last_name || ''}`.trim())
    : data.account_name || 'Unknown';
  const billingAddress = [data.street_address, data.city, data.state, data.zip_code, data.country]
    .filter(Boolean)
    .join(', ');

  return (
    <div className="bg-white">
      <InvoiceDocumentPreview
        settings={(data.template_settings || {}) as Partial<InvoiceTemplateSettings>}
        company={{
          company_name: data.company_name || '',
          email: data.company_email || '',
          phone: data.company_phone || '',
          logo_url: data.company_logo_url,
        }}
        lineItems={data.line_items}
        data={{
          invoiceNumber: data.invoice_number,
          issueDate: formatDate(data.issue_date),
          dueDate: formatDate(data.due_date),
          customerName,
          customerAddress: billingAddress || undefined,
          customerEmail: data.contact_email || undefined,
          customerPhone: data.contact_phone || undefined,
          paymentInstructions: undefined,
          notes: data.customer_notes || undefined,
          amountPaid: data.amount_paid,
        }}
      />
    </div>
  );
}
