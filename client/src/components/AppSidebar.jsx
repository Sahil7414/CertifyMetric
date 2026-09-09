import React from 'react';

/**
 * Navigation item definition schema:
 * - id: unique key
 * - label: display title
 * - icon: Material Symbols Outlined icon name
 * - tab: target activeTab if route-based
 * - matches: array of activeTab names that should highlight this navigation item
 * - onClick: custom click handler (e.g. for modals or utility actions)
 */
export function getNavigationConfig(role, callbacks = {}) {
  const {
    onSelectTab,
    onOpenApplyModal,
    onVerifyPublicToken
  } = callbacks;

  switch (role) {
    case 'TRADER':
      return [
        {
          id: 'dashboard',
          label: 'Dashboard',
          icon: 'speed',
          tab: 'dashboard',
          matches: ['dashboard'],
          onClick: () => onSelectTab && onSelectTab('dashboard')
        },
        {
          id: 'instruments',
          label: 'My Instruments',
          icon: 'scale',
          tab: 'instruments',
          matches: ['instruments', 'instrument-detail'],
          onClick: () => onSelectTab && onSelectTab('instruments')
        },
        {
          id: 'apply-verification',
          label: 'Apply for Verification',
          icon: 'post_add',
          tab: 'apply-verification',
          matches: ['apply-verification', 'vendor-apply-tank'],
          onClick: () => onSelectTab && onSelectTab('apply-verification')
        },
        {
          id: 'applications',
          label: 'My Applications',
          icon: 'receipt_long',
          tab: 'applications',
          matches: ['applications', 'application-timeline', 'applications-rejected'],
          onClick: () => onSelectTab && onSelectTab('applications')
        },
        {
          id: 'certificates',
          label: 'Certificates',
          icon: 'workspace_premium',
          tab: 'certificates',
          matches: ['certificates', 'official-certificate'],
          onClick: () => onSelectTab && onSelectTab('certificates')
        },
        {
          id: 'public-qr-verify',
          label: 'Public QR Verify',
          icon: 'qr_code_scanner',
          tab: 'public-qr-verify',
          matches: [],
          isUtility: true,
          onClick: () => onVerifyPublicToken && onVerifyPublicToken('e1a2b3c4-d5e6-47f8-9a0b-1c2d3e4f5a6b')
        }
      ];

    case 'AUTHORITY':
      return [
        {
          id: 'authority-dashboard',
          label: 'Operations Dashboard',
          icon: 'monitoring',
          tab: 'authority-dashboard',
          matches: ['authority-dashboard'],
          onClick: () => onSelectTab && onSelectTab('authority-dashboard')
        },
        {
          id: 'applications',
          label: 'Applications Queue',
          icon: 'assignment',
          tab: 'applications',
          matches: ['applications', 'application-review', 'assignment-decision', 'application-timeline'],
          onClick: () => onSelectTab && onSelectTab('applications')
        },
        {
          id: 'certificates',
          label: 'Issued Certificates',
          icon: 'workspace_premium',
          tab: 'certificates',
          matches: ['certificates', 'official-certificate'],
          onClick: () => onSelectTab && onSelectTab('certificates')
        },
        {
          id: 'audit-logs',
          label: 'Audit & Governance',
          icon: 'history_edu',
          tab: 'audit-logs',
          matches: ['audit-logs'],
          onClick: () => onSelectTab && onSelectTab('audit-logs')
        }
      ];

    case 'VERIFIER':
      return [
        {
          id: 'verifier-dashboard',
          label: 'Assigned Inspections',
          icon: 'assignment_turned_in',
          tab: 'verifier-dashboard',
          matches: ['verifier-dashboard'],
          onClick: () => onSelectTab && onSelectTab('verifier-dashboard')
        },
        {
          id: 'verification-workspace',
          label: 'Inspection Workspace',
          icon: 'fact_check',
          tab: 'verification-workspace',
          matches: ['verification-workspace'],
          onClick: () => onSelectTab && onSelectTab('verification-workspace')
        },
        {
          id: 'certificates',
          label: 'Completed Cases',
          icon: 'inventory_2',
          tab: 'certificates',
          matches: ['certificates', 'official-certificate'],
          onClick: () => onSelectTab && onSelectTab('certificates')
        },
        {
          id: 'public-qr-verify',
          label: 'Public QR Verify',
          icon: 'qr_code_scanner',
          tab: 'public-qr-verify',
          matches: [],
          isUtility: true,
          onClick: () => onVerifyPublicToken && onVerifyPublicToken('e1a2b3c4-d5e6-47f8-9a0b-1c2d3e4f5a6b')
        }
      ];

    case 'GATC':
      return [
        {
          id: 'gatc-dashboard',
          label: 'GATC Lab Console',
          icon: 'biotech',
          tab: 'gatc-dashboard',
          matches: ['gatc-dashboard'],
          onClick: () => onSelectTab && onSelectTab('gatc-dashboard')
        },
        {
          id: 'verification-workspace',
          label: 'Technical Testing',
          icon: 'science',
          tab: 'verification-workspace',
          matches: ['verification-workspace'],
          onClick: () => onSelectTab && onSelectTab('verification-workspace')
        },
        {
          id: 'certificates',
          label: 'Test Reports Archive',
          icon: 'inventory_2',
          tab: 'certificates',
          matches: ['certificates', 'official-certificate'],
          onClick: () => onSelectTab && onSelectTab('certificates')
        },
        {
          id: 'public-qr-verify',
          label: 'Public QR Verify',
          icon: 'qr_code_scanner',
          tab: 'public-qr-verify',
          matches: [],
          isUtility: true,
          onClick: () => onVerifyPublicToken && onVerifyPublicToken('e1a2b3c4-d5e6-47f8-9a0b-1c2d3e4f5a6b')
        }
      ];

    case 'PLATFORM_ADMIN':
      return [
        {
          id: 'admin-dashboard',
          label: 'Portal Admin Console',
          icon: 'admin_panel_settings',
          tab: 'admin-dashboard',
          matches: ['admin-dashboard'],
          onClick: () => onSelectTab && onSelectTab('admin-dashboard')
        },
        {
          id: 'audit-logs',
          label: 'Audit & Governance Ledger',
          icon: 'history_edu',
          tab: 'audit-logs',
          matches: ['audit-logs'],
          onClick: () => onSelectTab && onSelectTab('audit-logs')
        },
        {
          id: 'public-qr-verify',
          label: 'Public QR Verify',
          icon: 'qr_code_scanner',
          tab: 'public-qr-verify',
          matches: [],
          isUtility: true,
          onClick: () => onVerifyPublicToken && onVerifyPublicToken('e1a2b3c4-d5e6-47f8-9a0b-1c2d3e4f5a6b')
        }
      ];

    default:
      return [
        {
          id: 'dashboard',
          label: 'Dashboard',
          icon: 'dashboard',
          tab: 'dashboard',
          matches: ['dashboard'],
          onClick: () => onSelectTab && onSelectTab('dashboard')
        }
      ];
  }
}

export default function AppSidebar({
  currentUser,
  currentRole,
  activeTab,
  onSelectTab,
  onOpenApplyModal,
  onOpenAddModal,
  onVerifyPublicToken,
  isCollapsed = false,
  onToggleCollapse,
  mobileOpen = false,
  onCloseMobile,
  onLogout
}) {
  const navItems = getNavigationConfig(currentRole, {
    onSelectTab,
    onOpenApplyModal,
    onVerifyPublicToken
  });

  const displayName = currentUser?.full_name || 'Authorized User';
  const roleLabel = currentRole ? currentRole.replace(/_/g, ' ') : 'User';

  const isItemActive = (item) => {
    if (item.matches && item.matches.includes(activeTab)) return true;
    return activeTab === item.tab;
  };

  const handleItemClick = (item) => {
    if (item.onClick) {
      item.onClick();
    }
    if (onCloseMobile) {
      onCloseMobile();
    }
  };

  return (
    <>
      {/* 1. Mobile Backdrop Overlay */}
      {mobileOpen && (
        <div
          onClick={onCloseMobile}
          className="fixed inset-0 z-40 bg-black/60 md:hidden backdrop-blur-xs transition-opacity animate-in fade-in duration-200"
          aria-hidden="true"
        />
      )}

      {/* 2. Main Sidebar Shell */}
      <aside
        className={`
          fixed md:static inset-y-0 left-0 z-40
          bg-[#002046] text-slate-200 flex flex-col shrink-0
          border-r border-[#1b365d]/70
          transition-[width,transform] duration-200 ease-in-out select-none
          shadow-2xl md:shadow-none
          ${mobileOpen ? 'translate-x-0 w-64' : '-translate-x-full md:translate-x-0'}
          ${isCollapsed ? 'md:w-20' : 'md:w-64'}
        `}
        aria-label="CertifyMetric Navigation Sidebar"
      >
        {/* Top Branding Header */}
        <div className={`h-16 px-3.5 border-b border-[#1b365d] bg-[#001733] flex items-center shrink-0 ${isCollapsed ? 'justify-center' : 'justify-between'}`}>
          <div className={`flex items-center gap-3 min-w-0 ${isCollapsed ? 'justify-center' : ''}`}>
            {/* Government Seal Icon Badge */}
            <div
              className="w-10 h-10 rounded-xl bg-[#1b365d]/80 border border-[#38598b]/50 text-amber-400 flex items-center justify-center font-bold shadow-xs shrink-0 cursor-pointer hover:bg-[#1b365d] transition-colors"
              title={isCollapsed ? "Click to Expand Sidebar" : "CertifyMetric — Online Verification System"}
              onClick={() => {
                if (isCollapsed && onToggleCollapse) {
                  onToggleCollapse();
                } else if (onSelectTab) {
                  onSelectTab(currentRole === 'TRADER' ? 'dashboard' : currentRole === 'AUTHORITY' ? 'authority-dashboard' : 'verifier-dashboard');
                }
              }}
            >
              <span className="material-symbols-outlined text-2xl">balance</span>
            </div>

            {/* Brand Title & Subtitle (Hidden when collapsed on desktop) */}
            {(!isCollapsed || mobileOpen) && (
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-extrabold text-base text-white tracking-tight leading-tight">
                    CertifyMetric
                  </span>
                </div>
                <p className="text-[10.5px] text-slate-400 truncate leading-tight mt-0.5 font-medium">
                  Online Verification System
                </p>
              </div>
            )}
          </div>

          {/* Desktop In-Header Collapse Toggle (Cleanly integrated on right) */}
          {onToggleCollapse && !isCollapsed && (
            <button
              type="button"
              onClick={onToggleCollapse}
              className="hidden md:flex p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer shrink-0"
              title="Collapse sidebar"
              aria-label="Collapse sidebar"
            >
              <span className="material-symbols-outlined text-xl">menu_open</span>
            </button>
          )}

          {/* Mobile Close Button */}
          <button
            type="button"
            onClick={onCloseMobile}
            className="md:hidden text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-white/10 transition-colors focus-visible:ring-2 focus-visible:ring-amber-400 focus-visible:outline-hidden"
            title="Close navigation menu"
            aria-label="Close navigation menu"
          >
            <span className="material-symbols-outlined text-2xl">close</span>
          </button>
        </div>

        {/* Navigation Items Section */}
        <nav
          className={`flex-1 py-3 space-y-1 px-2 ${isCollapsed && !mobileOpen ? 'overflow-visible' : 'overflow-y-auto scrollbar-thin'}`}
          aria-label="Main Navigation"
        >
          {navItems.map((item) => {
            const active = isItemActive(item);
            const showCollapsedTooltip = isCollapsed && !mobileOpen;

            return (
              <div key={item.id} className="relative group">
                <button
                  type="button"
                  onClick={() => handleItemClick(item)}
                  aria-current={active ? 'page' : undefined}
                  title={showCollapsedTooltip ? item.label : undefined}
                  aria-label={item.label}
                  className={`
                    w-full flex items-center rounded-lg text-xs font-semibold
                    transition-all duration-150 cursor-pointer select-none
                    focus-visible:ring-2 focus-visible:ring-amber-400 focus-visible:outline-hidden
                    ${isCollapsed && !mobileOpen ? 'justify-center p-3' : 'justify-start px-3.5 py-2.5 gap-3'}
                    ${
                      active
                        ? 'bg-[#1b365d] text-white border-l-4 border-amber-400 shadow-sm'
                        : 'text-slate-300 hover:bg-white/10 hover:text-white border-l-4 border-transparent'
                    }
                  `}
                >
                  <span
                    className={`
                      material-symbols-outlined text-xl shrink-0 transition-colors
                      ${active ? 'text-amber-400' : 'text-slate-400 group-hover:text-amber-300'}
                    `}
                  >
                    {item.icon}
                  </span>

                  {(!isCollapsed || mobileOpen) && (
                    <span className="truncate text-left tracking-wide">
                      {item.label}
                    </span>
                  )}
                </button>

                {/* Floating Tooltip in Collapsed Desktop Mode */}
                {showCollapsedTooltip && (
                  <div
                    role="tooltip"
                    className="
                      opacity-0 pointer-events-none group-hover:opacity-100 group-focus-within:opacity-100
                      transition-opacity duration-150 absolute left-full top-1/2 -translate-y-1/2 ml-2.5 px-3 py-1.5
                      bg-[#001733] text-white text-xs font-semibold rounded-md shadow-xl
                      border border-[#1b365d] whitespace-nowrap z-50
                    "
                  >
                    <div className="absolute right-full top-1/2 -translate-y-1/2 border-4 border-transparent border-r-[#001733]" />
                    {item.label}
                  </div>
                )}
              </div>
            );
          })}
        </nav>

        {/* Sidebar Footer: Compact User Section & Logout */}
        <div className="p-3 border-t border-[#1b365d] bg-[#001733] shrink-0">
          {(!isCollapsed || mobileOpen) ? (
            <div className="space-y-3">
              {/* User Profile Info */}
              <div className="flex items-center gap-3 px-1">
                <div className="w-9 h-9 rounded-full bg-amber-400/20 border border-amber-400/30 text-amber-300 flex items-center justify-center font-bold text-sm shrink-0 shadow-2xs">
                  {displayName ? displayName.charAt(0).toUpperCase() : 'U'}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold text-white truncate leading-tight">
                    {displayName}
                  </p>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0"></span>
                    <span className="text-[10px] font-bold text-slate-300 uppercase tracking-wider truncate">
                      {roleLabel}
                    </span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-1 flex items-center justify-between border-t border-[#1b365d]/60 text-[11px]">
                <span className="text-[10px] text-slate-400 font-mono">
                  SIH 26036
                </span>
                {onLogout && (
                  <button
                    type="button"
                    onClick={onLogout}
                    className="px-2.5 py-1 text-rose-300 hover:text-white hover:bg-rose-500/20 rounded transition-colors flex items-center gap-1.5 font-semibold cursor-pointer focus-visible:ring-2 focus-visible:ring-rose-400 focus-visible:outline-hidden"
                    title="Sign Out of CertifyMetric"
                    aria-label="Sign Out"
                  >
                    <span className="material-symbols-outlined text-sm">logout</span>
                    <span>Sign Out</span>
                  </button>
                )}
              </div>
            </div>
          ) : (
            /* Collapsed Footer View */
            <div className="flex flex-col items-center gap-2">
              <div
                className="relative group cursor-pointer"
                title={`${displayName} (${roleLabel})`}
              >
                <div className="w-9 h-9 rounded-full bg-amber-400/20 border border-amber-400/30 text-amber-300 flex items-center justify-center font-bold text-sm shadow-2xs">
                  {displayName ? displayName.charAt(0).toUpperCase() : 'U'}
                </div>
                {/* Floating tooltip */}
                <div
                  role="tooltip"
                  className="
                    opacity-0 pointer-events-none group-hover:opacity-100 group-focus-within:opacity-100
                    transition-opacity duration-150 absolute left-full top-1/2 -translate-y-1/2 ml-2.5 px-3 py-1.5
                    bg-[#001733] text-white text-xs font-medium rounded-md shadow-xl
                    border border-[#1b365d] whitespace-nowrap z-50
                  "
                >
                  <div className="absolute right-full top-1/2 -translate-y-1/2 border-4 border-transparent border-r-[#001733]" />
                  <p className="font-bold">{displayName}</p>
                  <p className="text-[10px] text-slate-300 uppercase">{roleLabel}</p>
                </div>
              </div>

              {onLogout && (
                <div className="relative group">
                  <button
                    type="button"
                    onClick={onLogout}
                    className="w-9 h-9 rounded-lg text-rose-300 hover:text-white hover:bg-rose-500/20 flex items-center justify-center transition-colors cursor-pointer focus-visible:ring-2 focus-visible:ring-rose-400 focus-visible:outline-hidden"
                    title="Sign Out"
                    aria-label="Sign Out"
                  >
                    <span className="material-symbols-outlined text-lg">logout</span>
                  </button>
                  <div
                    role="tooltip"
                    className="
                      opacity-0 pointer-events-none group-hover:opacity-100 group-focus-within:opacity-100
                      transition-opacity duration-150 absolute left-full top-1/2 -translate-y-1/2 ml-2.5 px-3 py-1.5
                      bg-[#001733] text-rose-300 text-xs font-semibold rounded-md shadow-xl
                      border border-[#1b365d] whitespace-nowrap z-50
                    "
                  >
                    <div className="absolute right-full top-1/2 -translate-y-1/2 border-4 border-transparent border-r-[#001733]" />
                    Sign Out
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </aside>
    </>
  );
}
