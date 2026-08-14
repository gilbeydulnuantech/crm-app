import { ReactNode, useEffect } from 'react';
import { useAuth } from './AuthContext';

const VAR_MAP: Record<'theme_header_color' | 'theme_main_color' | 'theme_accent_color', string> = {
  theme_header_color: '--theme-header',
  theme_main_color: '--theme-main',
  theme_accent_color: '--theme-accent',
};

// Applies the signed-in user's saved theme colors (Settings → Theme) as CSS
// custom properties on <html>, falling back to the defaults declared in
// index.css for any color the user hasn't set. Runs as its own provider
// (nested inside AuthProvider) purely so it re-runs whenever `user` changes
// — login, logout, and a theme save all naturally flow through the same
// effect without every consumer needing to know about it.
export default function ThemeProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();

  useEffect(() => {
    const root = document.documentElement;
    (Object.keys(VAR_MAP) as (keyof typeof VAR_MAP)[]).forEach((field) => {
      const cssVar = VAR_MAP[field];
      const value = user?.[field];
      if (value) {
        root.style.setProperty(cssVar, value);
      } else {
        root.style.removeProperty(cssVar);
      }
    });
  }, [user]);

  return <>{children}</>;
}
