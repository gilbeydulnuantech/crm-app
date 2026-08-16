import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import ThemeModal from '../components/settings/ThemeModal';
import MyProfileModal from '../components/settings/MyProfileModal';
import NotificationPreferencesModal from '../components/settings/NotificationPreferencesModal';
import AuditLogModal from '../components/settings/AuditLogModal';
import UserManagementModal from '../components/settings/UserManagementModal';

export default function Settings() {
  const { user, isAdmin } = useAuth();
  const [themeOpen, setThemeOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [auditLogOpen, setAuditLogOpen] = useState(false);
  const [userMgmtOpen, setUserMgmtOpen] = useState(false);

  return (
    <div className="flex-1 overflow-y-auto p-6">
      <h1 className="text-lg font-bold text-slate-800 mb-1">Settings</h1>
      <p className="text-xs text-slate-500 mb-6">Signed in as {user?.name}</p>

      <div className="max-w-xl bg-white border border-slate-200 rounded-xl divide-y divide-slate-100">
        <div className="p-5 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-slate-800">My Profile</h2>
            <p className="text-xs text-slate-500 mt-0.5">View your avatar, name, color, and account role.</p>
          </div>
          <button
            type="button"
            onClick={() => setProfileOpen(true)}
            className="shrink-0 px-4 py-2 text-sm font-semibold border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-lg flex items-center gap-2"
          >
            <i className="fa-solid fa-user text-[var(--theme-accent)]" />
            My Profile
          </button>
        </div>

        <div className="p-5 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-slate-800">Color Theme</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Personalize the header, sidebar, main window, and accent colors for your account.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setThemeOpen(true)}
            className="shrink-0 px-4 py-2 text-sm font-semibold border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-lg flex items-center gap-2"
          >
            <i className="fa-solid fa-palette text-[var(--theme-accent)]" />
            Color Theme
          </button>
        </div>

        <div className="p-5 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-slate-800">Notification Preferences</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Choose what shows up in your notification bell.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setNotificationsOpen(true)}
            className="shrink-0 px-4 py-2 text-sm font-semibold border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-lg flex items-center gap-2"
          >
            <i className="fa-solid fa-bell text-[var(--theme-accent)]" />
            Notifications
          </button>
        </div>
      </div>

      {isAdmin && (
        <>
          <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wide mt-6 mb-2">Admin</h2>
          <div className="max-w-xl bg-white border border-slate-200 rounded-xl divide-y divide-slate-100">
            <div className="p-5 flex items-center justify-between">
              <div>
                <h2 className="text-sm font-semibold text-slate-800">User Management</h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Manage teammate roles and deactivate accounts.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setUserMgmtOpen(true)}
                className="shrink-0 px-4 py-2 text-sm font-semibold border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-lg flex items-center gap-2"
              >
                <i className="fa-solid fa-users-gear text-[var(--theme-accent)]" />
                Users
              </button>
            </div>

            <div className="p-5 flex items-center justify-between">
              <div>
                <h2 className="text-sm font-semibold text-slate-800">Audit Log</h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  See who created, archived, or restored records across every contact and company.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setAuditLogOpen(true)}
                className="shrink-0 px-4 py-2 text-sm font-semibold border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-lg flex items-center gap-2"
              >
                <i className="fa-solid fa-clock-rotate-left text-[var(--theme-accent)]" />
                Audit Log
              </button>
            </div>
          </div>
        </>
      )}

      <MyProfileModal open={profileOpen} onClose={() => setProfileOpen(false)} />
      <ThemeModal open={themeOpen} onClose={() => setThemeOpen(false)} />
      <NotificationPreferencesModal open={notificationsOpen} onClose={() => setNotificationsOpen(false)} />
      <AuditLogModal open={auditLogOpen} onClose={() => setAuditLogOpen(false)} />
      <UserManagementModal open={userMgmtOpen} onClose={() => setUserMgmtOpen(false)} />
    </div>
  );
}
