import React, { useEffect, useState } from 'react';
import { api } from '../api';

export default function PublicVerify({ token, onBackToPortal }) {
  const [currentToken, setCurrentToken] = useState(token || 'e1a2b3c4-d5e6-47f8-9a0b-1c2d3e4f5a6b');
  const [certData, setCertData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [errorStatus, setErrorStatus] = useState(null);

  const fetchTokenData = (tkn) => {
    setLoading(true);
    setErrorStatus(null);
    api.publicVerify(tkn)
      .then((data) => {
        setCertData(data);
      })
      .catch((err) => {
        console.error(err);
        setErrorStatus('INVALID');
        setCertData(null);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (currentToken) {
      fetchTokenData(currentToken);
    }
  }, [currentToken]);

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col items-center justify-center p-4 antialiased">
      {/* Top Demo Helper Bar */}
      <div className="w-full max-w-md mb-3 flex items-center justify-between text-xs">
        <button
          onClick={onBackToPortal}
          className="text-primary hover:underline font-semibold flex items-center gap-1"
        >
          <span className="material-symbols-outlined text-sm">arrow_back</span>
          Back to Portal
        </button>

        {/* Demo Token Preset Toggles (Stitch screens: Valid, Expired, Invalid) */}
        <div className="flex items-center gap-1 bg-white p-1 rounded-lg border border-slate-200 shadow-xs">
          <span className="text-[10px] text-slate-400 font-bold px-1">Test State:</span>
          <button
            onClick={() => setCurrentToken('e1a2b3c4-d5e6-47f8-9a0b-1c2d3e4f5a6b')}
            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
              currentToken === 'e1a2b3c4-d5e6-47f8-9a0b-1c2d3e4f5a6b' ? 'bg-emerald-600 text-white' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            Valid
          </button>
          <button
            onClick={() => setCurrentToken('7c8d9e0f-1a2b-43c4-8d5e-6f7a8b9c0d1e')}
            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
              currentToken === '7c8d9e0f-1a2b-43c4-8d5e-6f7a8b9c0d1e' ? 'bg-amber-600 text-white' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            Expiring
          </button>
          <button
            onClick={() => setCurrentToken('invalid-random-token-999')}
            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
              currentToken === 'invalid-random-token-999' ? 'bg-rose-600 text-white' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            Invalid
          </button>
        </div>
      </div>

      {/* Main Public Verification Card (Mobile-First) */}
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Government Authority Banner */}
        <div className="bg-[#002046] text-white p-5 text-center relative">
          <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center mx-auto mb-2 text-amber-300">
            <span className="material-symbols-outlined text-2xl">balance</span>
          </div>
          <h2 className="text-xs font-bold uppercase tracking-widest text-slate-300">
            Government of India • DoCA
          </h2>
          <h1 className="text-base font-extrabold tracking-tight mt-0.5">
            Legal Metrology Verification Portal
          </h1>
          <p className="text-[11px] text-slate-300 mt-1">Official Statutory Instrument Authentication Service</p>
        </div>

        {loading ? (
          <div className="p-12 text-center text-slate-400 text-xs">
            <span className="material-symbols-outlined text-3xl animate-spin block mb-2 text-primary">progress_activity</span>
            Authenticating token with National Metrology Register...
          </div>
        ) : errorStatus === 'INVALID' || !certData ? (
          /* Invalid / Tampered Screen (Stitch Screen 716a8fe110f54dc8937770f2b9ad90ac) */
          <div className="p-8 text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
              <span className="material-symbols-outlined text-4xl font-bold">cancel</span>
            </div>
            <div>
              <span className="px-3 py-1 rounded-full text-xs font-bold uppercase bg-rose-100 text-rose-800 border border-rose-300">
                Invalid / Unverified Certificate
              </span>
              <h3 className="text-lg font-bold text-slate-900 mt-3">Authentication Failed</h3>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                This verification token does not match any valid certificate in the statutory registry or has been revoked. The instrument may not be legally verified for trade.
              </p>
            </div>
            <div className="pt-2 text-[11px] text-slate-400 font-mono">
              Scanned Token: {currentToken}
            </div>
          </div>
        ) : (
          /* Valid or Expired Screen (Stitch Screens 8017cb2a26a948cd8f6286d1e9e00fac & 27e67bd544ee46baaeda884e80af1528) */
          <div className="p-6 space-y-5">
            {/* Status Hero */}
            <div className="text-center pb-4 border-b border-slate-100">
              {certData.status === 'VALID' ? (
                <div className="space-y-2">
                  <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
                    <span className="material-symbols-outlined text-3xl font-bold">verified</span>
                  </div>
                  <span className="inline-block px-3 py-1 rounded-full text-xs font-extrabold uppercase tracking-wide bg-emerald-100 text-emerald-800 border border-emerald-300">
                    Statutory Verification: VALID
                  </span>
                  <div className="font-mono text-base font-extrabold text-primary">
                    {certData.certificate_no}
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="w-14 h-14 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center mx-auto">
                    <span className="material-symbols-outlined text-3xl font-bold">warning</span>
                  </div>
                  <span className="inline-block px-3 py-1 rounded-full text-xs font-extrabold uppercase tracking-wide bg-amber-100 text-amber-900 border border-amber-300">
                    Verification: EXPIRED / RE-VERIFICATION DUE
                  </span>
                  <div className="font-mono text-base font-extrabold text-slate-800">
                    {certData.certificate_no}
                  </div>
                </div>
              )}
            </div>

            {/* Public-Safe Instrument Specifications */}
            <div className="space-y-2.5 text-xs">
              <h4 className="font-bold text-slate-800 uppercase text-[10px] tracking-wider text-slate-400">
                Verified Instrument Information
              </h4>
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                <div className="flex justify-between">
                  <span className="text-slate-500">Category:</span>
                  <span className="font-semibold text-slate-800">{certData.instrument.category}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Make & Model:</span>
                  <span className="font-semibold text-slate-800">{certData.instrument.manufacturer} {certData.instrument.model}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Serial Number:</span>
                  <span className="font-mono font-bold text-primary">{certData.instrument.serial_number}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Capacity:</span>
                  <span className="font-semibold text-slate-800">{certData.instrument.capacity}</span>
                </div>
              </div>
            </div>

            {/* Validity Timeline */}
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
                <span className="text-slate-400 block text-[10px]">Verified On</span>
                <strong className="text-slate-800">{new Date(certData.issue_date).toLocaleDateString()}</strong>
              </div>
              <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
                <span className="text-slate-400 block text-[10px]">Valid Until</span>
                <strong className={`block ${certData.status === 'VALID' ? 'text-emerald-700 font-extrabold' : 'text-amber-700 font-extrabold'}`}>
                  {new Date(certData.valid_until).toLocaleDateString()}
                </strong>
              </div>
            </div>

            {/* Issuing Authority Seal */}
            <div className="pt-2 text-center text-[11px] text-slate-500 border-t border-slate-100">
              <div>Verified by <strong className="text-slate-700">{certData.issuing_officer}</strong></div>
              <div className="text-[10px] text-slate-400 mt-0.5">{certData.issuing_authority}</div>
            </div>

            {/* Privacy Protection Note */}
            <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200/80 text-[10px] text-slate-500 text-center">
              🔒 <strong>Citizen Privacy Protected:</strong> Commercial trader personal identification and financial records are restricted and excluded from public verification payloads.
            </div>
          </div>
        )}
      </div>

      <p className="text-[10px] text-slate-400 mt-4 text-center">
        Legal Metrology Verification Engine • Smart India Hackathon PS 26036
      </p>
    </div>
  );
}
