import { LineChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { TrendPoint } from '../../types/report';

export function ReportStatCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: string | number;
  tone?: string;
}) {
  return (
    <div className="border border-slate-200 rounded-xl p-4">
      <div className={`text-2xl font-bold ${tone ?? 'text-slate-800'}`}>{value}</div>
      <div className="text-xs text-slate-500 mt-1">{label}</div>
    </div>
  );
}

export function TrendChart({ data, label }: { data: TrendPoint[]; label: string }) {
  if (!data || data.length === 0) {
    return (
      <div className="h-56 flex items-center justify-center text-sm text-slate-400 border border-dashed border-slate-200 rounded-xl">
        No snapshot history yet for "{label}" — the nightly snapshot job needs to run at least once.
      </div>
    );
  }

  return (
    <div className="border border-slate-200 rounded-xl p-4">
      <h3 className="text-sm font-semibold text-slate-800 mb-3">{label}</h3>
      <ResponsiveContainer width="100%" height={220}>
        <LineChart data={data}>
          <XAxis
            dataKey="snapshot_date"
            tick={{ fontSize: 11 }}
            tickFormatter={(v) => new Date(v).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
          />
          <YAxis tick={{ fontSize: 11 }} width={40} />
          <Tooltip
            labelFormatter={(v) => new Date(v as string).toLocaleDateString()}
            formatter={(v: number) => v.toLocaleString()}
          />
          <Line type="monotone" dataKey="value" stroke="#4f46e5" strokeWidth={2} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
