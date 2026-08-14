import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import TopBar from './TopBar';

export default function AppLayout() {
  const [navOpen, setNavOpen] = useState(true);

  return (
    <div className="h-screen w-screen flex flex-col overflow-hidden">
      <TopBar />
      <div className="flex-1 flex min-h-0">
        <Sidebar collapsed={!navOpen} onToggleCollapsed={() => setNavOpen((v) => !v)} />
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
