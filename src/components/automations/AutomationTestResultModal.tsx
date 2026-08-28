import { AutomationTestResult } from '../../api/n8nWorkflows';

interface Props {
  workflowName: string;
  result: AutomationTestResult | null;
  isRunning: boolean;
  error: string | null;
  onClose: () => void;
}

// Shows the node-by-node outcome of a live test run — which node failed and
// why, not just "it worked" / "it didn't". This IS a real run against live
// data (see the confirm step before firing in AutomationsPage), so a
// success here means the automation actually did whatever it does.
export default function AutomationTestResultModal({ workflowName, result, isRunning, error, onClose }: Props) {
  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6 max-h-[85vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-slate-800">Test: {workflowName}</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <i className="fa-solid fa-xmark" />
          </button>
        </div>

        {isRunning ? (
          <div className="py-10 text-center">
            <i className="fa-solid fa-circle-notch fa-spin text-2xl text-slate-400 mb-3" />
            <p className="text-sm text-slate-500">Running for real against live data...</p>
          </div>
        ) : error ? (
          <p className="text-sm text-rose-600 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2">{error}</p>
        ) : !result ? null : !result.success ? (
          <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
            {result.error || 'Could not run this automation.'}
          </p>
        ) : (
          <div className="space-y-3">
            <div
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-semibold ${
                result.overallStatus === 'success'
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                  : 'bg-rose-50 text-rose-700 border border-rose-200'
              }`}
            >
              <i className={`fa-solid ${result.overallStatus === 'success' ? 'fa-circle-check' : 'fa-circle-exclamation'}`} />
              {result.overallStatus === 'success' ? 'Ran successfully' : 'Failed'}
            </div>

            <div className="space-y-1.5">
              {(result.nodes || []).map((n) => (
                <div
                  key={n.name}
                  className={`px-3 py-2 rounded-lg border text-xs ${
                    n.status === 'error' ? 'bg-rose-50 border-rose-200' : 'bg-slate-50 border-slate-200'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-slate-800">{n.name}</span>
                    <span className={n.status === 'error' ? 'text-rose-600' : 'text-emerald-600'}>
                      {n.status === 'error' ? 'Failed' : n.itemCount != null ? `${n.itemCount} item(s)` : 'OK'}
                    </span>
                  </div>
                  {n.error && <p className="mt-1 text-rose-600 whitespace-pre-wrap">{n.error}</p>}
                </div>
              ))}
              {(result.nodes || []).length === 0 && (
                <p className="text-xs text-slate-400 italic">No nodes ran — nothing was due to process.</p>
              )}
            </div>
          </div>
        )}

        <div className="flex justify-end pt-4">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 rounded-lg"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
