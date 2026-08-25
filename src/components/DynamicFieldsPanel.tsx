import { DynamicField } from './DynamicFieldDropdown';

// Persistent right-hand panel for template editors — same idea as
// AutomationEditorPage's DynamicFieldsPanel, minus the Documents section
// (templates don't insert other documents into themselves). The parent
// tracks which field was last focused (activeField) and inserts at that
// field's cursor position via onInsert.
export default function DynamicFieldsPanel({
  fields,
  activeField,
  onInsert,
}: {
  fields: DynamicField[];
  activeField: string | null;
  onInsert: (token: string) => void;
}) {
  const hasGroups = fields.some((f) => f.group);
  const groups = hasGroups
    ? fields.reduce<Record<string, DynamicField[]>>((acc, f) => {
        const g = f.group || 'Other';
        (acc[g] ||= []).push(f);
        return acc;
      }, {})
    : { Fields: fields };

  return (
    <div className="w-64 shrink-0 border-l border-slate-200 bg-slate-50 overflow-y-auto p-4">
      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Dynamic Fields</p>
      <p className={`text-xs mb-4 ${activeField ? 'text-emerald-700' : 'text-slate-400 italic'}`}>
        {activeField ? 'Click a field below to insert it here.' : 'Click into Subject or Body first.'}
      </p>

      <div className="space-y-3">
        {Object.entries(groups).map(([group, groupFields]) => (
          <div key={group}>
            {hasGroups && (
              <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-1">{group}</p>
            )}
            <div className="space-y-0.5">
              {groupFields.map((f) => (
                <button
                  key={f.token}
                  type="button"
                  onClick={() => onInsert(f.token)}
                  className="w-full text-left px-2 py-1 text-xs text-slate-600 hover:bg-white hover:text-[var(--theme-accent)] rounded-md"
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
