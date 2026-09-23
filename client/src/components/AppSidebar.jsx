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
    onSelectTab
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
          label: 'Assigned Work',
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
        }
      ];

    case 'GATC':
      return [
        {
          id: 'gatc-dashboard',
          label: 'Lab Requests',
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
        }
      ];

    case 'PLATFORM_ADMIN':
      return [
        {
          id: 'admin-dashboard',
          label: 'Platform Dashboard',
          icon: 'dashboard',
          tab: 'admin-dashboard',
          matches: ['admin-dashboard'],
          onClick: () => onSelectTab && onSelectTab('admin-dashboard')
        },
        {
          id: 'admin-users',
          label: 'Users & Roles',
          icon: 'group',
          tab: 'admin-users',
          matches: ['admin-users'],
          onClick: () => onSelectTab && onSelectTab('admin-users')
        },
        {
          id: 'admin-orgs',
          label: 'Offices & Labs',
          icon: 'apartment',
          tab: 'admin-orgs',
          matches: ['admin-orgs'],
          onClick: () => onSelectTab && onSelectTab('admin-orgs')
        },
        {
          id: 'admin-master',
          label: 'Categories & Rulesets',
          icon: 'tune',
          tab: 'admin-master',
          matches: ['admin-master'],
          onClick: () => onSelectTab && onSelectTab('admin-master')
        },
        {
          id: 'audit-logs',
          label: 'Audit & Governance',
          icon: 'history_edu',
          tab: 'audit-logs',
          matches: ['audit-logs'],
          onClick: () => onSelectTab && onSelectTab('audit-logs')
        },
        {
          id: 'system-health',
          label: 'System Health',
          icon: 'health_and_safety',
          tab: 'system-health',
          matches: ['system-health'],
          onClick: () => onSelectTab && onSelectTab('system-health')
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

  return (
    <>
      {/* Mobile Off-Canvas Backdrop */}
      {mobileOpen && (
        <div
          className="md:hidden fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-40"
          onClick={onCloseMobile}
        />
      )}

      <aside
        className={`bg-[#001733] text-white flex flex-col justify-between shrink-0 transition-all duration-300 z-30 shadow-md ${
          isCollapsed ? 'w-16' : 'w-64'
        } ${
          mobileOpen
            ? 'fixed inset-y-0 left-0 z-50 w-64 translate-x-0'
            : 'hidden md:flex'
        }`}
      >
        <div>
          {/* Sidebar Header / Role Badge */}
          <div className="p-4 border-b border-white/10 flex items-center justify-between">
            {(!isCollapsed || mobileOpen) && (
              <div className="min-w-0">
                <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 block truncate">
                  Authenticated Portal
                </span>
                <span className="text-sm font-extrabold text-white tracking-tight truncate block">
                  {currentRole === 'TRADER'
                    ? 'Trader Portal'
                    : currentRole === 'AUTHORITY'
                    ? 'Statutory Authority'
                    : currentRole === 'VERIFIER'
                    ? 'Field Verifier'
                    : currentRole === 'GATC'
                    ? 'GATC Testing Center'
                    : 'Platform Admin'}
                </span>
              </div>
            )}
            {onToggleCollapse && (
              <button
                onClick={onToggleCollapse}
                className="hidden md:block p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 transition-colors ml-auto cursor-pointer"
                title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              >
                <span className="material-symbols-outlined text-lg">
                  {isCollapsed ? 'chevron_right' : 'chevron_left'}
                </span>
              </button>
            )}
            {onCloseMobile && (
              <button
                onClick={onCloseMobile}
                className="md:hidden p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 transition-colors ml-auto cursor-pointer"
                title="Close menu"
              >
                <span className="material-symbols-outlined text-lg">close</span>
              </button>
            )}
          </div>

          {/* Navigation Items List */}
          <nav className="px-2 py-3 space-y-1">
            {navItems.map((item) => {
              const isActive =
                activeTab === item.tab ||
                (item.matches && item.matches.includes(activeTab));

              return (
                <button
                  key={item.id}
                  onClick={() => {
                    if (item.onClick) item.onClick();
                    if (onCloseMobile) onCloseMobile();
                  }}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold transition-all text-left cursor-pointer ${
                    isActive
                      ? 'bg-white/15 text-white shadow-inner border border-white/20'
                      : 'text-slate-300 hover:text-white hover:bg-white/10'
                  } ${isCollapsed && !mobileOpen ? 'justify-center px-0' : ''}`}
                  title={isCollapsed && !mobileOpen ? item.label : undefined}
                >
                  <span
                    className={`material-symbols-outlined text-lg shrink-0 ${
                      isActive ? 'text-amber-400' : 'text-slate-400'
                    }`}
                  >
                    {item.icon}
                  </span>
                  {(!isCollapsed || mobileOpen) && (
                    <span className="truncate flex-1">{item.label}</span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* User Info & Logout Footer */}
        <div className="p-3 border-t border-white/10 bg-[#001026] space-y-2">
          <div className={`flex items-center gap-2.5 ${isCollapsed && !mobileOpen ? 'justify-center' : ''}`}>
            <div className="w-8 h-8 rounded-full bg-slate-700 text-white flex items-center justify-center font-bold text-xs shrink-0 border border-slate-500">
              {currentUser?.full_name?.charAt(0) || currentUser?.email?.charAt(0) || 'U'}
            </div>
            {(!isCollapsed || mobileOpen) && (
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold text-white truncate">{currentUser?.full_name || 'User Account'}</p>
                <p className="text-[10px] text-slate-400 truncate">{currentUser?.email || currentUser?.role}</p>
              </div>
            )}
          </div>

          {onLogout && (
            <button
              type="button"
              onClick={() => {
                if (onLogout) onLogout();
                if (onCloseMobile) onCloseMobile();
              }}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold text-rose-300 hover:text-white hover:bg-rose-600/30 border border-rose-500/20 transition-all cursor-pointer ${
                isCollapsed && !mobileOpen ? 'justify-center px-0' : ''
              }`}
              title="Sign Out / Logout"
            >
              <span className="material-symbols-outlined text-lg shrink-0 text-rose-400">logout</span>
              {(!isCollapsed || mobileOpen) && <span>Logout</span>}
            </button>
          )}
        </div>
      </aside>
    </>
  );
}
