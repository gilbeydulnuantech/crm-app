import { usePipelines, useStages, useOpportunities } from '../../hooks/useOpportunities';

const inputClass =
  'w-full px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--theme-accent)]';

// Clicking the insert button drops the {{token}} placeholder at the cursor,
// not the literal value — see utils/mergeFields.ts. Keeps the document
// reusable as a template (it resolves per-recipient at Preview/view time)
// instead of baking in whichever deal happened to be selected. The value
// itself is editable here too — an existing/saved proposal has its deal
// picker locked, so this is the only place a rep can fix a wrong or missing
// value (e.g. a contact name that was blank when the proposal was created).
function EditableFieldRow({
  label,
  token,
  value,
  onChange,
  onInsert,
  placeholder,
}: {
  label: string;
  token: string;
  value: string;
  onChange: (v: string) => void;
  onInsert: () => void;
  placeholder?: string;
}) {
  return (
    <div>
      <label className="block text-[10px] text-slate-400 mb-1">{label}</label>
      <div className="flex gap-1.5">
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className={inputClass}
        />
        <button
          type="button"
          onClick={onInsert}
          disabled={!value}
          title={`Insert ${token} at the cursor`}
          className="shrink-0 w-8 rounded-lg border border-slate-200 text-slate-400 hover:text-[var(--theme-accent)] hover:border-[var(--theme-accent)] disabled:opacity-40 disabled:hover:text-slate-400 disabled:hover:border-slate-200"
        >
          <i className="fa-solid fa-plus text-[10px]" />
        </button>
      </div>
    </div>
  );
}

// Owner details come from the deal's assigned CRM user — always accurate,
// never rep-edited — so they stay a plain read-only insert chip.
function FieldChip({ label, token, value, onClick }: { label: string; token: string; value: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={`Insert ${token} at the cursor`}
      className="w-full flex items-center gap-1.5 px-2 py-1.5 text-xs border border-dashed border-slate-300 rounded-lg bg-white hover:border-[var(--theme-accent)] hover:bg-[var(--theme-accent-tint)] text-left"
    >
      <i className="fa-solid fa-plus text-slate-300 text-[10px]" />
      <div className="min-w-0">
        <p className="text-[10px] text-slate-400 leading-tight">{label}</p>
        <p className="text-slate-700 font-medium truncate leading-tight">{value}</p>
      </div>
    </button>
  );
}

interface Props {
  pipelineId: string;
  stageId: string;
  opportunityId: string;
  onChangePipeline: (v: string) => void;
  onChangeStage: (v: string) => void;
  onChangeOpportunity: (v: string) => void;
  onInsertField: (token: string) => void;
  lockedDealName?: string | null;
  clientName?: string;
  onChangeClientName?: (v: string) => void;
  clientCompanyName?: string;
  onChangeClientCompanyName?: (v: string) => void;
  clientAddress?: string;
  onChangeClientAddress?: (v: string) => void;
  clientEmail?: string;
  onChangeClientEmail?: (v: string) => void;
  clientPhone?: string;
  onChangeClientPhone?: (v: string) => void;
  ownerName?: string;
  ownerEmail?: string;
  ownerPhone?: string;
}

export default function DealFieldsPanel({
  pipelineId,
  stageId,
  opportunityId,
  onChangePipeline,
  onChangeStage,
  onChangeOpportunity,
  onInsertField,
  lockedDealName,
  clientName,
  onChangeClientName,
  clientCompanyName,
  onChangeClientCompanyName,
  clientAddress,
  onChangeClientAddress,
  clientEmail,
  onChangeClientEmail,
  clientPhone,
  onChangeClientPhone,
  ownerName,
  ownerEmail,
  ownerPhone,
}: Props) {
  const { data: pipelines = [] } = usePipelines();
  const { data: stages = [] } = useStages(pipelineId ? Number(pipelineId) : undefined);
  const { data: opportunities = [] } = useOpportunities(pipelineId ? Number(pipelineId) : undefined);
  const visibleOpportunities = stageId ? opportunities.filter((o) => o.stage_id === Number(stageId)) : opportunities;

  const showClientDetails = !!(onChangeClientName || onChangeClientCompanyName || onChangeClientAddress || onChangeClientEmail || onChangeClientPhone);

  const ownerFields = [
    { label: 'Owner Name', token: '{{owner_name}}', value: ownerName },
    { label: 'Owner Email', token: '{{owner_email}}', value: ownerEmail },
    { label: 'Owner Phone', token: '{{owner_phone}}', value: ownerPhone },
  ].filter((f) => f.value);

  return (
    <div className="w-56 shrink-0 space-y-4">
      <div>
        <h3 className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-1.5">Deal</h3>
        {lockedDealName != null ? (
          <p className="px-2.5 py-1.5 text-xs text-slate-600 bg-slate-50 border border-slate-200 rounded-lg">{lockedDealName}</p>
        ) : (
          <div className="space-y-1.5">
            <select
              value={pipelineId}
              onChange={(e) => onChangePipeline(e.target.value)}
              className={inputClass}
            >
              <option value="">Choose a pipeline...</option>
              {pipelines.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
            <select
              value={stageId}
              onChange={(e) => onChangeStage(e.target.value)}
              disabled={!pipelineId}
              className={inputClass}
            >
              <option value="">All stages</option>
              {stages.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
            <select
              value={opportunityId}
              onChange={(e) => onChangeOpportunity(e.target.value)}
              disabled={!pipelineId}
              className={inputClass}
            >
              <option value="">Choose a deal...</option>
              {visibleOpportunities.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.name}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {showClientDetails && (
        <div>
          <h3 className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-1.5">Client Details</h3>
          <div className="space-y-2">
            {onChangeClientName && (
              <EditableFieldRow
                label="Client Name"
                token="{{client_name}}"
                value={clientName || ''}
                onChange={onChangeClientName}
                onInsert={() => onInsertField('{{client_name}}')}
                placeholder="Jane Doe"
              />
            )}
            {onChangeClientCompanyName && (
              <EditableFieldRow
                label="Client Company"
                token="{{client_company_name}}"
                value={clientCompanyName || ''}
                onChange={onChangeClientCompanyName}
                onInsert={() => onInsertField('{{client_company_name}}')}
                placeholder="Acme Inc."
              />
            )}
            {onChangeClientAddress && (
              <EditableFieldRow
                label="Client Address"
                token="{{client_address}}"
                value={clientAddress || ''}
                onChange={onChangeClientAddress}
                onInsert={() => onInsertField('{{client_address}}')}
                placeholder="123 Main St, City"
              />
            )}
            {onChangeClientEmail && (
              <EditableFieldRow
                label="Client Email"
                token="{{client_email}}"
                value={clientEmail || ''}
                onChange={onChangeClientEmail}
                onInsert={() => onInsertField('{{client_email}}')}
                placeholder="client@example.com"
              />
            )}
            {onChangeClientPhone && (
              <EditableFieldRow
                label="Client Phone"
                token="{{client_phone}}"
                value={clientPhone || ''}
                onChange={onChangeClientPhone}
                onInsert={() => onInsertField('{{client_phone}}')}
                placeholder="(555) 555-5555"
              />
            )}
          </div>
        </div>
      )}

      {ownerFields.length > 0 && (
        <div>
          <h3 className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-1.5">Owner Details</h3>
          <div className="space-y-1">
            {ownerFields.map((f) => (
              <FieldChip key={f.label} label={f.label} token={f.token} value={f.value!} onClick={() => onInsertField(f.token)} />
            ))}
          </div>
        </div>
      )}

      {showClientDetails || ownerFields.length > 0 ? (
        <p className="text-[10px] text-slate-400 italic">Fill in a value, then click + to insert its {'{{'}token{'}}'} at the cursor — it resolves per client.</p>
      ) : null}
    </div>
  );
}
