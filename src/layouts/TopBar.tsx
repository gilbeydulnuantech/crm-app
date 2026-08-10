import { useAuth } from '../context/AuthContext';
import { toTitleCase } from '../utils/text';

export default function TopBar() {
  const { user } = useAuth();

  return (
    <header className="h-12 border-b border-slate-200 bg-white flex items-center justify-between px-4 shrink-0">
      <span className="font-bold text-slate-800 text-sm tracking-wide">CRM</span>

      <div className="flex items-center gap-4">
        <button className="text-slate-500 hover:text-slate-700 relative">
          <i className="fa-solid fa-bell" />
        </button>
        <span className="text-sm font-medium text-slate-600 flex items-center gap-1">
          {user?.name ? toTitleCase(user.name) : 'Account'}
          <i className="fa-solid fa-chevron-down text-[10px] text-slate-400" />
        </span>
      </div>
    </header>
  );
}
