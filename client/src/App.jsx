import React, { useState, useEffect } from 'react';
import AuthenticatedLayout from './layouts/AuthenticatedLayout';
import TraderDashboard from './views/TraderDashboard';
import InstrumentsList from './views/InstrumentsList';
import AddInstrumentModal from './views/AddInstrumentModal';
import ApplyVerificationView from './views/ApplyVerificationView';
import ApplicationsList from './views/ApplicationsList';
import InstrumentDetail from './views/InstrumentDetail';
import ApplicationTimeline from './views/ApplicationTimeline';
import AuthorityDashboard from './views/AuthorityDashboard';
import ApplicationReview from './views/ApplicationReview';
import AssignmentDecisionSupport from './views/AssignmentDecisionSupport';
import VerifierDashboard from './views/VerifierDashboard';
import VerificationWorkspace from './views/VerificationWorkspace';
import CertificatesList from './views/CertificatesList';
import OfficialCertificate from './views/OfficialCertificate';
import PublicCertificateVerification from './views/PublicCertificateVerification';
import PortalLanding from './views/PortalLanding';
import VendorApplyVerificationView from './views/VendorApplyVerificationView';
import QRCodeModal from './components/QRCodeModal';
import LoginView from './views/LoginView';
import RegisterView from './views/RegisterView';
import AuditLogView from './views/AuditLogView';
import GatcDashboard from './views/GatcDashboard';
import AdminDashboard from './views/AdminDashboard';
import AdminUsersView from './views/AdminUsersView';
import AdminOrgsView from './views/AdminOrgsView';
import AdminMasterDataView from './views/AdminMasterDataView';
import AdminSystemHealthView from './views/AdminSystemHealthView';
import { api, setApiUser, getStoredAuth } from './api';

const ROLE_ALLOWED_TABS = {
  TRADER: ['dashboard', 'instruments', 'instrument-detail', 'apply-verification', 'applications', 'application-timeline', 'applications-rejected', 'vendor-apply-tank', 'certificates', 'official-certificate'],
  AUTHORITY: ['authority-dashboard', 'applications', 'application-timeline', 'application-review', 'assignment-decision', 'certificates', 'official-certificate', 'audit-logs'],
  VERIFIER: ['verifier-dashboard', 'verification-workspace'],
  GATC: ['gatc-dashboard', 'verification-workspace'],
  PLATFORM_ADMIN: [
    'admin-dashboard',
    'admin-users',
    'admin-orgs',
    'admin-master',
    'audit-logs',
    'system-health',
    'applications',
    'certificates',
    'instruments'
  ]
};

const getInitialRoleTab = (role) => {
  if (role === 'TRADER') return 'dashboard';
  if (role === 'AUTHORITY') return 'authority-dashboard';
  if (role === 'PLATFORM_ADMIN') return 'admin-dashboard';
  if (role === 'VERIFIER') return 'verifier-dashboard';
  if (role === 'GATC') return 'gatc-dashboard';
  return 'dashboard';
};

export function computePathForState(tab, entityIds = {}, role = null) {
  const { instrumentId, applicationId, certificateId } = entityIds;
  switch (tab) {
    case 'dashboard':
      return '/dashboard';
    case 'authority-dashboard':
      return '/authority/dashboard';
    case 'verifier-dashboard':
      return '/verifier/dashboard';
    case 'gatc-dashboard':
      return '/gatc/dashboard';
    case 'admin-dashboard':
      return '/admin/dashboard';

    case 'instruments':
      return '/instruments';
    case 'instrument-detail':
      return instrumentId ? `/instruments/${encodeURIComponent(instrumentId)}` : '/instruments';
    case 'apply-verification':
      return instrumentId ? `/apply-verification?instrument=${encodeURIComponent(instrumentId)}` : '/apply-verification';
    case 'vendor-apply-tank':
      return '/vendor-apply-tank';

    case 'applications':
      return '/applications';
    case 'applications-rejected':
      return '/applications/rejected';
    case 'application-timeline':
      return applicationId ? `/applications/${encodeURIComponent(applicationId)}/timeline` : '/applications';
    case 'application-review':
      return applicationId ? `/applications/${encodeURIComponent(applicationId)}/review` : '/applications';
    case 'assignment-decision':
      return applicationId ? `/applications/${encodeURIComponent(applicationId)}/assign` : '/applications';

    case 'verification-workspace':
      return applicationId ? `/verifications/workspace/${encodeURIComponent(applicationId)}` : '/verifications/workspace';

    case 'certificates':
      return '/certificates';
    case 'official-certificate':
      return certificateId ? `/certificates/${encodeURIComponent(certificateId)}` : '/certificates';

    case 'audit-logs':
      return '/audit-logs';
    case 'admin-users':
      return '/admin/users';
    case 'admin-orgs':
      return '/admin/organizations';
    case 'admin-master':
      return '/admin/master-data';
    case 'system-health':
      return '/admin/system-health';

    default:
      return '/dashboard';
  }
}

export function parseRouteFromUrl(pathname, search, role) {
  const cleanPath = (pathname || window.location.pathname).replace(/\/+$/, '') || '/';
  const params = new URLSearchParams(search !== undefined ? search : window.location.search);

  // 1. Check Public Certificate Verify Route
  if (cleanPath.startsWith('/verify') || params.has('verify') || params.has('token')) {
    const parts = cleanPath.split('/').filter(Boolean);
    const tok = parts.length > 1 ? decodeURIComponent(parts.slice(1).join('/')).trim() : (params.get('verify') || params.get('token') || '');
    return { isPublicVerify: true, publicMode: 'CERTIFICATE', publicToken: tok };
  }

  // 2. Pre-auth Routes
  if (cleanPath === '/login') {
    return { isPreAuth: true, showLanding: false, showRegister: false };
  }
  if (cleanPath === '/register') {
    return { isPreAuth: true, showLanding: false, showRegister: true };
  }
  if (cleanPath === '/') {
    return { isPreAuth: true, showLanding: true, showRegister: false };
  }

  // 3. Authenticated Routes
  if (cleanPath === '/dashboard') {
    return { tab: getInitialRoleTab(role) };
  }
  if (cleanPath === '/authority/dashboard') {
    return { tab: 'authority-dashboard' };
  }
  if (cleanPath === '/verifier/dashboard') {
    return { tab: 'verifier-dashboard' };
  }
  if (cleanPath === '/gatc/dashboard') {
    return { tab: 'gatc-dashboard' };
  }
  if (cleanPath === '/admin/dashboard') {
    return { tab: 'admin-dashboard' };
  }

  // Instruments
  if (cleanPath === '/instruments') {
    return { tab: 'instruments' };
  }
  if (cleanPath.startsWith('/instruments/')) {
    const id = decodeURIComponent(cleanPath.slice('/instruments/'.length));
    return { tab: 'instrument-detail', instrumentId: id };
  }

  // Apply Verification
  if (cleanPath === '/apply-verification') {
    const instId = params.get('instrument') || null;
    return { tab: 'apply-verification', instrumentId: instId };
  }
  if (cleanPath === '/vendor-apply-tank') {
    return { tab: 'vendor-apply-tank' };
  }

  // Applications
  if (cleanPath === '/applications') {
    return { tab: 'applications' };
  }
  if (cleanPath === '/applications/rejected') {
    return { tab: 'applications-rejected' };
  }
  if (cleanPath.startsWith('/applications/')) {
    const sub = cleanPath.slice('/applications/'.length);
    const parts = sub.split('/');
    const id = decodeURIComponent(parts[0]);
    const action = parts[1];
    if (action === 'timeline') {
      return { tab: 'application-timeline', applicationId: id };
    }
    if (action === 'review') {
      return { tab: 'application-review', applicationId: id };
    }
    if (action === 'assign') {
      return { tab: 'assignment-decision', applicationId: id };
    }
    // Default /applications/:id
    return {
      tab: role === 'AUTHORITY' ? 'application-review' : 'application-timeline',
      applicationId: id
    };
  }

  // Verification Workspace
  if (cleanPath.startsWith('/verifications/workspace')) {
    const sub = cleanPath.slice('/verifications/workspace'.length);
    const id = sub ? decodeURIComponent(sub.replace(/^\//, '')) : null;
    return { tab: 'verification-workspace', applicationId: id || null };
  }

  // Certificates
  if (cleanPath === '/certificates') {
    return { tab: 'certificates' };
  }
  if (cleanPath.startsWith('/certificates/')) {
    const id = decodeURIComponent(cleanPath.slice('/certificates/'.length));
    return { tab: 'official-certificate', certificateId: id };
  }

  // Admin / Audit
  if (cleanPath === '/audit-logs') {
    return { tab: 'audit-logs' };
  }
  if (cleanPath === '/admin/users') {
    return { tab: 'admin-users' };
  }
  if (cleanPath === '/admin/organizations') {
    return { tab: 'admin-orgs' };
  }
  if (cleanPath === '/admin/master-data') {
    return { tab: 'admin-master' };
  }
  if (cleanPath === '/admin/system-health') {
    return { tab: 'system-health' };
  }



  // Fallback
  return { tab: getInitialRoleTab(role) };
}

// Reads the current path once at module scope so the initial render already
// matches the URL — avoids a flash of the wrong screen on refresh/deep-link.
const getInitialPreAuthState = () => {
  const path = window.location.pathname;
  if (path === '/register') return { showLanding: false, showRegister: true };
  if (path === '/login') return { showLanding: false, showRegister: false };
  return { showLanding: true, showRegister: false };
};

const getInitialPublicVerifyState = () => {
  const path = window.location.pathname;
  const params = new URLSearchParams(window.location.search);

  // Check certificate routes: /verify or /verify/:token
  if (path.startsWith('/verify') || params.has('verify') || params.has('token')) {
    const parts = path.split('/').filter(Boolean);
    const tok = parts.length > 1 ? decodeURIComponent(parts.slice(1).join('/')).trim() : (params.get('verify') || params.get('token') || '');
    return { isRoute: true, mode: 'CERTIFICATE', token: tok };
  }

  return { isRoute: false, mode: 'CERTIFICATE', token: null };
};

export default function App() {
  // Tracks how many history entries this session has pushed internally.
  // Used by navigateBack to decide whether window.history.back() is safe.
  const navDepthRef = React.useRef(0);
  const authUser = getStoredAuth().user;
  const initialParsedRoute = authUser ? parseRouteFromUrl(window.location.pathname, window.location.search, authUser.role) : null;
  const initialPreAuthState = getInitialPreAuthState();

  const [currentUser, setCurrentUser] = useState(() => authUser);
  const [currentRole, setCurrentRole] = useState(() => authUser?.role || null);
  const [showLanding, setShowLanding] = useState(() =>
    authUser ? false : initialPreAuthState.showLanding
  );
  const [showRegister, setShowRegister] = useState(() =>
    authUser ? false : initialPreAuthState.showRegister
  );

  const [activeTab, setActiveTab] = useState(() => {
    if (initialParsedRoute?.tab) {
      const allowed = ROLE_ALLOWED_TABS[authUser?.role] || [];
      if (allowed.includes(initialParsedRoute.tab)) return initialParsedRoute.tab;
    }
    return getInitialRoleTab(authUser?.role);
  });

  // Public QR / Engine Verification Route State (No auth required)
  const initialVerifyState = getInitialPublicVerifyState();
  const [publicVerifyMode, setPublicVerifyMode] = useState(initialVerifyState.mode);
  const [publicVerifyToken, setPublicVerifyToken] = useState(initialVerifyState.token);
  const [isPublicVerifyRoute, setIsPublicVerifyRoute] = useState(initialVerifyState.isRoute);

  // Selected Entities for Drill-down Views
  const [selectedInstrumentId, setSelectedInstrumentId] = useState(() => initialParsedRoute?.instrumentId || null);
  const [selectedApplicationId, setSelectedApplicationId] = useState(() => initialParsedRoute?.applicationId || null);
  const [selectedCertificateId, setSelectedCertificateId] = useState(() => initialParsedRoute?.certificateId || null);

  // Modals & Navigation States
  const [showAddModal, setShowAddModal] = useState(false);
  const [applyModalInstId, setApplyModalInstId] = useState(() => (initialParsedRoute?.tab === 'apply-verification' ? (initialParsedRoute.instrumentId || null) : null));
  const [resubmitAppData, setResubmitAppData] = useState(null);
  const [pendingPaymentAppData, setPendingPaymentAppData] = useState(null);
  const [showQrModal, setShowQrModal] = useState(false);
  const [qrModalInfo, setQrModalInfo] = useState(null);

  // Global Data Stores
  const [instruments, setInstruments] = useState([]);
  const [applications, setApplications] = useState([]);
  const [certificates, setCertificates] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  const refreshAllData = async (user = currentUser) => {
    if (!user) {
      setLoading(false);
      return;
    }
    try {
      const [instList, appList, certList, statData] = await Promise.all([
        api.getInstruments(user?.role === 'TRADER' ? user?.id : undefined),
        api.getApplications(user?.role === 'TRADER' ? { trader_id: user?.id } : {}),
        api.getCertificates(user?.role === 'TRADER' ? user?.id : undefined),
        api.getStats()
      ]);

      setInstruments(Array.isArray(instList) ? instList : []);
      setApplications(Array.isArray(appList) ? appList : []);
      setCertificates(Array.isArray(certList) ? certList : []);
      setStats(statData && !statData.error ? statData : null);
    } catch (err) {
      console.error('Failed to load application data:', err);
      setInstruments([]);
      setApplications([]);
      setCertificates([]);
    } finally {
      setLoading(false);
    }
  };

  // Central Router: Updates Browser History, URL, and React View State
  const navigateTo = (tab, entityIds = {}, replace = false) => {
    const role = currentRole || currentUser?.role;
    const allowed = ROLE_ALLOWED_TABS[role] || [];
    const validTab = allowed.includes(tab) ? tab : getInitialRoleTab(role);

    const instId = entityIds.instrumentId !== undefined ? entityIds.instrumentId : (validTab === 'instrument-detail' ? selectedInstrumentId : null);
    const appId = entityIds.applicationId !== undefined ? entityIds.applicationId : (['application-timeline', 'application-review', 'assignment-decision', 'verification-workspace'].includes(validTab) ? selectedApplicationId : null);
    const certId = entityIds.certificateId !== undefined ? entityIds.certificateId : (validTab === 'official-certificate' ? selectedCertificateId : null);

    const path = computePathForState(validTab, {
      instrumentId: instId,
      applicationId: appId,
      certificateId: certId
    }, role);

    const stateObj = {
      tab: validTab,
      instrumentId: instId,
      applicationId: appId,
      certificateId: certId
    };

    if (replace) {
      window.history.replaceState(stateObj, '', path);
    } else {
      const currentUrl = window.location.pathname + window.location.search;
      if (currentUrl !== path) {
        window.history.pushState(stateObj, '', path);
        navDepthRef.current += 1;
      }
    }

    setActiveTab(validTab);
    setSelectedInstrumentId(instId);
    setSelectedApplicationId(appId);
    setSelectedCertificateId(certId);
    if (validTab === 'apply-verification') {
      setApplyModalInstId(instId);
    }
    setShowAddModal(false);
    setShowQrModal(false);
    // Scroll to top on forward navigation (not on replace/back)
    if (!replace) {
      window.scrollTo({ top: 0, behavior: 'instant' });
    }
  };

  // Navigates back in browser history if this session has pushed entries,
  // otherwise falls back to the specified destination.
  const navigateBack = (fallbackTab, fallbackIds = {}) => {
    if (navDepthRef.current > 0) {
      navDepthRef.current -= 1;
      window.history.back();
    } else {
      navigateTo(fallbackTab, fallbackIds, true);
    }
  };

  useEffect(() => {
    if (currentUser) {
      // If user is authenticated at root '/', replace with their designated role dashboard
      if (window.location.pathname === '/' || !window.location.pathname) {
        const targetTab = getInitialRoleTab(currentUser.role);
        const path = computePathForState(targetTab, {}, currentUser.role);
        window.history.replaceState({ tab: targetTab }, '', path);
      }

      api.getMe().then(res => {
        if (!res || !res.user) {
          handleLogout();
        } else {
          setCurrentUser(res.user);
          refreshAllData(res.user);
        }
      }).catch(() => {
        handleLogout();
      });
    } else {
      setLoading(false);
    }

    // Listen for browser navigation changes (Back and Forward buttons)
    const handlePopState = (event) => {
      const path = window.location.pathname;
      const search = window.location.search;
      const user = getStoredAuth().user;

      // 1. Standalone Public Verify routes (/verify, /public/instrument)
      const publicState = getInitialPublicVerifyState();
      if (publicState.isRoute) {
        setIsPublicVerifyRoute(true);
        setPublicVerifyMode(publicState.mode);
        setPublicVerifyToken(publicState.token);
        return;
      }
      setIsPublicVerifyRoute(false);
      setPublicVerifyToken(null);
      setPublicVerifyMode('CERTIFICATE');

      // 2. Pre-auth screen transitions (Landing / Login / Register)
      if (!user) {
        if (path === '/register') {
          setShowLanding(false);
          setShowRegister(true);
        } else if (path === '/login') {
          setShowLanding(false);
          setShowRegister(false);
        } else {
          setShowLanding(true);
          setShowRegister(false);
        }
        return;
      }

      // 3. Authenticated routes
      const parsed = parseRouteFromUrl(path, search, user.role);
      if (parsed.isPublicVerify) {
        setIsPublicVerifyRoute(true);
        setPublicVerifyMode(parsed.publicMode);
        setPublicVerifyToken(parsed.publicToken);
        return;
      }

      const allowed = ROLE_ALLOWED_TABS[user.role] || [];
      const targetTab = allowed.includes(parsed.tab) ? parsed.tab : getInitialRoleTab(user.role);

      const instId = parsed.instrumentId !== undefined ? parsed.instrumentId : (event.state?.instrumentId || null);
      const appId = parsed.applicationId !== undefined ? parsed.applicationId : (event.state?.applicationId || null);
      const certId = parsed.certificateId !== undefined ? parsed.certificateId : (event.state?.certificateId || null);

      setActiveTab(targetTab);
      setSelectedInstrumentId(instId);
      setSelectedApplicationId(appId);
      setSelectedCertificateId(certId);
      if (targetTab === 'apply-verification') {
        setApplyModalInstId(instId);
      }
      setShowAddModal(false);
      setShowQrModal(false);
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);



  const handleLoginSuccess = (authData) => {
    const { user, token } = authData;
    setCurrentUser(user);
    setCurrentRole(user.role);
    setApiUser(user, token);
    setShowLanding(false);
    setShowRegister(false);

    // Determine portal / dashboard strictly based on database role.
    // Use replaceState so the user cannot press Back to return to the
    // login/landing screen after a successful authentication.
    const targetTab = getInitialRoleTab(user.role);
    const path = computePathForState(targetTab, {}, user.role);
    window.history.replaceState({ tab: targetTab }, '', path);
    navDepthRef.current = 0; // reset internal depth after login
    setActiveTab(targetTab);
    setSelectedInstrumentId(null);
    setSelectedApplicationId(null);
    setSelectedCertificateId(null);

    refreshAllData(user);
  };

  const handleDirectDemoLogin = async (demo) => {
    try {
      setLoading(true);
      const data = await api.login(demo.email, demo.password);
      handleLoginSuccess(data);
    } catch (err) {
      alert(`Demo login failed: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await api.logout();
    } catch (e) {}
    setApiUser(null);
    setCurrentUser(null);
    setCurrentRole(null);
    setShowLanding(true);
    setShowRegister(false);
    // Use replaceState so Forward after logout cannot revisit protected routes.
    window.history.replaceState({}, '', '/');
    navDepthRef.current = 0;
    setInstruments([]);
    setApplications([]);
    setCertificates([]);
  };

  const handleOpenApplyModal = (instrumentId = null) => {
    setResubmitAppData(null);
    setPendingPaymentAppData(null);
    navigateTo('apply-verification', { instrumentId: instrumentId || null });
  };

  const handleOpenResubmit = (app) => {
    setPendingPaymentAppData(null);
    setResubmitAppData(app);
    navigateTo('apply-verification', { instrumentId: app?.instrument_id || null });
  };

  const handleOpenPayment = (app) => {
    setResubmitAppData(null);
    setPendingPaymentAppData(app);
    navigateTo('apply-verification', { instrumentId: app?.instrument_id || null });
  };

  // Standalone Public Verification Route (Immediate render, no auth/login or data loading required)
  if (isPublicVerifyRoute || publicVerifyToken !== null) {
    return (
      <PublicCertificateVerification
        token={publicVerifyToken}
        onExit={() => {
          if (window.history.length > 1) {
            window.history.back();
          } else {
            window.history.pushState({}, '', '/');
            setIsPublicVerifyRoute(false);
            setPublicVerifyToken(null);
            setPublicVerifyMode('CERTIFICATE');
          }
        }}
      />
    );
  }

  // Render Landing Page or Login Screen if not authenticated
  if (!currentUser) {
    const goToLogin = () => {
      window.history.pushState({}, '', '/login');
      setShowLanding(false);
      setShowRegister(false);
    };
    const goToLanding = () => {
      window.history.pushState({}, '', '/');
      setShowLanding(true);
      setShowRegister(false);
    };
    const goToRegister = () => {
      window.history.pushState({}, '', '/register');
      setShowLanding(false);
      setShowRegister(true);
    };
    const backToLoginFromRegister = () => {
      if (window.history.length > 1) {
        window.history.back();
      } else {
        window.history.pushState({}, '', '/login');
        setShowLanding(false);
        setShowRegister(false);
      }
    };

    if (showLanding) {
      return (
        <PortalLanding
          onGoToLogin={goToLogin}
          onGoToRegister={goToRegister}
          onTrackApplication={(appNo) => {
            goToLogin();
          }}
          onDirectDemoLogin={handleDirectDemoLogin}
        />
      );
    }

    if (showRegister) {
      return (
        <RegisterView
          onRegisterSuccess={handleLoginSuccess}
          onBackToLogin={backToLoginFromRegister}
        />
      );
    }

    return (
      <LoginView
        onLoginSuccess={handleLoginSuccess}
        onBackToLanding={goToLanding}
        onGoToRegister={goToRegister}
      />
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-surface flex flex-col items-center justify-center text-slate-500">
        <div className="w-12 h-12 rounded-xl bg-primary text-white flex items-center justify-center mb-3 shadow-md animate-bounce">
          <span className="material-symbols-outlined text-2xl">gavel</span>
        </div>
        <h2 className="text-base font-bold text-primary">CertifyMetric Verification System</h2>
        <p className="text-xs text-slate-400 mt-1">Initializing Legal Metrology Foundation & Rules...</p>
      </div>
    );
  }

  const handleTabChange = (tab) => {
    navigateTo(tab);
  };

  const handleNotificationNavigate = (appId, type, certId) => {
    if (certId) {
      navigateTo('official-certificate', { certificateId: certId });
      return;
    }

    if (appId) {
      if (currentRole === 'AUTHORITY') {
        navigateTo('application-review', { applicationId: appId });
      } else if (currentRole === 'VERIFIER' || currentRole === 'GATC') {
        navigateTo('verification-workspace', { applicationId: appId });
      } else {
        // Commercial Trader
        if (type === 'PAYMENT_INITIATED' || type === 'PAYMENT_REQUIRED') {
          navigateTo('applications');
        } else {
          navigateTo('application-timeline', { applicationId: appId });
        }
      }
    } else {
      navigateTo(getInitialRoleTab(currentRole));
    }
  };

  return (
    <>
      <AuthenticatedLayout
        currentUser={currentUser}
        currentRole={currentRole}
        activeTab={activeTab}
        onSelectTab={handleTabChange}
        onOpenApplyModal={handleOpenApplyModal}
        onOpenAddModal={() => setShowAddModal(true)}
        onLogout={handleLogout}
        onGoHome={() => navigateTo(getInitialRoleTab(currentRole))}
        onNavigateToApplication={handleNotificationNavigate}
      >
        {/* LMOMS Vehicle Tank Verification View */}
        {activeTab === 'vendor-apply-tank' && (
          <VendorApplyVerificationView
            instruments={instruments}
            onOpenApplyModal={handleOpenApplyModal}
            onOpenAddModal={() => setShowAddModal(true)}
          />
        )}

        {/* Resubmit Rejected Weights/Measures */}
        {activeTab === 'applications-rejected' && (
          <ApplicationsList
            applications={applications.filter(a => a.status === 'FAILED' || a.status === 'REJECTED')}
            onSelectApplication={(id) => navigateTo('application-timeline', { applicationId: id })}
            onOpenApplyModal={handleOpenApplyModal}
            onSelectCertificate={(id) => navigateTo('official-certificate', { certificateId: id })}
          />
        )}

        {/* ========================================================
            TRADER VIEWS: Login -> Dashboard -> Add Instrument -> Apply for Verification
           ======================================================== */}
        {activeTab === 'dashboard' && (
          <TraderDashboard
            currentUser={currentUser}
            instruments={instruments}
            applications={applications}
            certificates={certificates}
            onOpenAddModal={() => setShowAddModal(true)}
            onOpenApplyModal={handleOpenApplyModal}
            onSelectInstrument={(id) => navigateTo('instrument-detail', { instrumentId: id })}
            onSelectApplication={(id) => navigateTo('application-timeline', { applicationId: id })}
            onSelectCertificate={(id) => navigateTo('official-certificate', { certificateId: id })}
            onResubmitApplication={handleOpenResubmit}
            onPayApplication={handleOpenPayment}
            onRequestVerification={handleOpenApplyModal}
            onOpenQR={(info) => {
              setQrModalInfo(info);
              setShowQrModal(true);
            }}
            onViewAllInstruments={() => navigateTo('instruments')}
            onViewAllApplications={() => navigateTo('applications')}
            onViewAllCertificates={() => navigateTo('certificates')}
          />
        )}

        {/* Dedicated Full Page: Apply for Statutory Verification */}
        {activeTab === 'apply-verification' && (
          <ApplyVerificationView
            currentUser={currentUser}
            instruments={instruments}
            preselectedInstrumentId={applyModalInstId}
            resubmitApplicationData={resubmitAppData}
            pendingPaymentApplication={pendingPaymentAppData}
            onClose={() => {
              setApplyModalInstId(null);
              setResubmitAppData(null);
              setPendingPaymentAppData(null);
              navigateBack('dashboard');
            }}
            onApplicationCreated={async (newAppId) => {
              await refreshAllData();
              navigateTo('application-timeline', { applicationId: newAppId });
            }}
            onPaymentCompleted={() => {
              refreshAllData();
            }}
            onOpenAddInstrument={() => {
              setShowAddModal(true);
            }}
            onViewApplicationTimeline={(newAppId) => {
              navigateTo('application-timeline', { applicationId: newAppId });
            }}
          />
        )}

        {activeTab === 'instruments' && (
          <InstrumentsList
            instruments={instruments}
            onOpenAddModal={() => setShowAddModal(true)}
            onOpenApplyModal={handleOpenApplyModal}
            onSelectInstrument={(id) => navigateTo('instrument-detail', { instrumentId: id })}
            onRequestVerification={handleOpenApplyModal}
            onOpenQR={(info) => {
              setQrModalInfo(info);
              setShowQrModal(true);
            }}
          />
        )}

        {activeTab === 'instrument-detail' && (
          <InstrumentDetail
            instrumentId={selectedInstrumentId}
            onBack={() => navigateBack('instruments')}
            onRequestVerification={handleOpenApplyModal}
            onOpenApplyModal={handleOpenApplyModal}
            onOpenQR={(info) => {
              setQrModalInfo(info);
              setShowQrModal(true);
            }}
            onSelectCertificate={(id) => navigateTo('official-certificate', { certificateId: id })}
          />
        )}

        {activeTab === 'applications' && (
          <ApplicationsList
            applications={applications}
            currentRole={currentRole}
            onSelectApplication={(id) => navigateTo(currentRole === 'AUTHORITY' ? 'application-review' : 'application-timeline', { applicationId: id })}
            onAssignApplication={(id) => navigateTo('assignment-decision', { applicationId: id })}
            onReviewApplication={(id) => navigateTo('application-review', { applicationId: id })}
            onOpenApplyModal={handleOpenApplyModal}
            onSelectCertificate={(id) => navigateTo('official-certificate', { certificateId: id })}
            onResubmitApplication={handleOpenResubmit}
            onPayApplication={currentRole === 'TRADER' ? handleOpenPayment : null}
          />
        )}

        {activeTab === 'application-timeline' && (
          <ApplicationTimeline
            applicationId={selectedApplicationId}
            onBack={() => navigateBack(currentRole === 'AUTHORITY' ? 'authority-dashboard' : 'applications')}
            onOpenQR={(info) => {
              setQrModalInfo(info);
              setShowQrModal(true);
            }}
            onSelectCertificate={(id) => navigateTo('official-certificate', { certificateId: id })}
            onResubmitApplication={handleOpenResubmit}
            onPayApplication={currentRole === 'TRADER' ? handleOpenPayment : null}
          />
        )}

        {/* ========================================================
            CERTIFICATE VIEWS
           ======================================================== */}
        {activeTab === 'certificates' && (
          <CertificatesList
            certificates={certificates}
            onSelectCertificate={(id) => navigateTo('official-certificate', { certificateId: id })}
            onOpenQR={(info) => {
              setQrModalInfo(info);
              setShowQrModal(true);
            }}
          />
        )}

        {activeTab === 'official-certificate' && (
          <OfficialCertificate
            certificateId={selectedCertificateId}
            onBack={() => navigateBack(currentRole === 'TRADER' || currentRole === 'AUTHORITY' ? 'certificates' : 'verifier-dashboard')}
            onOpenQR={(info) => {
              setQrModalInfo(info);
              setShowQrModal(true);
            }}
          />
        )}

        {/* ========================================================
            AUTHORITY VIEWS: Login -> Dashboard -> Review -> Assign Verifier
           ======================================================== */}
        {activeTab === 'authority-dashboard' && (
          <AuthorityDashboard
            currentUser={currentUser}
            applications={applications}
            stats={stats}
            onReviewApplication={(id) => navigateTo('application-review', { applicationId: id })}
            onAssignApplication={(id) => navigateTo('assignment-decision', { applicationId: id })}
            onViewQueue={() => navigateTo('applications')}
            onViewCertificates={() => navigateTo('certificates')}
            onViewAuditLogs={() => navigateTo('audit-logs')}
          />
        )}

        {activeTab === 'application-review' && (
          <ApplicationReview
            applicationId={selectedApplicationId}
            onBack={() => navigateBack('authority-dashboard')}
            onProceedToAssignment={(id) => navigateTo('assignment-decision', { applicationId: id })}
            onViewCertificate={(id) => navigateTo('official-certificate', { certificateId: id })}
          />
        )}

        {activeTab === 'assignment-decision' && (
          <AssignmentDecisionSupport
            applicationId={selectedApplicationId}
            currentUser={currentUser}
            onBack={() => navigateBack('application-review', { applicationId: selectedApplicationId })}
            onAssignmentComplete={async (appId) => {
              await refreshAllData();
              navigateTo('application-timeline', { applicationId: appId });
            }}
          />
        )}

        {/* ========================================================
            GATC LAB METROLOGY CONSOLE
           ======================================================== */}
        {activeTab === 'gatc-dashboard' && (
          <GatcDashboard
            currentUser={currentUser}
            onOpenCase={(appId) => navigateTo('verification-workspace', { applicationId: appId })}
            onViewAllCases={() => navigateTo('verification-workspace')}
          />
        )}

        {/* ========================================================
            PLATFORM ADMIN CONSOLE & DEDICATED MANAGEMENT VIEWS
           ======================================================== */}
        {activeTab === 'admin-dashboard' && (
          <AdminDashboard
            currentUser={currentUser}
            onViewAuditLogs={() => navigateTo('audit-logs')}
            onNavigateTab={(tab) => navigateTo(tab)}
          />
        )}

        {activeTab === 'admin-users' && (
          <AdminUsersView
            currentUser={currentUser}
            onBack={() => navigateBack('admin-dashboard')}
          />
        )}

        {activeTab === 'admin-orgs' && (
          <AdminOrgsView
            currentUser={currentUser}
            onBack={() => navigateBack('admin-dashboard')}
          />
        )}

        {activeTab === 'admin-master' && (
          <AdminMasterDataView
            currentUser={currentUser}
            onBack={() => navigateBack('admin-dashboard')}
          />
        )}

        {activeTab === 'system-health' && (
          <AdminSystemHealthView
            currentUser={currentUser}
            onBack={() => navigateBack('admin-dashboard')}
          />
        )}

        {/* ========================================================
            VERIFIER VIEWS: Login -> Dashboard -> Assigned Cases -> Open Workspace
           ======================================================== */}
        {activeTab === 'verifier-dashboard' && (
          <VerifierDashboard
            currentUser={currentUser}
            onOpenCase={(appId) => navigateTo('verification-workspace', { applicationId: appId })}
            onViewAllCases={() => navigateTo('verification-workspace')}
          />
        )}

        {activeTab === 'verification-workspace' && (
          <VerificationWorkspace
            applicationId={selectedApplicationId}
            currentUser={currentUser}
            onBack={() => navigateBack(currentRole === 'GATC' ? 'gatc-dashboard' : 'verifier-dashboard')}
            onVerificationCompleted={async () => {
              await refreshAllData();
            }}
            onViewCertificate={(id) => navigateTo('official-certificate', { certificateId: id })}
          />
        )}

        {/* ========================================================
            GOVERNANCE AUDIT LEDGER (Authority & Admin)
           ======================================================== */}
        {activeTab === 'audit-logs' && (
          <AuditLogView />
        )}

      </AuthenticatedLayout>

      {/* Global Add Instrument Modal */}
      {showAddModal && (
        <AddInstrumentModal
          currentUser={currentUser}
          onClose={() => setShowAddModal(false)}
          onCreated={async (newId) => {
            await refreshAllData();
            navigateTo('instrument-detail', { instrumentId: newId });
          }}
        />
      )}

      {/* Global QR Code Inspection Modal */}
      {showQrModal && (
        <QRCodeModal
          certificate={qrModalInfo}
          onClose={() => setShowQrModal(false)}
        />
      )}
    </>
  );
}
