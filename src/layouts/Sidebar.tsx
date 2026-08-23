import { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useUnreadChatCount } from '../hooks/useChat';
import { toTitleCase } from '../utils/text';

interface NavItem {
  to: string;
  label: string;
  icon: string;
}

const NAV_ITEMS: NavItem[] = [
  { to: '/dashboard', label: 'Dashboard', icon: 'fa-solid fa-chart-pie' },
  { to: '/contacts', label: 'Contacts', icon: 'fa-solid fa-users' },
  { to: '/companies', label: 'Companies', icon: 'fa-solid fa-building' },
  { to: '/pipeline', label: 'Sales Pipeline', icon: 'fa-solid fa-diagram-project' },
  { to: '/tasks', label: 'Tasks', icon: 'fa-solid fa-check-to-slot' },
  { to: '/calendar', label: 'Calendar', icon: 'fa-solid fa-calendar-days' },
  { to: '/reports', label: 'Reports', icon: 'fa-solid fa-chart-line' },
  { to: '/team-chat', label: 'Team Chat', icon: 'fa-solid fa-comments' },
  { to: '/tickets', label: 'Tickets', icon: 'fa-solid fa-headset' },
];

const DOCUMENTS_SUB_ITEMS = [
  { to: '/documents/proposals', label: 'Proposals', icon: 'fa-solid fa-file-lines' },
  { to: '/documents/contracts', label: 'Contracts', icon: 'fa-solid fa-file-signature' },
  { to: '/documents/pages', label: 'Pages', icon: 'fa-solid fa-window-maximize' },
  { to: '/documents', label: 'Email Templates', icon: 'fa-solid fa-envelope' },
];

const navLinkClasses = (isActive: boolean) =>
  `flex items-center space-x-3 px-3 py-2 rounded-lg font-medium text-sm transition-colors ${
    isActive
      ? 'bg-[var(--theme-accent-tint)] text-[var(--theme-accent)] font-bold'
      : 'text-slate-600 hover:bg-slate-50'
  }`;
const collapsedNavLinkClasses = (isActive: boolean) =>
  `rounded p-1.5 ${
    isActive
      ? 'text-[var(--theme-accent)] bg-[var(--theme-accent-tint)]'
      : 'text-slate-400 hover:text-[var(--theme-accent)] hover:bg-slate-100'
  }`;

interface Props {
  collapsed: boolean;
  onToggleCollapsed: () => void;
}

export default function Sidebar({ collapsed, onToggleCollapsed }: Props) {
  const { user, logout } = useAuth();
  const location = useLocation();
  const documentsActive = location.pathname.startsWith('/documents');
  const [documentsOpen, setDocumentsOpen] = useState(documentsActive);
  const chatUnreadCount = useUnreadChatCount();

  if (collapsed) {
    return (
      <aside
        className="w-7 border-r border-slate-200 flex flex-col items-center pt-4 gap-1 shrink-0"
        style={{ backgroundColor: 'var(--theme-header)' }}
      >
        <button
          onClick={onToggleCollapsed}
          title="Show navigation"
          className="text-slate-400 hover:text-[var(--theme-accent)] hover:bg-slate-100 rounded p-1.5"
        >
          <i className="fa-solid fa-chevron-right text-xs" />
        </button>
        <div className="w-full border-t border-slate-100 my-1" />
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            title={item.label}
            className={({ isActive }) => `relative ${collapsedNavLinkClasses(isActive)}`}
          >
            <i className={`${item.icon} text-xs`} />
            {item.to === '/team-chat' && chatUnreadCount > 0 && (
              <span className="absolute top-0.5 right-0.5 w-1.5 h-1.5 rounded-full bg-rose-500" />
            )}
          </NavLink>
        ))}
        <NavLink
          to="/documents/proposals"
          title="Documents"
          className={collapsedNavLinkClasses(documentsActive)}
        >
          <i className="fa-solid fa-file-signature text-xs" />
        </NavLink>
        <NavLink
          to="/automations"
          title="Automation"
          className={({ isActive }) => collapsedNavLinkClasses(isActive)}
        >
          <i className="fa-solid fa-bolt text-xs" />
        </NavLink>
        <div className="w-full border-t border-slate-100 my-1" />
        <NavLink
          to="/settings"
          title="Settings"
          className={({ isActive }) => collapsedNavLinkClasses(isActive)}
        >
          <i className="fa-solid fa-gear text-xs" />
        </NavLink>
      </aside>
    );
  }

  return (
    <aside
      className="w-60 border-r border-slate-200 flex flex-col shrink-0 overflow-hidden"
      style={{ backgroundColor: 'var(--theme-header)' }}
    >
      <div className="flex-1 overflow-y-auto">
        <div className="p-3 space-y-1">
          <div className="flex items-center justify-between px-3 mb-2">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">CRM</span>
            <button
              onClick={onToggleCollapsed}
              title="Hide navigation"
              className="text-slate-400 hover:text-indigo-600 hover:bg-slate-100 rounded p-1"
            >
              <i className="fa-solid fa-chevron-left text-xs" />
            </button>
          </div>

          <nav className="space-y-0.5">
            {NAV_ITEMS.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) => navLinkClasses(isActive)}
              >
                <i className={`${item.icon} w-5`} />
                <span className="flex-1">{item.label}</span>
                {item.to === '/team-chat' && chatUnreadCount > 0 && (
                  <span className="shrink-0 min-w-[18px] h-[18px] px-1 rounded-full bg-rose-500 text-white text-[10px] font-bold flex items-center justify-center leading-none">
                    {chatUnreadCount > 99 ? '99+' : chatUnreadCount}
                  </span>
                )}
              </NavLink>
            ))}

            <button
              type="button"
              onClick={() => setDocumentsOpen((o) => !o)}
              className={`w-full ${navLinkClasses(documentsActive && !documentsOpen)}`}
            >
              <i className="fa-solid fa-file-signature w-5" />
              <span className="flex-1 text-left">Documents</span>
              <i className={`fa-solid fa-chevron-${documentsOpen ? 'up' : 'down'} text-[10px] text-slate-400`} />
            </button>
            {documentsOpen && (
              <div className="pl-6 space-y-0.5">
                {DOCUMENTS_SUB_ITEMS.map((item) => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end={item.to === '/documents'}
                    className={({ isActive }) => navLinkClasses(isActive)}
                  >
                    <i className={`${item.icon} w-5 text-xs`} />
                    <span>{item.label}</span>
                  </NavLink>
                ))}
              </div>
            )}

            <NavLink to="/automations" className={({ isActive }) => navLinkClasses(isActive)}>
              <i className="fa-solid fa-bolt w-5" />
              <span>Automation</span>
            </NavLink>
          </nav>
        </div>
      </div>

      <div className="p-3 border-t border-slate-200 bg-slate-50/50 shrink-0">
        <NavLink
          to="/settings"
          className={({ isActive }) => navLinkClasses(isActive)}
        >
          <i className="fa-solid fa-gear w-5 text-slate-500" />
          <span>Settings</span>
        </NavLink>

        <div className="px-3 py-2 text-xs text-slate-500">
          Signed in as{' '}
          <span className="font-medium text-slate-700">{user?.name ? toTitleCase(user.name) : '--'}</span>
        </div>

        <button
          onClick={logout}
          className="w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-rose-600 hover:bg-rose-50 font-medium text-sm transition-colors"
        >
          <i className="fa-solid fa-right-from-bracket w-5" />
          <span>Logout</span>
        </button>
      </div>
    </aside>
  );
}
