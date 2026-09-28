import { useEffect, useRef, useState } from 'react';

export interface DynamicField {
  token: string;
  label: string;
  group?: string;
}

export const DYNAMIC_FIELDS: DynamicField[] = [
  { token: '{{first_name}}', label: 'First Name' },
  { token: '{{last_name}}', label: 'Last Name' },
  { token: '{{deal_name}}', label: 'Deal Name' },
  { token: '{{proposal_link}}', label: 'Proposal Link' },
  { token: '{{owner_name}}', label: 'Owner' },
];

// The full merge-token set the Automation Engine's fill() functions
// actually resolve (Build Candidate Query selects the underlying columns,
// Prepare Email / Substitute Contract Link & Prepare Email / Prepare Team
// Notification replace them). Grouped and namespaced GHL-style (Contact →
// Company → Opportunity → Appointment → User → System) so the picker reads
// like GoHighLevel/HubSpot's categorized merge-field menus. The OLD flat
// tokens ({{first_name}}, {{deal_value}}, etc.) still work in every saved
// automation/template — fill() resolves both forms from the same
// underlying data — they're just no longer offered in this picker in favor
// of the namespaced equivalents below.
//
// Opportunity only resolves on a Deal-triggered automation, and
// Appointment only on a Task/Calendar-triggered one (Appointment reuses
// that same `activities` data — there's no separate appointments table in
// this schema) — on any other trigger type those tokens resolve to an
// empty string rather than leaking a same-named column from the wrong
// entity. Custom Fields and Trigger Data (webhook payload) aren't offered
// here — neither exists as real, queryable data in this schema yet.
export const AUTOMATION_DYNAMIC_FIELDS: DynamicField[] = [
  { token: '{{contact.id}}', label: 'Contact ID', group: 'Contact' },
  { token: '{{contact.first_name}}', label: 'First Name', group: 'Contact' },
  { token: '{{contact.last_name}}', label: 'Last Name', group: 'Contact' },
  { token: '{{contact.full_name}}', label: 'Full Name', group: 'Contact' },
  { token: '{{contact.email}}', label: 'Email', group: 'Contact' },
  { token: '{{contact.phone}}', label: 'Phone', group: 'Contact' },
  { token: '{{contact.city}}', label: 'City', group: 'Contact' },
  { token: '{{contact.state}}', label: 'State', group: 'Contact' },
  { token: '{{contact.address}}', label: 'City, State', group: 'Contact' },
  { token: '{{contact.postal_code}}', label: 'Postal Code', group: 'Contact' },
  { token: '{{contact.country}}', label: 'Country', group: 'Contact' },
  { token: '{{contact.date_of_birth}}', label: 'Date of Birth', group: 'Contact' },
  { token: '{{contact.source}}', label: 'Lead Source', group: 'Contact' },
  { token: '{{contact.tags}}', label: 'Tags', group: 'Contact' },
  { token: '{{contact.created_at}}', label: 'Created At', group: 'Contact' },
  { token: '{{contact.updated_at}}', label: 'Updated At', group: 'Contact' },

  { token: '{{company.id}}', label: 'Company ID', group: 'Company' },
  { token: '{{company.name}}', label: 'Company Name', group: 'Company' },
  { token: '{{company.phone}}', label: 'Phone', group: 'Company' },
  { token: '{{company.website}}', label: 'Website', group: 'Company' },
  { token: '{{company.address}}', label: 'Address', group: 'Company' },
  { token: '{{company.city}}', label: 'City', group: 'Company' },
  { token: '{{company.state}}', label: 'State', group: 'Company' },
  { token: '{{company.postal_code}}', label: 'Postal Code', group: 'Company' },
  { token: '{{company.country}}', label: 'Country', group: 'Company' },

  { token: '{{opportunity.id}}', label: 'Opportunity ID', group: 'Opportunity' },
  { token: '{{opportunity.name}}', label: 'Name', group: 'Opportunity' },
  { token: '{{opportunity.status}}', label: 'Status', group: 'Opportunity' },
  { token: '{{opportunity.pipeline}}', label: 'Pipeline', group: 'Opportunity' },
  { token: '{{opportunity.pipeline_id}}', label: 'Pipeline ID', group: 'Opportunity' },
  { token: '{{opportunity.stage}}', label: 'Stage', group: 'Opportunity' },
  { token: '{{opportunity.stage_id}}', label: 'Stage ID', group: 'Opportunity' },
  { token: '{{opportunity.value}}', label: 'Value', group: 'Opportunity' },
  { token: '{{opportunity.source}}', label: 'Source', group: 'Opportunity' },
  { token: '{{opportunity.created_at}}', label: 'Created At', group: 'Opportunity' },
  { token: '{{opportunity.updated_at}}', label: 'Updated At', group: 'Opportunity' },
  { token: '{{opportunity.due_at}}', label: 'Due At', group: 'Opportunity' },
  { token: '{{proposal_link}}', label: 'Proposal Link', group: 'Opportunity' },
  { token: '{{contract_link}}', label: 'Contract Link', group: 'Opportunity' },

  { token: '{{payment.down_payment_amount}}', label: 'Down Payment Amount', group: 'Payment' },
  { token: '{{payment.down_payment_paid_at}}', label: 'Down Payment Paid At', group: 'Payment' },
  { token: '{{payment.balance_amount}}', label: 'Balance Amount', group: 'Payment' },
  { token: '{{payment.balance_paid_at}}', label: 'Balance Paid At', group: 'Payment' },
  { token: '{{payment.number}}', label: 'Payment Number', group: 'Payment' },
  { token: '{{payment.amount}}', label: 'Payment Amount', group: 'Payment' },
  { token: '{{payment.date}}', label: 'Payment Date', group: 'Payment' },

  { token: '{{appointment.id}}', label: 'Appointment ID', group: 'Appointment' },
  { token: '{{appointment.title}}', label: 'Title', group: 'Appointment' },
  { token: '{{appointment.start_time}}', label: 'Start Time', group: 'Appointment' },
  { token: '{{appointment.end_time}}', label: 'End Time', group: 'Appointment' },
  { token: '{{appointment.status}}', label: 'Status', group: 'Appointment' },
  { token: '{{appointment.calendar}}', label: 'Type', group: 'Appointment' },
  { token: '{{appointment.location}}', label: 'Location', group: 'Appointment' },
  { token: '{{appointment.assigned_user}}', label: 'Assigned User', group: 'Appointment' },
  { token: '{{appointment.notes}}', label: 'Notes', group: 'Appointment' },
  { token: '{{cancel_link}}', label: 'Cancel Appointment Link', group: 'Appointment' },

  { token: '{{user.id}}', label: 'User ID', group: 'User' },
  { token: '{{user.full_name}}', label: 'Full Name', group: 'User' },
  { token: '{{user.email}}', label: 'Email', group: 'User' },
  { token: '{{user.phone}}', label: 'Phone', group: 'User' },
  { token: '{{user.company_name}}', label: 'Company Name', group: 'User' },

  { token: '{{contract.signature_name}}', label: 'Signature Name', group: 'Contract' },
  { token: '{{contract.signed_at}}', label: 'Signed At', group: 'Contract' },

  { token: '{{system.current_date}}', label: 'Current Date', group: 'System' },
  { token: '{{system.current_time}}', label: 'Current Time', group: 'System' },
  { token: '{{system.current_datetime}}', label: 'Current Date & Time', group: 'System' },
  { token: '{{system.timestamp}}', label: 'Timestamp (ISO)', group: 'System' },
];

export function insertAtCursor(
  el: HTMLInputElement | HTMLTextAreaElement | null,
  current: string,
  token: string,
  onChange: (value: string) => void
) {
  if (!el) {
    onChange(current + token);
    return;
  }
  const start = el.selectionStart ?? current.length;
  const end = el.selectionEnd ?? current.length;
  const next = current.slice(0, start) + token + current.slice(end);
  onChange(next);
  requestAnimationFrame(() => {
    el.focus();
    const pos = start + token.length;
    el.setSelectionRange(pos, pos);
  });
}

function tokenText(token: string) {
  return token.replace(/^\{\{\s*/, '').replace(/\s*\}\}$/, '');
}

// Category accordion — every category (Contact, Company, Opportunity, ...)
// is its own row; click one to expand its fields in place (only one open
// at a time), click a field to insert it. Shows the raw token path (e.g.
// contact.first_name) rather than a friendly label, so a rep sees exactly
// what they're inserting. A flat (ungrouped) field list — e.g. the small
// default DYNAMIC_FIELDS, or PAGE_DYNAMIC_FIELDS — skips the category
// level and lists fields directly.
function FieldList({ onInsert, fields }: { onInsert: (token: string) => void; fields: DynamicField[] }) {
  const [openGroup, setOpenGroup] = useState<string | null>(null);

  const hasGroups = fields.some((f) => f.group);
  const groups = hasGroups
    ? fields.reduce<Record<string, DynamicField[]>>((acc, f) => {
        const g = f.group || 'Other';
        (acc[g] ||= []).push(f);
        return acc;
      }, {})
    : null;

  return (
    <div className="text-xs border border-slate-200 rounded-md bg-white max-h-56 overflow-y-auto">
      {groups
        ? Object.entries(groups).map(([group, groupFields]) => {
            const isOpen = openGroup === group;
            return (
              <div key={group} className="border-b border-slate-100 last:border-b-0">
                <button
                  type="button"
                  onClick={() => setOpenGroup(isOpen ? null : group)}
                  className={`w-full flex items-center justify-between px-2 py-1.5 text-left font-semibold text-[11px] hover:bg-slate-50 ${
                    isOpen ? 'text-[var(--theme-accent)]' : 'text-slate-600'
                  }`}
                >
                  {group}
                  <i className={`fa-solid fa-chevron-down text-[9px] transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                </button>
                {isOpen && (
                  <div className="bg-slate-50 py-1">
                    {groupFields.map((f) => (
                      <button
                        key={f.token}
                        type="button"
                        onClick={() => onInsert(f.token)}
                        title={f.label}
                        className="w-full text-left px-4 py-1 text-slate-600 hover:bg-white hover:text-[var(--theme-accent)] font-mono text-[11px]"
                      >
                        {tokenText(f.token)}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          })
        : fields.map((f) => (
            <button
              key={f.token}
              type="button"
              onClick={() => onInsert(f.token)}
              title={f.label}
              className="w-full text-left px-2 py-1.5 text-slate-600 hover:bg-slate-50 hover:text-[var(--theme-accent)] font-mono text-[11px]"
            >
              {tokenText(f.token)}
            </button>
          ))}
    </div>
  );
}

// Two display modes, same underlying FieldList:
//   - panel (default): always-visible, used in a dedicated side column
//     (Proposal/Contract/Email Template/Receipt/Stage Reminder/Page
//     editors) where there's room for it to just sit open.
//   - popover: collapsed behind a small trigger button, opens on click,
//     closes on click-outside — used in compact inline contexts (the
//     Automation Rules builder) where an always-open field list would
//     make an already-long form much longer.
export default function DynamicFieldDropdown({
  onInsert,
  fields = DYNAMIC_FIELDS,
  mode = 'panel',
}: {
  onInsert: (token: string) => void;
  fields?: DynamicField[];
  mode?: 'panel' | 'popover';
}) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (mode !== 'popover' || !open) return;
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [mode, open]);

  if (mode === 'panel') {
    return <FieldList onInsert={onInsert} fields={fields} />;
  }

  function handleInsert(token: string) {
    onInsert(token);
    setOpen(false);
  }

  return (
    <div className="relative inline-block" ref={containerRef}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1 text-[11px] border border-slate-200 rounded-md px-1.5 py-0.5 text-slate-500 hover:border-[var(--theme-accent)] hover:text-[var(--theme-accent)] focus:outline-none focus:ring-2 focus:ring-[var(--theme-accent)]"
      >
        Insert field...
        <i className={`fa-solid fa-chevron-down text-[9px] transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1 w-56 z-30 shadow-xl">
          <FieldList onInsert={handleInsert} fields={fields} />
        </div>
      )}
    </div>
  );
}
