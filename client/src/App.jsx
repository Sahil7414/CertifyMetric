import React, { useState, useEffect, useCallback } from 'react';
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
import NotFoundView from './views/NotFoundView';
import { api, setApiUser, getStoredAuth } from './api';

const ROLE_ALLOWED_TABS = {
  TRADER: [
    'dashboard',
    'instruments',
    'instrument-detail',
    'apply-verification',
    'applications',
    'application-timeline',
    'applications-rejected',
    'vendor-apply-tank',
    'certificates',
    'official-certificate',
    'public-qr-verify'
  ],
  AUTHORITY: [
    'authority-dashboard',
    'applications',
    'application-timeline',
    'application-review',
    'assignment-decision',
    'certificates',
    'official-certificate',
    'audit-logs',
    'public-qr-verify'
  ],
  VERIFIER: [
    'verifier-dashboard',
    'verification-workspace',
    'certificates',
    'official-certificate',
    'public-qr-verify'
  ],
  GATC: [
    'gatc-dashboard',
    'verification-workspace',
    'certificates',
    'official-certificate',
    'public-qr-verify'
  ],
  PLATFORM_ADMIN: [
    'admin-dashboard',
    'audit-logs',
    'public-qr-verify'
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

// URL Builder for tabs and entities
const buildTabUrl = (tab, params = {}) => {
  switch (tab) {
    case 'dashboard':
      return '/dashboard';
    case 'instruments':
      return '/instruments';
    case 'instrument-detail':
      return params.id ? `/instruments/detail?id=${encodeURIComponent(params.id)}` : '/instruments/detail';
    case 'apply-verification': {
      const searchParams = new URLSearchParams();
      if (params.step && params.step > 1) searchParams.set('step', String(params.step));
      if (params.instId) searchParams.set('instId', String(params.instId));
      if (params.appId) searchParams.set('appId', String(params.appId));
      if (params.mode) searchParams.set('mode', String(params.mode));
      const qs = searchParams.toString();
      return qs ? `/apply-verification?${qs}` : '/apply-verification';
    }
    case 'vendor-apply-tank':
      return '/vendor-apply-tank';
    case 'applications':
      return '/applications';
    case 'applications-rejected':
      return '/applications/rejected';
    case 'application-timeline':
      return params.id ? `/applications/timeline?id=${encodeURIComponent(params.id)}` : '/applications/timeline';
    case 'application-review':
      return params.id ? `/applications/review?id=${encodeURIComponent(params.id)}` : '/applications/review';
    case 'assignment-decision':
      return params.id ? `/applications/assign?id=${encodeURIComponent(params.id)}` : '/applications/assign';
    case 'authority-dashboard':
      return '/authority-dashboard';
    case 'verifier-dashboard':
      return '/verifier-dashboard';
    case 'verification-workspace':
      return params.id ? `/verification-workspace?id=${encodeURIComponent(params.id)}` : '/verification-workspace';
    case 'gatc-dashboard':
      return '/gatc-dashboard';
    case 'admin-dashboard':
      return '/admin-dashboard';
    case 'certificates':
      return '/certificates';
    case 'official-certificate':
      return params.id ? `/certificates/view?id=${encodeURIComponent(params.id)}` : '/certificates/view';
    case 'audit-logs':
      return '/audit-logs';
    case 'public-qr-verify':
      return params.token ? `/verify/${encodeURIComponent(params.token)}` : '/verify';
    default:
      return '/dashboard';
  }
};

// Robust route parser for pathname + search
const parseRoute = (pathname = window.location.pathname, search = window.location.search) => {
  const cleanPath = pathname.replace(/\/+$/, '') || '/';
  const searchParams = new URLSearchParams(search);

  // 1. Public QR Verification: /verify/:token, /verify?token=..., ?verify=...
  if (cleanPath.startsWith('/verify/')) {
    const token = cleanPath.replace('/verify/', '').trim();
    if (token) return { type: 'public-verify', token };
  }
  if (cleanPath === '/verify') {
    const token = searchParams.get('token') || searchParams.get('verify');
    if (token) return { type: 'public-verify', token };
  }
  if (searchParams.get('verify')) {
    return { type: 'public-verify', token: searchParams.get('verify') };
  }

  // 2. Pre-auth routes: /login, /register, /
  if (cleanPath === '/login') {
    return { type: 'login' };
  }
  if (cleanPath === '/register') {
    return { type: 'register' };
  }
  if (cleanPath === '/' || cleanPath === '') {
    return { type: 'home' };
  }

  // 3. Authenticated routes:
  if (cleanPath === '/dashboard') {
    return { type: 'tab', tab: 'dashboard' };
  }
  if (cleanPath === '/instruments') {
    return { type: 'tab', tab: 'instruments' };
  }
  if (cleanPath === '/instruments/detail' || cleanPath === '/instrument-detail' || (cleanPath.startsWith('/instruments/') && cleanPath !== '/instruments')) {
    const idFromPath = cleanPath.startsWith('/instruments/') && cleanPath !== '/instruments/detail'
      ? cleanPath.replace('/instruments/', '')
      : null;
    return {
      type: 'tab',
      tab: 'instrument-detail',
      params: { id: idFromPath || searchParams.get('id') }
    };
  }
  if (cleanPath === '/apply-verification' || cleanPath === '/apply') {
    return {
      type: 'tab',
      tab: 'apply-verification',
      params: {
        step: searchParams.get('step') ? parseInt(searchParams.get('step'), 10) : undefined,
        instId: searchParams.get('instId') || searchParams.get('instrument_id'),
        appId: searchParams.get('appId') || searchParams.get('application_id'),
        mode: searchParams.get('mode')
      }
    };
  }
  if (cleanPath === '/vendor-apply-tank' || cleanPath === '/apply-tank') {
    return { type: 'tab', tab: 'vendor-apply-tank' };
  }
  if (cleanPath === '/applications/rejected') {
    return { type: 'tab', tab: 'applications-rejected' };
  }
  if (cleanPath === '/applications') {
    return { type: 'tab', tab: 'applications' };
  }
  if (cleanPath === '/applications/review' || cleanPath === '/application-review') {
    return {
      type: 'tab',
      tab: 'application-review',
      params: { id: searchParams.get('id') || searchParams.get('appId') }
    };
  }
  if (cleanPath === '/applications/assign' || cleanPath === '/assignment-decision') {
    return {
      type: 'tab',
      tab: 'assignment-decision',
      params: { id: searchParams.get('id') || searchParams.get('appId') }
    };
  }
  if (cleanPath === '/applications/timeline' || cleanPath === '/application-timeline' || (cleanPath.startsWith('/applications/') && cleanPath !== '/applications')) {
    const idFromPath = cleanPath.startsWith('/applications/') && cleanPath !== '/applications/timeline'
      ? cleanPath.replace('/applications/', '')
      : null;
    return {
      type: 'tab',
      tab: 'application-timeline',
      params: { id: idFromPath || searchParams.get('id') || searchParams.get('appId') }
    };
  }
  if (cleanPath === '/authority-dashboard') {
    return { type: 'tab', tab: 'authority-dashboard' };
  }
  if (cleanPath === '/verifier-dashboard') {
    return { type: 'tab', tab: 'verifier-dashboard' };
  }
  if (cleanPath === '/verification-workspace') {
    return {
      type: 'tab',
      tab: 'verification-workspace',
      params: { id: searchParams.get('id') || searchParams.get('appId') }
    };
  }
  if (cleanPath === '/gatc-dashboard') {
    return { type: 'tab', tab: 'gatc-dashboard' };
  }
  if (cleanPath === '/admin-dashboard') {
    return { type: 'tab', tab: 'admin-dashboard' };
  }
  if (cleanPath === '/certificates') {
    return { type: 'tab', tab: 'certificates' };
  }
  if (cleanPath === '/certificates/view' || cleanPath === '/official-certificate' || (cleanPath.startsWith('/certificates/') && cleanPath !== '/certificates')) {
    const idFromPath = cleanPath.startsWith('/certificates/') && cleanPath !== '/certificates/view'
      ? cleanPath.replace('/certificates/', '')
      : null;
    return {
      type: 'tab',
      tab: 'official-certificate',
      params: { id: idFromPath || searchParams.get('id') || searchParams.get('certId') }
    };
  }
  if (cleanPath === '/audit-logs') {
    return { type: 'tab', tab: 'audit-logs' };
  }

  // 4. Unknown route -> in-app 404
  return { type: '404', path: pathname };
};

export default function App() {
  const [currentUser, setCurrentUser] = useState(() => getStoredAuth().user);
  const [currentRole, setCurrentRole] = useState(() => getStoredAuth().user?.role || null);

  // Pre-auth screens
  const [showLanding, setShowLanding] = useState(false);
  const [showRegister, setShowRegister] = useState(false);
  const [isNotFound, setIsNotFound] = useState(false);
  const [notFoundPath, setNotFoundPath] = useState('');

  // Active authenticated tab
  const [activeTab, setActiveTab] = useState(() => {
    const user = getStoredAuth().user;
    return user ? getInitialRoleTab(user.role) : 'dashboard';
  });

  // Public QR Token
  const [publicVerifyToken, setPublicVerifyToken] = useState(null);

  // Selected Entities
  const [selectedInstrumentId, setSelectedInstrumentId] = useState(null);
  const [selectedApplicationId, setSelectedApplicationId] = useState(null);
  const [selectedCertificateId, setSelectedCertificateId] = useState(null);

  // Apply Form Custom State
  const [applyModalInstId, setApplyModalInstId] = useState(null);
  const [applyInitialStep, setApplyInitialStep] = useState(1);
  const [resubmitAppData, setResubmitAppData] = useState(null);
  const [pendingPaymentAppData, setPendingPaymentAppData] = useState(null);

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [showQrModal, setShowQrModal] = useState(false);
  const [qrModalInfo, setQrModalInfo] = useState(null);

  // Global Data
  const [instruments, setInstruments] = useState([]);
  const [applications, setApplications] = useState([]);
  const [certificates, setCertificates] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  // Refresh backend data
  const refreshAllData = useCallback(async (user = currentUser) => {
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
  }, [currentUser]);

  // Synchronize route state with React component state
  const applyRouteState = useCallback((route) => {
    const user = getStoredAuth().user;

    if (route.type === 'public-verify') {
      setPublicVerifyToken(route.token);
      setIsNotFound(false);
      return;
    }
    setPublicVerifyToken(null);

    if (!user) {
      // Unauthenticated state
      if (route.type === 'register') {
        setShowLanding(false);
        setShowRegister(true);
        setIsNotFound(false);
      } else if (route.type === 'login') {
        setShowLanding(false);
        setShowRegister(false);
        setIsNotFound(false);
      } else if (route.type === 'home') {
        setShowLanding(true);
        setShowRegister(false);
        setIsNotFound(false);
      } else if (route.type === '404') {
        setShowLanding(false);
        setShowRegister(false);
        setIsNotFound(true);
        setNotFoundPath(route.path);
      } else {
        // Attempting to access protected tab while logged out -> show Login
        setShowLanding(false);
        setShowRegister(false);
        setIsNotFound(false);
      }
      return;
    }

    // Authenticated state
    setShowLanding(false);
    setShowRegister(false);

    if (route.type === 'home' || route.type === 'login' || route.type === 'register') {
      const initialTab = getInitialRoleTab(user.role);
      setActiveTab(initialTab);
      setIsNotFound(false);
      return;
    }

    if (route.type === '404') {
      setIsNotFound(true);
      setNotFoundPath(route.path);
      return;
    }

    if (route.type === 'tab') {
      const allowed = ROLE_ALLOWED_TABS[user.role] || [];
      const targetTab = allowed.includes(route.tab) ? route.tab : getInitialRoleTab(user.role);
      setActiveTab(targetTab);
      setIsNotFound(false);

      if (route.params) {
        if (route.params.id) {
          if (targetTab === 'instrument-detail') setSelectedInstrumentId(route.params.id);
          if (targetTab === 'application-timeline' || targetTab === 'application-review' || targetTab === 'assignment-decision' || targetTab === 'verification-workspace') {
            setSelectedApplicationId(route.params.id);
          }
          if (targetTab === 'official-certificate') setSelectedCertificateId(route.params.id);
        }
        if (route.params.instId) {
          setApplyModalInstId(route.params.instId);
        }
        if (route.params.step) {
          setApplyInitialStep(route.params.step);
        }
      }
    }
  }, []);

  // Primary navigation function
  const navigateTo = useCallback((tab, params = {}, { replace = false } = {}) => {
    const user = currentUser || getStoredAuth().user;
    const url = buildTabUrl(tab, params);

    if (replace) {
      window.history.replaceState({ tab, params }, '', url);
    } else {
      window.history.pushState({ tab, params }, '', url);
    }

    if (tab === 'public-qr-verify') {
      setPublicVerifyToken(params.token || 'demo-token');
      setIsNotFound(false);
      return;
    }

    setPublicVerifyToken(null);
    setIsNotFound(false);

    if (user) {
      const allowed = ROLE_ALLOWED_TABS[user.role] || [];
      const targetTab = allowed.includes(tab) ? tab : getInitialRoleTab(user.role);
      setActiveTab(targetTab);

      if (params.id) {
        if (targetTab === 'instrument-detail') setSelectedInstrumentId(params.id);
        if (targetTab === 'application-timeline' || targetTab === 'application-review' || targetTab === 'assignment-decision' || targetTab === 'verification-workspace') {
          setSelectedApplicationId(params.id);
        }
        if (targetTab === 'official-certificate') setSelectedCertificateId(params.id);
      }
      if (params.instId) {
        setApplyModalInstId(params.instId);
      }
      if (params.step) {
        setApplyInitialStep(params.step);
      }
    }
  }, [currentUser]);

  // Initial mount & popstate listener
  useEffect(() => {
    // Initial route resolve
    const initialRoute = parseRoute(window.location.pathname, window.location.search);
    applyRouteState(initialRoute);

    if (currentUser) {
      api.getMe().then(res => {
        if (!res || !res.user) {
          handleLogout();
        } else {
          setCurrentUser(res.user);
          setCurrentRole(res.user.role);
          refreshAllData(res.user);
        }
      }).catch(() => {
        handleLogout();
      });
    } else {
      setLoading(false);
    }

    // Listen for browser Back/Forward transitions
    const handlePopState = () => {
      const currentRoute = parseRoute(window.location.pathname, window.location.search);
      applyRouteState(currentRoute);
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [applyRouteState, currentUser, refreshAllData]);

  const handleVerifyPublicToken = (token) => {
    window.history.pushState({ tab: 'public-qr-verify', token }, '', `/verify/${token}`);
    setPublicVerifyToken(token);
    setIsNotFound(false);
  };

  const handleLoginSuccess = (authData) => {
    const { user, token } = authData;
    setCurrentUser(user);
    setCurrentRole(user.role);
    setApiUser(user, token);
    setShowLanding(false);
    setShowRegister(false);
    setIsNotFound(false);

    // Check if there was an initial deep-link requested before login
    const currentRoute = parseRoute(window.location.pathname, window.location.search);
    if (currentRoute.type === 'tab') {
      const allowed = ROLE_ALLOWED_TABS[user.role] || [];
      const targetTab = allowed.includes(currentRoute.tab) ? currentRoute.tab : getInitialRoleTab(user.role);
      navigateTo(targetTab, currentRoute.params, { replace: true });
    } else {
      const targetTab = getInitialRoleTab(user.role);
      navigateTo(targetTab, {}, { replace: true });
    }

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
    setIsNotFound(false);
    window.history.pushState({}, '', '/');
    setInstruments([]);
    setApplications([]);
    setCertificates([]);
  };

  const handleOpenApplyModal = (instrumentId = null, step = 1) => {
    setResubmitAppData(null);
    setPendingPaymentAppData(null);
    setApplyModalInstId(instrumentId);
    setApplyInitialStep(step);
    navigateTo('apply-verification', { instId: instrumentId, step });
  };

  const handleOpenResubmit = (app) => {
    setPendingPaymentAppData(null);
    setResubmitAppData(app);
    setApplyModalInstId(app?.instrument_id || null);
    navigateTo('apply-verification', { appId: app?.id, instId: app?.instrument_id, mode: 'resubmit', step: 4 });
  };

  const handleOpenPayment = (app) => {
    setResubmitAppData(null);
    setPendingPaymentAppData(app);
    setApplyModalInstId(app?.instrument_id || null);
    navigateTo('apply-verification', { appId: app?.id, instId: app?.instrument_id, mode: 'payment', step: 9 });
  };

  // Standalone Public Verification Route (Immediate render, no auth or data loading required)
  if (publicVerifyToken) {
    return (
      <PublicCertificateVerification
        token={publicVerifyToken}
        onExit={() => {
          if (currentUser) {
            navigateTo(getInitialRoleTab(currentRole), {}, { replace: true });
          } else {
            window.history.pushState({}, '', '/');
            setShowLanding(true);
            setPublicVerifyToken(null);
          }
        }}
      />
    );
  }

  // Render Pre-Auth Screens
  if (!currentUser) {
    const goToLogin = () => {
      window.history.pushState({}, '', '/login');
      setShowLanding(false);
      setShowRegister(false);
      setIsNotFound(false);
    };
    const goToLanding = () => {
      window.history.pushState({}, '', '/');
      setShowLanding(true);
      setShowRegister(false);
      setIsNotFound(false);
    };
    const goToRegister = () => {
      window.history.pushState({}, '', '/register');
      setShowLanding(false);
      setShowRegister(true);
      setIsNotFound(false);
    };
    const backToLoginFromRegister = () => {
      window.history.pushState({}, '', '/login');
      setShowRegister(false);
      setIsNotFound(false);
    };

    if (isNotFound) {
      return (
        <NotFoundView
          path={notFoundPath}
          onGoHome={goToLanding}
          onGoToLogin={goToLogin}
        />
      );
    }

    if (showLanding) {
      return (
        <PortalLanding
          onGoToLogin={goToLogin}
          onTrackApplication={(appNo) => {
            goToLogin();
          }}
          onVerifyCertificate={handleVerifyPublicToken}
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

  return (
    <>
      <AuthenticatedLayout
        currentUser={currentUser}
        currentRole={currentRole}
        activeTab={activeTab}
        onSelectTab={(tab) => navigateTo(tab)}
        onOpenApplyModal={(instId) => handleOpenApplyModal(instId)}
        onOpenAddModal={() => setShowAddModal(true)}
        onVerifyPublicToken={handleVerifyPublicToken}
        onLogout={handleLogout}
        onGoHome={() => navigateTo(getInitialRoleTab(currentRole))}
      >
        {/* In-app 404 Route for Authenticated Users */}
        {isNotFound ? (
          <NotFoundView
            currentUser={currentUser}
            currentRole={currentRole}
            path={notFoundPath}
            onGoHome={() => navigateTo(getInitialRoleTab(currentRole))}
          />
        ) : (
          <>
            {/* LMOMS Vehicle Tank Verification View */}
            {activeTab === 'vendor-apply-tank' && (
              <VendorApplyVerificationView
                instruments={instruments}
                onOpenApplyModal={(instId) => handleOpenApplyModal(instId)}
                onOpenAddModal={() => setShowAddModal(true)}
              />
            )}

            {/* Resubmit Rejected Weights/Measures */}
            {activeTab === 'applications-rejected' && (
              <ApplicationsList
                applications={applications.filter(a => a.status === 'FAILED' || a.status === 'REJECTED' || a.status === 'RETURNED')}
                onSelectApplication={(id) => {
                  setSelectedApplicationId(id);
                  navigateTo('application-timeline', { id });
                }}
                onOpenApplyModal={(instId) => handleOpenApplyModal(instId)}
                onSelectCertificate={(id) => {
                  setSelectedCertificateId(id);
                  navigateTo('official-certificate', { id });
                }}
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
                onOpenApplyModal={(instId) => handleOpenApplyModal(instId)}
                onSelectInstrument={(id) => {
                  setSelectedInstrumentId(id);
                  navigateTo('instrument-detail', { id });
                }}
                onSelectApplication={(id) => {
                  setSelectedApplicationId(id);
                  navigateTo('application-timeline', { id });
                }}
                onSelectCertificate={(id) => {
                  setSelectedCertificateId(id);
                  navigateTo('official-certificate', { id });
                }}
                onResubmitApplication={handleOpenResubmit}
                onPayApplication={handleOpenPayment}
                onRequestVerification={(instId) => handleOpenApplyModal(instId)}
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
                initialStep={applyInitialStep}
                resubmitApplicationData={resubmitAppData}
                pendingPaymentApplication={pendingPaymentAppData}
                onClose={() => {
                  setApplyModalInstId(null);
                  setResubmitAppData(null);
                  setPendingPaymentAppData(null);
                  navigateTo('dashboard');
                }}
                onApplicationCreated={async (newAppId) => {
                  await refreshAllData();
                  setSelectedApplicationId(newAppId);
                  navigateTo('application-timeline', { id: newAppId });
                }}
                onOpenAddInstrument={() => {
                  setShowAddModal(true);
                }}
                onViewApplicationTimeline={(newAppId) => {
                  setSelectedApplicationId(newAppId);
                  navigateTo('application-timeline', { id: newAppId });
                }}
              />
            )}

            {activeTab === 'instruments' && (
              <InstrumentsList
                instruments={instruments}
                onOpenAddModal={() => setShowAddModal(true)}
                onOpenApplyModal={(instId) => handleOpenApplyModal(instId)}
                onSelectInstrument={(id) => {
                  setSelectedInstrumentId(id);
                  navigateTo('instrument-detail', { id });
                }}
                onRequestVerification={(instId) => handleOpenApplyModal(instId)}
                onOpenQR={(info) => {
                  setQrModalInfo(info);
                  setShowQrModal(true);
                }}
              />
            )}

            {activeTab === 'instrument-detail' && (
              <InstrumentDetail
                instrumentId={selectedInstrumentId}
                onBack={() => navigateTo('instruments')}
                onRequestVerification={(instId) => handleOpenApplyModal(instId)}
                onOpenApplyModal={(instId) => handleOpenApplyModal(instId)}
                onOpenQR={(info) => {
                  setQrModalInfo(info);
                  setShowQrModal(true);
                }}
                onSelectCertificate={(id) => {
                  setSelectedCertificateId(id);
                  navigateTo('official-certificate', { id });
                }}
              />
            )}

            {activeTab === 'applications' && (
              <ApplicationsList
                applications={applications}
                onSelectApplication={(id) => {
                  setSelectedApplicationId(id);
                  navigateTo('application-timeline', { id });
                }}
                onOpenApplyModal={(instId) => handleOpenApplyModal(instId)}
                onSelectCertificate={(id) => {
                  setSelectedCertificateId(id);
                  navigateTo('official-certificate', { id });
                }}
                onResubmitApplication={handleOpenResubmit}
                onPayApplication={handleOpenPayment}
              />
            )}

            {activeTab === 'application-timeline' && (
              <ApplicationTimeline
                applicationId={selectedApplicationId}
                onBack={() => navigateTo(currentRole === 'AUTHORITY' ? 'authority-dashboard' : 'applications')}
                onOpenQR={(info) => {
                  setQrModalInfo(info);
                  setShowQrModal(true);
                }}
                onSelectCertificate={(id) => {
                  setSelectedCertificateId(id);
                  navigateTo('official-certificate', { id });
                }}
                onResubmitApplication={handleOpenResubmit}
                onPayApplication={handleOpenPayment}
              />
            )}

            {/* ========================================================
                CERTIFICATE VIEWS (Slice 3)
               ======================================================== */}
            {activeTab === 'certificates' && (
              <CertificatesList
                certificates={certificates}
                onSelectCertificate={(id) => {
                  setSelectedCertificateId(id);
                  navigateTo('official-certificate', { id });
                }}
                onOpenQR={(info) => {
                  setQrModalInfo(info);
                  setShowQrModal(true);
                }}
                onVerifyPublicToken={handleVerifyPublicToken}
              />
            )}

            {activeTab === 'official-certificate' && (
              <OfficialCertificate
                certificateId={selectedCertificateId}
                onBack={() => navigateTo(currentRole === 'TRADER' ? 'certificates' : currentRole === 'AUTHORITY' ? 'authority-dashboard' : 'verifier-dashboard')}
                onOpenQR={(info) => {
                  setQrModalInfo(info);
                  setShowQrModal(true);
                }}
                onVerifyPublicToken={handleVerifyPublicToken}
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
                onReviewApplication={(id) => {
                  setSelectedApplicationId(id);
                  navigateTo('application-review', { id });
                }}
                onViewWorkload={() => navigateTo('audit-logs')}
              />
            )}

            {activeTab === 'application-review' && (
              <ApplicationReview
                applicationId={selectedApplicationId}
                onBack={() => navigateTo('authority-dashboard')}
                onProceedToAssignment={(id) => {
                  setSelectedApplicationId(id);
                  navigateTo('assignment-decision', { id });
                }}
                onViewCertificate={(id) => {
                  setSelectedCertificateId(id);
                  navigateTo('official-certificate', { id });
                }}
              />
            )}

            {activeTab === 'assignment-decision' && (
              <AssignmentDecisionSupport
                applicationId={selectedApplicationId}
                currentUser={currentUser}
                onBack={() => navigateTo('application-review', { id: selectedApplicationId })}
                onAssignmentComplete={async (appId) => {
                  await refreshAllData();
                  setSelectedApplicationId(appId);
                  navigateTo('application-timeline', { id: appId });
                }}
              />
            )}

            {/* ========================================================
                GATC LAB METROLOGY CONSOLE
               ======================================================== */}
            {activeTab === 'gatc-dashboard' && (
              <GatcDashboard
                currentUser={currentUser}
                onOpenCase={(appId) => {
                  setSelectedApplicationId(appId);
                  navigateTo('verification-workspace', { id: appId });
                }}
              />
            )}

            {/* ========================================================
                PLATFORM ADMIN CONSOLE
               ======================================================== */}
            {activeTab === 'admin-dashboard' && (
              <AdminDashboard
                currentUser={currentUser}
                onViewAuditLogs={() => navigateTo('audit-logs')}
              />
            )}

            {/* ========================================================
                VERIFIER VIEWS: Login -> Dashboard -> Assigned Cases -> Open Workspace
               ======================================================== */}
            {activeTab === 'verifier-dashboard' && (
              <VerifierDashboard
                currentUser={currentUser}
                onOpenCase={(appId) => {
                  setSelectedApplicationId(appId);
                  navigateTo('verification-workspace', { id: appId });
                }}
              />
            )}

            {activeTab === 'verification-workspace' && (
              <VerificationWorkspace
                applicationId={selectedApplicationId}
                currentUser={currentUser}
                onBack={() => navigateTo(currentRole === 'GATC' ? 'gatc-dashboard' : 'verifier-dashboard')}
                onVerificationCompleted={async () => {
                  await refreshAllData();
                }}
                onViewCertificate={(id) => {
                  setSelectedCertificateId(id);
                  navigateTo('official-certificate', { id });
                }}
              />
            )}

            {/* ========================================================
                GOVERNANCE AUDIT LEDGER (Authority & Admin)
               ======================================================== */}
            {activeTab === 'audit-logs' && (
              <AuditLogView />
            )}
          </>
        )}
      </AuthenticatedLayout>

      {/* Global Add Instrument Modal */}
      {showAddModal && (
        <AddInstrumentModal
          currentUser={currentUser}
          onClose={() => setShowAddModal(false)}
          onCreated={async (newId) => {
            await refreshAllData();
            setSelectedInstrumentId(newId);
            navigateTo('instrument-detail', { id: newId });
          }}
        />
      )}

      {/* Global QR Code Inspection Modal */}
      {showQrModal && (
        <QRCodeModal
          certificate={qrModalInfo}
          onClose={() => setShowQrModal(false)}
          onNavigateToVerify={handleVerifyPublicToken}
        />
      )}
    </>
  );
}
