import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

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
];

const navLinkClasses = (isActive: boolean) =>
  `flex items-center space-x-3 px-3 py-2 rounded-lg font-medium text-sm transition-colors ${
    isActive
      ? 'bg-indigo-50 text-indigo-600 font-bold'
      : 'text-slate-600 hover:bg-slate-50'
  }`;

export default function Sidebar() {
  const { user, logout } = useAuth();

  return (
    <aside className="w-60 bg-white border-r border-slate-200 flex flex-col shrink-0 overflow-hidden">
      <div className="flex-1 overflow-y-auto">
        <div className="p-3 space-y-1">
          <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider px-3 mb-2">
            CRM
          </div>

          <nav className="space-y-0.5">
            {NAV_ITEMS.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) => navLinkClasses(isActive)}
              >
                <i className={`${item.icon} w-5`} />
                <span>{item.label}</span>
              </NavLink>
            ))}
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
          Signed in as <span className="font-medium text-slate-700">{user?.name ?? '--'}</span>
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
