import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import ThemeModal from '../components/settings/ThemeModal';
import MyProfileModal from '../components/settings/MyProfileModal';
import NotificationPreferencesModal from '../components/settings/NotificationPreferencesModal';
import AuditLogModal from '../components/settings/AuditLogModal';
import UserManagementModal from '../components/settings/UserManagementModal';
import CalendarIntegrationsModal from '../components/settings/CalendarIntegrationsModal';
import IntegrationsModal from '../components/settings/IntegrationsModal';
import NurtureSequencesModal from '../components/settings/NurtureSequencesModal';
import StageRemindersModal from '../components/settings/StageRemindersModal';
import DocumentFlowModal from '../components/settings/DocumentFlowModal';
import CompanyProfileModal from '../components/settings/CompanyProfileModal';

export default function Settings() {
  const { user, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [themeOpen, setThemeOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [auditLogOpen, setAuditLogOpen] = useState(false);
  const [userMgmtOpen, setUserMgmtOpen] = useState(false);
  const [calendarIntegrationsOpen, setCalendarIntegrationsOpen] = useState(false);
  const [integrationsOpen, setIntegrationsOpen] = useState(false);
  const [nurtureSequencesOpen, setNurtureSequencesOpen] = useState(false);
  const [stageRemindersOpen, setStageRemindersOpen] = useState(false);
  const [documentFlowOpen, setDocumentFlowOpen] = useState(false);
  const [companyProfileOpen, setCompanyProfileOpen] = useState(false);

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

            <div className="p-5 flex items-center justify-between">
              <div>
                <h2 className="text-sm font-semibold text-slate-800">Calendar Integrations</h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Connect a rep's Google Calendar so booked leads sync into the CRM automatically.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setCalendarIntegrationsOpen(true)}
                className="shrink-0 px-4 py-2 text-sm font-semibold border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-lg flex items-center gap-2"
              >
                <i className="fa-solid fa-calendar-days text-[var(--theme-accent)]" />
                Calendars
              </button>
            </div>

            <div className="p-5 flex items-center justify-between">
              <div>
                <h2 className="text-sm font-semibold text-slate-800">Integrations</h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Connect third-party apps like Vapi or Retell with an API key.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIntegrationsOpen(true)}
                className="shrink-0 px-4 py-2 text-sm font-semibold border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-lg flex items-center gap-2"
              >
                <i className="fa-solid fa-plug text-[var(--theme-accent)]" />
                Integrations
              </button>
            </div>

            <div className="p-5 flex items-center justify-between">
              <div>
                <h2 className="text-sm font-semibold text-slate-800">Email Nurture</h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Multi-step drip sequences for contacts who've gone quiet — stops automatically on reply.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setNurtureSequencesOpen(true)}
                className="shrink-0 px-4 py-2 text-sm font-semibold border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-lg flex items-center gap-2"
              >
                <i className="fa-solid fa-seedling text-[var(--theme-accent)]" />
                Sequences
              </button>
            </div>

            <div className="p-5 flex items-center justify-between">
              <div>
                <h2 className="text-sm font-semibold text-slate-800">Stage Reminders</h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Appointment reminders for deals sitting in a pipeline stage — e.g. reminders before an
                  inspection, or a no-show follow-up after.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setStageRemindersOpen(true)}
                className="shrink-0 px-4 py-2 text-sm font-semibold border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-lg flex items-center gap-2"
              >
                <i className="fa-solid fa-bell text-[var(--theme-accent)]" />
                Reminders
              </button>
            </div>

            <div className="p-5 flex items-center justify-between">
              <div>
                <h2 className="text-sm font-semibold text-slate-800">Proposal & Contract Flow</h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Auto-email a rep's proposal, then move the deal forward as the lead views, approves, and signs.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setDocumentFlowOpen(true)}
                className="shrink-0 px-4 py-2 text-sm font-semibold border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-lg flex items-center gap-2"
              >
                <i className="fa-solid fa-file-signature text-[var(--theme-accent)]" />
                Flow
              </button>
            </div>

            <div className="p-5 flex items-center justify-between">
              <div>
                <h2 className="text-sm font-semibold text-slate-800">Company Profile</h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Your company's name, email, and phone — auto-fills the "Contractor" details on new proposals.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setCompanyProfileOpen(true)}
                className="shrink-0 px-4 py-2 text-sm font-semibold border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-lg flex items-center gap-2"
              >
                <i className="fa-solid fa-building text-[var(--theme-accent)]" />
                Profile
              </button>
            </div>

            <div className="p-5 flex items-center justify-between">
              <div>
                <h2 className="text-sm font-semibold text-slate-800">Observability Dashboard</h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Live health of every n8n workflow — status, execution times, errors, success rate, and server load.
                </p>
              </div>
              <button
                type="button"
                onClick={() => navigate('/observability')}
                className="shrink-0 px-4 py-2 text-sm font-semibold border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-lg flex items-center gap-2"
              >
                <i className="fa-solid fa-gauge-high text-[var(--theme-accent)]" />
                Dashboard
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
      <CalendarIntegrationsModal open={calendarIntegrationsOpen} onClose={() => setCalendarIntegrationsOpen(false)} />
      <IntegrationsModal open={integrationsOpen} onClose={() => setIntegrationsOpen(false)} />
      <NurtureSequencesModal open={nurtureSequencesOpen} onClose={() => setNurtureSequencesOpen(false)} />
      <StageRemindersModal open={stageRemindersOpen} onClose={() => setStageRemindersOpen(false)} />
      <DocumentFlowModal open={documentFlowOpen} onClose={() => setDocumentFlowOpen(false)} />
      <CompanyProfileModal open={companyProfileOpen} onClose={() => setCompanyProfileOpen(false)} />
    </div>
  );
}
