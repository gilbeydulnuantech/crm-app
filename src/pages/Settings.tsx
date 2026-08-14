import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import ThemeModal from '../components/settings/ThemeModal';

export default function Settings() {
  const { user } = useAuth();
  const [themeOpen, setThemeOpen] = useState(false);

  return (
    <div className="flex-1 overflow-y-auto p-6">
      <h1 className="text-lg font-bold text-slate-800 mb-1">Settings</h1>
      <p className="text-xs text-slate-500 mb-6">Signed in as {user?.name}</p>

      <div className="max-w-xl bg-white border border-slate-200 rounded-xl p-5">
        <div className="flex items-center justify-between">
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
      </div>

      <ThemeModal open={themeOpen} onClose={() => setThemeOpen(false)} />
    </div>
  );
}
