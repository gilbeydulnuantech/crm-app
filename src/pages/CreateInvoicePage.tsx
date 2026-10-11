import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useContacts } from '../hooks/useContacts';
import { useCompanies } from '../hooks/useCompanies';
import { usePipelines, useAllOpportunities } from '../hooks/useOpportunities';
import { useCreateInvoice, useSendInvoice } from '../hooks/usePayments';
import { useProposals } from '../hooks/useProposals';
import { useInvoiceTemplates } from '../hooks/useInvoiceTemplates';
import { useCompanyProfile } from '../hooks/useCompanyProfile';
import { InvoiceLineItemInput } from '../api/payments';
import InvoiceLineItemsEditor, { invoiceTotals } from '../components/payments/InvoiceLineItemsEditor';
import InvoiceDocumentPreview from '../components/payments/InvoiceDocumentPreview';

const EMPTY_ITEM: InvoiceLineItemInput = { product: '', qty: 1, unit_price: 0, discount: 0, tax: 0 };

function isBlank(items: InvoiceLineItemInput[]) {
  return items.every((it) => !it.product.trim() && !it.unit_price);
}
function money(n: number) {
  return `$${Number(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
function formatDate(iso: string) {
  if (!iso) return '--';
  return new Date(`${iso}T00:00:00`).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

const inputClass =
  'w-full px-3 py-1.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--theme-accent)]';
const labelClass = 'block text-[11px] font-medium text-slate-500 mb-1';

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4">
      <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-3">{title}</h2>
      {children}
    </div>
  );
}

export default function CreateInvoicePage() {
  const navigate = useNavigate();
  const { data: contacts = [] } = useContacts();
  const { data: companies = [] } = useCompanies();
  const { data: pipelines = [] } = usePipelines();
  const { data: deals = [] } = useAllOpportunities(pipelines.map((p) => p.id));
  const { data: invoiceTemplates = [] } = useInvoiceTemplates();
  const { data: company } = useCompanyProfile();
  const createInvoice = useCreateInvoice();
  const sendInvoice = useSendInvoice();

  const [contactId, setContactId] = useState('');
  const [accountId, setAccountId] = useState('');
  const [opportunityId, setOpportunityId] = useState('');
  const [issueDate, setIssueDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [dueDate, setDueDate] = useState('');
  const [items, setItems] = useState<InvoiceLineItemInput[]>([EMPTY_ITEM]);
  const [itemsAutoFilled, setItemsAutoFilled] = useState(false);
  const [internalNotes, setInternalNotes] = useState('');
  const [customerNotes, setCustomerNotes] = useState('');
  const [sendOnCreate, setSendOnCreate] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);

  const dealsForContact = contactId ? deals.filter((d) => String(d.contact_id) === contactId) : [];
  const selectedDeal = deals.find((d) => String(d.id) === opportunityId);
  const selectedContact = contacts.find((c) => String(c.id) === contactId);
  const selectedAccount = companies.find((c) => String(c.id) === accountId);

  const { data: dealProposals = [] } = useProposals(opportunityId ? Number(opportunityId) : null, !!opportunityId);
  const activeTemplate = invoiceTemplates.find((t) => t.is_active);

  function handleContactChange(value: string) {
    setContactId(value);
    setOpportunityId('');
    const contact = contacts.find((c) => String(c.id) === value);
    if (contact?.account_id) setAccountId(String(contact.account_id));
  }

  function handleItemsChange(next: InvoiceLineItemInput[]) {
    setItems(next);
    setItemsAutoFilled(false);
  }

  function handleInsertTemplate(templateId: string) {
    if (!templateId) return;
    const tmpl = invoiceTemplates.find((t) => String(t.id) === templateId);
    if (!tmpl || tmpl.line_items.length === 0) return;
    setItems(tmpl.line_items.map((it) => ({ ...it })));
    setItemsAutoFilled(false);
  }

  useEffect(() => {
    if (selectedDeal?.expected_close) setDueDate(selectedDeal.expected_close.slice(0, 10));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [opportunityId]);

  useEffect(() => {
    if (!opportunityId) return;
    if (dealProposals.length === 0) {
      if (itemsAutoFilled) {
        setItems([EMPTY_ITEM]);
        setItemsAutoFilled(false);
      }
      return;
    }
    if (!isBlank(items) && !itemsAutoFilled) return;
    const proposal = dealProposals[0];
    if (proposal.line_items && proposal.line_items.length > 0) {
      setItems(proposal.line_items.map((it) => ({ ...it })));
      setItemsAutoFilled(true);
      return;
    }
    setItems([{ product: proposal.title, qty: 1, unit_price: Number(proposal.total_amount) || 0, discount: 0, tax: 0 }]);
    setItemsAutoFilled(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [opportunityId, dealProposals]);

  const billingAddress = selectedAccount
    ? [selectedAccount.street_address, selectedAccount.city, selectedAccount.state, selectedAccount.zip_code, selectedAccount.country]
        .filter(Boolean)
        .join(', ')
    : selectedContact
      ? [selectedContact.city, selectedContact.state, selectedContact.zip_code, selectedContact.country].filter(Boolean).join(', ')
      : '';

  const totals = invoiceTotals(items.filter((it) => it.product.trim()));

  function handleCreate() {
    setError(null);
    const validItems = items.filter((it) => it.product.trim());
    if (validItems.length === 0) return setError('Add at least one line item.');
    createInvoice.mutate(
      {
        contact_id: contactId ? Number(contactId) : null,
        account_id: accountId ? Number(accountId) : null,
        opportunity_id: opportunityId ? Number(opportunityId) : null,
        line_items: validItems,
        issue_date: issueDate,
        due_date: dueDate || null,
        internal_notes: internalNotes.trim() || undefined,
        customer_notes: customerNotes.trim() || undefined,
      },
      {
        onSuccess: (res) => {
          if (sendOnCreate) sendInvoice.mutate(res.id);
          navigate(`/payments/invoices/${res.id}`);
        },
        onError: (err) => setError(err instanceof Error ? err.message : 'Failed to create invoice.'),
      }
    );
  }

  const previewData = {
    invoiceNumber: 'Assigned on save',
    issueDate: formatDate(issueDate),
    dueDate: dueDate ? formatDate(dueDate) : '--',
    customerName: selectedContact ? `${selectedContact.first_name} ${selectedContact.last_name}`.trim() : selectedAccount?.name || 'Customer',
    customerAddress: billingAddress || undefined,
    customerEmail: selectedContact?.email || undefined,
    customerPhone: selectedContact?.phone || undefined,
    notes: customerNotes || undefined,
  };

  return (
    <div className="flex-1 overflow-y-auto bg-slate-50">
      <div className="bg-white border-b border-slate-200 px-6 py-4">
        <button
          type="button"
          onClick={() => navigate('/payments/invoices')}
          className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 mb-2"
        >
          <i className="fa-solid fa-chevron-left text-xs" />
          Back to Invoices
        </button>
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-lg font-bold text-slate-800">Create Invoice</h1>
            <p className="text-xs text-slate-500">Create and send a professional invoice to your customer.</p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => navigate('/payments/invoices')}
              className="px-3 py-2 text-sm font-semibold border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-lg"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => setPreviewOpen(true)}
              className="px-3 py-2 text-sm font-semibold border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-lg"
            >
              <i className="fa-solid fa-eye mr-1.5" /> Preview
            </button>
            <button
              type="button"
              onClick={handleCreate}
              disabled={createInvoice.isPending}
              className="px-4 py-2 text-sm font-semibold bg-[var(--theme-accent)] hover:opacity-90 text-white rounded-lg disabled:opacity-50"
            >
              {createInvoice.isPending ? 'Creating...' : sendOnCreate ? 'Create & Send' : 'Create Invoice'}
            </button>
          </div>
        </div>
        {error && <p className="text-xs text-rose-600 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2 mt-3">{error}</p>}
      </div>

      <div className="p-6 grid grid-cols-1 lg:grid-cols-3 gap-4 items-start">
        <div className="lg:col-span-2 space-y-4">
          <Card title="Invoice Details">
            <div className="grid grid-cols-2 gap-3 mb-3">
              <div>
                <label className={labelClass}>Customer</label>
                <select value={contactId} onChange={(e) => handleContactChange(e.target.value)} className={inputClass}>
                  <option value="">None</option>
                  {contacts.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.first_name} {c.last_name}
                    </option>
                  ))}
                </select>
                {selectedContact && (
                  <p className="text-[11px] text-slate-400 mt-1">
                    {selectedContact.email} {selectedContact.phone ? `· ${selectedContact.phone}` : ''}
                  </p>
                )}
              </div>
              <div>
                <label className={labelClass}>Company</label>
                <select value={accountId} onChange={(e) => setAccountId(e.target.value)} className={inputClass}>
                  <option value="">None</option>
                  {companies.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div>
              <label className={labelClass}>Billing Address</label>
              <p className="text-xs text-slate-500 min-h-[1.5rem]">{billingAddress || 'Select a customer or company to fill in an address.'}</p>
            </div>
          </Card>

          <Card title="Related To">
            <div>
              <label className={labelClass}>Deal</label>
              <select
                value={opportunityId}
                onChange={(e) => setOpportunityId(e.target.value)}
                disabled={!contactId}
                className={`${inputClass} disabled:bg-slate-50 disabled:text-slate-400`}
              >
                <option value="">{contactId ? 'None' : 'Select a customer first'}</option>
                {dealsForContact.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
              {contactId && dealsForContact.length === 0 && (
                <p className="text-[11px] text-slate-400 mt-1">This customer has no deals linked yet.</p>
              )}
            </div>
          </Card>

          <Card title="Dates">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelClass}>Issue Date</label>
                <input type="date" value={issueDate} onChange={(e) => setIssueDate(e.target.value)} className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Due Date</label>
                <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className={inputClass} />
              </div>
            </div>
          </Card>

          <Card title="Invoice Template">
            <div className="flex items-end gap-2">
              <div className="flex-1">
                <label className={labelClass}>Insert line items from</label>
                <select
                  value=""
                  onChange={(e) => handleInsertTemplate(e.target.value)}
                  disabled={invoiceTemplates.length === 0}
                  className={`${inputClass} disabled:bg-slate-50 disabled:text-slate-400`}
                >
                  <option value="">{invoiceTemplates.length === 0 ? 'No templates yet' : 'Choose a template...'}</option>
                  {invoiceTemplates.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                      {t.is_active ? ' (Active — controls appearance)' : ''}
                    </option>
                  ))}
                </select>
              </div>
              <button
                type="button"
                onClick={() => navigate('/documents/templates')}
                className="px-3 py-1.5 text-xs font-semibold border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-lg shrink-0"
              >
                <i className="fa-solid fa-pen mr-1" /> Customize
              </button>
            </div>
            <p className="text-[11px] text-slate-400 mt-1.5">
              Picking a template pre-fills these line items. The <strong>Active</strong> template also controls how the
              invoice document looks.
            </p>
          </Card>

          <Card title="Notes">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelClass}>Internal Notes</label>
                <textarea value={internalNotes} onChange={(e) => setInternalNotes(e.target.value)} rows={2} className={inputClass} placeholder="Not shown to the customer" />
              </div>
              <div>
                <label className={labelClass}>Notes to Customer</label>
                <textarea value={customerNotes} onChange={(e) => setCustomerNotes(e.target.value)} rows={2} className={inputClass} placeholder="Thank you for your business..." />
              </div>
            </div>
          </Card>

          <Card title="Invoice Items">
            <InvoiceLineItemsEditor items={items} onChange={handleItemsChange} />
          </Card>
        </div>

        <div className="space-y-4">
          <Card title="Invoice Summary">
            <div className="space-y-1.5 text-xs">
              <div className="flex justify-between"><span className="text-slate-400">Subtotal</span><span>{money(totals.amount)}</span></div>
              <div className="flex justify-between"><span className="text-slate-400">Discount</span><span>{money(totals.discount)}</span></div>
              <div className="flex justify-between"><span className="text-slate-400">Tax</span><span>{money(totals.tax)}</span></div>
              <div className="flex justify-between font-bold text-slate-800 pt-1.5 border-t border-slate-100"><span>Total</span><span>{money(totals.total)}</span></div>
              <div className="flex justify-between text-emerald-600"><span>Paid</span><span>$0.00</span></div>
              <div className="flex justify-between font-bold text-rose-600"><span>Balance Due</span><span>{money(totals.total)}</span></div>
            </div>
          </Card>

          <Card title="Preview">
            <div className="flex items-center justify-between -mt-3 mb-2">
              <span />
              <button
                type="button"
                onClick={() => navigate(activeTemplate ? `/documents/templates/invoice/${activeTemplate.id}/edit` : '/documents/templates')}
                className="text-[11px] font-semibold text-[var(--theme-accent)] hover:underline"
              >
                Edit Template
              </button>
            </div>
            <button
              type="button"
              onClick={() => setPreviewOpen(true)}
              className="block w-full border border-slate-200 rounded-lg overflow-hidden hover:border-slate-300"
              style={{ height: 340 }}
            >
              <div className="origin-top-left scale-[0.5] pointer-events-none" style={{ width: '200%' }}>
                <InvoiceDocumentPreview
                  settings={activeTemplate?.settings || {}}
                  company={company}
                  lineItems={items.filter((it) => it.product.trim())}
                  data={previewData}
                />
              </div>
            </button>
          </Card>

          <Card title="Settings">
            <label className="flex items-center gap-2 text-xs text-slate-600 cursor-pointer">
              <input type="checkbox" checked={sendOnCreate} onChange={(e) => setSendOnCreate(e.target.checked)} className="rounded border-slate-300" />
              Send invoice to customer immediately
            </label>
          </Card>
        </div>
      </div>

      {previewOpen && (
        <div className="fixed inset-0 z-[120] bg-black/40 flex items-center justify-center p-6" onClick={() => setPreviewOpen(false)}>
          <div className="bg-white rounded-xl max-h-full overflow-hidden flex flex-col shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 shrink-0">
              <p className="text-sm font-semibold text-slate-800">Invoice Preview</p>
              <button type="button" onClick={() => setPreviewOpen(false)} className="text-slate-400 hover:text-slate-600 px-1">
                <i className="fa-solid fa-xmark" />
              </button>
            </div>
            <div className="overflow-y-auto p-6 bg-slate-100">
              <InvoiceDocumentPreview
                settings={activeTemplate?.settings || {}}
                company={company}
                lineItems={items.filter((it) => it.product.trim())}
                data={previewData}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
