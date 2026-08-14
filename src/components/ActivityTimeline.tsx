import { useMemo, useState } from 'react';
import { ACTIVITY_TABS, ActivityLogEntry, ActivityTab } from '../types/activity';
import { EmailLog } from '../types/contact';

const TAB_FILTERS: Record<ActivityTab, (category: TimelineItem['category']) => boolean> = {
  All: () => true,
  Emails: (c) => c === 'email',
  Calls: (c) => c === 'call',
  Meetings: (c) => c === 'meeting',
  'System Audit': (c) => c === 'system_audit',
};

const SUBTYPE_ICONS: Record<string, string> = {
  calendar_sync: 'fa-calendar-days',
  video_call: 'fa-video',
  physical: 'fa-people-arrows',
  transcript: 'fa-file-lines',
  field_change: 'fa-pen',
  automation: 'fa-robot',
  ownership_change: 'fa-right-left',
  integration_sync: 'fa-plug',
  permission: 'fa-shield-halved',
};

interface TimelineItem {
  key: string;
  category: 'email' | 'call' | 'meeting' | 'system_audit';
  icon: string;
  iconColor: string;
  cardClass: string;
  title: string;
  subtitle?: string;
  body?: string;
  timestamp: string;
  unread?: boolean;
  onClick?: () => void;
}

function emailToItem(log: EmailLog, i: number, onClick: (log: EmailLog) => void): TimelineItem {
  const isReceived = log.type === 'received';
  const isUnread = isReceived && log.is_read !== true;
  return {
    key: `email-${log.id ?? i}`,
    category: 'email',
    icon: isReceived ? 'fa-reply' : 'fa-paper-plane',
    iconColor: isReceived ? 'text-blue-500' : 'text-slate-400',
    cardClass: isReceived ? (isUnread ? 'bg-sky-50 border-sky-200' : 'bg-green-50 border-green-200') : 'bg-slate-50 border-slate-100',
    title: `${isReceived ? 'Reply:' : 'Sent:'} ${log.subject || 'No Subject'}`,
    subtitle: isReceived ? `From: ${log.from ?? '--'}` : `To: ${log.to ?? '--'}`,
    body: log.message,
    timestamp: log.sent_at || '',
    unread: isUnread,
    onClick: () => onClick(log),
  };
}

function activityToItem(entry: ActivityLogEntry): TimelineItem {
  const category = entry.category === 'call' ? 'call' : entry.category === 'meeting' ? 'meeting' : 'system_audit';
  const icon =
    (entry.subtype && SUBTYPE_ICONS[entry.subtype]) ||
    (category === 'call' ? 'fa-phone' : category === 'meeting' ? 'fa-calendar-days' : 'fa-clock-rotate-left');
  const iconColor = category === 'call' ? 'text-purple-500' : category === 'meeting' ? 'text-teal-600' : 'text-amber-600';
  const cardClass = category === 'call' ? 'bg-purple-50 border-purple-200' : category === 'meeting' ? 'bg-teal-50 border-teal-200' : 'bg-amber-50 border-amber-200';
  return {
    key: `activity-${entry.id}`,
    category,
    icon,
    iconColor,
    cardClass,
    title: entry.summary,
    subtitle: entry.actor_name ? `By ${entry.actor_name}` : undefined,
    timestamp: entry.created_at,
  };
}

interface Props {
  emails?: EmailLog[];
  activity: ActivityLogEntry[];
  isLoading?: boolean;
  onEmailClick: (log: EmailLog) => void;
}

export default function ActivityTimeline({ emails = [], activity, isLoading, onEmailClick }: Props) {
  const [tab, setTab] = useState<ActivityTab>('All');
  const [search, setSearch] = useState('');

  const items = useMemo(() => {
    const emailItems = emails.map((log, i) => emailToItem(log, i, onEmailClick));
    const activityItems = activity.map(activityToItem);
    return [...emailItems, ...activityItems].sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [emails, activity]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items.filter((item) => {
      if (!TAB_FILTERS[tab](item.category)) return false;
      if (!q) return true;
      return [item.title, item.subtitle, item.body].some((s) => s?.toLowerCase().includes(q));
    });
  }, [items, tab, search]);

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-1 border-b border-slate-200 -mx-1 px-1 overflow-x-auto">
        {ACTIVITY_TABS.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`px-2 py-1.5 text-[11px] font-semibold whitespace-nowrap border-b-2 -mb-px transition-colors ${
              tab === t
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-400 hover:text-slate-600'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      <div className="relative">
        <i className="fa-solid fa-magnifying-glass absolute left-2.5 top-1/2 -translate-y-1/2 text-[11px] text-slate-300" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search activity..."
          className="w-full pl-7 pr-2.5 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
      </div>

      {isLoading ? (
        <p className="text-xs text-slate-400 italic">Loading activity...</p>
      ) : filtered.length === 0 ? (
        <p className="text-xs text-slate-400 italic">
          {items.length === 0 ? 'No activity recorded yet.' : 'No activity matches this filter.'}
        </p>
      ) : (
        <div className="space-y-3">
          {filtered.map((item) => (
            <div
              key={item.key}
              onClick={item.onClick}
              className={`p-3 rounded-lg border space-y-1 ${item.cardClass} ${item.onClick ? 'cursor-pointer' : ''}`}
              title={item.onClick ? 'Click to view' : undefined}
            >
              <div className="flex items-center justify-between text-xs font-medium">
                <span className="flex items-center gap-1.5 text-slate-700 min-w-0">
                  <i className={`fa-solid ${item.icon} ${item.iconColor}`} />
                  <span className="truncate">{item.title}</span>
                </span>
                <span className="text-slate-400 text-[10px] shrink-0">
                  {item.timestamp ? new Date(item.timestamp).toLocaleDateString() : ''}
                </span>
              </div>
              {item.subtitle && <p className="text-slate-400 text-[10px]">{item.subtitle}</p>}
              {item.body && <p className="text-slate-600 text-xs whitespace-pre-wrap line-clamp-2">{item.body}</p>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
