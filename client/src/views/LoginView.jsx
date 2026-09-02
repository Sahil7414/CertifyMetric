import React, { useState } from 'react';
import { api, setApiUser } from '../api';

const DEMO_ROLES = [
  {
    role: 'TRADER',
    label: 'Trader',
    sublabel: 'Commercial',
    icon: 'storefront',
    email: 'demo.trader@certifymetric.local',
    password: 'DemoTrader@2026',
    border: 'hover:border-emerald-500 hover:bg-emerald-50/40',
    iconColor: 'text-emerald-600'
  },
  {
    role: 'AUTHORITY',
    label: 'Authority',
    sublabel: 'LMO Officer',
    icon: 'admin_panel_settings',
    email: 'demo.authority@certifymetric.local',
    password: 'DemoAuthority@2026',
    border: 'hover:border-blue-500 hover:bg-blue-50/40',
    iconColor: 'text-blue-600'
  },
  {
    role: 'VERIFIER',
    label: 'Verifier',
    sublabel: 'Field Inspector',
    icon: 'shield_person',
    email: 'demo.verifier@certifymetric.local',
    password: 'DemoVerifier@2026',
    border: 'hover:border-purple-500 hover:bg-purple-50/40',
    iconColor: 'text-purple-600'
  },
  {
    role: 'GATC',
    label: 'GATC',
    sublabel: 'Testing Lab',
    icon: 'science',
    email: 'demo.gatc@certifymetric.local',
    password: 'DemoGatc@2026',
    border: 'hover:border-amber-500 hover:bg-amber-50/40',
    iconColor: 'text-amber-600'
  },
  {
    role: 'PLATFORM_ADMIN',
    label: 'Admin',
    sublabel: 'SysAdmin',
    icon: 'settings_suggest',
    email: 'demo.admin@certifymetric.local',
    password: 'DemoAdmin@2026',
    border: 'hover:border-rose-500 hover:bg-rose-50/40',
    iconColor: 'text-rose-600'
  }
];

export default function LoginView({ onLoginSuccess }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingRole, setLoadingRole] = useState(null);
  const [error, setError] = useState('');

  // 1-Click Direct Demo Login
  const handleDirectDemoLogin = async (demo) => {
    setLoading(true);
    setLoadingRole(demo.role);
    setError('');
    setEmail(demo.email);
    setPassword(demo.password);

    try {
      const data = await api.login(demo.email, demo.password);
      setApiUser(data.user, data.token);
      if (onLoginSuccess) {
        onLoginSuccess(data);
      }
    } catch (err) {
      setError(err.message || 'Demo authentication failed.');
    } finally {
      setLoading(false);
      setLoadingRole(null);
    }
  };

  // Standard Credentials Login
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Please provide both your registered email address and password.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const data = await api.login(email.trim(), password);
      setApiUser(data.user, data.token);
      if (onLoginSuccess) {
        onLoginSuccess(data);
      }
    } catch (err) {
      setError(err.message || 'Authentication failed. Please verify your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100/90 flex flex-col justify-between font-sans antialiased text-slate-800">
      {/* 1. Official Regulatory Masthead */}
      <header className="bg-[#002046] text-white py-2.5 px-4 shadow-sm">
        <div className="max-w-7xl mx-auto flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-amber-400 text-base">balance</span>
            <span className="font-semibold tracking-wide">Legal Metrology Verification Framework</span>
            <span className="hidden md:inline text-slate-400">|</span>
            <span className="hidden md:inline text-slate-300">Statutory Standards under Legal Metrology Act, 2009</span>
          </div>
          <span className="text-[11px] text-slate-300 hidden sm:inline">National Compliance Registry</span>
        </div>
      </header>

      {/* 2. Centered Login Card */}
      <main className="flex-1 flex items-center justify-center p-4 sm:p-6 my-auto">
        <div className="w-full max-w-lg bg-white rounded-2xl border border-slate-200/90 shadow-xl p-6 sm:p-8 space-y-5 animate-in fade-in zoom-in-95 duration-200">
          
          {/* Platform Identity */}
          <div className="text-center space-y-2">
            <div className="w-12 h-12 rounded-xl bg-primary text-white flex items-center justify-center mx-auto shadow-sm">
              <span className="material-symbols-outlined text-2xl">gavel</span>
            </div>
            <div>
              <h1 className="text-xl font-extrabold text-primary tracking-tight">CertifyMetric</h1>
              <p className="text-xs text-slate-500 font-medium">Online Verification & Compliance Platform</p>
            </div>
          </div>

          <div className="text-center pb-1">
            <h2 className="text-sm font-bold text-slate-900">Account Authentication</h2>
            <p className="text-[11px] text-slate-500 mt-0.5">Select a demo role for 1-click login or enter your credentials</p>
          </div>

          {/* 3. 1-Click Direct Demo Login Selector */}
          <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3.5 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-600 flex items-center gap-1">
                <span className="material-symbols-outlined text-[15px] text-primary">bolt</span>
                1-Click Demo Login
              </span>
              <span className="text-[10px] text-slate-400">Select role to login directly</span>
            </div>

            <div className="grid grid-cols-5 gap-1.5 sm:gap-2">
              {DEMO_ROLES.map((demo) => {
                const isLoggingThis = loading && loadingRole === demo.role;

                return (
                  <button
                    key={demo.role}
                    type="button"
                    disabled={loading}
                    onClick={() => handleDirectDemoLogin(demo)}
                    className={`p-2 rounded-lg border border-slate-200 bg-white transition-all text-center flex flex-col items-center justify-center gap-1 shadow-2xs group disabled:opacity-50 ${demo.border}`}
                    title={`Direct login as ${demo.label} (${demo.email})`}
                  >
                    {isLoggingThis ? (
                      <span className="material-symbols-outlined text-[20px] text-primary animate-spin">
                        progress_activity
                      </span>
                    ) : (
                      <span className={`material-symbols-outlined text-[20px] ${demo.iconColor} group-hover:scale-110 transition-transform`}>
                        {demo.icon}
                      </span>
                    )}
                    <span className="text-[11px] font-bold text-slate-800 leading-none">{demo.label}</span>
                    <span className="text-[9px] text-slate-400 hidden sm:block leading-none mt-0.5">{demo.sublabel}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Divider */}
          <div className="relative flex items-center justify-center">
            <div className="border-t border-slate-200 w-full"></div>
            <span className="bg-white px-3 text-[11px] text-slate-400 uppercase tracking-wider font-semibold whitespace-nowrap">
              or sign in with credentials
            </span>
            <div className="border-t border-slate-200 w-full"></div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-start gap-2 animate-in fade-in">
              <span className="material-symbols-outlined text-base text-rose-600 shrink-0 mt-0.5">error</span>
              <span className="leading-snug">{error}</span>
            </div>
          )}

          {/* Manual Authentication Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5" htmlFor="email">
                Registered Email Address
              </label>
              <div className="relative flex items-center">
                <span className="material-symbols-outlined absolute left-3 text-slate-400 text-lg pointer-events-none flex items-center">
                  mail
                </span>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@enterprise.com or official.gov.in"
                  required
                  autoComplete="email"
                  className="w-full pl-10 pr-3 py-2.5 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-slate-900 transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5" htmlFor="password">
                Password
              </label>
              <div className="relative flex items-center">
                <span className="material-symbols-outlined absolute left-3 text-slate-400 text-lg pointer-events-none flex items-center">
                  lock
                </span>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  required
                  autoComplete="current-password"
                  className="w-full pl-10 pr-3 py-2.5 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-slate-900 transition-colors"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 px-4 bg-primary hover:bg-primary-container text-white font-bold text-xs tracking-wide uppercase rounded-lg shadow-sm transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading && !loadingRole ? (
                <>
                  <span className="material-symbols-outlined text-base animate-spin">progress_activity</span>
                  <span>Authenticating...</span>
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-base">login</span>
                  <span>Sign In to Portal</span>
                </>
              )}
            </button>
          </form>

          {/* Local Development Reference Notice */}
          <div className="pt-2 text-center">
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Local Development: Demo credentials and setup details in <span className="font-mono text-slate-600 bg-slate-100 px-1 py-0.5 rounded">DEMO_CREDENTIALS.md</span>.
            </p>
          </div>
        </div>
      </main>

      {/* 3. Regulatory Legal Metrology Footer */}
      <footer className="text-center py-3.5 text-[11px] text-slate-500 border-t border-slate-200 bg-white">
        Legal Metrology Portal • Authorized Under Section 24 of the Legal Metrology Act, 2009
      </footer>
    </div>
  );
}
