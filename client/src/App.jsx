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
import { api, setApiUser, getStoredAuth } from './api';

const ROLE_ALLOWED_TABS = {
  TRADER: ['dashboard', 'instruments', 'instrument-detail', 'apply-verification', 'applications', 'application-timeline', 'applications-rejected', 'vendor-apply-tank', 'certificates', 'official-certificate', 'public-qr-verify'],
  AUTHORITY: ['authority-dashboard', 'applications', 'application-timeline', 'application-review', 'assignment-decision', 'certificates', 'official-certificate', 'audit-logs', 'public-qr-verify'],
  VERIFIER: ['verifier-dashboard', 'verification-workspace', 'certificates', 'official-certificate', 'public-qr-verify'],
  GATC: ['gatc-dashboard', 'verification-workspace', 'certificates', 'official-certificate', 'public-qr-verify'],
  PLATFORM_ADMIN: ['admin-dashboard', 'audit-logs', 'public-qr-verify']
};

const getInitialRoleTab = (role) => {
  if (role === 'TRADER') return 'dashboard';
  if (role === 'AUTHORITY') return 'authority-dashboard';
  if (role === 'PLATFORM_ADMIN') return 'admin-dashboard';
  if (role === 'VERIFIER') return 'verifier-dashboard';
  if (role === 'GATC') return 'gatc-dashboard';
  return 'dashboard';
};

// Reads the current path once at module scope so the initial render already
// matches the URL — avoids a flash of the wrong screen on refresh/deep-link.
const getInitialPreAuthState = () => {
  const path = window.location.pathname;
  if (path === '/register') return { showLanding: false, showRegister: true };
  if (path === '/login') return { showLanding: false, showRegister: false };
  return { showLanding: true, showRegister: false };
};

export default function App() {
  const [currentUser, setCurrentUser] = useState(() => getStoredAuth().user);
  const [currentRole, setCurrentRole] = useState(() => getStoredAuth().user?.role || null);
  const [showLanding, setShowLanding] = useState(() =>
    getStoredAuth().user ? false : getInitialPreAuthState().showLanding
  );
  const [showRegister, setShowRegister] = useState(() =>
    getStoredAuth().user ? false : getInitialPreAuthState().showRegister
  );
  const [activeTab, setActiveTab] = useState(() => {
    const role = getStoredAuth().user?.role;
    return getInitialRoleTab(role);
  });

  // Public QR Verification Route State (No auth required)
  const [publicVerifyToken, setPublicVerifyToken] = useState(() => {
    const path = window.location.pathname;
    if (path.startsWith('/verify/')) {
      const t = path.replace('/verify/', '').trim();
      return t || null;
    }
    const params = new URLSearchParams(window.location.search);
    return params.get('verify') || null;
  });

  // Selected Entities for Drill-down Views
  const [selectedInstrumentId, setSelectedInstrumentId] = useState(null);
  const [selectedApplicationId, setSelectedApplicationId] = useState(null);
  const [selectedCertificateId, setSelectedCertificateId] = useState(null);

  // Modals & Navigation States
  const [showAddModal, setShowAddModal] = useState(false);
  const [applyModalInstId, setApplyModalInstId] = useState(null);
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

  useEffect(() => {
    if (currentUser) {
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

    // Listen for browser navigation changes (Back/Forward, pushState, QR scan links)
    const handlePopState = () => {
      const path = window.location.pathname;
      if (path.startsWith('/verify/')) {
        setPublicVerifyToken(path.replace('/verify/', '').trim() || null);
        return;
      }
      const params = new URLSearchParams(window.location.search);
      const verifyParam = params.get('verify');
      if (verifyParam) {
        setPublicVerifyToken(verifyParam);
        return;
      }
      setPublicVerifyToken(null);

      // Pre-auth screen transitions (Landing / Login / Register) — this makes the
      // browser's Back button move between these screens instead of leaving the
      // app entirely, since without pushState history had nowhere else to go.
      if (!getStoredAuth().user) {
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
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const handleVerifyPublicToken = (token) => {
    window.history.pushState({}, '', `/verify/${token}`);
    setPublicVerifyToken(token);
  };

  const handleLoginSuccess = (authData) => {
    const { user, token } = authData;
    setCurrentUser(user);
    setCurrentRole(user.role);
    setApiUser(user, token);
    setShowLanding(false);
    setShowRegister(false);
    window.history.pushState({}, '', '/dashboard');

    // Determine portal / dashboard strictly based on database role:
    const targetTab = getInitialRoleTab(user.role);
    setActiveTab(targetTab);

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
    window.history.pushState({}, '', '/');
    setInstruments([]);
    setApplications([]);
    setCertificates([]);
  };

  const handleOpenApplyModal = (instrumentId = null) => {
    setResubmitAppData(null);
    setPendingPaymentAppData(null);
    setApplyModalInstId(instrumentId);
    setActiveTab('apply-verification');
  };

  const handleOpenResubmit = (app) => {
    setPendingPaymentAppData(null);
    setResubmitAppData(app);
    setApplyModalInstId(app?.instrument_id || null);
    setActiveTab('apply-verification');
  };

  const handleOpenPayment = (app) => {
    setResubmitAppData(null);
    setPendingPaymentAppData(app);
    setApplyModalInstId(app?.instrument_id || null);
    setActiveTab('apply-verification');
  };

  // Standalone Public Verification Route (Immediate render, no auth/login or data loading required)
  if (publicVerifyToken) {
    return (
      <PublicCertificateVerification
        token={publicVerifyToken}
        onExit={() => {
          window.history.pushState({}, '', '/');
          setPublicVerifyToken(null);
        }}
      />
    );
  }

  // Render Landing Page or Login Screen if not authenticated
  if (!currentUser) {
    const goToLogin = () => {
      window.history.pushState({}, '', '/login');
      setShowLanding(false);
    };
    const goToLanding = () => {
      window.history.pushState({}, '', '/');
      setShowLanding(true);
      setShowRegister(false);
    };
    const goToRegister = () => {
      window.history.pushState({}, '', '/register');
      setShowRegister(true);
    };
    const backToLoginFromRegister = () => {
      window.history.pushState({}, '', '/login');
      setShowRegister(false);
    };

    if (showLanding) {
      return (
        <PortalLanding
          onGoToLogin={goToLogin}
          onTrackApplication={(appNo) => {
            // Switch to login for secure access to application tracking
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

  const handleTabChange = (tab) => {
    const allowed = ROLE_ALLOWED_TABS[currentRole] || [];
    if (!allowed.includes(tab)) {
      console.warn(`Access denied to tab '${tab}' for role '${currentRole}'`);
      setActiveTab(getInitialRoleTab(currentRole));
      return;
    }
    setActiveTab(tab);
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
        onVerifyPublicToken={handleVerifyPublicToken}
        onLogout={handleLogout}
        onGoHome={() => handleTabChange(getInitialRoleTab(currentRole))}
      >
        {/* LMOMS Vehicle Tank Verification View (Matches Screenshot) */}
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
                onSelectApplication={(id) => {
                  setSelectedApplicationId(id);
                  setActiveTab('application-timeline');
                }}
                onOpenApplyModal={handleOpenApplyModal}
                onSelectCertificate={(id) => {
                  setSelectedCertificateId(id);
                  setActiveTab('official-certificate');
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
            onOpenApplyModal={handleOpenApplyModal}
            onSelectInstrument={(id) => {
              setSelectedInstrumentId(id);
              setActiveTab('instrument-detail');
            }}
            onSelectApplication={(id) => {
              setSelectedApplicationId(id);
              setActiveTab('application-timeline');
            }}
            onSelectCertificate={(id) => {
              setSelectedCertificateId(id);
              setActiveTab('official-certificate');
            }}
            onResubmitApplication={handleOpenResubmit}
            onPayApplication={handleOpenPayment}
            onRequestVerification={handleOpenApplyModal}
            onOpenQR={(info) => {
              setQrModalInfo(info);
              setShowQrModal(true);
            }}
            onViewAllInstruments={() => setActiveTab('instruments')}
            onViewAllApplications={() => setActiveTab('applications')}
            onViewAllCertificates={() => setActiveTab('certificates')}
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
              setActiveTab('dashboard');
            }}
            onApplicationCreated={async (newAppId) => {
              await refreshAllData();
              setSelectedApplicationId(newAppId);
              setActiveTab('application-timeline');
            }}
            onOpenAddInstrument={() => {
              setShowAddModal(true);
            }}
            onViewApplicationTimeline={(newAppId) => {
              setSelectedApplicationId(newAppId);
              setActiveTab('application-timeline');
            }}
          />
        )}

        {activeTab === 'instruments' && (
          <InstrumentsList
            instruments={instruments}
            onOpenAddModal={() => setShowAddModal(true)}
            onOpenApplyModal={handleOpenApplyModal}
            onSelectInstrument={(id) => {
              setSelectedInstrumentId(id);
              setActiveTab('instrument-detail');
            }}
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
            onBack={() => setActiveTab('instruments')}
            onRequestVerification={handleOpenApplyModal}
            onOpenApplyModal={handleOpenApplyModal}
            onOpenQR={(info) => {
              setQrModalInfo(info);
              setShowQrModal(true);
            }}
            onSelectCertificate={(id) => {
              setSelectedCertificateId(id);
              setActiveTab('official-certificate');
            }}
          />
        )}

        {activeTab === 'applications' && (
          <ApplicationsList
            applications={applications}
            onSelectApplication={(id) => {
              setSelectedApplicationId(id);
              setActiveTab('application-timeline');
            }}
            onOpenApplyModal={handleOpenApplyModal}
            onSelectCertificate={(id) => {
              setSelectedCertificateId(id);
              setActiveTab('official-certificate');
            }}
            onResubmitApplication={handleOpenResubmit}
            onPayApplication={handleOpenPayment}
          />
        )}

        {activeTab === 'application-timeline' && (
          <ApplicationTimeline
            applicationId={selectedApplicationId}
            onBack={() => setActiveTab(currentRole === 'AUTHORITY' ? 'authority-dashboard' : 'applications')}
            onOpenQR={(info) => {
              setQrModalInfo(info);
              setShowQrModal(true);
            }}
            onSelectCertificate={(id) => {
              setSelectedCertificateId(id);
              setActiveTab('official-certificate');
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
              setActiveTab('official-certificate');
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
            onBack={() => setActiveTab(currentRole === 'TRADER' ? 'certificates' : currentRole === 'AUTHORITY' ? 'authority-dashboard' : 'verifier-dashboard')}
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
              setActiveTab('application-review');
            }}
            onViewWorkload={() => setActiveTab('audit-logs')}
          />
        )}

        {activeTab === 'application-review' && (
          <ApplicationReview
            applicationId={selectedApplicationId}
            onBack={() => setActiveTab('authority-dashboard')}
            onProceedToAssignment={(id) => {
              setSelectedApplicationId(id);
              setActiveTab('assignment-decision');
            }}
            onViewCertificate={(id) => {
              setSelectedCertificateId(id);
              setActiveTab('official-certificate');
            }}
          />
        )}

        {activeTab === 'assignment-decision' && (
          <AssignmentDecisionSupport
            applicationId={selectedApplicationId}
            currentUser={currentUser}
            onBack={() => setActiveTab('application-review')}
            onAssignmentComplete={async (appId) => {
              await refreshAllData();
              setSelectedApplicationId(appId);
              setActiveTab('application-timeline');
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
              setActiveTab('verification-workspace');
            }}
          />
        )}

        {/* ========================================================
            PLATFORM ADMIN CONSOLE
           ======================================================== */}
        {activeTab === 'admin-dashboard' && (
          <AdminDashboard
            currentUser={currentUser}
            onViewAuditLogs={() => setActiveTab('audit-logs')}
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
              setActiveTab('verification-workspace');
            }}
          />
        )}

        {activeTab === 'verification-workspace' && (
          <VerificationWorkspace
            applicationId={selectedApplicationId}
            currentUser={currentUser}
            onBack={() => setActiveTab(currentRole === 'GATC' ? 'gatc-dashboard' : 'verifier-dashboard')}
            onVerificationCompleted={async () => {
              await refreshAllData();
            }}
            onViewCertificate={(id) => {
              setSelectedCertificateId(id);
              setActiveTab('official-certificate');
            }}
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
            setSelectedInstrumentId(newId);
            setActiveTab('instrument-detail');
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
