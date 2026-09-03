import { useState } from 'react';
import EmailTemplatesPanel from '../components/documents/EmailTemplatesPanel';
import InvoiceTemplatesPanel from '../components/documents/InvoiceTemplatesPanel';
import ReceiptTemplatesPanel from '../components/documents/ReceiptTemplatesPanel';

const TABS = [
  ['email', 'Email', 'fa-envelope'],
  ['invoice', 'Invoice', 'fa-file-invoice-dollar'],
  ['receipt', 'Receipt', 'fa-receipt'],
] as const;

type TemplateTab = (typeof TABS)[number][0];

export default function TemplatesPage() {
  const [tab, setTab] = useState<TemplateTab>('email');

  return (
    <div className="flex-1 overflow-y-auto p-6">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-lg font-bold text-slate-800 mb-1">Templates</h1>
        <p className="text-xs text-slate-500 mb-4">Reusable content for email, invoices, and payment receipts.</p>

        <div className="flex items-center gap-1 border-b border-slate-200 mb-5">
          {TABS.map(([key, label, icon]) => (
            <button
              key={key}
              type="button"
              onClick={() => setTab(key)}
              className={`flex items-center gap-1.5 px-3 py-2 text-sm font-semibold border-b-2 transition-colors -mb-px ${
                tab === key ? 'border-[var(--theme-accent)] text-[var(--theme-accent)]' : 'border-transparent text-slate-400 hover:text-slate-600'
              }`}
            >
              <i className={`fa-solid ${icon} text-xs`} />
              {label}
            </button>
          ))}
        </div>

        {tab === 'email' && <EmailTemplatesPanel />}
        {tab === 'invoice' && <InvoiceTemplatesPanel />}
        {tab === 'receipt' && <ReceiptTemplatesPanel />}
      </div>
    </div>
  );
}
