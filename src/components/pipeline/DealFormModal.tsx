import { FormEvent, useEffect, useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { DEAL_PRIORITIES, DEAL_SOURCES, DealPriority, Opportunity } from '../../types/opportunity';
import { useAddOpportunity, useUpdateOpportunity, usePipelines, useStages } from '../../hooks/useOpportunities';
import { useContacts, useUsers } from '../../hooks/useContacts';
import { useAuth } from '../../context/AuthContext';
import { toTitleCase } from '../../utils/text';
import CompanyPicker from '../contacts/CompanyPicker';
import ContactPicker from './ContactPicker';

interface Props {
  open: boolean;
  opportunity: Opportunity | null; // null = add mode
  pipelineId: number; // initial/default pipeline
  defaultStageId?: number;
  defaultContactId?: number;
  defaultAccountId?: number;
  defaultCompanyName?: string;
  onClose: () => void;
}

const EMPTY = {
  name: '',
  contact_id: '',
  contact_name: '',
  account_id: '',
  company_name: '',
  pipeline_id: '',
  stage_id: '',
  deal_value: '',
  assigned_user: '',
  expected_close: '',
  probability: '',
  description: '',
  source: '',
  priority: '' as DealPriority | '',
  maintenance_interval_months: '',
};

function formatDate(value?: string | null) {
  if (!value) return null;
  return new Date(value).toLocaleDateString(undefined, { month: 'short', day: '2-digit', year: 'numeric' });
}

function SectionHeader({ children }: { children: string }) {
  return (
    <h4 className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider pt-1">{children}</h4>
  );
}

export default function DealFormModal({
  open,
  opportunity,
  pipelineId,
  defaultStageId,
  defaultContactId,
  defaultAccountId,
  defaultCompanyName,
  onClose,
}: Props) {
  const [form, setForm] = useState(EMPTY);
  const [error, setError] = useState<string | null>(null);
  const qc = useQueryClient();
  const { user } = useAuth();

  const isEdit = !!opportunity;
  // Locked to a single contact only when opened straight from that
  // contact's own detail modal in add mode — otherwise the contact is
  // searchable (editing an existing deal, or creating one from the
  // Pipeline board with no contact context yet).
  const isContactLocked = !isEdit && !!defaultContactId;

  const { data: pipelines = [] } = usePipelines();
  const { data: contacts = [] } = useContacts();
  const { data: users = [] } = useUsers();

  const selectedPipelineId = form.pipeline_id ? Number(form.pipeline_id) : undefined;
  const { data: stages = [] } = useStages(selectedPipelineId);
  const sortedStages = useMemo(
    () => stages.slice().sort((a, b) => a.display_order - b.display_order),
    [stages]
  );

  const addOpportunity = useAddOpportunity(selectedPipelineId);
  const updateOpportunity = useUpdateOpportunity(selectedPipelineId);
  const isSaving = addOpportunity.isPending || updateOpportunity.isPending;

  useEffect(() => {
    if (!open) return;

    if (opportunity) {
      setForm({
        name: opportunity.name ?? '',
        contact_id: String(opportunity.contact_id ?? ''),
        contact_name: opportunity.contact_name ?? '',
        account_id: opportunity.account_id ? String(opportunity.account_id) : '',
        company_name: opportunity.company_name ?? '',
        pipeline_id: opportunity.pipeline_id ? String(opportunity.pipeline_id) : String(pipelineId),
        stage_id: String(opportunity.stage_id ?? ''),
        deal_value: opportunity.deal_value ? String(opportunity.deal_value) : '',
        assigned_user: opportunity.assigned_user ? String(opportunity.assigned_user) : '',
        expected_close: opportunity.expected_close?.slice(0, 10) ?? '',
        probability: opportunity.probability != null ? String(opportunity.probability) : '',
        description: opportunity.description ?? '',
        source: opportunity.source ?? '',
        priority: opportunity.priority ?? '',
        maintenance_interval_months:
          opportunity.maintenance_interval_months != null ? String(opportunity.maintenance_interval_months) : '',
      });
      setError(null);
      return;
    }

    const defaultContact = defaultContactId ? contacts.find((c) => c.id === defaultContactId) : undefined;

    setForm({
      ...EMPTY,
      pipeline_id: String(pipelineId),
      stage_id: defaultStageId ? String(defaultStageId) : '',
      contact_id: defaultContact ? String(defaultContact.id) : '',
      contact_name: defaultContact ? `${defaultContact.first_name} ${defaultContact.last_name}`.trim() : '',
      account_id: defaultContact?.account_id
        ? String(defaultContact.account_id)
        : defaultAccountId
          ? String(defaultAccountId)
          : '',
      company_name: defaultContact?.company_name ?? defaultCompanyName ?? '',
      assigned_user: defaultContact?.owner_id ? String(defaultContact.owner_id) : '',
    });
    setError(null);
    // `contacts` intentionally excluded — it refetches on the app's polling
    // interval and we only want this to (re)seed the form when the modal
    // actually opens for a (possibly) different opportunity/contact, not
    // every time the background contacts list happens to refresh.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [opportunity, open, pipelineId, defaultStageId, defaultContactId, defaultAccountId, defaultCompanyName]);

  if (!open) return null;

  function update<K extends keyof typeof EMPTY>(key: K, value: (typeof EMPTY)[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function handleContactChange(id: number | null, name: string) {
    const matched = id ? contacts.find((c) => c.id === id) : undefined;
    setForm((f) => ({
      ...f,
      contact_id: id ? String(id) : '',
      contact_name: name,
      account_id: matched?.account_id ? String(matched.account_id) : f.account_id,
      company_name: matched?.company_name ?? f.company_name,
      assigned_user: matched?.owner_id ? String(matched.owner_id) : f.assigned_user,
    }));
  }

  function handleStageChange(stageId: string) {
    const idx = sortedStages.findIndex((s) => String(s.id) === stageId);
    const computed =
      idx >= 0 && sortedStages.length > 0 ? Math.round(((idx + 1) / sortedStages.length) * 100) : undefined;
    setForm((f) => ({
      ...f,
      stage_id: stageId,
      probability: computed != null ? String(computed) : f.probability,
    }));
  }

  function handlePipelineChange(newPipelineId: string) {
    setForm((f) => ({ ...f, pipeline_id: newPipelineId, stage_id: '', probability: '' }));
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (!form.pipeline_id || !form.stage_id) {
      setError('Pipeline and stage are required.');
      return;
    }

    const payload = {
      name: form.name,
      contact_id: form.contact_id ? Number(form.contact_id) : null,
      account_id: form.account_id ? Number(form.account_id) : null,
      pipeline_id: Number(form.pipeline_id),
      stage_id: Number(form.stage_id),
      deal_value: form.deal_value ? Number(form.deal_value) : null,
      assigned_user: form.assigned_user ? Number(form.assigned_user) : null,
      expected_close: form.expected_close || null,
      probability: form.probability ? Number(form.probability) : 0,
      description: form.description || null,
      source: form.source || null,
      priority: form.priority || null,
      maintenance_interval_months: form.maintenance_interval_months ? Number(form.maintenance_interval_months) : null,
      requester_id: user?.id ?? null,
    };

    // A deal can be created/moved under a different pipeline than the one
    // this form started with — invalidate broadly so any pipeline board
    // picks up the change, not just the one tied to selectedPipelineId.
    const invalidateAll = () => qc.invalidateQueries({ queryKey: ['opportunities'] });

    if (isEdit && opportunity) {
      updateOpportunity.mutate(
        { id: opportunity.id, payload },
        {
          onSuccess: () => {
            invalidateAll();
            onClose();
          },
          onError: (err) => setError(err instanceof Error ? err.message : 'Failed to update deal.'),
        }
      );
    } else {
      addOpportunity.mutate(payload, {
        onSuccess: () => {
          invalidateAll();
          setForm(EMPTY);
          onClose();
        },
        onError: (err) => setError(err instanceof Error ? err.message : 'Failed to add deal.'),
      });
    }
  }

  const inputClass =
    'w-full px-3 py-1.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--theme-accent)]';

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-slate-800">{isEdit ? 'Edit Deal' : 'Add Deal'}</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <i className="fa-solid fa-xmark" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-3">
            <SectionHeader>Deal Information</SectionHeader>

            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Deal Name *</label>
              <input
                required
                value={form.name}
                onChange={(e) => update('name', e.target.value)}
                className={inputClass}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Pipeline *</label>
                <select
                  required
                  value={form.pipeline_id}
                  onChange={(e) => handlePipelineChange(e.target.value)}
                  className={inputClass}
                >
                  <option value="">--</option>
                  {pipelines.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Stage *</label>
                <select
                  required
                  value={form.stage_id}
                  onChange={(e) => handleStageChange(e.target.value)}
                  disabled={!form.pipeline_id}
                  className={`${inputClass} disabled:bg-slate-50 disabled:text-slate-400`}
                >
                  <option value="">--</option>
                  {sortedStages.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Deal Value *</label>
                <input
                  required
                  type="number"
                  value={form.deal_value}
                  onChange={(e) => update('deal_value', e.target.value)}
                  className={inputClass}
                  placeholder="$"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Expected Close Date</label>
                <input
                  type="date"
                  value={form.expected_close}
                  onChange={(e) => update('expected_close', e.target.value)}
                  className={inputClass}
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Owner *</label>
              <select
                required
                value={form.assigned_user}
                onChange={(e) => update('assigned_user', e.target.value)}
                className={inputClass}
              >
                <option value="">Unassigned</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>
                    {toTitleCase(u.name)}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-3 pt-3 border-t border-slate-100">
            <SectionHeader>Contact & Company</SectionHeader>

            {isContactLocked ? (
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Contact *</label>
                <div className="px-3 py-1.5 text-sm border border-slate-200 rounded-lg bg-slate-50 text-slate-700 truncate">
                  {toTitleCase(form.contact_name) || '--'}
                </div>
              </div>
            ) : (
              <ContactPicker
                contactId={form.contact_id ? Number(form.contact_id) : null}
                contactName={form.contact_name}
                onChange={handleContactChange}
                accountId={form.account_id ? Number(form.account_id) : null}
              />
            )}
            <CompanyPicker
              accountId={form.account_id ? Number(form.account_id) : null}
              companyName={form.company_name}
              onChange={(accountId, name) =>
                setForm((f) => ({
                  ...f,
                  account_id: accountId ? String(accountId) : '',
                  company_name: name,
                }))
              }
            />
          </div>

          <div className="space-y-3 pt-3 border-t border-slate-100">
            <SectionHeader>Details</SectionHeader>

            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Description</label>
              <textarea
                value={form.description}
                onChange={(e) => update('description', e.target.value)}
                rows={3}
                className={`${inputClass} resize-none`}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Source</label>
                <select value={form.source} onChange={(e) => update('source', e.target.value)} className={inputClass}>
                  <option value="">--</option>
                  {DEAL_SOURCES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Priority</label>
                <select
                  value={form.priority}
                  onChange={(e) => update('priority', e.target.value as DealPriority | '')}
                  className={inputClass}
                >
                  <option value="">--</option>
                  {DEAL_PRIORITIES.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {opportunity?.status === 'Won' && (
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Maintenance Reminder Every (months)</label>
                <input
                  type="number"
                  min={1}
                  value={form.maintenance_interval_months}
                  onChange={(e) => update('maintenance_interval_months', e.target.value)}
                  placeholder="e.g. 12 for an annual reminder — leave blank to disable"
                  className={inputClass}
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  Automatically re-emails this client every N months after the job closed (or after the last
                  reminder), suggesting a check-up/maintenance visit. Leave blank for no recurring reminder.
                </p>
              </div>
            )}
          </div>

          {error && (
            <div className="p-2.5 text-xs rounded-lg text-center bg-rose-50 text-rose-700 border border-rose-200">
              {error}
            </div>
          )}

          <div className="flex items-center justify-between gap-2 pt-3 border-t border-slate-100">
            {isEdit && opportunity ? (
              <div className="text-[11px] text-slate-400 space-y-0.5">
                {opportunity.created_at && <div>Created: {formatDate(opportunity.created_at)}</div>}
                {opportunity.updated_at && <div>Last Updated: {formatDate(opportunity.updated_at)}</div>}
              </div>
            ) : (
              <span />
            )}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 rounded-lg"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSaving}
                className="px-4 py-2 text-sm font-semibold bg-[var(--theme-accent)] hover:bg-[var(--theme-accent-hover)] disabled:opacity-60 text-white rounded-lg"
              >
                {isSaving ? 'Saving...' : isEdit ? 'Save Changes' : 'Add Deal'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
