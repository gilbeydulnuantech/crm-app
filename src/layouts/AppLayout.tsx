import { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import TopBar from './TopBar';

// The full-page proposal/contract/page document editors — and the
// automation builder — want maximum width, same idea as GHL's builder
// going full-screen — hide the nav only there, not on the Documents/
// Automations list pages, which keep the main nav like the rest of the app.
const NO_SIDEBAR_PATTERN = /^\/documents\/(proposals|contracts|pages)\/(new|\d+\/edit)$|^\/automations\/(new|\d+\/edit)$/;

export default function AppLayout() {
  const [navOpen, setNavOpen] = useState(true);
  const location = useLocation();
  const hideSidebar = NO_SIDEBAR_PATTERN.test(location.pathname);

  return (
    <div className="h-screen w-screen flex flex-col overflow-hidden">
      <TopBar />
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
