import React, { useEffect, useState } from 'react';
import Navbar from './Navbar';
import Sidebar from './Sidebar';
import CommandPalette from '../common/CommandPalette';

const DashboardLayout = ({ title, subtitle, action, children }) => {
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setCommandPaletteOpen((prev) => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      <Navbar
        mobileMenuOpen={mobileSidebarOpen}
        onOpenMobileMenu={() => setMobileSidebarOpen(true)}
        onOpenCommandPalette={() => setCommandPaletteOpen(true)}
      />
      <div className="flex flex-1">
        <Sidebar
          mobileOpen={mobileSidebarOpen}
          onClose={() => setMobileSidebarOpen(false)}
        />
        <main className="mx-auto w-full max-w-7xl flex-1 overflow-x-hidden p-4 sm:p-6 lg:p-8">
          {(title || subtitle || action) && (
            <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
              <div>
                {title && (
                  <h1 className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">
                    {title}
                  </h1>
                )}
                {subtitle && (
                  <p className="mt-1 text-xs font-medium text-slate-600 sm:text-sm">
                    {subtitle}
                  </p>
                )}
              </div>
              {action && <div className="shrink-0">{action}</div>}
            </div>
          )}
          {children}
        </main>
      </div>
      <CommandPalette
        isOpen={commandPaletteOpen}
        onClose={() => setCommandPaletteOpen(false)}
      />
    </div>
  );
};

export default DashboardLayout;
