import React, { useEffect, useState } from 'react';
import StatusBadge from '../components/StatusBadge';
import { api } from '../api';

export default function InstrumentDetail({
  instrumentId,
  onBack,
  onRequestVerification,
  onOpenQR,
  onSelectCertificate
}) {
  const [instrument, setInstrument] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (instrumentId) {
      setLoading(true);
      api.getInstrument(instrumentId)
        .then(setInstrument)
        .catch(console.error)
        .finally(() => setLoading(false));
    }
  }, [instrumentId]);

  if (loading) {
    return <div className="p-12 text-center text-slate-500">Loading instrument profile...</div>;
  }

  if (!instrument) {
    return <div className="p-12 text-center text-rose-500">Instrument record not found.</div>;
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Back link & Title */}
      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-primary transition-colors"
        >
          <span className="material-symbols-outlined text-[16px]">arrow_back</span>
          Back to Instruments
        </button>
        <div className="flex items-center gap-2">
          <StatusBadge status={instrument.status} />
        </div>
      </div>

      {/* Main Profile Card */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between pb-6 border-b border-slate-100 gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
              <span className="material-symbols-outlined text-3xl">scale</span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold text-slate-900">{instrument.manufacturer} {instrument.model}</h1>
                <span className="font-mono text-xs px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-semibold">{instrument.serial_number}</span>
              </div>
              <p className="text-xs text-slate-500 mt-1">{instrument.category_name}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {instrument.status === 'REGISTERED' && (
              <button
                onClick={() => onRequestVerification(instrument.id)}
                className="px-4 py-2 bg-primary text-white rounded-lg text-xs font-bold hover:bg-primary-container shadow-xs transition-all flex items-center gap-1.5"
              >
                <span className="material-symbols-outlined text-[16px]">send</span>
                Request Verification
              </button>
            )}
            {instrument.status === 'EXPIRING' && (
              <button
                onClick={() => onRequestVerification(instrument.id)}
                className="px-4 py-2 bg-amber-600 text-white rounded-lg text-xs font-bold hover:bg-amber-700 shadow-xs transition-all flex items-center gap-1.5"
              >
                <span className="material-symbols-outlined text-[16px]">published_with_changes</span>
                Apply for Re-verification
              </button>
            )}
          </div>
        </div>

        {/* Technical Specification Matrix */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6 text-xs">
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100">
            <span className="text-slate-400 block font-medium">Max Capacity</span>
            <span className="text-sm font-bold text-slate-900 mt-0.5 block">{instrument.max_capacity}</span>
          </div>
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100">
            <span className="text-slate-400 block font-medium">Min Capacity</span>
            <span className="text-sm font-bold text-slate-900 mt-0.5 block">{instrument.min_capacity}</span>
          </div>
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100">
            <span className="text-slate-400 block font-medium">Verification Interval (e)</span>
            <span className="text-sm font-bold text-slate-900 mt-0.5 block">{instrument.verification_scale_interval_e}</span>
          </div>
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100">
            <span className="text-slate-400 block font-medium">Class Standard</span>
            <span className="text-sm font-bold text-primary mt-0.5 block">OIML Class III (Commercial)</span>
          </div>
        </div>

        <div className="mt-4 pt-4 border-t border-slate-100 flex flex-col md:flex-row justify-between gap-3 text-xs text-slate-600">
          <div>
            <span className="font-semibold text-slate-800">Operational Premises: </span>
            {instrument.location}
          </div>
          <div>
            <span className="font-semibold text-slate-800">Owner: </span>
            {instrument.owner_name} ({instrument.owner_org})
          </div>
        </div>
      </div>

      {/* Verification Lifecycle History Ledger */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50/50 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-slate-900">Verification & Certificate History</h2>
            <p className="text-[11px] text-slate-500">Persistent statutory audit log of all verification events for this instrument</p>
          </div>
          <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
            {instrument.history?.length || 0} Records
          </span>
        </div>

        {(!instrument.history || instrument.history.length === 0) ? (
          <div className="p-8 text-center text-slate-400 text-xs">
            <span className="material-symbols-outlined text-3xl mb-2 block text-slate-300">history_toggle_off</span>
            No statutory verifications recorded yet. Submit a verification request to initiate the first verification cycle.
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {instrument.history.map((hist) => (
              <div key={hist.id} className="p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 hover:bg-slate-50/50 transition-colors">
                <div className="space-y-1 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900">{hist.certificate_no || 'Pending Certification'}</span>
                    <span className="font-mono text-[11px] text-slate-500">({hist.application_no})</span>
                    <StatusBadge status={hist.certificate_status || hist.result} />
                  </div>
                  <p className="text-slate-600">
                    Verified by: <strong className="font-semibold text-slate-800">{hist.verifier_name || 'Authorized Officer'}</strong>
                  </p>
                  <p className="text-[11px] text-slate-400">
                    Verification Date: {new Date(hist.completed_at).toLocaleDateString()} • Valid Until: {new Date(hist.valid_until).toLocaleDateString()}
                  </p>
                </div>

                <div className="flex items-center gap-2 self-end md:self-center">
                  {hist.certificate_id && onSelectCertificate && (
                    <button
                      onClick={() => onSelectCertificate(hist.certificate_id)}
                      className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg text-xs font-bold transition-all"
                    >
                      View Certificate
                    </button>
                  )}
                  {hist.public_token && onOpenQR && (
                    <button
                      onClick={() => onOpenQR({
                        certificate_no: hist.certificate_no,
                        public_token: hist.public_token,
                        status: hist.certificate_status
                      })}
                      className="px-3 py-1.5 bg-primary text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all shadow-xs"
                    >
                      <span className="material-symbols-outlined text-[16px]">qr_code_2</span>
                      QR
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
