import React from 'react';

export default function Navbar({
  currentUser,
  currentRole,
  activeTab,
  onSelectTab,
  onOpenAddModal,
  onLogout
}) {
  return (
    <header className="w-full bg-white border-b border-slate-200 sticky top-0 z-40 shadow-xs">
      {/* 1. Legal Metrology Statutory Context Stripe */}
      <div className="bg-[#002046] text-white px-4 py-1.5 flex items-center justify-between text-xs">
        <div className="flex items-center gap-2">
          <span className="font-semibold tracking-wide flex items-center gap-1.5 text-slate-200">
            <span className="material-symbols-outlined text-[15px] text-amber-400">balance</span>
            Legal Metrology Verification Framework
          </span>
          <span className="hidden md:inline text-slate-400">|</span>
          <span className="hidden md:inline text-slate-300">Statutory Standards under Legal Metrology Act, 2009 & General Rules, 2011</span>
        </div>
      </div>

      {/* 2. Main Platform Navigation Bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Portal Branding */}
          <div
            className="flex items-center gap-3 cursor-pointer"
            onClick={() => onSelectTab(currentRole === 'TRADER' ? 'dashboard' : currentRole === 'AUTHORITY' ? 'authority-dashboard' : 'verifier-dashboard')}
          >
            <div className="w-10 h-10 rounded-lg bg-primary flex items-center justify-center text-white shadow-sm">
              <span className="material-symbols-outlined text-2xl">gavel</span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-lg tracking-tight text-primary">CertifyMetric</span>
              </div>
              <p className="text-[11px] text-slate-500 leading-none font-medium mt-0.5">Online Verification & Compliance Platform</p>
            </div>
          </div>

          {/* Role-Specific Navigation Links */}
          <nav className="hidden md:flex items-center gap-1">
            {currentRole === 'TRADER' && (
              <>
                <button
                  onClick={() => onSelectTab('dashboard')}
                  className={`px-3 py-2 rounded-lg text-sm font-semibold transition-colors flex items-center gap-1.5 ${
                    activeTab === 'dashboard' ? 'bg-primary/10 text-primary' : 'text-slate-600 hover:text-primary hover:bg-slate-50'
                  }`}
                >
                  <span className="material-symbols-outlined text-[18px]">dashboard</span>
                  Dashboard
                </button>
                <button
                  onClick={() => onSelectTab('instruments')}
                  className={`px-3 py-2 rounded-lg text-sm font-semibold transition-colors flex items-center gap-1.5 ${
                    activeTab === 'instruments' ? 'bg-primary/10 text-primary' : 'text-slate-600 hover:text-primary hover:bg-slate-50'
                  }`}
                >
                  <span className="material-symbols-outlined text-[18px]">scale</span>
                  My Instruments
                </button>
                <button
                  onClick={() => onSelectTab('certificates')}
                  className={`px-3 py-2 rounded-lg text-sm font-semibold transition-colors flex items-center gap-1.5 ${
                    activeTab === 'certificates' ? 'bg-primary/10 text-primary' : 'text-slate-600 hover:text-primary hover:bg-slate-50'
                  }`}
                >
                  <span className="material-symbols-outlined text-[18px]">workspace_premium</span>
                  Certificates
                </button>
              </>
            )}

            {(currentRole === 'AUTHORITY' || currentRole === 'PLATFORM_ADMIN') && (
              <>
                <button
                  onClick={() => onSelectTab('authority-dashboard')}
                  className={`px-3 py-2 rounded-lg text-sm font-semibold transition-colors flex items-center gap-1.5 ${
                    activeTab === 'authority-dashboard' ? 'bg-primary/10 text-primary' : 'text-slate-600 hover:text-primary hover:bg-slate-50'
                  }`}
                >
                  <span className="material-symbols-outlined text-[18px]">monitoring</span>
                  Operations Dashboard
                </button>
                <button
                  onClick={() => onSelectTab('certificates')}
                  className={`px-3 py-2 rounded-lg text-sm font-semibold transition-colors flex items-center gap-1.5 ${
                    activeTab === 'certificates' ? 'bg-primary/10 text-primary' : 'text-slate-600 hover:text-primary hover:bg-slate-50'
                  }`}
                >
                  <span className="material-symbols-outlined text-[18px]">workspace_premium</span>
                  Issued Certificates
                </button>
                <button
                  onClick={() => onSelectTab('audit-logs')}
                  className={`px-3 py-2 rounded-lg text-sm font-semibold transition-colors flex items-center gap-1.5 ${
                    activeTab === 'audit-logs' ? 'bg-primary/10 text-primary' : 'text-slate-600 hover:text-primary hover:bg-slate-50'
                  }`}
                >
                  <span className="material-symbols-outlined text-[18px]">history_edu</span>
                  Audit Ledger
                </button>
              </>
            )}

            {(currentRole === 'VERIFIER' || currentRole === 'GATC') && (
              <>
                <button
                  onClick={() => onSelectTab('verifier-dashboard')}
                  className={`px-3 py-2 rounded-lg text-sm font-semibold transition-colors flex items-center gap-1.5 ${
                    activeTab === 'verifier-dashboard' ? 'bg-primary/10 text-primary' : 'text-slate-600 hover:text-primary hover:bg-slate-50'
                  }`}
                >
                  <span className="material-symbols-outlined text-[18px]">task_alt</span>
                  Assigned Cases
                </button>
              </>
            )}
          </nav>

          {/* Right Action: CTA & Profile Badge */}
          <div className="flex items-center gap-3">
            {currentRole === 'TRADER' && (
              <button
                onClick={onOpenAddModal}
                className="hidden sm:inline-flex items-center gap-1.5 px-3.5 py-2 bg-primary text-white rounded-lg text-xs font-bold hover:bg-primary-container transition-all shadow-xs"
              >
                <span className="material-symbols-outlined text-[16px]">add_circle</span>
                Add Instrument
              </button>
            )}

            {/* Profile Avatar & Logout Action */}
            <div className="flex items-center gap-3 pl-2 border-l border-slate-200">
              <div className="flex items-center gap-2">
                <img
                  src={currentUser?.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150'}
                  alt={currentUser?.full_name}
                  className="w-9 h-9 rounded-full object-cover border border-slate-300"
                />
                <div className="hidden lg:block text-left">
                  <p className="text-xs font-bold text-slate-800 leading-tight">{currentUser?.full_name}</p>
                  <p className="text-[10px] text-slate-500 font-medium">{currentUser?.role}</p>
                </div>
              </div>

              {onLogout && (
                <button
                  onClick={onLogout}
                  className="px-2.5 py-1.5 text-xs text-slate-600 hover:text-rose-700 hover:bg-rose-50 border border-slate-200 hover:border-rose-200 rounded-lg transition-colors flex items-center gap-1 font-semibold shadow-2xs"
                  title="Sign out of current account to switch demo role"
                >
                  <span className="material-symbols-outlined text-[15px]">logout</span>
                  <span className="hidden sm:inline">Sign Out</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 3. Mobile Navigation Bar (Visible on small screens) */}
      <div className="md:hidden border-t border-slate-200 bg-slate-50/90 px-3 py-1.5 overflow-x-auto flex items-center gap-1.5">
        {currentRole === 'TRADER' && (
          <>
            <button
              onClick={() => onSelectTab('dashboard')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors flex items-center gap-1 shrink-0 ${
                activeTab === 'dashboard' ? 'bg-primary text-white' : 'text-slate-600 hover:bg-slate-200'
              }`}
            >
              <span className="material-symbols-outlined text-[15px]">dashboard</span>
              Dashboard
            </button>
            <button
              onClick={() => onSelectTab('instruments')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors flex items-center gap-1 shrink-0 ${
                activeTab === 'instruments' ? 'bg-primary text-white' : 'text-slate-600 hover:bg-slate-200'
              }`}
            >
              <span className="material-symbols-outlined text-[15px]">scale</span>
              Instruments
            </button>
            <button
              onClick={() => onSelectTab('certificates')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors flex items-center gap-1 shrink-0 ${
                activeTab === 'certificates' ? 'bg-primary text-white' : 'text-slate-600 hover:bg-slate-200'
              }`}
            >
              <span className="material-symbols-outlined text-[15px]">workspace_premium</span>
              Certificates
            </button>
            {onOpenAddModal && (
              <button
                onClick={onOpenAddModal}
                className="px-2.5 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-colors flex items-center gap-1 shrink-0 bg-amber-400 text-slate-950 ml-auto shadow-2xs"
              >
                <span className="material-symbols-outlined text-[15px]">add</span>
                Add
              </button>
            )}
          </>
        )}

        {(currentRole === 'AUTHORITY' || currentRole === 'PLATFORM_ADMIN') && (
          <>
            <button
              onClick={() => onSelectTab('authority-dashboard')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors flex items-center gap-1 shrink-0 ${
                activeTab === 'authority-dashboard' ? 'bg-primary text-white' : 'text-slate-600 hover:bg-slate-200'
              }`}
            >
              <span className="material-symbols-outlined text-[15px]">monitoring</span>
              Dashboard
            </button>
            <button
              onClick={() => onSelectTab('certificates')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors flex items-center gap-1 shrink-0 ${
                activeTab === 'certificates' ? 'bg-primary text-white' : 'text-slate-600 hover:bg-slate-200'
              }`}
            >
              <span className="material-symbols-outlined text-[15px]">workspace_premium</span>
              Certificates
            </button>
            <button
              onClick={() => onSelectTab('audit-logs')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors flex items-center gap-1 shrink-0 ${
                activeTab === 'audit-logs' ? 'bg-primary text-white' : 'text-slate-600 hover:bg-slate-200'
              }`}
            >
              <span className="material-symbols-outlined text-[15px]">history_edu</span>
              Audit
            </button>
          </>
        )}

        {(currentRole === 'VERIFIER' || currentRole === 'GATC') && (
          <>
            <button
              onClick={() => onSelectTab('verifier-dashboard')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors flex items-center gap-1 shrink-0 ${
                activeTab === 'verifier-dashboard' ? 'bg-primary text-white' : 'text-slate-600 hover:bg-slate-200'
              }`}
            >
              <span className="material-symbols-outlined text-[15px]">task_alt</span>
              Assigned Cases
            </button>
            <button
              onClick={() => onSelectTab('certificates')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors flex items-center gap-1 shrink-0 ${
                activeTab === 'certificates' ? 'bg-primary text-white' : 'text-slate-600 hover:bg-slate-200'
              }`}
            >
              <span className="material-symbols-outlined text-[15px]">workspace_premium</span>
              Certificates
            </button>
          </>
        )}
      </div>
    </header>
  );
}
