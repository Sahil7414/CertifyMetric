import React, { useState } from 'react';

const DEMO_ROLES = [
  {
    role: 'TRADER',
    label: 'Trader / Owner',
    sublabel: 'Commercial User',
    icon: 'storefront',
    email: 'demo.trader@certifymetric.local',
    password: 'DemoTrader@2026',
    border: 'hover:border-emerald-500 hover:bg-emerald-50/50',
    color: 'text-emerald-700 bg-emerald-100'
  },
  {
    role: 'AUTHORITY',
    label: 'Authority Officer',
    sublabel: 'LMO Review & Allocation',
    icon: 'admin_panel_settings',
    email: 'demo.authority@certifymetric.local',
    password: 'DemoAuthority@2026',
    border: 'hover:border-blue-500 hover:bg-blue-50/50',
    color: 'text-blue-700 bg-blue-100'
  },
  {
    role: 'VERIFIER',
    label: 'Field Verifier',
    sublabel: 'Inspection & Testing',
    icon: 'shield_person',
    email: 'demo.verifier@certifymetric.local',
    password: 'DemoVerifier@2026',
    border: 'hover:border-purple-500 hover:bg-purple-50/50',
    color: 'text-purple-700 bg-purple-100'
  },
  {
    role: 'GATC',
    label: 'GATC Lab',
    sublabel: 'Approved Testing Lab',
    icon: 'science',
    email: 'demo.gatc@certifymetric.local',
    password: 'DemoGatc@2026',
    border: 'hover:border-amber-500 hover:bg-amber-50/50',
    color: 'text-amber-700 bg-amber-100'
  },
  {
    role: 'PLATFORM_ADMIN',
    label: 'Portal Admin',
    sublabel: 'System Governance',
    icon: 'settings_suggest',
    email: 'demo.admin@certifymetric.local',
    password: 'DemoAdmin@2026',
    border: 'hover:border-rose-500 hover:bg-rose-50/50',
    color: 'text-rose-700 bg-rose-100'
  }
];

export default function PortalLanding({
  onGoToLogin,
  onTrackApplication,
  onVerifyCertificate,
  onDirectDemoLogin
}) {
  const [trackInput, setTrackInput] = useState('');
  const [verifyInput, setVerifyInput] = useState('');

  const handleTrackSubmit = (e) => {
    e.preventDefault();
    if (trackInput.trim()) {
      onTrackApplication(trackInput.trim());
    }
  };

  const handleVerifySubmit = (e) => {
    e.preventDefault();
    if (verifyInput.trim()) {
      onVerifyCertificate(verifyInput.trim());
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col text-slate-800 font-sans">
      {/* 1. National Apex Regulatory Masthead */}
      <header className="bg-[#002046] text-white border-b border-[#001733]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2.5 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2.5 text-center sm:text-left">
            <span className="material-symbols-outlined text-amber-400 text-lg">balance</span>
            <div>
              <span className="font-bold tracking-wide uppercase">Government of India</span>
              <span className="text-slate-300 ml-2 hidden sm:inline">| Ministry of Consumer Affairs, Food & Public Distribution</span>
            </div>
          </div>
          <div className="flex items-center gap-4 text-[11px] text-slate-300">
            <span>Department of Consumer Affairs</span>
            <span>•</span>
            <span className="text-amber-300 font-semibold">Legal Metrology Division</span>
          </div>
        </div>
      </header>

      {/* 2. Portal Header & Navigation Bar */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-2xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-18 flex items-center justify-between">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-primary text-white flex items-center justify-center shadow-xs">
              <span className="material-symbols-outlined text-2xl">gavel</span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xl font-extrabold text-primary tracking-tight">CertifyMetric</span>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
                  LMOMS • SIH 26036
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium leading-none mt-0.5">
                Online Verification & Lifecycle Management System for Weighing & Measuring Instruments
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => onGoToLogin()}
              className="px-4 py-2 bg-primary hover:bg-primary-container text-white text-xs font-bold rounded-lg shadow-xs transition-all flex items-center gap-1.5"
            >
              <span className="material-symbols-outlined text-base">login</span>
              Portal Sign In
            </button>
          </div>
        </div>
      </div>

      {/* 3. Reviewer & Evaluator Fast Access Strip */}
      <div className="bg-gradient-to-r from-blue-900 to-indigo-900 text-white py-3 px-4 shadow-xs">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <span className="flex h-2.5 w-2.5 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-400"></span>
            </span>
            <span className="font-bold text-amber-300">Reviewer Quick-Access:</span>
            <span className="text-slate-200">1-Click Direct Demo Authentication into each RBAC role:</span>
          </div>

          <div className="flex items-center gap-2 flex-wrap justify-center">
            {DEMO_ROLES.map((demo) => (
              <button
                key={demo.role}
                onClick={() => onDirectDemoLogin(demo)}
                className="px-2.5 py-1 bg-white/10 hover:bg-white/20 border border-white/20 rounded-md text-[11px] font-semibold text-white transition-all flex items-center gap-1.5 hover:scale-105"
                title={`Login directly as ${demo.label}`}
              >
                <span className="material-symbols-outlined text-[14px]">{demo.icon}</span>
                {demo.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 4. Hero Banner */}
      <section className="bg-gradient-to-b from-slate-100 to-slate-50 border-b border-slate-200 py-10 px-4 sm:px-6">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          <div className="lg:col-span-8 space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 border border-blue-200 text-blue-900 text-xs font-semibold">
              <span className="material-symbols-outlined text-sm text-blue-600">verified</span>
              Statutory Online Portal under Section 24 of Legal Metrology Act, 2009
            </div>
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-slate-900 tracking-tight leading-tight">
              Online Verification & Lifecycle Certification for Weighing and Measuring Instruments
            </h1>
            <p className="text-sm text-slate-600 leading-relaxed max-w-2xl">
              A single-window digital interface for commercial establishments, traders, manufacturers, and repairers to register instruments, apply for statutory verification / re-verification, track application lifecycle stages, and obtain verifiable digital certificates.
            </p>

            <div className="flex flex-wrap items-center gap-3 pt-2">
              <button
                onClick={() => onDirectDemoLogin(DEMO_ROLES[0])}
                className="px-5 py-3 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl text-xs uppercase tracking-wide transition-all shadow-sm flex items-center gap-2"
              >
                <span className="material-symbols-outlined text-lg">post_add</span>
                Apply for Verification
              </button>
              <button
                onClick={() => onGoToLogin()}
                className="px-5 py-3 bg-white hover:bg-slate-50 text-slate-800 font-semibold rounded-xl text-xs transition-all border border-slate-300 shadow-2xs flex items-center gap-2"
              >
                <span className="material-symbols-outlined text-lg text-primary">account_circle</span>
                User Login / Dashboard
              </button>
            </div>
          </div>

          {/* Quick Track & Verify Widget Card */}
          <div className="lg:col-span-4 bg-white rounded-2xl p-5 border border-slate-200 shadow-sm space-y-4">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5 pb-2 border-b border-slate-100">
              <span className="material-symbols-outlined text-primary text-base">search</span>
              Quick Statutory Tracking
            </h2>

            {/* Track Application */}
            <form onSubmit={handleTrackSubmit} className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 block">
                Track Application Status
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="e.g. APP-2026-1042"
                  value={trackInput}
                  onChange={(e) => setTrackInput(e.target.value)}
                  className="flex-1 px-3 py-2 text-xs border border-slate-300 rounded-lg font-mono focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                />
                <button
                  type="submit"
                  className="px-3 py-2 bg-primary hover:bg-primary-container text-white font-bold text-xs rounded-lg transition-all"
                >
                  Track
                </button>
              </div>
              <span className="text-[10px] text-slate-400 block">Enter application number from acknowledgement receipt</span>
            </form>

            <div className="border-t border-slate-100 pt-3">
              {/* Verify Certificate */}
              <form onSubmit={handleVerifySubmit} className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 block">
                  Verify Digital Certificate
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Enter QR Public Token"
                    value={verifyInput}
                    onChange={(e) => setVerifyInput(e.target.value)}
                    className="flex-1 px-3 py-2 text-xs border border-slate-300 rounded-lg font-mono focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  />
                  <button
                    type="submit"
                    className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-lg transition-all"
                  >
                    Verify
                  </button>
                </div>
                <span className="text-[10px] text-slate-400 block">Or scan the QR code printed on physical certificate</span>
              </form>
            </div>
          </div>
        </div>
      </section>

      {/* 5. Four Key Service Channels (Inspired by Kerala LMOMS Structure) */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 w-full">
        <div className="text-center max-w-2xl mx-auto mb-8 space-y-1.5">
          <span className="text-xs font-bold uppercase tracking-wider text-primary">Department Services</span>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900">
            Statutory Legal Metrology Verification Services
          </h2>
          <p className="text-xs text-slate-500">
            Choose your service category to initiate verification, check compliance status, or access officer tools.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          {/* Card 1: Verification of Weights & Measures */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs hover:shadow-md hover:border-primary/40 transition-all flex flex-col justify-between group">
            <div className="space-y-3">
              <div className="w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center group-hover:scale-105 transition-transform">
                <span className="material-symbols-outlined text-2xl">scale</span>
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Verification of Weights & Measures</h3>
                <span className="inline-block mt-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-blue-50 text-blue-700">
                  Section 24 Compliance
                </span>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                Submit online applications for initial stamping (Original Verification) or statutory periodic Re-verification. Supports both Camp / Centre and In-situ testing modes.
              </p>
            </div>
            <button
              onClick={() => onDirectDemoLogin(DEMO_ROLES[0])}
              className="mt-5 w-full py-2 px-3 bg-primary hover:bg-primary-container text-white text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 shadow-2xs"
            >
              <span>Apply for Verification</span>
              <span className="material-symbols-outlined text-sm">arrow_forward</span>
            </button>
          </div>

          {/* Card 2: Application Status Tracking */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs hover:shadow-md hover:border-primary/40 transition-all flex flex-col justify-between group">
            <div className="space-y-3">
              <div className="w-12 h-12 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center group-hover:scale-105 transition-transform">
                <span className="material-symbols-outlined text-2xl">receipt_long</span>
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Application Status & Acknowledgement</h3>
                <span className="inline-block mt-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-purple-50 text-purple-700">
                  Real-Time Lifecycle Tracking
                </span>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                Track the statutory processing stage of your submitted application using the reference number. Monitor review, inspector assignment, scheduled dates, and results.
              </p>
            </div>
            <button
              onClick={() => onDirectDemoLogin(DEMO_ROLES[0])}
              className="mt-5 w-full py-2 px-3 bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 shadow-2xs"
            >
              <span>Track in Trader Dashboard</span>
              <span className="material-symbols-outlined text-sm">arrow_forward</span>
            </button>
          </div>

          {/* Card 3: Digital Certificate & Public QR */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs hover:shadow-md hover:border-primary/40 transition-all flex flex-col justify-between group">
            <div className="space-y-3">
              <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center group-hover:scale-105 transition-transform">
                <span className="material-symbols-outlined text-2xl">verified</span>
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Digital Certificate & Public QR</h3>
                <span className="inline-block mt-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-700">
                  Tamper-Evident Verification
                </span>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                Verify the validity of statutory verification certificates issued under the Act. Consumers and enforcement authorities can authenticate instrument credentials instantly.
              </p>
            </div>
            <button
              onClick={() => onVerifyCertificate('e1a2b3c4-d5e6-47f8-9a0b-1c2d3e4f5a6b')}
              className="mt-5 w-full py-2 px-3 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 shadow-2xs"
            >
              <span>Verify Sample Certificate</span>
              <span className="material-symbols-outlined text-sm">qr_code_scanner</span>
            </button>
          </div>

          {/* Card 4: Department & Inspection Officials */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs hover:shadow-md hover:border-primary/40 transition-all flex flex-col justify-between group">
            <div className="space-y-3">
              <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-800 flex items-center justify-center group-hover:scale-105 transition-transform">
                <span className="material-symbols-outlined text-2xl">policy</span>
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Department Officials & GATC Labs</h3>
                <span className="inline-block mt-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-blue-50 text-blue-800">
                  Statutory Officers Portal
                </span>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                Role-based workspace for Legal Metrology Officers (LMO) and Approved Test Centres (GATC). Record test points, nominal readings matrix, evidence, and issue certificates.
              </p>
            </div>
            <button
              onClick={() => onDirectDemoLogin(DEMO_ROLES[1])}
              className="mt-5 w-full py-2 px-3 bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 shadow-2xs"
            >
              <span>Authority / Officer Login</span>
              <span className="material-symbols-outlined text-sm">arrow_forward</span>
            </button>
          </div>
        </div>
      </section>

      {/* 6. Standard 6-Step Verification Lifecycle Guide (LMOMS Pattern) */}
      <section className="bg-white border-y border-slate-200 py-10 px-4 sm:px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center max-w-xl mx-auto mb-8 space-y-1">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Step-by-Step Procedure</span>
            <h2 className="text-lg sm:text-xl font-bold text-slate-900">
              How the Statutory Verification Process Works
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3 text-xs">
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/80 space-y-2">
              <div className="w-7 h-7 rounded-full bg-primary text-white font-bold flex items-center justify-center text-xs">1</div>
              <h4 className="font-bold text-slate-900">Account Login</h4>
              <p className="text-slate-500 text-[11px] leading-relaxed">Trader/owner logs into the secure digital portal.</p>
            </div>

            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/80 space-y-2">
              <div className="w-7 h-7 rounded-full bg-primary text-white font-bold flex items-center justify-center text-xs">2</div>
              <h4 className="font-bold text-slate-900">Select Instrument</h4>
              <p className="text-slate-500 text-[11px] leading-relaxed">Choose device or register new instrument specifications.</p>
            </div>

            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/80 space-y-2">
              <div className="w-7 h-7 rounded-full bg-primary text-white font-bold flex items-center justify-center text-xs">3</div>
              <h4 className="font-bold text-slate-900">Type & Mode</h4>
              <p className="text-slate-500 text-[11px] leading-relaxed">Select Original or Re-verification, Camp or In-situ testing.</p>
            </div>

            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/80 space-y-2">
              <div className="w-7 h-7 rounded-full bg-primary text-white font-bold flex items-center justify-center text-xs">4</div>
              <h4 className="font-bold text-slate-900">Submit Application</h4>
              <p className="text-slate-500 text-[11px] leading-relaxed">Review details, attach documents, and obtain Reference No.</p>
            </div>

            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/80 space-y-2">
              <div className="w-7 h-7 rounded-full bg-primary text-white font-bold flex items-center justify-center text-xs">5</div>
              <h4 className="font-bold text-slate-900">Officer Inspection</h4>
              <p className="text-slate-500 text-[11px] leading-relaxed">Authorized LMO/GATC conducts physical testing and records readings.</p>
            </div>

            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/80 space-y-2">
              <div className="w-7 h-7 rounded-full bg-primary text-white font-bold flex items-center justify-center text-xs">6</div>
              <h4 className="font-bold text-slate-900">Certificate & QR</h4>
              <p className="text-slate-500 text-[11px] leading-relaxed">Download official digital certificate and QR compliance seal.</p>
            </div>
          </div>
        </div>
      </section>

      {/* 7. Regulatory Legal Metrology Footer */}
      <footer className="mt-auto bg-slate-900 text-slate-400 py-6 px-4 text-xs border-t border-slate-800">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="text-center md:text-left space-y-1">
            <p className="font-bold text-white">CertifyMetric • Online Verification System (SIH 26036)</p>
            <p className="text-[11px]">Department of Consumer Affairs • Ministry of Consumer Affairs, Food & Public Distribution, Government of India</p>
          </div>
          <div className="text-center md:text-right text-[11px]">
            <p>Administered under the Legal Metrology Act, 2009 & General Rules, 2011</p>
            <p className="text-slate-500 mt-0.5">Reference Architecture inspired by State Legal Metrology Online Management Systems (LMOMS)</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
