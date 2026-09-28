import { FormEvent, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useImportMapsLeads } from '../../hooks/useMapsLeads';

interface Props {
  open: boolean;
  onClose: () => void;
}

const inputClass =
  'w-full px-3 py-1.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--theme-accent)]';

export default function FindLeadsModal({ open, onClose }: Props) {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [location, setLocation] = useState('');
  const [maxResults, setMaxResults] = useState(30);
  const [error, setError] = useState<string | null>(null);
  const importLeads = useImportMapsLeads();

  if (!open) return null;

  function handleClose() {
    if (importLeads.isPending) return;
    setError(null);
    importLeads.reset();
    onClose();
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!searchQuery.trim() || !location.trim()) {
      setError('Both a search term and a location are required.');
      return;
    }
    importLeads.mutate(
      { search_query: searchQuery.trim(), location: location.trim(), max_results: maxResults },
      { onError: (err) => setError(err instanceof Error ? err.message : 'Import failed.') }
    );
  }

  const result = importLeads.data;

  return (
    <div className="fixed inset-0 bg-slate-900/70 z-[100] flex items-center justify-center p-4" onClick={handleClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 pt-6">
          <h3 className="text-lg font-bold text-slate-800">Find Leads on Google Maps</h3>
          <button onClick={handleClose} className="text-slate-400 hover:text-slate-600">
            <i className="fa-solid fa-xmark" />
          </button>
        </div>
        <p className="text-xs text-slate-500 px-6 mt-1">
          Searches Google Maps and imports matching businesses as new Companies + Contacts, ready to work in
          your pipeline. Already-imported places are skipped automatically.
        </p>

        <form onSubmit={handleSubmit} className="px-6 py-4 space-y-3">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">What are you looking for?</label>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder='e.g. "property management companies"'
              className={inputClass}
              disabled={importLeads.isPending}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Where?</label>
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="e.g. Austin, TX"
              className={inputClass}
              disabled={importLeads.isPending}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Max results</label>
            <input
              type="number"
              min={1}
              max={100}
              value={maxResults}
              onChange={(e) => setMaxResults(Number(e.target.value))}
              className={inputClass}
              disabled={importLeads.isPending}
            />
          </div>

          {error && (
            <p className="text-xs text-rose-600 bg-rose-50 border border-rose-200 rounded-md px-3 py-2">
              {error}
              {/apify|not connected/i.test(error) && (
                <>
                  {' '}
                  <button
                    type="button"
                    onClick={() => navigate('/settings')}
                    className="font-semibold underline"
                  >
                    Go to Settings
                  </button>
                </>
              )}
            </p>
          )}

          {result && (
            <p className="text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-md px-3 py-2">
              Found {result.scraped} · Imported {result.imported} new lead{result.imported === 1 ? '' : 's'}
              {result.skipped_duplicates > 0 ? ` · Skipped ${result.skipped_duplicates} already in your CRM` : ''}
            </p>
          )}

          <div className="flex gap-2 pt-1">
            <button
              type="submit"
              disabled={importLeads.isPending}
              className="flex-1 px-3 py-2 text-sm font-semibold text-white bg-[var(--theme-accent)] hover:opacity-90 rounded-lg disabled:opacity-50"
            >
              {importLeads.isPending ? 'Searching...' : 'Search & Import'}
            </button>
            <button
              type="button"
              onClick={handleClose}
              disabled={importLeads.isPending}
              className="flex-1 px-3 py-2 text-sm font-medium border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-lg disabled:opacity-50"
            >
              {result ? 'Done' : 'Cancel'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
