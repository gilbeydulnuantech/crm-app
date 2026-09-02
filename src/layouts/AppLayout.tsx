import { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import TopBar from './TopBar';

// The full-page document editors want maximum width, same idea as GHL's
// builder going full-screen — hide the nav only there, not on the
// Documents/Automations list pages, which keep the main nav like the rest
// of the app. Proposal/Contract/Email/Invoice/Receipt template editors keep
// the collapsible sidebar (same as every other page) — only the Pages
// editor and the automation/ticket/payment builders still go full-bleed.
const NO_SIDEBAR_PATTERN =
  /^\/documents\/pages\/(new|\d+\/edit)$|^\/automations\/(new|\d+\/edit)$|^\/tickets\/\d+$|^\/payments\/\d+$|^\/payments\/invoices\/(new|\d+)$/;

export default function AppLayout() {
  const [navOpen, setNavOpen] = useState(true);
  const location = useLocation();
  const hideSidebar = NO_SIDEBAR_PATTERN.test(location.pathname);

  return (
    <div className="h-screen w-screen flex flex-col overflow-hidden">
      <TopBar sidebarCollapsed={hideSidebar || !navOpen} />
      <div className="flex-1 flex min-h-0">
        {!hideSidebar && <Sidebar collapsed={!navOpen} onToggleCollapsed={() => setNavOpen((v) => !v)} />}
        <main
          className="flex-1 flex flex-col min-w-0 overflow-hidden"
          style={{ backgroundColor: 'var(--theme-main)' }}
        >
          <Outlet />
        </main>
      </div>
    </div>
  );
}
