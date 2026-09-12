import React, { useState } from 'react';

export default function TopHeader({
  currentUser,
  currentRole,
  activeTab,
  onToggleSidebar,
  isSidebarCollapsed = false,
  onGoHome,
  onLogout
}) {
  const [showUserDropdown, setShowUserDropdown] = useState(false);

  // Format breadcrumb title
  const getBreadcrumbTitle = () => {
    switch (activeTab) {
      case 'dashboard':
        return '';
      case 'apply-verification':
        return ' / Statutory Filing / Apply for Verification';
      case 'admin-dashboard':
        return ' / Portal Administration & Governance';
      case 'gatc-dashboard':
        return ' / Laboratory Metrology Console';
      case 'vendor-apply-tank':
        return ' / Verification / Vehicle Tank Calibration';
      case 'instruments':
        return ' / List of Weights & Measures';
      case 'instrument-detail':
        return ' / Instrument Particulars';
      case 'applications':
        return ' / Verification Applications Registry';
      case 'applications-rejected':
        return ' / Resubmit Rejected Weighing Instruments';
      case 'application-timeline':
        return ' / Application Lifecycle & Verification Status';
      case 'certificates':
        return ' / Statutory Compliance Certificates';
      case 'official-certificate':
        return ' / Official Certificate of Verification';
      case 'authority-dashboard':
        return ' / Authority Operations & Assignment Queue';
      case 'application-review':
        return ' / Statutory Schedule Assessment';
      case 'assignment-decision':
        return ' / Verifier Allocation Engine';
      case 'verifier-dashboard':
        return ' / Assigned Inspection Cases';
      case 'verification-workspace':
        return ' / Calibration & Testing Workspace';
      case 'audit-logs':
        return ' / Governance Audit Trail & Immutable Ledger';
      default:
        return '';
    }
  };

  const displayName = currentUser?.full_name || 'Sahil Jadhav';

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-30 select-none shadow-2xs">
      {/* 1. Legal Metrology Statutory Context Stripe (Project Signature Bar) */}
      <div className="bg-[#001733] text-slate-300 px-4 py-1 flex items-center justify-between text-[11px] border-b border-[#1b365d]/60">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-[14px] text-amber-400">balance</span>
          <span className="font-semibold text-white tracking-wide">Legal Metrology Verification Framework</span>
          <span className="hidden md:inline text-slate-500">|</span>
          <span className="hidden md:inline text-slate-400">Standards under Legal Metrology Act, 2009 & General Rules, 2011</span>
        </div>
        <div className="flex items-center gap-3 text-[10px] text-slate-400 font-mono">
          <span>LMOMS • CertifyMetric</span>
        </div>
      </div>

      {/* 2. Main Action Header Bar */}
      <div className="h-14 px-4 flex items-center justify-between">
        {/* Left side: Hamburger Toggle & Breadcrumbs */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onToggleSidebar}
            className="p-2 rounded-lg text-slate-700 hover:bg-slate-100 hover:text-[#002046] transition-colors cursor-pointer focus-visible:ring-2 focus-visible:ring-amber-400 focus-visible:outline-hidden"
            title={isSidebarCollapsed ? "Expand Navigation Menu" : "Collapse Navigation Menu"}
            aria-label={isSidebarCollapsed ? "Expand Navigation Menu" : "Collapse Navigation Menu"}
            aria-expanded={!isSidebarCollapsed}
          >
            <span className="material-symbols-outlined text-2xl">menu</span>
          </button>

          <nav className="flex items-center text-xs sm:text-sm font-medium">
            <button
              onClick={onGoHome}
              className="text-[#002046] hover:text-blue-700 hover:underline flex items-center gap-1.5 font-bold transition-colors"
            >
              <span className="material-symbols-outlined text-base text-amber-500">home</span>
              <span>Home</span>
            </button>
            {getBreadcrumbTitle() && (
              <span className="text-slate-500 font-normal truncate max-w-xs sm:max-w-md hidden sm:inline">
                {getBreadcrumbTitle()}
              </span>
            )}
          </nav>
        </div>

        {/* Right side: Welcome User Badge (Matching CertifyMetric Theme) */}
        <div className="flex items-center gap-3 relative">
          <div
            onClick={() => setShowUserDropdown(!showUserDropdown)}
            className="flex items-center gap-2.5 cursor-pointer group py-1.5 px-3 rounded-xl hover:bg-slate-50 border border-slate-200/80 transition-all shadow-2xs"
            title="User Account Options"
          >
            {/* Navy circular badge with amber accent */}
            <div className="w-8 h-8 rounded-full bg-[#002046] flex items-center justify-center text-amber-300 shadow-xs shrink-0">
              <span className="material-symbols-outlined text-lg">person</span>
            </div>

            {/* Welcome Text in Primary Navy with Role Pill */}
            <div className="text-left hidden sm:block">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold text-[#002046] tracking-tight">
                  Welcome, {displayName}
                </span>
                <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                  {currentRole || 'TRADER'}
                </span>
              </div>
              <p className="text-[10px] text-slate-500 font-medium leading-none mt-0.5">
                {currentUser?.email || 'Authenticated User'}
              </p>
            </div>

            <span className="material-symbols-outlined text-sm text-slate-400 group-hover:text-slate-700 transition-colors">
              expand_more
            </span>
          </div>

          {/* User Account Dropdown Menu */}
          {showUserDropdown && (
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={() => setShowUserDropdown(false)}
              />
              <div className="absolute right-0 top-12 w-64 bg-white rounded-xl shadow-xl border border-slate-200 py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                <div className="px-4 py-2.5 border-b border-slate-100 bg-slate-50/50">
                  <p className="text-xs font-bold text-[#002046] truncate">{displayName}</p>
                  <p className="text-[11px] text-slate-500 truncate mt-0.5">{currentUser?.email || 'user@certifymetric.gov.in'}</p>
                  <div className="mt-2 inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-[#002046] text-white">
                    {currentRole || 'TRADER'}
                  </div>
                </div>

                <div className="py-1 text-xs text-slate-700">
                  <button
                    onClick={() => {
                      setShowUserDropdown(false);
                      onGoHome();
                    }}
                    className="w-full px-4 py-2 text-left hover:bg-slate-50 flex items-center gap-2"
                  >
                    <span className="material-symbols-outlined text-base text-amber-500">dashboard</span>
                    <span>Portal Dashboard</span>
                  </button>
                </div>

                <div className="border-t border-slate-100 pt-1">
                  <button
                    onClick={() => {
                      setShowUserDropdown(false);
                      if (onLogout) onLogout();
                    }}
                    className="w-full px-4 py-2 text-left text-rose-600 hover:bg-rose-50 flex items-center gap-2 text-xs font-medium"
                  >
                    <span className="material-symbols-outlined text-base text-rose-500">logout</span>
                    <span>Sign Out</span>
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
