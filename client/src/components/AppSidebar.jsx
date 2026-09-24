import React from 'react';
import { useTranslation } from 'react-i18next';

const NAV_ITEM_TRANSLATION_KEYS = {
  'dashboard': 'nav.dashboard',
  'instruments': 'nav.myInstruments',
  'apply-verification': 'nav.applyVerification',
  'applications': 'nav.myApplications',
  'certificates': 'nav.certificates',
  'public-qr-verify': 'nav.publicQrVerify',
  'authority-dashboard': 'nav.operationsDashboard',
  'audit-logs': 'nav.auditLogs',
  'verifier-dashboard': 'nav.verifierDashboard',
  'verification-workspace': 'nav.verificationWorkspace',
  'gatc-dashboard': 'nav.gatcDashboard',
  'admin-dashboard': 'nav.adminDashboard'
};

/**
 * Navigation item definition schema:
 * - id: unique key
 * - label: display title
 * - icon: Material Symbols Outlined icon name
 * - tab: target activeTab if route-based
 * - matches: array of activeTab names that should highlight this navigation item
 * - onClick: custom click handler (e.g. for modals or utility actions)
 */
function getNavigationConfig(role, callbacks = {}) {
  const {
    onSelectTab
  } = callbacks;

  switch (role) {
    case 'TRADER':
      return [
        {
          id: 'dashboard',
          label: 'Dashboard',
          translationKey: 'nav.dashboard',
          icon: 'speed',
          tab: 'dashboard',
          matches: ['dashboard'],
          onClick: () => onSelectTab && onSelectTab('dashboard')
        },
        {
          id: 'instruments',
          label: 'My Instruments',
          translationKey: 'nav.myInstruments',
          icon: 'scale',
          tab: 'instruments',
          matches: ['instruments', 'instrument-detail'],
          onClick: () => onSelectTab && onSelectTab('instruments')
        },
        {
          id: 'apply-verification',
          label: 'Apply for Verification',
          translationKey: 'nav.applyVerification',
          icon: 'post_add',
          tab: 'apply-verification',
          matches: ['apply-verification', 'vendor-apply-tank'],
          onClick: () => onSelectTab && onSelectTab('apply-verification')
        },
        {
          id: 'applications',
          label: 'My Applications',
          translationKey: 'nav.myApplications',
          icon: 'receipt_long',
          tab: 'applications',
          matches: ['applications', 'application-timeline', 'applications-rejected'],
          onClick: () => onSelectTab && onSelectTab('applications')
        },
        {
          id: 'certificates',
          label: 'Certificates',
          translationKey: 'nav.certificates',
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
          translationKey: 'nav.operationsDashboard',
          icon: 'monitoring',
          tab: 'authority-dashboard',
          matches: ['authority-dashboard'],
          onClick: () => onSelectTab && onSelectTab('authority-dashboard')
        },
        {
          id: 'applications',
          label: 'Applications Queue',
          translationKey: 'nav.applicationsQueue',
          icon: 'assignment',
          tab: 'applications',
          matches: ['applications', 'application-review', 'assignment-decision', 'application-timeline'],
          onClick: () => onSelectTab && onSelectTab('applications')
        },
        {
          id: 'certificates',
          label: 'Issued Certificates',
          translationKey: 'nav.issuedCertificates',
          icon: 'workspace_premium',
          tab: 'certificates',
          matches: ['certificates', 'official-certificate'],
          onClick: () => onSelectTab && onSelectTab('certificates')
        },
        {
          id: 'audit-logs',
          label: 'Audit & Governance',
          translationKey: 'nav.auditLogs',
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
          translationKey: 'nav.verifierDashboard',
          icon: 'assignment_turned_in',
          tab: 'verifier-dashboard',
          matches: ['verifier-dashboard'],
          onClick: () => onSelectTab && onSelectTab('verifier-dashboard')
        },
        {
          id: 'verification-workspace',
          label: 'Inspection Workspace',
          translationKey: 'nav.verificationWorkspace',
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
          translationKey: 'nav.gatcDashboard',
          icon: 'biotech',
          tab: 'gatc-dashboard',
          matches: ['gatc-dashboard'],
          onClick: () => onSelectTab && onSelectTab('gatc-dashboard')
        },
        {
          id: 'verification-workspace',
          label: 'Technical Testing',
          translationKey: 'nav.verificationWorkspace',
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
          translationKey: 'nav.adminDashboard',
          icon: 'dashboard',
          tab: 'admin-dashboard',
          matches: ['admin-dashboard'],
          onClick: () => onSelectTab && onSelectTab('admin-dashboard')
        },
        {
          id: 'admin-users',
          label: 'Users & Roles',
          translationKey: 'admin.usersRoles',
          icon: 'group',
          tab: 'admin-users',
          matches: ['admin-users'],
          onClick: () => onSelectTab && onSelectTab('admin-users')
        },
        {
          id: 'admin-orgs',
          label: 'Offices & Labs',
          translationKey: 'admin.officesLabs',
          icon: 'apartment',
          tab: 'admin-orgs',
          matches: ['admin-orgs'],
          onClick: () => onSelectTab && onSelectTab('admin-orgs')
        },
        {
          id: 'admin-master',
          label: 'Categories & Rulesets',
          translationKey: 'admin.categoriesRules',
          icon: 'tune',
          tab: 'admin-master',
          matches: ['admin-master'],
          onClick: () => onSelectTab && onSelectTab('admin-master')
        },
        {
          id: 'audit-logs',
          label: 'Audit & Governance',
          translationKey: 'nav.auditLogs',
          icon: 'history_edu',
          tab: 'audit-logs',
          matches: ['audit-logs'],
          onClick: () => onSelectTab && onSelectTab('audit-logs')
        },
        {
          id: 'system-health',
          label: 'System Health',
          translationKey: 'admin.systemHealth',
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
          translationKey: 'nav.dashboard',
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
  isCollapsed = false,
  onToggleCollapse,
  mobileOpen = false,
  onCloseMobile,
  onLogout
}) {
  const { t } = useTranslation();
  const navItems = getNavigationConfig(currentRole, {
    onSelectTab,
    onOpenApplyModal
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
                  {t('nav.authenticatedPortal', 'Authenticated Portal')}
                </span>
                <span className="text-sm font-extrabold text-white tracking-tight truncate block">
                  {currentRole === 'TRADER'
                    ? t('landing.traderPortal', 'Trader Portal')
                    : currentRole === 'AUTHORITY'
                    ? t('auth.authorityRole', 'Statutory Authority')
                    : currentRole === 'VERIFIER'
                    ? t('auth.verifierRole', 'Field Verifier')
                    : currentRole === 'GATC'
                    ? t('nav.gatc', 'GATC Testing Center')
                    : t('auth.adminRole', 'Platform Admin')}
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
                    <span className="truncate flex-1">
                      {t(item.translationKey || NAV_ITEM_TRANSLATION_KEYS[item.id] || `nav.${item.id}`, item.label)}
                    </span>
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
              {(!isCollapsed || mobileOpen) && <span>{t('nav.signOut', 'Logout')}</span>}
            </button>
          )}
        </div>
      </aside>
    </>
  );
}
