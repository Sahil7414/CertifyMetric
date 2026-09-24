import React, { useEffect, useState } from 'react';
import { api } from '../api';

export default function PublicCertificateVerification({
  token: initialToken = '',
  onExit
}) {
  const [certToken, setCertToken] = useState(initialToken || '');
  const [certInput, setCertInput] = useState(initialToken || '');
  const [certData, setCertData] = useState(null);
  const [certLoading, setCertLoading] = useState(Boolean(initialToken));
  const [certError, setCertError] = useState(null);

  const fetchCertificate = (tokenToFetch) => {
    const clean = (tokenToFetch || '').trim();
    if (!clean) {
      setCertError('Please enter a valid certificate number or public verification token.');
      setCertLoading(false);
      setCertData(null);
      return;
    }

    setCertLoading(true);
    setCertError(null);

    api.verifyPublicCertificate(clean)
      .then((res) => {
        if (res.status === 'NOT_FOUND' || res.status === 'INVALID' || !res.ok) {
          setCertError(res.error || 'Certificate not found or verification reference invalid.');
          setCertData(res);
        } else {
          setCertData(res);
        }
      })
      .catch(() => {
        setCertError('Network error: Unable to contact legal metrology verification registry.');
        setCertData(null);
      })
      .finally(() => setCertLoading(false));
  };

  useEffect(() => {
    if (initialToken) {
      setCertToken(initialToken);
      setCertInput(initialToken);
      fetchCertificate(initialToken);
    }
  }, [initialToken]);

  const handleCertSubmit = (e) => {
    e?.preventDefault();
    const clean = certInput.trim();
    if (!clean) return;
    setCertToken(clean);
    window.history.pushState({}, '', `/verify/${encodeURIComponent(clean)}`);
    fetchCertificate(clean);
  };

  const isCertValid = certData?.status === 'VALID';
  const isCertExpired = certData?.status === 'EXPIRED';
  const isCertNotFound = !certData || certData?.status === 'NOT_FOUND' || certData?.status === 'INVALID' || Boolean(certError && !certData?.certificate_no);

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col font-sans antialiased text-slate-800">
      {/* 1. Official Government Header Stripe */}
      <header className="bg-[#002046] text-white py-3 px-4 shadow-sm print:hidden">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="material-symbols-outlined text-amber-400 text-2xl">balance</span>
            <div>
              <div className="text-xs font-bold tracking-wide uppercase">Government of India</div>
              <div className="text-[10px] text-slate-300">Department of Consumer Affairs • Legal Metrology Division</div>
            </div>
          </div>
          {onExit && (
            <button
              type="button"
              onClick={onExit}
              className="text-xs bg-white/10 hover:bg-white/20 text-white px-3 py-1.5 rounded-lg transition-colors font-semibold flex items-center gap-1 cursor-pointer"
            >
              <span className="material-symbols-outlined text-sm">home</span>
              Portal Home
            </button>
          )}
        </div>
      </header>

      {/* 2. Main Verification Content */}
      <main className="flex-1 max-w-3xl w-full mx-auto p-4 sm:p-6 flex flex-col justify-start">
        
        {/* If no token or search active, show minimal lookup bar (print:hidden) */}
        {!certToken && (
          <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200 shadow-sm mb-6 print:hidden text-center space-y-4">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 text-xs font-bold border border-emerald-200">
              <span className="material-symbols-outlined text-sm">verified_user</span>
              <span>National Legal Metrology Registry</span>
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-[#002046] tracking-tight">
                Certificate Verification
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-md mx-auto">
                Authenticate any statutory Legal Metrology Certificate. Enter the certificate number or public token printed on the document.
              </p>
            </div>

            <form onSubmit={handleCertSubmit} className="max-w-md mx-auto space-y-3 pt-2 text-left">
              <div>
                <label htmlFor="public-cert-input" className="block text-xs font-bold text-slate-700 mb-1">
                  Certificate Number or Public Token
                </label>
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-3 top-2.5 text-slate-400 text-base">
                    vpn_key
                  </span>
                  <input
                    id="public-cert-input"
                    type="text"
                    value={certInput}
                    onChange={(e) => {
                      setCertInput(e.target.value);
                      if (certError) setCertError(null);
                    }}
                    placeholder="e.g. CERT-2026-0001 or 550e8400-e29b-41d4..."
                    className="w-full pl-9 pr-3 py-2.5 text-xs bg-white border border-slate-300 rounded-lg font-mono text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#002046]/20 focus:border-[#002046] box-border"
                  />
                </div>
                {certError && (
                  <p className="text-[11px] font-semibold text-rose-600 mt-1">{certError}</p>
                )}
              </div>

              <button
                type="submit"
                disabled={certLoading || !certInput.trim()}
                className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-lg transition-all flex items-center justify-center gap-1.5 shadow-2xs disabled:opacity-50 cursor-pointer"
              >
                <span className="material-symbols-outlined text-base">verified</span>
                <span>{certLoading ? 'Querying Ledger...' : 'Verify Certificate'}</span>
              </button>
            </form>
          </div>
        )}

        {/* 3. Loading Indicator */}
        {certLoading && (
          <div className="bg-white rounded-2xl p-10 border border-slate-200 shadow-sm text-center space-y-4 my-8">
            <div className="w-14 h-14 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto animate-spin">
              <span className="material-symbols-outlined text-3xl">progress_activity</span>
            </div>
            <h2 className="text-base font-bold text-slate-900">
              Authenticating Digital Certificate
            </h2>
            <p className="text-xs text-slate-500 max-w-xs mx-auto">
              Querying official National Legal Metrology digital ledger for reference token...
            </p>
          </div>
        )}

        {/* 4. Certificate Verification Results */}
        {!certLoading && certToken && (
          <div className="space-y-4 animate-in fade-in duration-200">
            {/* Desktop Action Bar */}
            <div className="flex items-center justify-between bg-white px-4 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-500 print:hidden">
              <div className="flex items-center gap-1.5">
                <span className="material-symbols-outlined text-base text-emerald-600">verified</span>
                <span className="font-semibold text-slate-700">Official Certificate Validation Result</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg font-bold transition-all flex items-center gap-1 text-[11px] cursor-pointer"
                >
                  <span className="material-symbols-outlined text-sm">print</span>
                  Print Record
                </button>
              </div>
            </div>

            {/* Status Banner: VALID */}
            {isCertValid && (
              <div className="bg-emerald-600 text-white rounded-2xl p-6 sm:p-7 shadow-md text-center space-y-3">
                <div className="w-14 h-14 rounded-full bg-white/20 text-white flex items-center justify-center mx-auto shadow-inner">
                  <span className="material-symbols-outlined text-3xl font-bold">verified</span>
                </div>
                <div className="text-xs uppercase tracking-widest font-extrabold text-emerald-100">
                  Authentication Succeeded
                </div>
                <h2 className="text-2xl sm:text-3xl font-black tracking-tight">CERTIFICATE VALID</h2>
                
                {/* Prominently Highlighted Validity Date */}
                <div className="pt-1 pb-1">
                  <div className="bg-emerald-700/80 border border-emerald-400/40 rounded-xl px-5 py-2.5 inline-block shadow-inner">
                    <span className="text-[11px] uppercase tracking-wider text-emerald-100 font-bold block">
                      Statutory Verification Valid Until
                    </span>
                    <span className="text-xl sm:text-2xl font-black tracking-wide text-white">
                      Valid Until: {certData?.valid_until ? new Date(certData.valid_until).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
                    </span>
                  </div>
                </div>

                <p className="text-xs text-emerald-50 max-w-md mx-auto leading-relaxed">
                  This weighing or measuring instrument is actively certified for commercial use under Section 24 of The Legal Metrology Act, 2009.
                </p>
              </div>
            )}

            {/* Status Banner: EXPIRED */}
            {isCertExpired && (
              <div className="bg-amber-600 text-white rounded-2xl p-6 sm:p-7 shadow-md text-center space-y-3">
                <div className="w-14 h-14 rounded-full bg-white/20 text-white flex items-center justify-center mx-auto shadow-inner">
                  <span className="material-symbols-outlined text-3xl font-bold">history_toggle_off</span>
                </div>
                <div className="text-xs uppercase tracking-widest font-extrabold text-amber-100">
                  Statutory Term Concluded
                </div>
                <h2 className="text-2xl sm:text-3xl font-black tracking-tight">CERTIFICATE EXPIRED</h2>
                
                {/* Prominently Highlighted Expiry Date */}
                <div className="pt-1 pb-1">
                  <div className="bg-amber-700/80 border border-amber-400/40 rounded-xl px-5 py-2.5 inline-block shadow-inner">
                    <span className="text-[11px] uppercase tracking-wider text-amber-100 font-bold block">
                      Validity Expired On
                    </span>
                    <span className="text-xl sm:text-2xl font-black tracking-wide text-white">
                      Valid Until: {certData?.valid_until ? new Date(certData.valid_until).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
                    </span>
                  </div>
                </div>

                <p className="text-xs text-amber-50 max-w-md mx-auto leading-relaxed">
                  This certificate was genuine, but its statutory validity period has passed. Re-verification is mandatory before commercial transactions.
                </p>
              </div>
            )}

            {/* Status Banner: NOT FOUND / INVALID */}
            {isCertNotFound && (
              <div className="bg-rose-700 text-white rounded-2xl p-6 sm:p-7 shadow-md text-center space-y-3">
                <div className="w-14 h-14 rounded-full bg-white/20 text-white flex items-center justify-center mx-auto shadow-inner">
                  <span className="material-symbols-outlined text-3xl font-bold">gpp_bad</span>
                </div>
                <div className="text-xs uppercase tracking-widest font-extrabold text-rose-100">
                  Authentication Failed
                </div>
                <h2 className="text-2xl sm:text-3xl font-black tracking-tight">CERTIFICATE NOT FOUND</h2>
                <p className="text-xs text-rose-100 max-w-md mx-auto leading-relaxed pt-1">
                  The scanned QR token or reference number does not correspond to any registered certificate in the official digital repository.
                </p>
              </div>
            )}

            {/* Certificate Certified Particulars Card */}
            {certData?.certificate_no && (
              <div className="bg-white rounded-2xl p-5 sm:p-7 border border-slate-200 shadow-sm space-y-4">
                <div className="pb-3 border-b border-slate-100 flex items-center justify-between flex-wrap gap-2">
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Official Certificate Number</span>
                    <span className="font-mono text-base font-extrabold text-[#002046]">{certData.certificate_no}</span>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-extrabold uppercase ${
                    isCertValid ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                  }`}>
                    {certData.status}
                  </span>
                </div>

                <div className="space-y-2.5 text-xs text-slate-700">
                  <div className="flex justify-between py-1 border-b border-slate-100">
                    <span className="text-slate-500">Application Number:</span>
                    <strong className="font-mono text-slate-900">{certData.application_no || '—'}</strong>
                  </div>

                  <div className="flex justify-between py-1 border-b border-slate-100">
                    <span className="text-slate-500">Verified Equipment:</span>
                    <strong className="text-slate-900 text-right">{certData.instrument?.manufacturer} {certData.instrument?.model}</strong>
                  </div>

                  <div className="flex justify-between py-1 border-b border-slate-100">
                    <span className="text-slate-500">Serial Number:</span>
                    <span className="font-mono font-bold text-primary">{certData.instrument?.serial_number}</span>
                  </div>

                  <div className="flex justify-between py-1 border-b border-slate-100">
                    <span className="text-slate-500">Instrument ID:</span>
                    <span className="font-mono text-slate-600">{certData.instrument?.id || '—'}</span>
                  </div>

                  <div className="flex justify-between py-1 border-b border-slate-100">
                    <span className="text-slate-500">Category / Type:</span>
                    <span className="text-slate-800 font-medium text-right">{certData.instrument?.category}</span>
                  </div>

                  <div className="flex justify-between py-1 border-b border-slate-100">
                    <span className="text-slate-500">Capacity & Interval:</span>
                    <span className="font-medium text-slate-900">
                      {certData.instrument?.max_capacity} (e = {certData.instrument?.verification_scale_interval_e})
                    </span>
                  </div>

                  <div className="flex justify-between py-1 border-b border-slate-100">
                    <span className="text-slate-500">Verification Date:</span>
                    <span className="font-semibold text-slate-800">
                      {certData.issue_date ? new Date(certData.issue_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
                    </span>
                  </div>

                  {/* Highlighted Validity Date in Grid */}
                  <div className="flex justify-between py-2 border-b border-slate-100 bg-slate-50/70 px-2 rounded-lg items-center">
                    <span className="text-slate-700 font-bold">Statutory Valid Until:</span>
                    <strong className={isCertValid ? 'text-emerald-700 font-extrabold text-sm sm:text-base' : 'text-rose-600 font-extrabold text-sm sm:text-base'}>
                      {certData.valid_until ? new Date(certData.valid_until).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
                    </strong>
                  </div>

                  <div className="flex justify-between py-1 border-b border-slate-100">
                    <span className="text-slate-500">Commercial Establishment:</span>
                    <span className="text-slate-800 font-semibold text-right">{certData.business?.enterprise_name || certData.business?.trader_name}</span>
                  </div>

                  <div className="flex justify-between py-1 border-b border-slate-100">
                    <span className="text-slate-500">Installation Location:</span>
                    <span className="text-slate-700 text-right max-w-xs truncate">{certData.instrument?.location || certData.business?.location || 'Registered Premises'}</span>
                  </div>

                  <div className="flex justify-between py-1">
                    <span className="text-slate-500">Issuing Authority:</span>
                    <span className="text-slate-700 text-right">{certData.verification_authority?.authority || 'Legal Metrology Division'}</span>
                  </div>
                </div>

                <div className="mt-4 p-3.5 bg-slate-50 rounded-xl border border-slate-200/80 text-[11px] text-slate-600 flex items-start gap-2.5">
                  <span className="material-symbols-outlined text-primary text-base shrink-0 mt-0.5">verified_user</span>
                  <p className="leading-relaxed">
                    {certData.verification_statement}
                  </p>
                </div>
              </div>
            )}

            {isCertNotFound && (
              <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm space-y-3 text-xs text-slate-600">
                <h4 className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-rose-600">report</span>
                  Consumer Protection Advisory
                </h4>
                <p className="leading-relaxed">
                  If this instrument is being used for commercial trade transactions, please request the establishment to present their physical Certificate of Verification (Form 6) or report non-compliance to the State Legal Metrology Department.
                </p>
                <div className="p-3 bg-slate-50 rounded-lg font-mono text-[11px] text-slate-500 break-all">
                  Reference Queried: {certToken || 'None provided'}
                </div>
              </div>
            )}

            <div className="text-center text-[10px] text-slate-400 py-2">
              National Metrology Registry • Verification ledger timestamp: {new Date().toLocaleString('en-IN')}
            </div>
          </div>
        )}

      </main>
    </div>
  );
}
