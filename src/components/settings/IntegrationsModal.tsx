import { FormEvent, useState } from 'react';
import { useIntegrations, useSaveIntegration, useDeleteIntegration } from '../../hooks/useIntegrations';
import { Integration, IntegrationProvider } from '../../api/integrations';

interface Props {
  open: boolean;
  onClose: () => void;
}

const inputClass =
  'w-full px-3 py-1.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--theme-accent)]';

// Non-secret settings each provider needs alongside the API key — these are
// specific to what their "create a call" endpoint expects, not something a
// key alone covers.
const PROVIDER_FIELDS: Record<IntegrationProvider, { key: string; label: string; placeholder: string }[]> = {
  vapi: [
    { key: 'assistant_id', label: 'Assistant ID', placeholder: 'From your Vapi dashboard' },
    { key: 'phone_number_id', label: 'Phone Number ID', placeholder: 'The Vapi number to call from' },
  ],
  retell: [
    { key: 'agent_id', label: 'Agent ID', placeholder: 'From your Retell dashboard' },
    { key: 'from_number', label: 'From Number', placeholder: 'e.g. +15551234567' },
  ],
  apify: [],
};

const PROVIDER_LABELS: Record<IntegrationProvider, string> = { vapi: 'Vapi', retell: 'Retell', apify: 'Apify' };

export default function IntegrationsModal({ open, onClose }: Props) {
  const { data: integrations = [], isLoading } = useIntegrations(open);
  const [editingProvider, setEditingProvider] = useState<IntegrationProvider | null>(null);

  if (!open) return null;

  const byProvider = (p: IntegrationProvider) => integrations.find((i) => i.provider === p);

  return (
    <>
      <div
        className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4"
        onClick={onClose}
      >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[85vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 pt-6">
          <h3 className="text-lg font-bold text-slate-800">Integrations</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <i className="fa-solid fa-xmark" />
          </button>
        </div>
        <p className="text-xs text-slate-500 px-6 mt-1">
          Connect third-party apps with an API key — n8n workflows read the key live from here, so rotating
          it never requires touching n8n.
        </p>

        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3">
          {isLoading ? (
            <p className="text-sm text-slate-400 py-4 text-center">Loading...</p>
          ) : (
            (['vapi', 'retell', 'apify'] as IntegrationProvider[]).map((provider) => (
              <ProviderCard
                key={provider}
                provider={provider}
                integration={byProvider(provider)}
                editing={editingProvider === provider}
                onStartEdit={() => setEditingProvider(provider)}
                onStopEdit={() => setEditingProvider(null)}
              />
            ))
          )}
        </div>
      </div>
      </div>
    </>
  );
}

function ProviderCard({
  provider,
  integration,
  editing,
  onStartEdit,
  onStopEdit,
}: {
  provider: IntegrationProvider;
  integration?: Integration;
  editing: boolean;
  onStartEdit: () => void;
  onStopEdit: () => void;
}) {
  const saveIntegration = useSaveIntegration();
  const deleteIntegration = useDeleteIntegration();
  const [apiKey, setApiKey] = useState('');
  const [label, setLabel] = useState(integration?.label ?? '');
  const [config, setConfig] = useState<Record<string, string>>(integration?.config ?? {});
  const [error, setError] = useState<string | null>(null);

  const isConnected = integration?.has_key && integration.is_active;

  function startEdit() {
    setApiKey('');
    setLabel(integration?.label ?? '');
    setConfig(integration?.config ?? {});
    setError(null);
    onStartEdit();
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!integration?.has_key && !apiKey.trim()) {
      setError('An API key is required to connect this provider.');
      return;
    }
    saveIntegration.mutate(
      {
        provider,
        label: label.trim() || undefined,
        api_key: apiKey.trim() || undefined,
        config,
      },
      {
        onSuccess: () => onStopEdit(),
        onError: (err) => setError(err instanceof Error ? err.message : 'Failed to save.'),
      }
    );
  }

  function handleRemove() {
    if (!integration) return;
    deleteIntegration.mutate(integration.id);
  }

  return (
    <div className="border border-slate-200 rounded-lg p-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-slate-800">{PROVIDER_LABELS[provider]}</span>
          {isConnected ? (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-semibold rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
              <i className="fa-solid fa-circle-check" /> Connected
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-semibold rounded-full bg-slate-100 text-slate-500">
              Not connected
            </span>
          )}
        </div>
        {!editing && (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={startEdit}
              className="text-xs font-semibold text-[var(--theme-accent)] hover:underline"
            >
              {integration?.has_key ? 'Edit' : 'Connect'}
            </button>
            {integration && (
              <button
                type="button"
                onClick={handleRemove}
                disabled={deleteIntegration.isPending}
                className="text-slate-400 hover:text-rose-600 disabled:opacity-40"
                title="Remove"
              >
                <i className="fa-solid fa-trash text-xs" />
              </button>
            )}
          </div>
        )}
      </div>

      {editing && (
        <form onSubmit={handleSubmit} className="mt-3 space-y-2">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">API Key</label>
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder={integration?.has_key ? 'Leave blank to keep the current key' : 'Paste your API key'}
              className={inputClass}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Label (optional)</label>
            <input
              type="text"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder={`e.g. "Main ${PROVIDER_LABELS[provider]} account"`}
              className={inputClass}
            />
          </div>
          {PROVIDER_FIELDS[provider].map((f) => (
            <div key={f.key}>
              <label className="block text-xs font-medium text-slate-600 mb-1">{f.label}</label>
              <input
                type="text"
                value={config[f.key] ?? ''}
                onChange={(e) => setConfig((c) => ({ ...c, [f.key]: e.target.value }))}
                placeholder={f.placeholder}
                className={inputClass}
              />
            </div>
          ))}
          {error && (
            <p className="text-xs text-rose-600 bg-rose-50 border border-rose-200 rounded-md px-2 py-1">{error}</p>
          )}
          <div className="flex gap-2 pt-1">
            <button
              type="submit"
              disabled={saveIntegration.isPending}
              className="flex-1 px-3 py-1.5 text-xs font-semibold text-white bg-[var(--theme-accent)] hover:opacity-90 rounded-lg disabled:opacity-50"
            >
              {saveIntegration.isPending ? 'Saving...' : 'Save'}
            </button>
            <button
              type="button"
              onClick={onStopEdit}
              disabled={saveIntegration.isPending}
              className="flex-1 px-3 py-1.5 text-xs font-medium border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-lg disabled:opacity-50"
            >
              Cancel
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
