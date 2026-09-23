import React, { useEffect, useState } from 'react';
import { api } from '../api';
import QrScannerModal from '../components/QrScannerModal';

export default function PublicCertificateVerification({
  mode: initialMode = 'CERTIFICATE',
  token: initialToken = '',
  onExit
}) {
  // Verification mode: 'CERTIFICATE' | 'INSTRUMENT'
  const [activeMode, setActiveMode] = useState(initialMode || 'CERTIFICATE');

  // Certificate State
  const [certToken, setCertToken] = useState(initialMode === 'CERTIFICATE' ? (initialToken || '') : '');
  const [certInput, setCertInput] = useState(initialMode === 'CERTIFICATE' ? (initialToken || '') : '');
  const [certData, setCertData] = useState(null);
  const [certLoading, setCertLoading] = useState(Boolean(initialMode === 'CERTIFICATE' && initialToken));
  const [certError, setCertError] = useState(null);

  // Instrument State
  const [instToken, setInstToken] = useState(initialMode === 'INSTRUMENT' ? (initialToken || '') : '');
  const [instInput, setInstInput] = useState(initialMode === 'INSTRUMENT' ? (initialToken || '') : '');
  const [instData, setInstData] = useState(null);
  const [instLoading, setInstLoading] = useState(Boolean(initialMode === 'INSTRUMENT' && initialToken));
  const [instError, setInstError] = useState(null);

  // QR Scanner Modal State
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [scannerMode, setScannerMode] = useState('INSTRUMENT'); // 'CERTIFICATE' | 'INSTRUMENT'

  // ==========================================
  // Certificate Fetch Logic
  // ==========================================
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

  // ==========================================
  // Instrument Fetch Logic
  // ==========================================
  const fetchInstrument = (tokenToFetch) => {
    const clean = (tokenToFetch || '').trim();
    if (!clean) {
      setInstError('Please enter a valid public instrument token or serial number.');
      setInstLoading(false);
      setInstData(null);
      return;
    }

    setInstLoading(true);
    setInstError(null);

    api.validatePublicInstrument(clean)
      .then((res) => {
        if (res.status === 'NOT_FOUND' || res.status === 'INVALID' || !res.ok) {
          setInstError(res.error || 'Instrument record not found in the official registry.');
          setInstData(res);
        } else {
          setInstData(res);
        }
      })
      .catch(() => {
        setInstError('Network error: Unable to contact legal metrology instrument registry.');
        setInstData(null);
      })
      .finally(() => setInstLoading(false));
  };

  // React to initial prop updates
  useEffect(() => {
    if (initialMode) {
      setActiveMode(initialMode);
    }
    if (initialToken) {
      if (initialMode === 'INSTRUMENT') {
        setInstToken(initialToken);
        setInstInput(initialToken);
        fetchInstrument(initialToken);
      } else {
        setCertToken(initialToken);
        setCertInput(initialToken);
        fetchCertificate(initialToken);
      }
    }
  }, [initialMode, initialToken]);

  // Tab Switch Handler
  const handleTabChange = (newMode) => {
    setActiveMode(newMode);
    if (newMode === 'CERTIFICATE') {
      const targetUrl = certToken ? `/verify/${encodeURIComponent(certToken)}` : '/verify';
      window.history.pushState({}, '', targetUrl);
    } else {
      const targetUrl = instToken ? `/public/instrument/${encodeURIComponent(instToken)}` : '/public/instrument';
      window.history.pushState({}, '', targetUrl);
    }
  };

  // Certificate Search Submit
  const handleCertSubmit = (e) => {
    e?.preventDefault();
    const clean = certInput.trim();
    if (!clean) return;
    setCertToken(clean);
    window.history.pushState({}, '', `/verify/${encodeURIComponent(clean)}`);
    fetchCertificate(clean);
  };

  // Instrument Search Submit
  const handleInstSubmit = (e) => {
    e?.preventDefault();
    const clean = instInput.trim();
    if (!clean) return;
    setInstToken(clean);
    window.history.pushState({}, '', `/public/instrument/${encodeURIComponent(clean)}`);
    fetchInstrument(clean);
  };

  // Scanner Open Trigger
  const handleOpenScanner = (targetMode) => {
    setScannerMode(targetMode);
    setIsScannerOpen(true);
  };

  // Successful QR Detection from Camera
  const handleQrScanned = (scannedToken) => {
    setIsScannerOpen(false);
    if (!scannedToken) return;

    if (scannerMode === 'CERTIFICATE') {
      setActiveMode('CERTIFICATE');
      setCertInput(scannedToken);
      setCertToken(scannedToken);
      window.history.pushState({}, '', `/verify/${encodeURIComponent(scannedToken)}`);
      fetchCertificate(scannedToken);
    } else {
      setActiveMode('INSTRUMENT');
      setInstInput(scannedToken);
      setInstToken(scannedToken);
      window.history.pushState({}, '', `/public/instrument/${encodeURIComponent(scannedToken)}`);
      fetchInstrument(scannedToken);
    }
  };

  // Derived statuses
  const isCertValid = certData?.status === 'VALID';
  const isCertExpired = certData?.status === 'EXPIRED';
  const isCertNotFound = !certData || certData?.status === 'NOT_FOUND' || certData?.status === 'INVALID' || Boolean(certError && !certData?.certificate_no);

  const isInstValid = instData?.status === 'VERIFIED_VALID';
  const isInstExpired = instData?.status === 'EXPIRED';
  const isInstPending = instData?.status === 'REGISTERED_NOT_VERIFIED';
  const isInstSuspended = instData?.status === 'SUSPENDED';
  const isInstCancelled = instData?.status === 'CANCELLED';
  const isInstNotFound = !instData || instData?.status === 'NOT_FOUND' || instData?.status === 'INVALID' || Boolean(instError && !instData?.serial_number && !instData?.instrument_id);

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col font-sans antialiased text-slate-800">
      {/* ====================================================
          1. Official Government Header Stripe
         ==================================================== */}
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

      {/* ====================================================
          2. Main Verification Container
         ==================================================== */}
      <main className="flex-1 max-w-4xl w-full mx-auto p-4 sm:p-6 flex flex-col justify-start">
        
        {/* Verification Engine Shell Card */}
        <div className="bg-white rounded-2xl p-4 sm:p-7 border border-slate-200 shadow-sm mb-6 print:hidden">
          
          {/* Header & Tabs */}
          <div className="text-center sm:text-left mb-6">
            <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-emerald-50 text-emerald-800 text-[11px] font-bold border border-emerald-200 mb-2">
              <span className="material-symbols-outlined text-sm">verified_user</span>
              <span>National Legal Metrology Registry</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-[#002046] tracking-tight">
              Public Verification Engine
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-xl">
              Real-time statutory authenticity check under the Legal Metrology Act, 2009. Select verification purpose below:
            </p>
          </div>

          {/* Two Clear Verification Options: Tabs */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 p-1.5 bg-slate-100/90 rounded-xl mb-6">
            <button
              type="button"
              onClick={() => handleTabChange('CERTIFICATE')}
              className={`py-2.5 px-4 rounded-lg font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all cursor-pointer ${
                activeMode === 'CERTIFICATE'
                  ? 'bg-white text-[#002046] shadow-xs border border-slate-200'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
              }`}
            >
              <span className="material-symbols-outlined text-base sm:text-lg text-emerald-600">
                description
              </span>
              <span>Verify Certificate</span>
            </button>

            <button
              type="button"
              onClick={() => handleTabChange('INSTRUMENT')}
              className={`py-2.5 px-4 rounded-lg font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all cursor-pointer ${
                activeMode === 'INSTRUMENT'
                  ? 'bg-white text-[#002046] shadow-xs border border-slate-200'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
              }`}
            >
              <span className="material-symbols-outlined text-base sm:text-lg text-primary">
                scale
              </span>
              <span>Validate Instrument</span>
            </button>
          </div>

          {/* ====================================================
              MODE A: CERTIFICATE VERIFICATION FORM
             ==================================================== */}
          {activeMode === 'CERTIFICATE' && (
            <div className="grid grid-cols-1 md:grid-cols-12 gap-5 sm:gap-6 items-center pt-1 animate-in fade-in duration-200">
              {/* Left / Info Column */}
              <div className="md:col-span-6 space-y-2">
                <div className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 text-[11px] font-bold border border-emerald-200">
                  <span className="material-symbols-outlined text-sm">verified</span>
                  <span>Certificate Verification</span>
                </div>
                <h2 className="text-base sm:text-lg font-extrabold text-[#002046] tracking-tight">
                  Verify Certificate Authenticity
                </h2>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Any citizen, trader, or enforcement officer can verify a digital certificate's statutory validity in real time. Enter the unique public token or scan the QR code printed on the certificate.
                </p>
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={() => handleOpenScanner('CERTIFICATE')}
                    className="w-full sm:w-auto px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs rounded-xl border border-slate-300 transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs"
                  >
                    <span className="material-symbols-outlined text-base text-emerald-600">qr_code_scanner</span>
                    <span>Scan Certificate QR</span>
                  </button>
                </div>
              </div>

              {/* Right / Input Form Column */}
              <div className="md:col-span-6 bg-slate-50 p-4 sm:p-5 rounded-xl border border-slate-200">
                <form onSubmit={handleCertSubmit} className="space-y-3">
                  <div>
                    <label htmlFor="cert-token-input" className="block text-xs font-bold text-slate-700 mb-1">
                      Public Certificate Token / UUID
                    </label>
                    <div className="relative">
                      <span className="material-symbols-outlined absolute left-3 top-2.5 text-slate-400 text-base">
                        vpn_key
                      </span>
                      <input
                        id="cert-token-input"
                        type="text"
                        value={certInput}
                        onChange={(e) => {
                          setCertInput(e.target.value);
                          if (certError) setCertError(null);
                        }}
                        placeholder="e.g. 550e8400-e29b-41d4... or LM-2026-..."
                        className="w-full pl-9 pr-3 py-2 text-xs bg-white border border-slate-300 rounded-lg font-mono text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#002046]/20 focus:border-[#002046] box-border"
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
            </div>
          )}

          {/* ====================================================
              MODE B: INSTRUMENT VALIDATION FORM
             ==================================================== */}
          {activeMode === 'INSTRUMENT' && (
            <div className="grid grid-cols-1 md:grid-cols-12 gap-5 sm:gap-6 items-center pt-1 animate-in fade-in duration-200">
              {/* Left / Info Column */}
              <div className="md:col-span-6 space-y-2">
                <div className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-800 text-[11px] font-bold border border-blue-200">
                  <span className="material-symbols-outlined text-sm">scale</span>
                  <span>Public Instrument Validation</span>
                </div>
                <h2 className="text-base sm:text-lg font-extrabold text-[#002046] tracking-tight">
                  Validate Instrument
                </h2>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Scan the QR code on an issued instrument to check its current verification status and validity date.
                </p>

                {/* Primary Action: Scan Instrument QR */}
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={() => handleOpenScanner('INSTRUMENT')}
                    className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs sm:text-sm rounded-xl transition-all flex items-center justify-center gap-2 shadow-xs cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-lg">qr_code_scanner</span>
                    <span>Scan Instrument QR</span>
                  </button>
                </div>
              </div>

              {/* Right / Secondary / Manual Input Column */}
              <div className="md:col-span-6 bg-slate-50 p-4 sm:p-5 rounded-xl border border-slate-200">
                <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1">
                  <span className="material-symbols-outlined text-sm">edit_note</span>
                  <span>Manual Lookup Option</span>
                </div>
                <form onSubmit={handleInstSubmit} className="space-y-3">
                  <div>
                    <label htmlFor="inst-token-input" className="block text-xs font-bold text-slate-700 mb-1">
                      Instrument Public Code / Token
                    </label>
                    <div className="relative">
                      <span className="material-symbols-outlined absolute left-3 top-2.5 text-slate-400 text-base">
                        pin
                      </span>
                      <input
                        id="inst-token-input"
                        type="text"
                        value={instInput}
                        onChange={(e) => {
                          setInstInput(e.target.value);
                          if (instError) setInstError(null);
                        }}
                        placeholder="Enter public instrument code or serial number"
                        className="w-full pl-9 pr-3 py-2 text-xs bg-white border border-slate-300 rounded-lg font-mono text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#002046]/20 focus:border-[#002046] box-border"
                      />
                    </div>
                    {instError && (
                      <p className="text-[11px] font-semibold text-rose-600 mt-1">{instError}</p>
                    )}
                  </div>

                  <button
                    type="submit"
                    disabled={instLoading || !instInput.trim()}
                    className="w-full py-2.5 bg-[#002046] hover:bg-[#1b365d] text-white font-bold text-xs rounded-lg transition-all flex items-center justify-center gap-1.5 shadow-2xs disabled:opacity-50 cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-base">search</span>
                    <span>{instLoading ? 'Validating Registry...' : 'Validate Instrument'}</span>
                  </button>
                </form>
              </div>
            </div>
          )}

        </div>

        {/* ====================================================
            3. Loading Indicator
           ==================================================== */}
        {(certLoading || instLoading) && (
          <div className="bg-white rounded-2xl p-8 border border-slate-200 shadow-md text-center space-y-4 my-auto">
            <div className="w-16 h-16 rounded-full bg-primary/10 text-primary flex items-center justify-center mx-auto animate-spin">
              <span className="material-symbols-outlined text-3xl">progress_activity</span>
            </div>
            <h2 className="text-base font-bold text-slate-900">
              {activeMode === 'CERTIFICATE' ? 'Authenticating Digital Certificate' : 'Validating Statutory Instrument Status'}
            </h2>
            <p className="text-xs text-slate-500 max-w-xs mx-auto">
              Querying official National Legal Metrology digital ledger for reference token...
            </p>
          </div>
        )}

        {/* ====================================================
            4. CERTIFICATE RESULTS VIEW
           ==================================================== */}
        {!certLoading && activeMode === 'CERTIFICATE' && certData && (
          <div className="space-y-4 animate-in fade-in duration-200">
            {/* Action Bar for Desktop / Print */}
            {certData?.certificate_no && (
              <div className="flex items-center justify-between bg-white px-4 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-500 print:hidden">
                <span className="font-semibold">Digital Certificate Authenticated</span>
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg font-bold transition-all flex items-center gap-1 text-[11px] cursor-pointer"
                >
                  <span className="material-symbols-outlined text-sm">print</span>
                  Print Record
                </button>
              </div>
            )}

            {/* Certificate Status Banner */}
            {isCertValid && (
              <div className="bg-emerald-600 text-white rounded-2xl p-6 shadow-md text-center space-y-2">
                <div className="w-14 h-14 rounded-full bg-white/20 text-white flex items-center justify-center mx-auto shadow-inner">
                  <span className="material-symbols-outlined text-3xl font-bold">verified</span>
                </div>
                <div className="text-xs uppercase tracking-widest font-extrabold text-emerald-100">
                  Authentication Succeeded
                </div>
                <h2 className="text-2xl font-black tracking-tight">CERTIFICATE VALID</h2>
                <p className="text-xs text-emerald-50 max-w-sm mx-auto leading-relaxed pt-1">
                  This weighing/measuring instrument is actively certified for commercial use under the Legal Metrology Act, 2009.
                </p>
              </div>
            )}

            {isCertExpired && (
              <div className="bg-amber-600 text-white rounded-2xl p-6 shadow-md text-center space-y-2">
                <div className="w-14 h-14 rounded-full bg-white/20 text-white flex items-center justify-center mx-auto shadow-inner">
                  <span className="material-symbols-outlined text-3xl font-bold">history_toggle_off</span>
                </div>
                <div className="text-xs uppercase tracking-widest font-extrabold text-amber-100">
                  Statutory Term Concluded
                </div>
                <h2 className="text-2xl font-black tracking-tight">CERTIFICATE EXPIRED</h2>
                <p className="text-xs text-amber-50 max-w-sm mx-auto leading-relaxed pt-1">
                  This certificate was genuine, but its statutory validity period has passed. Re-verification is required before commercial use.
                </p>
              </div>
            )}

            {isCertNotFound && (
              <div className="bg-rose-700 text-white rounded-2xl p-6 shadow-md text-center space-y-2">
                <div className="w-14 h-14 rounded-full bg-white/20 text-white flex items-center justify-center mx-auto shadow-inner">
                  <span className="material-symbols-outlined text-3xl font-bold">gpp_bad</span>
                </div>
                <div className="text-xs uppercase tracking-widest font-extrabold text-rose-100">
                  Authentication Failed
                </div>
                <h2 className="text-2xl font-black tracking-tight">CERTIFICATE NOT FOUND</h2>
                <p className="text-xs text-rose-100 max-w-sm mx-auto leading-relaxed pt-1">
                  The scanned QR token or certificate number does not correspond to any registered certificate in the official digital repository.
                </p>
              </div>
            )}

            {/* Certificate Certified Particulars Card */}
            {certData?.certificate_no && (
              <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-4">
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
                    <span className="font-semibold text-slate-800">{new Date(certData.issue_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                  </div>

                  <div className="flex justify-between py-1 border-b border-slate-100">
                    <span className="text-slate-500">Statutory Valid Until:</span>
                    <strong className={isCertValid ? 'text-emerald-700 font-extrabold text-sm' : 'text-rose-600 font-extrabold text-sm'}>
                      {new Date(certData.valid_until).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
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

        {/* ====================================================
            5. INSTRUMENT VALIDATION RESULTS VIEW
           ==================================================== */}
        {!instLoading && activeMode === 'INSTRUMENT' && instData && (
          <div className="space-y-4 animate-in fade-in duration-200">
            {/* Action Bar for Desktop / Print */}
            {instData?.serial_number && (
              <div className="flex items-center justify-between bg-white px-4 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-500 print:hidden">
                <span className="font-semibold">Public Instrument Validation Status</span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleOpenScanner('INSTRUMENT')}
                    className="px-3 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 rounded-lg font-bold transition-all flex items-center gap-1 text-[11px] cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-sm">qr_code_scanner</span>
                    Scan Another
                  </button>
                  <button
                    type="button"
                    onClick={() => window.print()}
                    className="px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg font-bold transition-all flex items-center gap-1 text-[11px] cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-sm">print</span>
                    Print
                  </button>
                </div>
              </div>
            )}

            {/* Status Banner A: VERIFIED — VALID */}
            {isInstValid && (
              <div className="bg-emerald-600 text-white rounded-2xl p-6 shadow-md text-center space-y-2">
                <div className="w-14 h-14 rounded-full bg-white/20 text-white flex items-center justify-center mx-auto shadow-inner">
                  <span className="material-symbols-outlined text-3xl font-bold">verified</span>
                </div>
                <div className="text-xs uppercase tracking-widest font-extrabold text-emerald-100">
                  Authentication Succeeded
                </div>
                <h2 className="text-2xl font-black tracking-tight">VERIFIED — VALID</h2>
                
                {/* Most Important Field: Valid Until */}
                <div className="pt-1 pb-1">
                  <div className="bg-emerald-700/80 border border-emerald-400/40 rounded-xl px-5 py-2.5 inline-block shadow-inner">
                    <span className="text-[11px] uppercase tracking-wider text-emerald-100 font-bold block">
                      Statutory Verification Valid Until
                    </span>
                    <span className="text-xl sm:text-2xl font-black tracking-wide text-white">
                      Valid Until: {instData.valid_until || '—'}
                    </span>
                  </div>
                </div>

                <p className="text-xs text-emerald-50 max-w-sm mx-auto leading-relaxed pt-1">
                  This weighing and measuring instrument holds an active statutory verification certificate and is lawful for commercial transactions.
                </p>
              </div>
            )}

            {/* Status Banner B: VERIFICATION EXPIRED */}
            {isInstExpired && (
              <div className="bg-amber-600 text-white rounded-2xl p-6 shadow-md text-center space-y-2">
                <div className="w-14 h-14 rounded-full bg-white/20 text-white flex items-center justify-center mx-auto shadow-inner">
                  <span className="material-symbols-outlined text-3xl font-bold">history_toggle_off</span>
                </div>
                <div className="text-xs uppercase tracking-widest font-extrabold text-amber-100">
                  Statutory Term Concluded
                </div>
                <h2 className="text-2xl font-black tracking-tight">VERIFICATION EXPIRED</h2>
                
                {/* Most Important Field: Valid Until */}
                <div className="pt-1 pb-1">
                  <div className="bg-amber-700/80 border border-amber-400/40 rounded-xl px-5 py-2.5 inline-block shadow-inner">
                    <span className="text-[11px] uppercase tracking-wider text-amber-100 font-bold block">
                      Validity Expired On
                    </span>
                    <span className="text-xl sm:text-2xl font-black tracking-wide text-white">
                      Valid Until: {instData.valid_until || '—'}
                    </span>
                  </div>
                </div>

                <p className="text-xs text-amber-50 max-w-sm mx-auto leading-relaxed pt-1">
                  The statutory validity of this instrument has lapsed. Commercial transactions with this equipment are non-compliant until re-verified.
                </p>
              </div>
            )}

            {/* Status Banner C: REGISTERED — NOT CURRENTLY VERIFIED */}
            {isInstPending && (
              <div className="bg-blue-700 text-white rounded-2xl p-6 shadow-md text-center space-y-2">
                <div className="w-14 h-14 rounded-full bg-white/20 text-white flex items-center justify-center mx-auto shadow-inner">
                  <span className="material-symbols-outlined text-3xl font-bold">pending</span>
                </div>
                <div className="text-xs uppercase tracking-widest font-extrabold text-blue-100">
                  Statutory Registration Active
                </div>
                <h2 className="text-2xl font-black tracking-tight">REGISTERED — NOT CURRENTLY VERIFIED</h2>
                <p className="text-xs text-blue-50 max-w-sm mx-auto leading-relaxed pt-1">
                  This instrument is registered in the official Legal Metrology system, but it does not have an active verification certificate on record.
                </p>
              </div>
            )}

            {/* Status Banner D: SUSPENDED */}
            {isInstSuspended && (
              <div className="bg-rose-700 text-white rounded-2xl p-6 shadow-md text-center space-y-2">
                <div className="w-14 h-14 rounded-full bg-white/20 text-white flex items-center justify-center mx-auto shadow-inner">
                  <span className="material-symbols-outlined text-3xl font-bold">gpp_bad</span>
                </div>
                <div className="text-xs uppercase tracking-widest font-extrabold text-rose-100">
                  Enforcement Notice
                </div>
                <h2 className="text-2xl font-black tracking-tight">SUSPENDED</h2>
                <p className="text-xs text-rose-100 max-w-sm mx-auto leading-relaxed pt-1">
                  Statutory verification privileges for this instrument have been suspended under enforcement order. Commercial use is prohibited.
                </p>
              </div>
            )}

            {/* Status Banner E: CANCELLED */}
            {isInstCancelled && (
              <div className="bg-slate-700 text-white rounded-2xl p-6 shadow-md text-center space-y-2">
                <div className="w-14 h-14 rounded-full bg-white/20 text-white flex items-center justify-center mx-auto shadow-inner">
                  <span className="material-symbols-outlined text-3xl font-bold">cancel</span>
                </div>
                <div className="text-xs uppercase tracking-widest font-extrabold text-slate-200">
                  Record Revoked
                </div>
                <h2 className="text-2xl font-black tracking-tight">CANCELLED</h2>
                <p className="text-xs text-slate-200 max-w-sm mx-auto leading-relaxed pt-1">
                  This instrument record has been cancelled or rejected by statutory authority.
                </p>
              </div>
            )}

            {/* Status Banner F: INSTRUMENT NOT FOUND */}
            {isInstNotFound && (
              <div className="bg-rose-700 text-white rounded-2xl p-6 shadow-md text-center space-y-2">
                <div className="w-14 h-14 rounded-full bg-white/20 text-white flex items-center justify-center mx-auto shadow-inner">
                  <span className="material-symbols-outlined text-3xl font-bold">search_off</span>
                </div>
                <div className="text-xs uppercase tracking-widest font-extrabold text-rose-100">
                  Lookup Failed
                </div>
                <h2 className="text-2xl font-black tracking-tight">INSTRUMENT NOT FOUND</h2>
                <p className="text-xs text-rose-100 max-w-sm mx-auto leading-relaxed pt-1">
                  The scanned QR token or instrument code does not match any registered instrument in the official digital repository.
                </p>
              </div>
            )}

            {/* Dedicated Public Instrument Particulars Card */}
            {instData?.serial_number && (
              <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-4">
                {/* Header */}
                <div className="pb-3 border-b border-slate-100 flex items-center justify-between flex-wrap gap-2">
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Instrument Identification</span>
                    <span className="font-mono text-base font-extrabold text-[#002046]">
                      {instData.serial_number}
                    </span>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-extrabold uppercase ${
                    isInstValid
                      ? 'bg-emerald-100 text-emerald-800'
                      : isInstExpired
                      ? 'bg-amber-100 text-amber-800'
                      : isInstPending
                      ? 'bg-blue-100 text-blue-800'
                      : 'bg-rose-100 text-rose-800'
                  }`}>
                    {instData.status_label || instData.status}
                  </span>
                </div>

                {/* Statutory Information Grid */}
                <div className="space-y-2.5 text-xs text-slate-700">
                  <div className="flex justify-between py-1 border-b border-slate-100">
                    <span className="text-slate-500">Instrument ID:</span>
                    <strong className="font-mono text-slate-900">{instData.instrument_id}</strong>
                  </div>

                  <div className="flex justify-between py-1 border-b border-slate-100">
                    <span className="text-slate-500">Instrument Category:</span>
                    <span className="font-semibold text-slate-900 text-right">{instData.category_name}</span>
                  </div>

                  <div className="flex justify-between py-1 border-b border-slate-100">
                    <span className="text-slate-500">Manufacturer:</span>
                    <span className="text-slate-800 text-right">{instData.manufacturer}</span>
                  </div>

                  <div className="flex justify-between py-1 border-b border-slate-100">
                    <span className="text-slate-500">Model:</span>
                    <span className="text-slate-800 text-right">{instData.model}</span>
                  </div>

                  <div className="flex justify-between py-1 border-b border-slate-100">
                    <span className="text-slate-500">Verification Type:</span>
                    <span className="font-semibold text-slate-800 text-right">{instData.verification_type}</span>
                  </div>

                  <div className="flex justify-between py-1 border-b border-slate-100">
                    <span className="text-slate-500">Verified On:</span>
                    <span className="font-semibold text-slate-800">{instData.verified_on || 'Not Available'}</span>
                  </div>

                  {/* Most Important Field: Highlighted Valid Until */}
                  <div className="flex justify-between py-2 border-b border-slate-100 bg-slate-50/70 px-2 rounded-lg items-center">
                    <span className="text-slate-700 font-bold">Valid Until:</span>
                    <strong className={isInstValid ? 'text-emerald-700 font-extrabold text-sm sm:text-base' : 'text-rose-600 font-extrabold text-sm sm:text-base'}>
                      {instData.valid_until ? `Valid Until: ${instData.valid_until}` : 'No Active Validity Period'}
                    </strong>
                  </div>

                  {instData.latest_certificate_no && (
                    <div className="flex justify-between py-1 border-b border-slate-100 items-center">
                      <span className="text-slate-500">Associated Certificate:</span>
                      <button
                        type="button"
                        onClick={() => {
                          setActiveMode('CERTIFICATE');
                          setCertInput(instData.latest_certificate_no);
                          fetchCertificate(instData.latest_certificate_no);
                        }}
                        className="font-mono font-bold text-primary hover:underline text-xs flex items-center gap-1 cursor-pointer"
                      >
                        <span>{instData.latest_certificate_no}</span>
                        <span className="material-symbols-outlined text-xs">open_in_new</span>
                      </button>
                    </div>
                  )}

                  {instData.district && (
                    <div className="flex justify-between py-1 border-b border-slate-100">
                      <span className="text-slate-500">Statutory District:</span>
                      <span className="text-slate-800">{instData.district}</span>
                    </div>
                  )}
                </div>

                {/* Trust Information Disclaimer as per Requirement 15 */}
                <div className="mt-4 p-3.5 bg-slate-50 rounded-xl border border-slate-200/80 text-[11px] text-slate-600 space-y-1.5">
                  <div className="flex items-center gap-1.5 font-bold text-slate-700">
                    <span className="material-symbols-outlined text-primary text-base">info</span>
                    <span>Statutory Registry Notice</span>
                  </div>
                  <p className="leading-relaxed">
                    {instData.notice || 'Current verification status is based on records available in CertifyMetric.'}
                  </p>
                  <p className="text-[10px] text-slate-500">
                    {instData.verification_statement}
                  </p>
                </div>
              </div>
            )}

            {isInstNotFound && (
              <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm space-y-3 text-xs text-slate-600">
                <h4 className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-rose-600">report</span>
                  Instrument Record Notice
                </h4>
                <p className="leading-relaxed">
                  No statutory instrument verification record was found matching this reference. Ensure that the QR code belongs to an authentic CertifyMetric legal metrology mark or enter the serial code manually.
                </p>
                <div className="p-3 bg-slate-50 rounded-lg font-mono text-[11px] text-slate-500 break-all">
                  Reference Queried: {instToken || 'None provided'}
                </div>
              </div>
            )}

            {/* Verification Timestamp */}
            <div className="text-center text-[10px] text-slate-400 py-2">
              National Metrology Registry • Verification ledger timestamp: {new Date().toLocaleString('en-IN')}
            </div>
          </div>
        )}

      </main>

      {/* ====================================================
          6. Live Camera QR Scanner Modal
         ==================================================== */}
      <QrScannerModal
        isOpen={isScannerOpen}
        title={scannerMode === 'CERTIFICATE' ? 'Scan Certificate QR' : 'Scan Instrument QR'}
        description={
          scannerMode === 'CERTIFICATE'
            ? 'Point your camera at the QR code printed on the Legal Metrology Certificate.'
            : 'Point your camera at the QR code printed on the weighing or measuring instrument.'
        }
        onClose={() => setIsScannerOpen(false)}
        onScan={handleQrScanned}
        onManualEntry={() => {
          setIsScannerOpen(false);
        }}
      />
    </div>
  );
}
