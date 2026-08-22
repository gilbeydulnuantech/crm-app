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
// Prepare Email / Substitute Contract Link & Prepare Email replace them).
// Grouped by entity so the picker reads like GoHighLevel/HubSpot's
// categorized merge-field menus rather than one flat list. A token not
// backed by the current trigger type's row (e.g. {{deal_value}} on a
// Contact trigger) just resolves to an empty string — same fallback
// behavior as the existing 5 tokens already had.
export const AUTOMATION_DYNAMIC_FIELDS: DynamicField[] = [
  { token: '{{first_name}}', label: 'First Name', group: 'Contact' },
  { token: '{{last_name}}', label: 'Last Name', group: 'Contact' },
  { token: '{{email}}', label: 'Email', group: 'Contact' },
  { token: '{{phone}}', label: 'Phone', group: 'Contact' },
  { token: '{{job_title}}', label: 'Job Title', group: 'Contact' },
  { token: '{{lead_status}}', label: 'Lead Status', group: 'Contact' },
  { token: '{{city}}', label: 'City', group: 'Contact' },
  { token: '{{state}}', label: 'State', group: 'Contact' },
  { token: '{{country}}', label: 'Country', group: 'Contact' },

  { token: '{{company_name}}', label: 'Company Name', group: 'Company' },
  { token: '{{industry}}', label: 'Industry', group: 'Company' },
  { token: '{{website}}', label: 'Website', group: 'Company' },

  { token: '{{deal_name}}', label: 'Deal Name', group: 'Deal' },
  { token: '{{deal_value}}', label: 'Deal Value', group: 'Deal' },
  { token: '{{deal_stage}}', label: 'Deal Stage', group: 'Deal' },
  { token: '{{pipeline_name}}', label: 'Pipeline', group: 'Deal' },
  { token: '{{expected_close}}', label: 'Expected Close', group: 'Deal' },
  { token: '{{proposal_link}}', label: 'Proposal Link', group: 'Deal' },
  { token: '{{contract_link}}', label: 'Contract Link', group: 'Deal' },

  { token: '{{owner_name}}', label: 'Owner Name', group: 'Owner' },
  { token: '{{owner_email}}', label: 'Owner Email', group: 'Owner' },
  { token: '{{owner_phone}}', label: 'Owner Phone', group: 'Owner' },

  { token: '{{task_name}}', label: 'Task / Event Name', group: 'Task & Calendar' },
  { token: '{{due_date}}', label: 'Due Date', group: 'Task & Calendar' },
  { token: '{{event_type}}', label: 'Event Type', group: 'Task & Calendar' },

  { token: '{{today}}', label: "Today's Date", group: 'Other' },
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

export default function DynamicFieldDropdown({
  onInsert,
  fields = DYNAMIC_FIELDS,
}: {
  onInsert: (token: string) => void;
  fields?: DynamicField[];
}) {
  const hasGroups = fields.some((f) => f.group);
  const groups = hasGroups
    ? fields.reduce<Record<string, DynamicField[]>>((acc, f) => {
        const g = f.group || 'Other';
        (acc[g] ||= []).push(f);
        return acc;
      }, {})
    : null;

  return (
    <select
      value=""
      onChange={(e) => {
        if (e.target.value) onInsert(e.target.value);
        e.target.value = '';
      }}
      className="text-[11px] border border-slate-200 rounded-md px-1.5 py-0.5 text-slate-500 focus:outline-none focus:ring-2 focus:ring-[var(--theme-accent)]"
    >
      <option value="">Insert field...</option>
      {groups
        ? Object.entries(groups).map(([group, groupFields]) => (
            <optgroup key={group} label={group}>
              {groupFields.map((f) => (
                <option key={f.token} value={f.token}>
                  {f.label}
                </option>
              ))}
            </optgroup>
          ))
        : fields.map((f) => (
            <option key={f.token} value={f.token}>
              {f.label}
            </option>
          ))}
    </select>
  );
}
