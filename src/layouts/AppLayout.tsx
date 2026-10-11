import { useState } from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Sidebar from './Sidebar';
import TopBar from './TopBar';
import { useCompanyProfile } from '../hooks/useCompanyProfile';
import { installTimeFormatPatch, setTimeFormat } from '../utils/timeFormat';

installTimeFormatPatch();

// Only the ticket/payment builders still go full-bleed. Every document editor
// (Proposal/Contract/Page/Email/Invoice/Receipt) and the automation builder
// keep the collapsible sidebar like the rest of the app.
const NO_SIDEBAR_PATTERN = /^\/tickets\/\d+$|^\/payments\/\d+$/;

export default function AppLayout() {
  const [navOpen, setNavOpen] = useState(true);
  const [bannerDismissed, setBannerDismissed] = useState(false);
  const { isAdmin } = useAuth();
  const location = useLocation();
  const hideSidebar = NO_SIDEBAR_PATTERN.test(location.pathname);

  // The clock preference lives on the company profile. It is set while rendering (before the page below
  // renders), and the page is re-keyed when it changes so every time on screen is redrawn in the new format.
  const { data: profile } = useCompanyProfile();
  const timeFormat = profile?.time_format === '24h' ? '24h' : '12h';
  setTimeFormat(profile ? timeFormat : null);

  return (
    <div className="h-screen w-screen flex flex-col overflow-hidden">
      <TopBar sidebarCollapsed={hideSidebar || !navOpen} />
      <div className="flex-1 flex min-h-0">
        {!hideSidebar && <Sidebar collapsed={!navOpen} onToggleCollapsed={() => setNavOpen((v) => !v)} />}
        <main
          className="flex-1 flex flex-col min-w-0 overflow-hidden"
          style={{ backgroundColor: 'var(--theme-main)' }}
        >
          {isAdmin && profile && !profile.industry && !bannerDismissed && location.pathname !== '/settings' && (
            <div className="shrink-0 flex items-center gap-3 px-4 py-2 bg-amber-50 border-b border-amber-200 text-sm text-amber-900">
              <i className="fa-solid fa-sliders" />
              <span className="flex-1">
                Finish setting up: choose your industry to get starter event types, staff and online booking.
              </span>
              <Link to="/settings" className="font-semibold underline">
                Open Settings
              </Link>
              <button type="button" onClick={() => setBannerDismissed(true)} className="text-amber-700 hover:text-amber-900" aria-label="Dismiss">
                <i className="fa-solid fa-xmark" />
              </button>
            </div>
          )}
          <Outlet key={timeFormat} />
        </main>
      </div>
    </div>
  );
}
