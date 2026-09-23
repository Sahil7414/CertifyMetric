import React, { useState } from 'react';
import QrScannerModal from '../components/QrScannerModal';

const ROLES_DATA = [
  {
    role: 'TRADER',
    title: 'Trader / Owner',
    badge: 'Commercial',
    icon: 'storefront',
    description: 'Register instruments, file verification applications, remit statutory fees, and download compliance certificates.',
    actionLabel: 'Trader Login',
    demoUser: {
      role: 'TRADER',
      email: 'demo.trader@certifymetric.local',
      password: 'DemoTrader@2026'
    },
    accent: 'border-emerald-200 hover:border-emerald-500 bg-emerald-50/30'
  },
  {
    role: 'AUTHORITY',
    title: 'Authority Officer',
    badge: 'Statutory LM Officer',
    icon: 'admin_panel_settings',
    description: 'Scrutinize applications, allocate verifiers using competence rules, review test evidence, and issue certificates.',
    actionLabel: 'Officer Login',
    demoUser: {
      role: 'AUTHORITY',
      email: 'demo.authority@certifymetric.local',
      password: 'DemoAuthority@2026'
    },
    accent: 'border-blue-200 hover:border-blue-500 bg-blue-50/30'
  },
  {
    role: 'VERIFIER',
    title: 'Field Verifier',
    badge: 'On-Site Inspection',
    icon: 'shield_person',
    description: 'Perform on-site calibrations against MPE tolerance limits, upload photographic evidence, and submit verification reports.',
    actionLabel: 'Verifier Login',
    demoUser: {
      role: 'VERIFIER',
      email: 'demo.verifier@certifymetric.local',
      password: 'DemoVerifier@2026'
    },
    accent: 'border-purple-200 hover:border-purple-500 bg-purple-50/30'
  },
  {
    role: 'GATC',
    title: 'GATC Lab',
    badge: 'Metrology Testing',
    icon: 'science',
    description: 'Receive laboratory test requests, perform reference standard tests under controlled conditions, and record reports.',
    actionLabel: 'Lab Login',
    demoUser: {
      role: 'GATC',
      email: 'demo.gatc@certifymetric.local',
      password: 'DemoGatc@2026'
    },
    accent: 'border-amber-200 hover:border-amber-500 bg-amber-50/30'
  },
  {
    role: 'PLATFORM_ADMIN',
    title: 'Portal Admin',
    badge: 'Governance',
    icon: 'settings_suggest',
    description: 'Manage officer accounts, statutory organizations, instrument categories, rule sets, and audit immutable system logs.',
    actionLabel: 'Admin Login',
    demoUser: {
      role: 'PLATFORM_ADMIN',
      email: 'demo.admin@certifymetric.local',
      password: 'DemoAdmin@2026'
    },
    accent: 'border-rose-200 hover:border-rose-500 bg-rose-50/30'
  }
];

const WORKFLOW_STEPS = [
  { step: '1', title: 'Register Instrument', desc: 'Add equipment specs, serial number & location' },
  { step: '2', title: 'Submit Application', desc: 'Apply for Original or Periodic Re-Verification' },
  { step: '3', title: 'Complete Payment', desc: 'Remit statutory fee via Razorpay or Challan' },
  { step: '4', title: 'Inspection & Testing', desc: 'Field verifier or GATC lab conducts MPE tests' },
  { step: '5', title: 'Authority Approval', desc: 'Legal Metrology Officer reviews report & evidence' },
  { step: '6', title: 'Certificate + QR', desc: 'Receive digitally signed certificate with QR' }
];

export default function PortalLanding({
  onGoToLogin,
  onGoToRegister,
  onVerifyCertificate,
  onValidateInstrument,
  onDirectDemoLogin
}) {
  const [certToken, setCertToken] = useState('');
  const [certTokenError, setCertTokenError] = useState('');
  const [instToken, setInstToken] = useState('');
  const [instTokenError, setInstTokenError] = useState('');
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [scannerTarget, setScannerTarget] = useState('INSTRUMENT'); // 'CERTIFICATE' | 'INSTRUMENT'
  // Certificate verify popup modal
  const [isCertModalOpen, setIsCertModalOpen] = useState(false);

  const handleVerifyCertSubmit = (e) => {
    e?.preventDefault();
    const cleanToken = certToken.trim();
    if (!cleanToken) {
      setCertTokenError('Please enter a certificate public token or UUID');
      return;
    }
    setCertTokenError('');
    onVerifyCertificate(cleanToken);
  };

  const handleValidateInstSubmit = (e) => {
    e?.preventDefault();
    const cleanToken = instToken.trim();
    if (!cleanToken) {
      setInstTokenError('Please enter an instrument public code or serial number');
      return;
    }
    setInstTokenError('');
    if (onValidateInstrument) {
      onValidateInstrument(cleanToken);
    } else {
      onVerifyCertificate(cleanToken);
    }
  };

  const handleQrScanned = (scannedToken) => {
    setIsScannerOpen(false);
    if (!scannedToken) return;
    if (scannerTarget === 'CERTIFICATE') {
      onVerifyCertificate(scannedToken);
    } else {
      if (onValidateInstrument) {
        onValidateInstrument(scannedToken);
      } else {
        onVerifyCertificate(scannedToken);
      }
    }
  };

  const handleRoleAction = (roleItem) => {
    if (onDirectDemoLogin && roleItem.demoUser) {
      onDirectDemoLogin(roleItem.demoUser);
    } else {
      onGoToLogin();
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col text-slate-800 font-sans antialiased selection:bg-amber-400 selection:text-[#002046] overflow-x-hidden w-full max-w-full">
      
      {/* ====================================================
          1. HEADER
         ==================================================== */}
      <header className="bg-[#002046] text-white sticky top-0 z-40 shadow-md border-b border-[#001733] w-full overflow-hidden">
        {/* Statutory context stripe */}
        <div className="bg-[#001733] text-slate-300 px-3 sm:px-4 py-1 flex items-center justify-between text-[11px] border-b border-[#1b365d]/50 overflow-hidden w-full">
          <div className="flex items-center gap-1.5 sm:gap-2 min-w-0 truncate">
            <span className="material-symbols-outlined text-[14px] text-amber-400 shrink-0">balance</span>
            <span className="font-semibold text-white tracking-wide truncate text-[10.5px] sm:text-[11px]">
              Govt. of India • Ministry of Consumer Affairs
            </span>
            <span className="hidden md:inline text-slate-500">|</span>
            <span className="hidden md:inline text-slate-400">Legal Metrology Division</span>
          </div>
          <div className="text-[10px] text-slate-400 font-mono hidden sm:block shrink-0">
            CertifyMetric LMOMS
          </div>
        </div>

        {/* Main Navbar */}
        <div className="max-w-6xl mx-auto px-3 sm:px-6 h-14 sm:h-16 flex items-center justify-between gap-2 min-w-0 w-full">
          {/* Logo & Portal Name */}
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-br from-amber-400 to-amber-500 text-[#002046] flex items-center justify-center font-black shadow-xs shrink-0">
              <span className="material-symbols-outlined text-lg sm:text-2xl font-bold">scale</span>
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1 sm:gap-2">
                <span className="text-sm sm:text-lg font-black tracking-tight text-white truncate">CertifyMetric</span>
                <span className="px-1.5 py-0.5 rounded text-[9px] font-extrabold bg-amber-400/20 text-amber-300 border border-amber-400/30 uppercase hidden sm:inline-block shrink-0">
                  LMOMS
                </span>
              </div>
              <p className="text-[10px] text-slate-300 leading-none hidden sm:block truncate">
                Weights & Measures Verification System
              </p>
            </div>
          </div>

          {/* Login & Register CTAs */}
          <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
            <a
              href="#verify-certificate"
              className="hidden md:flex items-center gap-1 text-xs font-semibold text-slate-300 hover:text-amber-300 px-3 py-1.5 rounded-lg transition-colors"
            >
              <span className="material-symbols-outlined text-sm">qr_code_scanner</span>
              <span>Verify Certificate</span>
            </a>
            <button
              type="button"
              onClick={onGoToLogin}
              className="px-2.5 sm:px-3.5 py-1.5 sm:py-2 text-xs font-bold text-white bg-white/10 hover:bg-white/20 border border-white/20 rounded-xl transition-all flex items-center gap-1 cursor-pointer shadow-2xs shrink-0"
            >
              <span className="material-symbols-outlined text-sm">login</span>
              <span>Login</span>
            </button>
            <button
              type="button"
              onClick={onGoToRegister || onGoToLogin}
              className="px-2.5 sm:px-4 py-1.5 sm:py-2 text-xs font-bold text-[#002046] bg-amber-400 hover:bg-amber-300 rounded-xl transition-all flex items-center gap-1 shadow-sm hover:shadow cursor-pointer shrink-0"
            >
              <span className="material-symbols-outlined text-sm">person_add</span>
              <span>Register</span>
            </button>
          </div>
        </div>
      </header>

      {/* ====================================================
          2. SHORT HERO
         ==================================================== */}
      <section className="bg-gradient-to-b from-[#002046] to-[#0a2f5c] text-white py-8 sm:py-16 px-3 sm:px-6 text-center overflow-hidden w-full">
        <div className="max-w-3xl mx-auto space-y-3 sm:space-y-4 px-1 min-w-0">
          <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-white/10 border border-white/15 text-amber-300 text-[10.5px] sm:text-xs font-semibold max-w-full">
            <span className="material-symbols-outlined text-xs sm:text-sm shrink-0">verified</span>
            <span className="truncate">Statutory Compliance under Legal Metrology Act, 2009</span>
          </div>

          <h1 className="text-xl sm:text-4xl font-extrabold tracking-tight leading-snug sm:leading-tight text-white break-words">
            Online Verification of Weights & Measures
          </h1>

          <p className="text-xs sm:text-base text-slate-200 font-normal max-w-2xl mx-auto leading-relaxed px-1">
            Apply, track verification, complete payment, and access digitally issued certificates.
          </p>

          <div className="pt-2 sm:pt-3 flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-3">
            <button
              type="button"
              onClick={() => handleRoleAction(ROLES_DATA[0])}
              className="w-full sm:w-auto px-5 sm:px-6 py-2.5 sm:py-3 bg-amber-400 hover:bg-amber-300 text-[#002046] font-extrabold text-xs sm:text-sm rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <span className="material-symbols-outlined text-base sm:text-lg">post_add</span>
              <span>Apply for Verification</span>
            </button>
            <a
              href="#how-it-works"
              className="w-full sm:w-auto px-4 sm:px-5 py-2.5 sm:py-3 bg-white/10 hover:bg-white/20 text-white font-semibold text-xs sm:text-sm rounded-xl border border-white/20 transition-all flex items-center justify-center gap-1.5"
            >
              <span className="material-symbols-outlined text-base sm:text-lg">help_outline</span>
              <span>How It Works</span>
            </a>
          </div>
        </div>
      </section>

      {/* ====================================================
          3. SIMPLE "HOW IT WORKS" (6 STEPS)
         ==================================================== */}
      <section id="how-it-works" className="py-10 sm:py-12 px-4 sm:px-6 max-w-6xl mx-auto w-full overflow-hidden">
        <div className="text-center mb-6 sm:mb-8 px-2">
          <h2 className="text-lg sm:text-2xl font-extrabold text-[#002046] tracking-tight">
            How It Works
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-1 px-1">
            6 simple statutory stages from instrument registration to official certification
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3 sm:gap-4">
          {WORKFLOW_STEPS.map((s) => (
            <div
              key={s.step}
              className="bg-white rounded-xl p-4 border border-slate-200 shadow-2xs hover:shadow-sm hover:border-blue-300 transition-all flex flex-col justify-between text-left relative"
            >
              <div>
                <div className="w-8 h-8 rounded-lg bg-[#002046] text-amber-400 font-extrabold text-xs flex items-center justify-center mb-2.5 shadow-2xs">
                  {s.step}
                </div>
                <h3 className="font-bold text-xs sm:text-[13px] text-slate-900 leading-snug">
                  {s.title}
                </h3>
                <p className="text-[11px] text-slate-500 mt-1 leading-snug">
                  {s.desc}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ====================================================
          4. ROLE ENTRY SECTION (5 ROLES)
         ==================================================== */}
      <section className="py-12 px-4 sm:px-6 bg-slate-100/70 border-y border-slate-200 w-full">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-8">
            <h2 className="text-lg sm:text-2xl font-extrabold text-[#002046] tracking-tight">
              Select Your Portal Role
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              Access the dedicated operational workspace for your statutory responsibility
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {ROLES_DATA.map((r) => (
              <div
                key={r.role}
                className={`bg-white rounded-2xl p-5 border shadow-2xs hover:shadow-md transition-all flex flex-col justify-between ${r.accent}`}
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="w-10 h-10 rounded-xl bg-[#002046] text-amber-400 flex items-center justify-center shadow-xs">
                      <span className="material-symbols-outlined text-2xl">{r.icon}</span>
                    </div>
                    <span className="px-2 py-0.5 rounded text-[9.5px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                      {r.badge}
                    </span>
                  </div>

                  <div>
                    <h3 className="font-extrabold text-sm text-slate-900">{r.title}</h3>
                    <p className="text-[11px] text-slate-600 mt-1.5 leading-relaxed">
                      {r.description}
                    </p>
                  </div>
                </div>

                <div className="pt-4 mt-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => handleRoleAction(r)}
                    className="w-full py-2 px-3 bg-[#002046] hover:bg-[#1b365d] text-white font-bold text-xs rounded-xl transition-all flex items-center justify-center gap-1.5 shadow-2xs cursor-pointer group"
                  >
                    <span>{r.actionLabel}</span>
                    <span className="material-symbols-outlined text-sm group-hover:translate-x-0.5 transition-transform">arrow_forward</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ====================================================
          5. PUBLIC VERIFICATION ENGINE — DARK BANNER ONLY
         ==================================================== */}
      <section id="verify-certificate" className="py-10 sm:py-14 px-3 sm:px-6 max-w-4xl mx-auto w-full overflow-hidden">

        {/* Prominent Legal Metrology Status Banner */}
        <div className="bg-gradient-to-r from-[#002046] via-[#082a52] to-[#002046] rounded-2xl p-5 sm:p-7 text-white shadow-md border border-[#001733] flex flex-col md:flex-row items-center justify-between gap-5">
          <div className="space-y-1.5 text-center md:text-left">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-400/20 text-amber-300 text-[11px] font-bold border border-amber-400/30">
              <span className="material-symbols-outlined text-xs">shield</span>
              <span>Open Public Registry</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white">
              Verify Legal Metrology Status
            </h2>
            <p className="text-xs sm:text-sm text-slate-200 max-w-md leading-relaxed">
              Check a certificate or scan an instrument QR to verify its current status.
            </p>
          </div>

          {/* Quick Action Buttons (No login required) */}
          <div className="flex flex-col sm:flex-row items-center gap-2.5 w-full md:w-auto shrink-0">
            {/* Scan QR → opens camera */}
            <button
              type="button"
              onClick={() => {
                setScannerTarget('INSTRUMENT');
                setIsScannerOpen(true);
              }}
              className="w-full sm:w-auto px-5 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs sm:text-sm rounded-xl shadow-xs hover:shadow transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <span className="material-symbols-outlined text-lg">qr_code_scanner</span>
              <span>Scan Instrument QR</span>
            </button>
            {/* Verify Certificate → opens popup */}
            <button
              type="button"
              onClick={() => {
                setCertToken('');
                setCertTokenError('');
                setIsCertModalOpen(true);
              }}
              className="w-full sm:w-auto px-5 py-3 bg-white/10 hover:bg-white/20 text-white border border-white/25 font-bold text-xs sm:text-sm rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <span className="material-symbols-outlined text-lg">verified</span>
              <span>Verify Certificate</span>
            </button>
          </div>
        </div>
      </section>

      {/* ==================================================
          Certificate Verify Popup Modal
         ================================================== */}
      {isCertModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          onClick={(e) => { if (e.target === e.currentTarget) setIsCertModalOpen(false); }}
        >
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-emerald-600 text-xl">verified_user</span>
                <div>
                  <div className="text-[11px] font-bold text-emerald-700 uppercase tracking-wide">Public Verification Engine</div>
                  <div className="text-sm font-extrabold text-[#002046] leading-tight">Verify Certificate Authenticity</div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsCertModalOpen(false)}
                className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-slate-100 text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
              >
                <span className="material-symbols-outlined text-lg">close</span>
              </button>
            </div>

            {/* Modal Body */}
            <div className="px-6 py-5 space-y-4">
              <p className="text-xs text-slate-600 leading-relaxed">
                Any citizen, trader, or enforcement officer can verify a digital certificate's statutory validity in real time. Enter the unique public token or scan the QR code printed on the certificate.
              </p>

              {/* Scan QR option inside modal */}
              <button
                type="button"
                onClick={() => {
                  setIsCertModalOpen(false);
                  setScannerTarget('CERTIFICATE');
                  setIsScannerOpen(true);
                }}
                className="w-full px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs rounded-xl border border-slate-300 transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs"
              >
                <span className="material-symbols-outlined text-base text-emerald-600">qr_code_scanner</span>
                <span>Scan Certificate QR</span>
              </button>

              <div className="flex items-center gap-2 text-[11px] text-slate-400 font-semibold">
                <div className="flex-1 h-px bg-slate-200" />
                <span>or enter manually</span>
                <div className="flex-1 h-px bg-slate-200" />
              </div>

              {/* Manual token form */}
              <form onSubmit={handleVerifyCertSubmit} className="space-y-3">
                <div>
                  <label htmlFor="modal-cert-token-input" className="block text-xs font-bold text-slate-700 mb-1">
                    Public Certificate Token / UUID
                  </label>
                  <div className="relative">
                    <span className="material-symbols-outlined absolute left-3 top-2.5 text-slate-400 text-base">vpn_key</span>
                    <input
                      id="modal-cert-token-input"
                      type="text"
                      autoFocus
                      value={certToken}
                      onChange={(e) => {
                        setCertToken(e.target.value);
                        if (certTokenError) setCertTokenError('');
                      }}
                      placeholder="e.g. 550e8400-e29b-41d4... or LM-2026-..."
                      className="w-full pl-9 pr-3 py-2.5 text-xs bg-white border border-slate-300 rounded-lg font-mono text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#002046]/20 focus:border-[#002046] box-border"
                    />
                  </div>
                  {certTokenError && (
                    <p className="text-[11px] font-semibold text-rose-600 mt-1">{certTokenError}</p>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={!certToken.trim()}
                  className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold text-xs rounded-lg transition-all flex items-center justify-center gap-1.5 shadow-2xs cursor-pointer"
                >
                  <span className="material-symbols-outlined text-base">verified</span>
                  <span>Verify Certificate</span>
                </button>
              </form>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-3 border-t border-slate-100 bg-slate-50 rounded-b-2xl">
              <div className="text-[10px] text-slate-400 text-center">
                Powered by National Legal Metrology Registry · Legal Metrology Act, 2009
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Live Camera QR Scanner Modal */}
      <QrScannerModal
        isOpen={isScannerOpen}
        title={scannerTarget === 'CERTIFICATE' ? 'Scan Certificate QR' : 'Scan Instrument QR'}
        description={
          scannerTarget === 'CERTIFICATE'
            ? 'Point your camera at the QR code printed on the Legal Metrology Certificate.'
            : 'Point your camera at the QR code printed on the weighing or measuring instrument.'
        }
        onClose={() => setIsScannerOpen(false)}
        onScan={handleQrScanned}
        onManualEntry={() => setIsScannerOpen(false)}
      />

      {/* ====================================================
          6. MINIMAL FOOTER
         ==================================================== */}
      <footer className="mt-auto bg-[#001733] text-slate-400 py-6 px-4 sm:px-6 border-t border-[#1b365d]/50 text-xs">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left">
          <div>
            <span className="font-semibold text-white">CertifyMetric • Legal Metrology Platform</span>
            <span className="mx-2 text-slate-600">|</span>
            <span>Standards under Legal Metrology Act, 2009 & General Rules, 2011</span>
          </div>

          <div className="flex items-center gap-4 text-[11px]">
            <button
              type="button"
              onClick={onGoToLogin}
              className="hover:text-amber-300 transition-colors cursor-pointer"
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={onGoToRegister || onGoToLogin}
              className="hover:text-amber-300 transition-colors cursor-pointer"
            >
              Register
            </button>
            <a
              href="#verify-certificate"
              className="hover:text-amber-300 transition-colors"
            >
              Public Verify
            </a>
          </div>
        </div>
      </footer>

    </div>
  );
}
