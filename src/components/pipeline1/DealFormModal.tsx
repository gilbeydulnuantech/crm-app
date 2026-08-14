import { FormEvent, useEffect, useState } from 'react';
import { Opportunity, Stage } from '../../types/opportunity';
import { useAddOpportunity, useUpdateOpportunity } from '../../hooks/useOpportunities';

interface Props {
  open: boolean;
  opportunity: Opportunity | null; // null = add mode
  stages: Stage[];
  pipelineId: number;
  defaultStageId?: number;
  onClose: () => void;
}

const EMPTY = {
  name: '',
  contact_id: '',
  account_id: '',
  stage_id: '',
  deal_value: '',
  expected_close: '',
};

export default function DealFormModal({
  open,
  opportunity,
  stages,
  pipelineId,
  defaultStageId,
  onClose,
}: Props) {
  const [form, setForm] = useState(EMPTY);
  const [error, setError] = useState<string | null>(null);
  const addOpportunity = useAddOpportunity(pipelineId);
  const updateOpportunity = useUpdateOpportunity(pipelineId);

  const isEdit = !!opportunity;
  const isSaving = addOpportunity.isPending || updateOpportunity.isPending;

  useEffect(() => {
    if (opportunity) {
      setForm({
        name: opportunity.name ?? '',
        contact_id: String(opportunity.contact_id ?? ''),
        account_id: opportunity.account_id ? String(opportunity.account_id) : '',
        stage_id: String(opportunity.stage_id ?? ''),
        deal_value: opportunity.deal_value ? String(opportunity.deal_value) : '',
        expected_close: opportunity.expected_close?.slice(0, 10) ?? '',
      });
    } else {
      setForm({ ...EMPTY, stage_id: defaultStageId ? String(defaultStageId) : '' });
    }
    setError(null);
  }, [opportunity, open, defaultStageId]);

  if (!open) return null;

  function update<K extends keyof typeof EMPTY>(key: K, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    const payload = {
      name: form.name,
      contact_id: Number(form.contact_id),
      account_id: form.account_id ? Number(form.account_id) : null,
      stage_id: Number(form.stage_id),
      pipeline_id: pipelineId,
      deal_value: form.deal_value ? Number(form.deal_value) : null,
      expected_close: form.expected_close || null,
    };

    if (isEdit && opportunity) {
      updateOpportunity.mutate(
        { id: opportunity.id, payload },
        {
          onSuccess: () => onClose(),
          onError: (err) =>
            setError(err instanceof Error ? err.message : 'Failed to update deal.'),
        }
      );
    } else {
      addOpportunity.mutate(payload, {
        onSuccess: () => {
          setForm(EMPTY);
          onClose();
        },
        onError: (err) => setError(err instanceof Error ? err.message : 'Failed to add deal.'),
      });
    }
  }

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-slate-800">{isEdit ? 'Edit Deal' : 'Add Deal'}</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <i className="fa-solid fa-xmark" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Deal Name</label>
            <input
              required
              value={form.name}
              onChange={(e) => update('name', e.target.value)}
              className="w-full px-3 py-1.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--theme-accent)]"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Contact ID</label>
              <input
                required
                type="number"
                value={form.contact_id}
                onChange={(e) => update('contact_id', e.target.value)}
                className="w-full px-3 py-1.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--theme-accent)]"
                placeholder="e.g. 42"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Company ID</label>
              <input
                type="number"
                value={form.account_id}
                onChange={(e) => update('account_id', e.target.value)}
                className="w-full px-3 py-1.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--theme-accent)]"
                placeholder="optional"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Stage</label>
              <select
                required
                value={form.stage_id}
                onChange={(e) => update('stage_id', e.target.value)}
                className="w-full px-3 py-1.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--theme-accent)]"
              >
                <option value="">--</option>
                {stages
                  .slice()
                  .sort((a, b) => a.display_order - b.display_order)
                  .map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Deal Value</label>
              <input
                type="number"
                value={form.deal_value}
                onChange={(e) => update('deal_value', e.target.value)}
                className="w-full px-3 py-1.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--theme-accent)]"
                placeholder="$"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Expected Close</label>
            <input
              type="date"
              value={form.expected_close}
              onChange={(e) => update('expected_close', e.target.value)}
              className="w-full px-3 py-1.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--theme-accent)]"
            />
          </div>

          {error && (
            <div className="p-2.5 text-xs rounded-lg text-center bg-rose-50 text-rose-700 border border-rose-200">
              {error}
            </div>
          )}

          <p className="text-[11px] text-slate-400 italic">
            Contact/Company use raw IDs for now — an autocomplete picker (reusing the Contacts
            search) is a good next step once this is wired to live data.
          </p>

          <div className="flex justify-end gap-2 pt-2">
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
        </form>
      </div>
    </div>
  );
}
