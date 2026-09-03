import { FormEvent, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useInvoiceTemplates, useSaveInvoiceTemplate, useSetInvoiceTemplateActive } from '../hooks/useInvoiceTemplates';
import { useCompanyProfile } from '../hooks/useCompanyProfile';
import { InvoiceLineItemInput } from '../api/payments';
import { DEFAULT_INVOICE_TEMPLATE_SETTINGS, InvoiceTemplateSettings } from '../api/invoiceTemplates';
import InvoiceLineItemsEditor from '../components/payments/InvoiceLineItemsEditor';
import InvoiceDocumentPreview from '../components/payments/InvoiceDocumentPreview';

const EMPTY_ITEM: InvoiceLineItemInput = { product: '', qty: 1, unit_price: 0, discount: 0, tax: 0 };

const SAMPLE_DATA = {
  invoiceNumber: 'INV-2001',
  issueDate: 'Jan 1, 2026',
  dueDate: 'Jan 15, 2026',
  customerName: 'Jane Customer',
  customerAddress: '456 Client Ave\nAustin, TX 78701\nUnited States',
  customerEmail: 'jane@clientco.com',
  customerPhone: '+1 555-000-5678',
  paymentInstructions: 'Pay via bank transfer or the link on your invoice email.',
  notes: 'Thanks for your business — let us know if you have questions.',
  terms: 'Payment due within 14 days of the issue date.',
};

const inputClass =
  'w-full px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--theme-accent)]';
const labelClass = 'block text-[11px] font-medium text-slate-600 mb-1';

function SettingsSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-5">
      <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-2">{title}</p>
      <div className="space-y-3">{children}</div>
    </div>
  );
}

function ColorField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <label className={labelClass}>{label}</label>
      <div className="flex items-center gap-2">
        <input type="color" value={value} onChange={(e) => onChange(e.target.value)} className="h-7 w-9 rounded border border-slate-200 shrink-0" />
        <input type="text" value={value} onChange={(e) => onChange(e.target.value)} className={inputClass} />
      </div>
    </div>
  );
}

function ToggleField({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-center justify-between text-xs text-slate-600 cursor-pointer">
      {label}
      <button
        type="button"
        onClick={() => onChange(!checked)}
        className={`shrink-0 ${checked ? 'text-[var(--theme-accent)]' : 'text-slate-300'}`}
      >
        <i className={`fa-solid ${checked ? 'fa-toggle-on' : 'fa-toggle-off'} text-lg`} />
      </button>
    </label>
  );
}

export default function InvoiceTemplateEditorPage() {
  const { id } = useParams();
  const isEdit = id != null && id !== 'new';
  const navigate = useNavigate();

  const { data: templates = [] } = useInvoiceTemplates();
  const { data: company } = useCompanyProfile();
  const saveTemplate = useSaveInvoiceTemplate();
  const setActive = useSetInvoiceTemplateActive();

  const [name, setName] = useState('');
  const [items, setItems] = useState<InvoiceLineItemInput[]>([EMPTY_ITEM]);
  const [settings, setSettings] = useState<InvoiceTemplateSettings>(DEFAULT_INVOICE_TEMPLATE_SETTINGS);
  const [isActive, setIsActive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadedExisting, setLoadedExisting] = useState(false);
  const [savedId, setSavedId] = useState<number | null>(null);

  useEffect(() => {
    if (!isEdit || loadedExisting) return;
    const t = templates.find((x) => String(x.id) === id);
    if (!t) return;
    setName(t.name);
    setItems(t.line_items.length > 0 ? t.line_items : [EMPTY_ITEM]);
    setSettings({ ...DEFAULT_INVOICE_TEMPLATE_SETTINGS, ...t.settings });
    setIsActive(t.is_active);
    setSavedId(t.id);
    setLoadedExisting(true);
  }, [isEdit, loadedExisting, templates, id]);

  function patchSettings(patch: Partial<InvoiceTemplateSettings>) {
    setSettings((s) => ({ ...s, ...patch }));
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!name.trim()) return setError('Give this template a name.');
    const validItems = items.filter((it) => it.product.trim());
    if (validItems.length === 0) return setError('Add at least one line item.');

    saveTemplate.mutate(
      { id: isEdit ? Number(id) : savedId ?? undefined, name: name.trim(), line_items: validItems, settings },
      {
        onSuccess: (res) => {
          const newId = res.id ?? savedId;
          if (newId) setSavedId(newId);
          if (newId) setActive.mutate({ id: newId, isActive });
          navigate('/documents/templates');
        },
        onError: (err) => setError(err instanceof Error ? err.message : 'Failed to save.'),
      }
    );
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-white">
      <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-slate-200 bg-white shrink-0">
        <button
          type="button"
          onClick={() => navigate('/documents/templates')}
          className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 shrink-0"
        >
          <i className="fa-solid fa-chevron-left text-xs" />
          Back
        </button>

        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="New Invoice Template"
          className="flex-1 max-w-md text-center text-sm font-semibold text-slate-800 border border-slate-200 rounded-full px-4 py-1.5 focus:outline-none focus:ring-2 focus:ring-[var(--theme-accent)] focus:border-transparent"
        />

        <div className="flex items-center gap-3 shrink-0">
          <label className="flex items-center gap-1.5 text-xs text-slate-600 cursor-pointer">
            <button type="button" onClick={() => setIsActive((v) => !v)} className={isActive ? 'text-[var(--theme-accent)]' : 'text-slate-300'}>
              <i className={`fa-solid ${isActive ? 'fa-toggle-on' : 'fa-toggle-off'} text-lg`} />
            </button>
            Active template
          </label>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={saveTemplate.isPending}
            className="px-4 py-2 text-sm font-semibold text-white bg-[var(--theme-accent)] hover:opacity-90 rounded-lg disabled:opacity-50"
          >
            {saveTemplate.isPending ? 'Saving...' : 'Save Template'}
          </button>
        </div>
      </div>

      {error && (
        <p className="text-xs text-rose-600 bg-rose-50 border-b border-rose-200 px-4 py-1.5">{error}</p>
      )}
      {isActive && (
        <p className="text-xs text-emerald-700 bg-emerald-50 border-b border-emerald-200 px-4 py-1.5">
          This is the active template — its appearance and default line items are what invoices use.
        </p>
      )}

      <div className="flex-1 flex overflow-hidden">
        <div className="flex-1 overflow-y-auto p-6 bg-slate-100">
          <div className="max-w-2xl mx-auto mb-4">
            <label className={labelClass}>Line Items (default for invoices created from this template)</label>
            <div className="bg-white border border-slate-200 rounded-lg p-3">
              <InvoiceLineItemsEditor items={items} onChange={setItems} />
            </div>
          </div>

          <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-2 text-center">Preview</p>
          <InvoiceDocumentPreview settings={settings} company={company} lineItems={items.filter((it) => it.product.trim())} data={SAMPLE_DATA} />
        </div>

        <div className="w-72 shrink-0 border-l border-slate-200 overflow-y-auto p-4">
          <SettingsSection title="Layout">
            <div>
              <label className={labelClass}>Page Size</label>
              <select value={settings.page_size} onChange={(e) => patchSettings({ page_size: e.target.value as 'A4' | 'Letter' })} className={inputClass}>
                <option value="A4">A4 (210 x 297 mm)</option>
                <option value="Letter">Letter (8.5 x 11 in)</option>
              </select>
            </div>
            <div>
              <label className={labelClass}>Orientation</label>
              <div className="flex gap-2">
                {(['portrait', 'landscape'] as const).map((o) => (
                  <button
                    key={o}
                    type="button"
                    onClick={() => patchSettings({ orientation: o })}
                    className={`flex-1 text-xs px-2 py-1.5 rounded-lg border capitalize ${
                      settings.orientation === o ? 'border-[var(--theme-accent)] text-[var(--theme-accent)] bg-[var(--theme-accent-tint)]' : 'border-slate-200 text-slate-500'
                    }`}
                  >
                    {o}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className={labelClass}>Page Margin (px)</label>
              <input type="number" value={settings.page_margin} onChange={(e) => patchSettings({ page_margin: Number(e.target.value) })} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Section Spacing (px)</label>
              <input type="number" value={settings.section_spacing} onChange={(e) => patchSettings({ section_spacing: Number(e.target.value) })} className={inputClass} />
            </div>
          </SettingsSection>

          <SettingsSection title="Typography & Color">
            <div>
              <label className={labelClass}>Font Family</label>
              <select value={settings.font_family} onChange={(e) => patchSettings({ font_family: e.target.value })} className={inputClass}>
                <option value="Inter">Inter</option>
                <option value="Arial">Arial</option>
                <option value="Georgia">Georgia</option>
                <option value="'Courier New'">Courier New</option>
              </select>
            </div>
            <div>
              <label className={labelClass}>Font Size (px)</label>
              <input type="number" value={settings.font_size} onChange={(e) => patchSettings({ font_size: Number(e.target.value) })} className={inputClass} />
            </div>
            <ColorField label="Primary Color" value={settings.primary_color} onChange={(v) => patchSettings({ primary_color: v })} />
          </SettingsSection>

          <SettingsSection title="Table Settings">
            <ColorField label="Header Background" value={settings.table_header_bg} onChange={(v) => patchSettings({ table_header_bg: v })} />
            <ColorField label="Header Text Color" value={settings.table_header_text} onChange={(v) => patchSettings({ table_header_text: v })} />
            <ColorField label="Row Background" value={settings.table_row_bg} onChange={(v) => patchSettings({ table_row_bg: v })} />
            <ColorField label="Alternate Row" value={settings.table_alt_row_bg} onChange={(v) => patchSettings({ table_alt_row_bg: v })} />
          </SettingsSection>

          <SettingsSection title="Sections">
            <ToggleField label="Bill To" checked={settings.show_bill_to} onChange={(v) => patchSettings({ show_bill_to: v })} />
            <ToggleField label="Ship To" checked={settings.show_ship_to} onChange={(v) => patchSettings({ show_ship_to: v })} />
            <ToggleField label="Payment Instructions" checked={settings.show_payment_instructions} onChange={(v) => patchSettings({ show_payment_instructions: v })} />
            <ToggleField label="Notes" checked={settings.show_notes} onChange={(v) => patchSettings({ show_notes: v })} />
            <ToggleField label="Terms & Conditions" checked={settings.show_terms} onChange={(v) => patchSettings({ show_terms: v })} />
          </SettingsSection>

          <SettingsSection title="Footer">
            <ToggleField label="Show Footer" checked={settings.show_footer} onChange={(v) => patchSettings({ show_footer: v })} />
            <ToggleField label="Show Page Number" checked={settings.show_page_number} onChange={(v) => patchSettings({ show_page_number: v })} />
            <ToggleField label="Show Company Info" checked={settings.show_company_info} onChange={(v) => patchSettings({ show_company_info: v })} />
          </SettingsSection>
        </div>
      </div>
    </div>
  );
}
