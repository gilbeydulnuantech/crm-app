import { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useUpdateUserTheme } from '../../hooks/useContacts';

const DEFAULTS = {
  header_color: '#ffffff',
  main_color: '#ffffff',
  accent_color: '#4f46e5',
};

interface Props {
  open: boolean;
  onClose: () => void;
}

interface ColorFieldProps {
  label: string;
  description: string;
  value: string;
  onChange: (value: string) => void;
}

function ColorField({ label, description, value, onChange }: ColorFieldProps) {
  return (
    <div className="flex items-center justify-between gap-4 py-3">
      <div>
        <p className="text-sm font-medium text-slate-700">{label}</p>
        <p className="text-xs text-slate-400 mt-0.5">{description}</p>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-9 h-9 rounded-lg border border-slate-200 cursor-pointer p-0.5 bg-white"
        />
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-24 px-2 py-1.5 text-xs font-mono border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--theme-accent)] uppercase"
        />
      </div>
    </div>
  );
}

export default function ThemeModal({ open, onClose }: Props) {
  const { user, updateLocalUser } = useAuth();
  const updateTheme = useUpdateUserTheme();
  const [error, setError] = useState<string | null>(null);

  const [headerColor, setHeaderColor] = useState(user?.theme_header_color || DEFAULTS.header_color);
  const [mainColor, setMainColor] = useState(user?.theme_main_color || DEFAULTS.main_color);
  const [accentColor, setAccentColor] = useState(user?.theme_accent_color || DEFAULTS.accent_color);

  // Re-sync to whatever's actually saved every time the modal opens, so a
  // cancel-without-saving doesn't leave stale edits sitting in state for
  // next time.
  useEffect(() => {
    if (!open) return;
    setHeaderColor(user?.theme_header_color || DEFAULTS.header_color);
    setMainColor(user?.theme_main_color || DEFAULTS.main_color);
    setAccentColor(user?.theme_accent_color || DEFAULTS.accent_color);
    setError(null);
  }, [open, user]);

  if (!open) return null;

  const isHex = (v: string) => /^#[0-9A-Fa-f]{6}$/.test(v);
  const canSave = isHex(headerColor) && isHex(mainColor) && isHex(accentColor);

  function handleSave() {
    if (!user || !canSave) return;
    setError(null);
    updateTheme.mutate(
      {
        userId: user.id,
        theme: { header_color: headerColor, main_color: mainColor, accent_color: accentColor },
      },
      {
        onSuccess: () => {
          updateLocalUser({
            theme_header_color: headerColor,
            theme_main_color: mainColor,
            theme_accent_color: accentColor,
          });
          onClose();
        },
        onError: (err) => setError(err instanceof Error ? err.message : 'Failed to save theme.'),
      }
    );
  }

  function handleReset() {
    setHeaderColor(DEFAULTS.header_color);
    setMainColor(DEFAULTS.main_color);
    setAccentColor(DEFAULTS.accent_color);
  }

  return (
    <div
      className="fixed inset-0 bg-slate-900/70 z-[100] flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-1">
          <h3 className="text-lg font-bold text-slate-800">Color Theme</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <i className="fa-solid fa-xmark" />
          </button>
        </div>
        <p className="text-xs text-slate-500 mb-3">
          Personalize how the CRM looks for your account only — nobody else sees your colors.
        </p>

        <div className="divide-y divide-slate-100">
          <ColorField
            label="Header &amp; Sidebar"
            description="The top bar and left navigation panel."
            value={headerColor}
            onChange={setHeaderColor}
          />
          <ColorField
            label="Main Window"
            description="The center content area behind every page."
            value={mainColor}
            onChange={setMainColor}
          />
          <ColorField
            label="Accent"
            description="Buttons, links, and the active navigation item."
            value={accentColor}
            onChange={setAccentColor}
          />
        </div>

        {!canSave && (
          <p className="text-[11px] text-rose-600 mt-2">Each color must be a hex code like #4F46E5.</p>
        )}
        {error && (
          <div className="p-2.5 text-xs rounded-lg text-center bg-rose-50 text-rose-700 border border-rose-200 mt-3">
            {error}
          </div>
        )}

        <div className="flex justify-end gap-2 pt-4">
          <button
            type="button"
            onClick={handleReset}
            className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 rounded-lg"
          >
            Reset to Default
          </button>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 rounded-lg"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={!canSave || updateTheme.isPending}
            onClick={handleSave}
            className="px-4 py-2 text-sm font-semibold bg-[var(--theme-accent)] hover:bg-[var(--theme-accent-hover)] disabled:opacity-60 text-white rounded-lg"
          >
            {updateTheme.isPending ? 'Saving...' : 'Save Theme'}
          </button>
        </div>
      </div>
    </div>
  );
}
