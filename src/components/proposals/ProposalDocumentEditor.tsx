import { Ref, RefObject } from 'react';
import ScopeOfWorkEditor from '../ScopeOfWorkEditor';
import { RichTextEditorHandle } from '../RichTextEditor';

function money(n: number) {
  return `$${Number(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

const ghostInput =
  'bg-transparent border-b border-dashed border-transparent hover:border-slate-300 focus:border-solid focus:border-[var(--theme-accent)] focus:outline-none px-0.5 -mx-0.5 transition-colors';

function InlineText({
  value,
  onChange,
  placeholder,
  className = '',
  type = 'text',
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  className?: string;
  type?: string;
}) {
  return (
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className={`${ghostInput} ${className}`}
    />
  );
}

interface Props {
  logoUrl?: string | null;
  dealName?: string;
  title: string;
  onTitleChange: (v: string) => void;
  clientName: string;
  onClientNameChange: (v: string) => void;
  clientCompanyName: string;
  onClientCompanyNameChange: (v: string) => void;
  clientAddress: string;
  onClientAddressChange: (v: string) => void;
  clientEmail: string;
  onClientEmailChange: (v: string) => void;
  clientPhone: string;
  onClientPhoneChange: (v: string) => void;
  contractorCompanyName: string;
  onContractorCompanyNameChange: (v: string) => void;
  contractorEmail: string;
  onContractorEmailChange: (v: string) => void;
  contractorPhone: string;
  onContractorPhoneChange: (v: string) => void;
  totalAmount: string;
  onTotalAmountChange: (v: string) => void;
  contentHtml: string;
  onContentHtmlChange: (html: string) => void;
  editorRef?: Ref<RichTextEditorHandle>;
  toolbarPlacement?: 'top' | 'right';
  toolbarContainer?: RefObject<HTMLDivElement | null>;
  // Everything except Scope of Work pulls silently from the deal/company
  // profile in the background — hide the rest of the document fields and
  // let Preview be where a rep double-checks the auto-filled data.
  minimal?: boolean;
}

// The editing surface IS the document — every field here renders inline,
// styled the same as the public proposal page, so what a rep types is
// literally what the client will see (no separate "preview" step needed).
export default function ProposalDocumentEditor({
  logoUrl,
  dealName,
  title,
  onTitleChange,
  clientName,
  onClientNameChange,
  clientCompanyName,
  onClientCompanyNameChange,
  clientAddress,
  onClientAddressChange,
  clientEmail,
  onClientEmailChange,
  clientPhone,
  onClientPhoneChange,
  contractorCompanyName,
  onContractorCompanyNameChange,
  contractorEmail,
  onContractorEmailChange,
  contractorPhone,
  onContractorPhoneChange,
  totalAmount,
  onTotalAmountChange,
  contentHtml,
  onContentHtmlChange,
  editorRef,
  toolbarPlacement,
  toolbarContainer,
  minimal,
}: Props) {
  const firstName = clientName.trim().split(/\s+/)[0] || dealName || '';

  if (minimal) {
    return (
      <ScopeOfWorkEditor ref={editorRef} value={contentHtml} onChange={onContentHtmlChange} toolbarPlacement={toolbarPlacement} toolbarContainer={toolbarContainer} />
    );
  }

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-8">
      {logoUrl && <img src={logoUrl} alt="" className="h-12 max-w-[220px] object-contain mb-4" />}

      <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">
        Proposal for {firstName || '--'}
      </p>
      <InlineText
        value={title}
        onChange={onTitleChange}
        placeholder="Proposal title"
        className="text-2xl font-bold text-slate-800 mt-1 w-full"
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-6 text-sm">
        <div className="border-l-2 border-slate-200 pl-3 space-y-0.5">
          <h2 className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide mb-1">Client</h2>
          <InlineText value={clientName} onChange={onClientNameChange} placeholder="Client name" className="font-medium text-slate-800 w-full block" />
          <InlineText value={clientCompanyName} onChange={onClientCompanyNameChange} placeholder="Client company" className="text-slate-600 w-full block" />
          <InlineText value={clientAddress} onChange={onClientAddressChange} placeholder="Client address" className="text-slate-600 w-full block" />
          <InlineText type="email" value={clientEmail} onChange={onClientEmailChange} placeholder="Client email" className="text-slate-600 w-full block" />
          <InlineText value={clientPhone} onChange={onClientPhoneChange} placeholder="Client phone" className="text-slate-600 w-full block" />
        </div>
        <div className="border-l-2 border-slate-200 pl-3 space-y-0.5">
          <h2 className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide mb-1">Contractor</h2>
          <InlineText
            value={contractorCompanyName}
            onChange={onContractorCompanyNameChange}
            placeholder="Auto-fills from Company Profile"
            className="font-medium text-slate-800 w-full block"
          />
          <InlineText type="email" value={contractorEmail} onChange={onContractorEmailChange} placeholder="Auto-fills from Company Profile" className="text-slate-600 w-full block" />
          <InlineText value={contractorPhone} onChange={onContractorPhoneChange} placeholder="Auto-fills from Company Profile" className="text-slate-600 w-full block" />
        </div>
      </div>

      <div className="mt-6">
        <ScopeOfWorkEditor ref={editorRef} value={contentHtml} onChange={onContentHtmlChange} toolbarPlacement={toolbarPlacement} toolbarContainer={toolbarContainer} />
      </div>

      <p className="text-right text-lg font-bold text-slate-800 mt-3">
        Total:{' '}
        <InlineText
          type="number"
          value={totalAmount}
          onChange={onTotalAmountChange}
          placeholder="0.00"
          className="w-32 text-right"
        />
      </p>
      <p className="text-right text-[11px] text-slate-400 -mt-1">{money(Number(totalAmount) || 0)}</p>
    </div>
  );
}
