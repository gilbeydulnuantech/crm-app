import { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useUsers, useUpdateNotificationPreferences } from '../../hooks/useContacts';
import { NotificationPreferences } from '../../api/contacts';

interface Props {
  open: boolean;
  onClose: () => void;
}

const DEFAULT_PREFS: Required<NotificationPreferences> = {
  email: true,
  chat: true,
  tasks_due: true,
  automation_dms: true,
};

const OPTIONS: { key: keyof NotificationPreferences; label: string; description: string }[] = [
  { key: 'email', label: 'Email replies', description: 'Unread replies from contacts.' },
  { key: 'chat', label: 'Team chat messages', description: 'Unread messages in your conversations.' },
  { key: 'tasks_due', label: 'Tasks due today', description: 'Your open tasks due today.' },
  {
    key: 'automation_dms',
    label: 'Automation alerts',
    description: 'DMs from automations — hot lead replies, no-shows, deals won/lost, and similar.',
  },
];

export default function NotificationPreferencesModal({ open, onClose }: Props) {
  const { user } = useAuth();
  const { data: users = [] } = useUsers();
  const currentUser = users.find((u) => u.id === user?.id);
  const updatePreferences = useUpdateNotificationPreferences();

  const [prefs, setPrefs] = useState<Required<NotificationPreferences>>(DEFAULT_PREFS);

  useEffect(() => {
    if (currentUser) {
      setPrefs({ ...DEFAULT_PREFS, ...currentUser.notification_preferences });
    }
  }, [currentUser]);

  if (!open) return null;

  function toggle(key: keyof NotificationPreferences) {
    const next = { ...prefs, [key]: !prefs[key] };
    setPrefs(next);
    updatePreferences.mutate(next);
  }

  return (
    <div
      className="fixed inset-0 bg-slate-900/70 z-[100] flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-slate-800">Notification Preferences</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <i className="fa-solid fa-xmark" />
          </button>
        </div>

        <p className="text-xs text-slate-500 mb-4">
          Choose what shows up in your notification bell.
        </p>

        <div className="space-y-3">
          {OPTIONS.map((opt) => (
            <label
              key={opt.key}
              className="flex items-start gap-3 p-3 border border-slate-200 rounded-lg cursor-pointer hover:bg-slate-50"
            >
              <input
                type="checkbox"
                checked={prefs[opt.key]}
                onChange={() => toggle(opt.key)}
                className="mt-0.5 rounded border-slate-300 text-[var(--theme-accent)] focus:ring-[var(--theme-accent)]"
              />
              <div className="min-w-0">
                <p className="text-sm font-medium text-slate-800">{opt.label}</p>
                <p className="text-xs text-slate-500">{opt.description}</p>
              </div>
            </label>
          ))}
        </div>

        <div className="flex justify-end pt-6">
          <button
            type="button"
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
