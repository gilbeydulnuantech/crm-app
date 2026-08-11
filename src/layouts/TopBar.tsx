import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { toTitleCase } from '../utils/text';
import { useUnreadEmailCount } from '../hooks/useContacts';

export default function TopBar() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const unreadCount = useUnreadEmailCount();

  return (
    <header className="h-12 border-b border-slate-200 bg-white flex items-center justify-between px-4 shrink-0">
      <span className="font-bold text-slate-800 text-sm tracking-wide">CRM</span>

      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate('/contacts')}
          title={unreadCount > 0 ? `${unreadCount} unread email${unreadCount === 1 ? '' : 's'}` : 'Notifications'}
          className="text-slate-500 hover:text-slate-700 relative"
        >
          <i className="fa-solid fa-bell" />
          {unreadCount > 0 && (
            <span className="absolute -top-1.5 -right-2 min-w-[16px] h-4 px-1 rounded-full bg-rose-500 text-white text-[10px] font-bold flex items-center justify-center leading-none">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </button>
        <span className="text-sm font-medium text-slate-600 flex items-center gap-1">
          {user?.name ? toTitleCase(user.name) : 'Account'}
          <i className="fa-solid fa-chevron-down text-[10px] text-slate-400" />
        </span>
      </div>
    </header>
  );
}
