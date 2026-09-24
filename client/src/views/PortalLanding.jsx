import React from 'react';

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
  onDirectDemoLogin
}) {
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

          </div>
        </div>
      </footer>

    </div>
  );
}
