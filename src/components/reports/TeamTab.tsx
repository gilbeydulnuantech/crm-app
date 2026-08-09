import { useTeamReport } from '../../hooks/useReports';
import { LoadingState } from './OverviewTab';

export default function TeamTab({ days }: { days: number }) {
  const { data = [], isLoading } = useTeamReport(days);

  if (isLoading) return <LoadingState />;

  if (data.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center text-sm text-slate-400">
        No team data yet.
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-auto p-4">
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="border-b border-slate-200">
            <th className="text-left font-semibold text-slate-500 text-xs uppercase tracking-wide py-2 px-2">
              Rep
            </th>
            <th className="text-right font-semibold text-slate-500 text-xs uppercase tracking-wide py-2 px-2">
              Open Deals
            </th>
            <th className="text-right font-semibold text-slate-500 text-xs uppercase tracking-wide py-2 px-2">
              Won Deals
            </th>
            <th className="text-right font-semibold text-slate-500 text-xs uppercase tracking-wide py-2 px-2">
              Revenue
            </th>
            <th className="text-right font-semibold text-slate-500 text-xs uppercase tracking-wide py-2 px-2">
              Tasks Completed
            </th>
            <th className="text-right font-semibold text-slate-500 text-xs uppercase tracking-wide py-2 px-2">
              Contacts Owned
            </th>
          </tr>
        </thead>
        <tbody>
          {data
            .slice()
            .sort((a, b) => b.revenue - a.revenue)
            .map((row) => (
              <tr key={row.user_id} className="border-b border-slate-100">
                <td className="py-2 px-2 font-medium text-slate-800">{row.name}</td>
                <td className="py-2 px-2 text-right text-slate-600">{row.open_deals}</td>
                <td className="py-2 px-2 text-right text-emerald-600 font-medium">{row.won_deals}</td>
                <td className="py-2 px-2 text-right text-slate-800 font-semibold">
                  ${row.revenue.toLocaleString()}
                </td>
                <td className="py-2 px-2 text-right text-slate-600">{row.tasks_completed}</td>
                <td className="py-2 px-2 text-right text-slate-600">{row.contacts_owned}</td>
              </tr>
            ))}
        </tbody>
      </table>
    </div>
  );
}
