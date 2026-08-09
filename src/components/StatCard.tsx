interface StatCardProps {
  label: string;
  value: string | number;
  delta?: string;
  deltaTone?: 'up' | 'down' | 'neutral';
}

export default function StatCard({ label, value, delta, deltaTone = 'up' }: StatCardProps) {
  const deltaColor =
    deltaTone === 'up'
      ? 'text-emerald-600'
      : deltaTone === 'down'
        ? 'text-rose-600'
        : 'text-slate-500';

  return (
    <div className="border border-slate-200 rounded-xl p-4">
      <div className="text-xs text-slate-500">{label}</div>
      <div className="text-2xl font-bold text-slate-800 mt-1">{value}</div>
      {delta && <div className={`text-xs font-medium mt-1 ${deltaColor}`}>{delta}</div>}
    </div>
  );
}
