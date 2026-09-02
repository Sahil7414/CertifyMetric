import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import TraderDashboard from './views/TraderDashboard';
import InstrumentsList from './views/InstrumentsList';
import AddInstrumentModal from './views/AddInstrumentModal';
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
import QRCodeModal from './components/QRCodeModal';
import LoginView from './views/LoginView';
import AuditLogView from './views/AuditLogView';
import { api, setApiUser, getStoredAuth } from './api';

export default function App() {
  const [currentUser, setCurrentUser] = useState(() => getStoredAuth().user);
  const [currentRole, setCurrentRole] = useState(() => getStoredAuth().user?.role || null);
  const [activeTab, setActiveTab] = useState(() => {
    const role = getStoredAuth().user?.role;
    if (role === 'TRADER') return 'dashboard';
    if (role === 'AUTHORITY' || role === 'PLATFORM_ADMIN') return 'authority-dashboard';
    if (role === 'VERIFIER' || role === 'GATC') return 'verifier-dashboard';
    return 'dashboard';
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

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
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

      setInstruments(instList);
      setApplications(appList);
      setCertificates(certList);
      setStats(statData);
    } catch (err) {
      console.error('Failed to load application data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (currentUser) {
      refreshAllData(currentUser);
    } else {
      setLoading(false);
    }

    // Listen for browser navigation changes (Back/Forward, pushState, QR scan links)
    const handlePopState = () => {
      const path = window.location.pathname;
      if (path.startsWith('/verify/')) {
        setPublicVerifyToken(path.replace('/verify/', '').trim() || null);
      } else {
        const params = new URLSearchParams(window.location.search);
        setPublicVerifyToken(params.get('verify') || null);
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

    // Determine portal / dashboard strictly based on database role:
    if (user.role === 'TRADER') setActiveTab('dashboard');
    else if (user.role === 'AUTHORITY' || user.role === 'PLATFORM_ADMIN') setActiveTab('authority-dashboard');
    else if (user.role === 'VERIFIER' || user.role === 'GATC') setActiveTab('verifier-dashboard');

    refreshAllData(user);
  };

  const handleLogout = async () => {
    try {
      await api.logout();
    } catch (e) {}
    setApiUser(null);
    setCurrentUser(null);
    setCurrentRole(null);
    setInstruments([]);
    setApplications([]);
    setCertificates([]);
  };

  const handleRequestVerification = async (instrumentId) => {
    try {
      const res = await api.createApplication({
        instrument_id: instrumentId,
        trader_id: currentUser?.id,
        request_type: 'INITIAL_VERIFICATION'
      });
      await refreshAllData();
      setSelectedApplicationId(res.id);
      setActiveTab('application-timeline');
    } catch (err) {
      alert('Error requesting verification: ' + err.message);
    }
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

  // Render Login Screen if not authenticated
  if (!currentUser) {
    return <LoginView onLoginSuccess={handleLoginSuccess} />;
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
    <div className="min-h-screen bg-surface flex flex-col antialiased text-on-surface">
      {/* Platform Navigation */}
      <Navbar
        currentUser={currentUser}
        currentRole={currentRole}
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        onOpenAddModal={() => setShowAddModal(true)}
        onLogout={handleLogout}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* ========================================================
            TRADER VIEWS: Login -> Dashboard -> Add Instrument -> Request Verification
           ======================================================== */}
        {activeTab === 'dashboard' && (
          <TraderDashboard
            currentUser={currentUser}
            instruments={instruments}
            applications={applications}
            certificates={certificates}
            onOpenAddModal={() => setShowAddModal(true)}
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
            onRequestVerification={handleRequestVerification}
            onOpenQR={(info) => {
              setQrModalInfo(info);
              setShowQrModal(true);
            }}
            onViewAllInstruments={() => setActiveTab('instruments')}
          />
        )}

        {activeTab === 'instruments' && (
          <InstrumentsList
            instruments={instruments}
            onOpenAddModal={() => setShowAddModal(true)}
            onSelectInstrument={(id) => {
              setSelectedInstrumentId(id);
              setActiveTab('instrument-detail');
            }}
            onRequestVerification={handleRequestVerification}
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
            onRequestVerification={handleRequestVerification}
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

        {activeTab === 'application-timeline' && (
          <ApplicationTimeline
            applicationId={selectedApplicationId}
            onBack={() => setActiveTab(currentRole === 'AUTHORITY' ? 'authority-dashboard' : 'dashboard')}
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
            onBack={() => setActiveTab('verifier-dashboard')}
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
      </main>

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
    </div>
  );
}
