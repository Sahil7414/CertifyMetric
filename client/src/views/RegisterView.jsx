import React, { useState, useMemo } from 'react';
import { api, setApiUser } from '../api';
import { INDIA_STATES_DISTRICTS } from '../data/indiaDistricts';

// Flattened once at module load — used to power the jurisdiction search picker.
const FLAT_DISTRICTS = INDIA_STATES_DISTRICTS.flatMap(s =>
  s.districts.map(d => ({ label: `${d}, ${s.state}`, district: d, state: s.state }))
);

const ROLE_OPTIONS = [
  {
    role: 'TRADER',
    label: 'Trader / Owner',
    sublabel: 'Register instruments & apply for verification',
    icon: 'storefront',
    orgLabel: 'Business / Establishment Name',
    orgPlaceholder: 'e.g. Apex Retail Traders Pvt Ltd',
    needsJurisdiction: false,
    border: 'hover:border-emerald-500',
    activeBorder: 'border-emerald-500 bg-emerald-50/50',
    iconColor: 'text-emerald-600'
  },
  {
    role: 'VERIFIER',
    label: 'Field Verifier (LMO)',
    sublabel: 'Legal Metrology Officer / Inspector',
    icon: 'shield_person',
    orgLabel: 'Office Name',
    orgPlaceholder: 'e.g. Dept. of Legal Metrology, District Office',
    needsJurisdiction: true,
    border: 'hover:border-purple-500',
    activeBorder: 'border-purple-500 bg-purple-50/50',
    iconColor: 'text-purple-600'
  },
  {
    role: 'AUTHORITY',
    label: 'Assistant Authority',
    sublabel: 'Assistant Controller — reviews, assigns & signs off',
    icon: 'admin_panel_settings',
    orgLabel: 'Office Name',
    orgPlaceholder: 'e.g. Dept. of Consumer Affairs, Legal Metrology Division',
    needsJurisdiction: true,
    border: 'hover:border-blue-500',
    activeBorder: 'border-blue-500 bg-blue-50/50',
    iconColor: 'text-blue-600'
  },
  {
    role: 'GATC',
    label: 'GATC Lab',
    sublabel: 'Government Approved Test Centre',
    icon: 'science',
    orgLabel: 'Laboratory / Test Centre Name',
    orgPlaceholder: 'e.g. National Metrology Testing Centre',
    needsJurisdiction: true,
    border: 'hover:border-amber-500',
    activeBorder: 'border-amber-500 bg-amber-50/50',
    iconColor: 'text-amber-600'
  }
];

export default function RegisterView({ onRegisterSuccess, onBackToLogin }) {
  const [selectedRole, setSelectedRole] = useState('TRADER');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [organizationName, setOrganizationName] = useState('');
  const [jurisdictions, setJurisdictions] = useState([]);
  const [districtSearch, setDistrictSearch] = useState('');
  const [districtDropdownOpen, setDistrictDropdownOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const roleConfig = ROLE_OPTIONS.find(r => r.role === selectedRole);

  // Shows a starter list on focus (before typing) so the field reads as a real
  // dropdown, not a search box that looks empty/broken until you type something.
  const filteredDistricts = useMemo(() => {
    const q = districtSearch.trim().toLowerCase();
    const pool = q ? FLAT_DISTRICTS.filter(d => d.label.toLowerCase().includes(q)) : FLAT_DISTRICTS;
    return pool.filter(d => !jurisdictions.includes(d.label)).slice(0, 30);
  }, [districtSearch, jurisdictions]);

  const addJurisdiction = (label) => {
    setJurisdictions(prev => (prev.includes(label) ? prev : [...prev, label]));
    setDistrictSearch('');
  };

  const removeJurisdiction = (label) => {
    setJurisdictions(prev => prev.filter(j => j !== label));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    if (roleConfig.needsJurisdiction && jurisdictions.length === 0) {
      setError('Please select at least one notified jurisdiction (district) — this determines which cases you can be recommended for.');
      return;
    }

    setLoading(true);
    try {
      const data = await api.register({
        full_name: fullName.trim(),
        email: email.trim(),
        password,
        phone: phone.trim(),
        role: selectedRole,
        organization_name: organizationName.trim(),
        jurisdictions
      });
      setApiUser(data.user, data.token);
      if (onRegisterSuccess) onRegisterSuccess(data);
    } catch (err) {
      setError(err.message || 'Registration failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100/90 flex flex-col justify-between font-sans antialiased text-slate-800">
      <header className="bg-[#002046] text-white py-2.5 px-4 shadow-sm">
        <div className="max-w-7xl mx-auto flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-amber-400 text-base">balance</span>
            <span className="font-semibold tracking-wide">Legal Metrology Verification Framework</span>
            <span className="hidden md:inline text-slate-400">|</span>
            <span className="hidden md:inline text-slate-300">Statutory Standards under Legal Metrology Act, 2009</span>
          </div>
          {onBackToLogin && (
            <button
              onClick={onBackToLogin}
              className="text-xs text-amber-300 hover:text-amber-200 font-semibold flex items-center gap-1 transition-colors"
            >
              <span className="material-symbols-outlined text-sm">login</span>
              Back to Sign In
            </button>
          )}
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center p-4 sm:p-6 my-auto">
        <div className="w-full max-w-xl bg-white rounded-2xl border border-slate-200/90 shadow-xl p-6 sm:p-8 space-y-5 animate-in fade-in zoom-in-95 duration-200">
          <div className="text-center space-y-2">
            <div className="w-12 h-12 rounded-xl bg-primary text-white flex items-center justify-center mx-auto shadow-sm">
              <span className="material-symbols-outlined text-2xl">gavel</span>
            </div>
            <div>
              <h1 className="text-xl font-extrabold text-primary tracking-tight">Create Account</h1>
              <p className="text-xs text-slate-500 font-medium">Register for the CertifyMetric verification platform</p>
            </div>
          </div>

          {/* Role Selector */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-2">I am registering as a...</label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {ROLE_OPTIONS.map((opt) => (
                <button
                  key={opt.role}
                  type="button"
                  onClick={() => setSelectedRole(opt.role)}
                  className={`p-2.5 rounded-lg border-2 text-center flex flex-col items-center justify-center gap-1 transition-all ${
                    selectedRole === opt.role ? opt.activeBorder : `border-slate-200 bg-white ${opt.border}`
                  }`}
                >
                  <span className={`material-symbols-outlined text-[20px] ${opt.iconColor}`}>{opt.icon}</span>
                  <span className="text-[10px] font-bold text-slate-800 leading-tight">{opt.label}</span>
                </button>
              ))}
            </div>
            <p className="text-[11px] text-slate-500 mt-2 leading-snug">{roleConfig.sublabel}</p>
          </div>

          {roleConfig.needsJurisdiction && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-[11px] text-amber-800 flex items-start gap-2">
              <span className="material-symbols-outlined text-base text-amber-600 shrink-0">gavel</span>
              <span>
                Statutory roles only have authority within their government-notified jurisdiction. The allocation engine
                will only recommend you for cases whose instrument district matches what you declare below.
              </span>
            </div>
          )}

          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-start gap-2">
              <span className="material-symbols-outlined text-base text-rose-600 shrink-0 mt-0.5">error</span>
              <span className="leading-snug">{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-3.5">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Full Name</label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                  className="w-full px-3 py-2.5 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-slate-900"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Phone</label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+91 XXXXX XXXXX"
                  className="w-full px-3 py-2.5 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-slate-900"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">Email Address</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                className="w-full px-3 py-2.5 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-slate-900"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={8}
                  autoComplete="new-password"
                  placeholder="Min. 8 characters"
                  className="w-full px-3 py-2.5 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-slate-900"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Confirm Password</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  autoComplete="new-password"
                  className="w-full px-3 py-2.5 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-slate-900"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">{roleConfig.orgLabel}</label>
              <input
                type="text"
                value={organizationName}
                onChange={(e) => setOrganizationName(e.target.value)}
                required
                placeholder={roleConfig.orgPlaceholder}
                className="w-full px-3 py-2.5 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-slate-900"
              />
            </div>

            {roleConfig.needsJurisdiction && (
              <div className="relative">
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Notified Jurisdiction(s)
                </label>

                {jurisdictions.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {jurisdictions.map((j) => (
                      <span
                        key={j}
                        className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-primary/10 text-primary text-[11px] font-semibold"
                      >
                        {j}
                        <button
                          type="button"
                          onClick={() => removeJurisdiction(j)}
                          className="hover:text-rose-600"
                          aria-label={`Remove ${j}`}
                        >
                          <span className="material-symbols-outlined text-[14px] leading-none">close</span>
                        </button>
                      </span>
                    ))}
                  </div>
                )}

                <input
                  type="text"
                  value={districtSearch}
                  onChange={(e) => setDistrictSearch(e.target.value)}
                  onFocus={() => setDistrictDropdownOpen(true)}
                  onBlur={() => setDistrictDropdownOpen(false)}
                  placeholder="Click or type to search a district (e.g. Mumbai Suburban, Pune)..."
                  className="w-full px-3 py-2.5 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-slate-900"
                />

                {districtDropdownOpen && filteredDistricts.length > 0 && (
                  <div className="absolute z-10 mt-1 w-full max-h-48 overflow-y-auto bg-white border border-slate-200 rounded-lg shadow-lg">
                    {!districtSearch.trim() && (
                      <div className="px-3 py-1.5 text-[10px] text-slate-400 border-b border-slate-100 sticky top-0 bg-white">
                        Showing 30 of {FLAT_DISTRICTS.length} districts — type to narrow down
                      </div>
                    )}
                    {filteredDistricts.map((d) => (
                      <button
                        type="button"
                        key={d.label}
                        // onMouseDown (not onClick) fires before the input's onBlur closes this
                        // dropdown, so the click actually registers instead of silently vanishing.
                        onMouseDown={(e) => {
                          e.preventDefault();
                          addJurisdiction(d.label);
                        }}
                        className="w-full text-left px-3 py-2 text-xs hover:bg-primary/5 flex items-center justify-between"
                      >
                        <span className="font-medium text-slate-800">{d.district}</span>
                        <span className="text-slate-400 text-[10px]">{d.state}</span>
                      </button>
                    ))}
                  </div>
                )}

                <p className="text-[10px] text-slate-400 mt-1">
                  Select every district you hold notified charge for (including any additional charge).
                </p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 px-4 bg-primary hover:bg-primary-container text-white font-bold text-xs tracking-wide uppercase rounded-lg shadow-sm transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading ? (
                <>
                  <span className="material-symbols-outlined text-base animate-spin">progress_activity</span>
                  <span>Creating Account...</span>
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-base">person_add</span>
                  <span>Create Account</span>
                </>
              )}
            </button>
          </form>

          {onBackToLogin && (
            <p className="text-center text-[11px] text-slate-500">
              Already have an account?{' '}
              <button onClick={onBackToLogin} className="font-bold text-primary hover:underline">
                Sign in
              </button>
            </p>
          )}
        </div>
      </main>

      <footer className="text-center py-3.5 text-[11px] text-slate-500 border-t border-slate-200 bg-white">
        Legal Metrology Portal • Authorized Under Section 24 of the Legal Metrology Act, 2009
      </footer>
    </div>
  );
}
