import React, { useState, useEffect } from 'react';
import AppSidebar from '../components/AppSidebar';
import TopHeader from '../components/TopHeader';

const SIDEBAR_COLLAPSED_KEY = 'certifymetric_sidebar_collapsed';

export default function AuthenticatedLayout({
  currentUser,
  currentRole,
  activeTab,
  onSelectTab,
  onOpenApplyModal,
  onOpenAddModal,
  onVerifyPublicToken,
  onLogout,
  onGoHome,
  children
}) {
  // Initialize collapsed preference from localStorage
  const [isCollapsed, setIsCollapsed] = useState(() => {
    try {
      const stored = localStorage.getItem(SIDEBAR_COLLAPSED_KEY);
      return stored === 'true';
    } catch {
      return false;
    }
  });

  // Mobile off-canvas drawer state
  const [mobileOpen, setMobileOpen] = useState(false);

  // Sync isCollapsed changes with localStorage
  const handleToggleCollapse = () => {
    setIsCollapsed(prev => {
      const next = !prev;
      try {
        localStorage.setItem(SIDEBAR_COLLAPSED_KEY, String(next));
      } catch (e) {
        console.warn('Unable to persist sidebar state in localStorage:', e);
      }
      return next;
    });
  };

  // Header toggle handler: toggles drawer on mobile, collapse state on desktop
  const handleToggleSidebar = () => {
    if (typeof window !== 'undefined' && window.innerWidth < 768) {
      setMobileOpen(prev => !prev);
    } else {
      handleToggleCollapse();
    }
  };

  // Close mobile drawer on route change or screen resize
  useEffect(() => {
    setMobileOpen(false);
  }, [activeTab]);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768 && mobileOpen) {
        setMobileOpen(false);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [mobileOpen]);

  return (
    <div className="h-screen bg-[#f4f6f9] flex flex-col antialiased text-slate-800 overflow-hidden">
      {/* 1. Integrated Global Top Header */}
      <TopHeader
        currentUser={currentUser}
        currentRole={currentRole}
        activeTab={activeTab}
        onToggleSidebar={handleToggleSidebar}
        isSidebarCollapsed={isCollapsed}
        onGoHome={onGoHome}
        onLogout={onLogout}
      />

      {/* 2. Responsive Application Body: Sidebar + Dynamic Main Content */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Unified Application Sidebar */}
        <AppSidebar
          currentUser={currentUser}
          currentRole={currentRole}
          activeTab={activeTab}
          onSelectTab={onSelectTab}
          onOpenApplyModal={onOpenApplyModal}
          onOpenAddModal={onOpenAddModal}
          onVerifyPublicToken={onVerifyPublicToken}
          isCollapsed={isCollapsed}
          onToggleCollapse={handleToggleCollapse}
          mobileOpen={mobileOpen}
          onCloseMobile={() => setMobileOpen(false)}
          onLogout={onLogout}
        />

        {/* Dynamic, Fluid Main Content Area */}
        <main
          id="main-content"
          className="flex-1 overflow-y-auto min-w-0 p-3 sm:p-5 lg:p-6 bg-[#f4f6f9] transition-all duration-200"
          tabIndex={-1}
        >
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
