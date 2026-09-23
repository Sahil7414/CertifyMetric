import React, { useState, useEffect, useRef } from 'react';
import { api } from '../api';

export default function TopHeader({
  currentUser,
  currentRole,
  activeTab,
  onToggleSidebar,
  isSidebarCollapsed = false,
  onGoHome,
  onLogout,
  onNavigateToApplication
}) {
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loadingNotifs, setLoadingNotifs] = useState(false);
  const [errorNotifs, setErrorNotifs] = useState('');
  const pollTimerRef = useRef(null);

  // Fetch real MongoDB notifications
  const fetchNotifications = async () => {
    if (!currentUser) return;
    try {
      const data = await api.getNotifications();
      if (data && Array.isArray(data.notifications)) {
        setNotifications(data.notifications);
        setUnreadCount(typeof data.unread_count === 'number' ? data.unread_count : 0);
        setErrorNotifs('');
      }
    } catch (err) {
      console.warn('Failed to fetch notifications:', err.message);
    }
  };

  useEffect(() => {
    fetchNotifications();
    // Poll every 30 seconds for background workflow updates
    pollTimerRef.current = setInterval(fetchNotifications, 30000);
    return () => {
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
    };
  }, [currentUser]);

  // Mark single notification read & navigate to target resource
  const handleNotificationClick = async (notif) => {
    const targetAppId = notif.related_application_id || notif.metadata?.application_id || notif.metadata?.id;
    const targetCertId = notif.related_certificate_id || notif.metadata?.certificate_id;

    try {
      if (!notif.read) {
        // Optimistic UI update
        setNotifications(prev => prev.map(n => n.id === notif.id ? { ...n, read: true } : n));
        setUnreadCount(prev => Math.max(0, prev - 1));
        await api.markNotificationRead(notif.id);
      }
    } catch (err) {
      console.warn('Failed to mark notification read on backend:', err.message);
    } finally {
      setShowNotifications(false);
      if (onNavigateToApplication) {
        onNavigateToApplication(targetAppId, notif.type, targetCertId);
      }
    }
  };

  // Mark all notifications read
  const handleMarkAllRead = async (e) => {
    if (e) {
      e.stopPropagation();
      e.preventDefault();
    }
    try {
      // Optimistic UI update
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      setUnreadCount(0);
      await api.markAllNotificationsRead();
    } catch (err) {
      console.error('Failed to mark all read:', err.message);
      fetchNotifications();
    }
  };

  // Icon & color styling based on workflow type
  const getNotificationVisuals = (type) => {
    switch (type) {
      case 'APPLICATION_SUBMITTED':
      case 'APPLICATION_RESUBMITTED':
      case 'NEW_APPLICATION':
        return { icon: 'post_add', color: 'text-blue-600 bg-blue-50 border-blue-200' };
      case 'PAYMENT_INITIATED':
      case 'PAYMENT_VERIFICATION_REQUIRED':
        return { icon: 'account_balance_wallet', color: 'text-amber-600 bg-amber-50 border-amber-200' };
      case 'PAYMENT_VERIFIED':
        return { icon: 'check_circle', color: 'text-emerald-600 bg-emerald-50 border-emerald-200' };
      case 'APPLICATION_RETURNED':
        return { icon: 'assignment_return', color: 'text-amber-700 bg-amber-50 border-amber-200' };
      case 'APPLICATION_REJECTED':
        return { icon: 'cancel', color: 'text-rose-600 bg-rose-50 border-rose-200' };
      case 'NEW_CASE_ASSIGNED':
      case 'NEW_LAB_REQUEST':
      case 'VERIFIER_ASSIGNED':
        return { icon: 'assignment_ind', color: 'text-purple-600 bg-purple-50 border-purple-200' };
      case 'VERIFICATION_COMPLETED':
      case 'VERIFICATION_REPORT_SUBMITTED':
        return { icon: 'fact_check', color: 'text-indigo-600 bg-indigo-50 border-indigo-200' };
      case 'CERTIFICATE_ISSUED':
      case 'CASE_APPROVED':
        return { icon: 'workspace_premium', color: 'text-emerald-700 bg-emerald-100 border-emerald-300' };
      default:
        return { icon: 'notifications', color: 'text-slate-600 bg-slate-100 border-slate-200' };
    }
  };

  const formatRelativeTime = (isoString) => {
    if (!isoString) return '';
    try {
      const diff = Math.max(0, Date.now() - new Date(isoString).getTime());
      const mins = Math.floor(diff / 60000);
      if (mins < 1) return 'Just now';
      if (mins < 60) return `${mins}m ago`;
      const hours = Math.floor(mins / 60);
      if (hours < 24) return `${hours}h ago`;
      const days = Math.floor(hours / 24);
      if (days === 1) return 'Yesterday';
      if (days < 7) return `${days}d ago`;
      return new Date(isoString).toLocaleDateString();
    } catch {
      return '';
    }
  };

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
      <div className="bg-[#001733] text-slate-300 px-3 sm:px-4 py-1 flex items-center justify-between text-[11px] border-b border-[#1b365d]/60 overflow-hidden">
        <div className="flex items-center gap-1.5 sm:gap-2 truncate">
          <span className="material-symbols-outlined text-[14px] text-amber-400 shrink-0">balance</span>
          <span className="font-semibold text-white tracking-wide truncate">Legal Metrology Framework</span>
          <span className="hidden md:inline text-slate-500">|</span>
          <span className="hidden md:inline text-slate-400">Standards under Legal Metrology Act, 2009 & General Rules, 2011</span>
        </div>
        <div className="hidden sm:flex items-center gap-3 text-[10px] text-slate-400 font-mono shrink-0">
          <span>CertifyMetric</span>
        </div>
      </div>

      {/* 2. Main Action Header Bar */}
      <div className="h-14 px-3 sm:px-4 flex items-center justify-between">
        {/* Left side: Hamburger Toggle & Breadcrumbs */}
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <button
            type="button"
            onClick={onToggleSidebar}
            className="md:hidden p-1.5 rounded-lg text-slate-700 hover:bg-slate-100 hover:text-[#002046] transition-colors cursor-pointer focus-visible:ring-2 focus-visible:ring-amber-400 focus-visible:outline-hidden shrink-0"
            title={isSidebarCollapsed ? "Expand Navigation Menu" : "Collapse Navigation Menu"}
            aria-label={isSidebarCollapsed ? "Expand Navigation Menu" : "Collapse Navigation Menu"}
            aria-expanded={!isSidebarCollapsed}
          >
            <span className="material-symbols-outlined text-2xl">menu</span>
          </button>

          <nav className="flex items-center text-xs sm:text-sm font-medium min-w-0">
            <button
              onClick={onGoHome}
              className="text-[#002046] hover:text-blue-700 hover:underline flex items-center gap-1 sm:gap-1.5 font-bold transition-colors shrink-0"
            >
              <span className="material-symbols-outlined text-base text-amber-500">home</span>
              <span className="text-xs sm:text-sm">Home</span>
            </button>
            {getBreadcrumbTitle() && (
              <span className="text-slate-500 font-normal truncate max-w-[120px] sm:max-w-xs md:max-w-md hidden sm:inline">
                {getBreadcrumbTitle()}
              </span>
            )}
          </nav>
        </div>

        {/* Right side: Notifications & User Profile */}
        <div className="flex items-center gap-1.5 sm:gap-3 relative shrink-0">
          
          {/* 1. Statutory Notifications Bell */}
          <div className="relative">
            <button
              type="button"
              onClick={() => {
                setShowNotifications(!showNotifications);
                setShowUserDropdown(false);
                if (!showNotifications) fetchNotifications();
              }}
              className="relative p-2 rounded-xl text-slate-600 hover:text-[#002046] hover:bg-slate-100 border border-slate-200/80 transition-all cursor-pointer shadow-2xs"
              title="Statutory Workflow Notifications"
              aria-label="Workflow Notifications"
            >
              <span className="material-symbols-outlined text-xl">notifications</span>
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 bg-amber-500 text-[#002046] font-extrabold text-[10px] rounded-full flex items-center justify-center border-2 border-white shadow-xs animate-pulse">
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )}
            </button>

            {/* Notification Dropdown Popover */}
            {showNotifications && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setShowNotifications(false)}
                />
                <div className="fixed sm:absolute right-2 sm:right-0 top-14 sm:top-12 w-[calc(100vw-1rem)] sm:w-96 max-w-sm bg-white rounded-2xl shadow-2xl border border-slate-200 py-0 z-50 animate-in fade-in slide-in-from-top-2 duration-150 overflow-hidden">
                  
                  {/* Dropdown Header */}
                  <div className="px-4 py-3 bg-gradient-to-r from-[#002046] to-[#1b365d] text-white flex items-center justify-between border-b border-[#001733]">
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-amber-400 text-lg">notifications_active</span>
                      <span className="font-bold text-xs">Statutory Notifications</span>
                      {unreadCount > 0 && (
                        <span className="px-1.5 py-0.2 rounded-full text-[9.5px] font-bold bg-amber-400 text-[#002046]">
                          {unreadCount} new
                        </span>
                      )}
                    </div>
                    {unreadCount > 0 && (
                      <button
                        type="button"
                        onClick={(e) => handleMarkAllRead(e)}
                        className="text-[11px] font-semibold text-amber-300 hover:text-white underline cursor-pointer transition-colors"
                      >
                        Mark all as read
                      </button>
                    )}
                  </div>

                  {/* Notification List Container */}
                  <div className="max-h-[360px] overflow-y-auto divide-y divide-slate-100">
                    {notifications.length === 0 ? (
                      <div className="py-10 px-4 text-center text-slate-400">
                        <span className="material-symbols-outlined text-4xl text-slate-300 block mb-2">notifications_off</span>
                        <p className="text-xs font-semibold text-slate-600">No Notifications</p>
                        <p className="text-[11px] text-slate-400 mt-0.5">Workflow alerts and lifecycle updates will appear here.</p>
                      </div>
                    ) : (
                      notifications.map((notif) => {
                        const visuals = getNotificationVisuals(notif.type);
                        return (
                          <div
                            key={notif.id}
                            onClick={() => handleNotificationClick(notif)}
                            className={`p-3.5 hover:bg-slate-50 transition-colors cursor-pointer flex items-start gap-3 text-xs ${
                              !notif.read ? 'bg-amber-50/30' : 'bg-white'
                            }`}
                          >
                            <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 border ${visuals.color}`}>
                              <span className="material-symbols-outlined text-base">{visuals.icon}</span>
                            </div>

                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between gap-1">
                                <span className={`font-bold truncate ${!notif.read ? 'text-[#002046]' : 'text-slate-700'}`}>
                                  {notif.title}
                                </span>
                                <span className="text-[10px] text-slate-400 shrink-0">
                                  {formatRelativeTime(notif.created_at)}
                                </span>
                              </div>
                              <p className="text-[11px] text-slate-600 mt-0.5 leading-snug line-clamp-2">
                                {notif.message}
                              </p>
                              {notif.related_application_id && (
                                <span className="inline-block mt-1 font-mono text-[9.5px] font-semibold text-blue-700 bg-blue-50 px-1.5 py-0.2 rounded border border-blue-200">
                                  {notif.metadata?.application_no || notif.related_application_id}
                                </span>
                              )}
                            </div>

                            {!notif.read && (
                              <div className="w-2 h-2 rounded-full bg-amber-500 shrink-0 mt-1" title="Unread" />
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>

                  {/* Dropdown Footer */}
                  <div className="p-2 bg-slate-50 border-t border-slate-100 text-center">
                    <span className="text-[10px] text-slate-400 font-medium">
                      MongoDB Persistent Workflow Ledger • Real-Time Sync
                    </span>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* 2. Welcome User Badge (Matching CertifyMetric Theme) */}
          <div
            onClick={() => {
              setShowUserDropdown(!showUserDropdown);
              setShowNotifications(false);
            }}
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
              <div className="fixed sm:absolute right-2 sm:right-0 top-14 sm:top-12 w-[calc(100vw-1rem)] max-w-[260px] sm:w-64 bg-white rounded-xl shadow-xl border border-slate-200 py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
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

