import { useContactRelated } from '../../hooks/useContacts';

interface Props {
  contactId: number;
}

function currency(n: number | null | undefined) {
  if (n === undefined || n === null) return '--';
  return `$${n.toLocaleString()}`;
}

export default function ContactRelatedTree({ contactId }: Props) {
  const { data, isLoading } = useContactRelated(contactId);

  if (isLoading) {
    return <p className="text-xs text-slate-400 italic">Loading related records...</p>;
  }

  const branches = [
    {
      label: 'COMPANY',
      content: data?.company ? (
        <p className="text-sm text-slate-700">{data.company.name}</p>
      ) : (
        <p className="text-xs text-slate-400">No company linked</p>
      ),
    },
    {
      label: 'DEAL / OPPORTUNITY',
      content: data?.deal ? (
        <div className="space-y-0.5">
          <p className="text-sm text-slate-700">{data.deal.name}</p>
          <p className="text-sm font-semibold text-emerald-600">{currency(data.deal.deal_value)}</p>
          <p className="text-xs text-slate-500">{data.deal.stage_name}</p>
        </div>
      ) : (
        <p className="text-xs text-slate-400">No open deal</p>
      ),
    },
    {
      label: 'TASK',
      content: data?.task ? (
        <div className="space-y-0.5">
          <p className="text-sm text-slate-700">{data.task.subject}</p>
          {data.task.due_at && (
            <p className="text-xs text-slate-500">
              Due: {new Date(data.task.due_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
            </p>
          )}
        </div>
      ) : (
        <p className="text-xs text-slate-400">No open task</p>
      ),
    },
    {
      label: 'EVENT',
      content: data?.event ? (
        <div className="space-y-0.5">
          <p className="text-sm text-slate-700">{data.event.subject}</p>
          {data.event.due_at && (
            <p className="text-xs text-slate-500">
              {new Date(data.event.due_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })},{' '}
              {new Date(data.event.due_at).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}
            </p>
          )}
        </div>
      ) : (
        <p className="text-xs text-slate-400">No upcoming event</p>
      ),
    },
  ];

  return (
    <div>
      {branches.map((b, i) => (
        <div key={b.label} className="flex gap-2">
          <div className="flex flex-col items-center w-4 shrink-0">
            <div className={`w-px flex-1 ${i === 0 ? 'bg-transparent' : 'bg-slate-200'}`} />
            <div className="w-2.5 h-2.5 rounded-full border-2 border-slate-300 bg-white shrink-0" />
            <div className={`w-px flex-1 ${i === branches.length - 1 ? 'bg-transparent' : 'bg-slate-200'}`} />
          </div>
          <div className="pb-4 pt-0.5 flex-1 min-w-0">
            <p className="text-[10px] font-semibold text-slate-400 tracking-wide mb-1">{b.label}</p>
            {b.content}
          </div>
        </div>
      ))}
    </div>
  );
}
