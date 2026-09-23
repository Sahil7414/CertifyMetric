import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { api } from '../api';
import LanguageSwitcher from '../components/LanguageSwitcher';

export default function PublicCertificateVerification({
  token,
  onExit
}) {
  const { t } = useTranslation();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!token) {
      setError('Missing or malformed verification reference.');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    api.verifyPublicCertificate(token)
      .then((res) => {
        if (res.status === 'NOT_FOUND' || res.status === 'INVALID' || !res.ok) {
          setError(res.error || 'Certificate not found or verification reference invalid.');
          setData(res);
        } else {
          setData(res);
        }
      })
      .catch((err) => {
        setError('Network error: Unable to contact legal metrology verification registry.');
      })
      .finally(() => setLoading(false));
  }, [token]);

  const isValid = data?.status === 'VALID';
  const isExpired = data?.status === 'EXPIRED';
  const isNotFound = !data || data?.status === 'NOT_FOUND' || data?.status === 'INVALID' || Boolean(error && !data?.certificate_no);

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col font-sans antialiased text-slate-800">
      {/* 1. Official Government Header Stripe */}
      <header className="bg-[#002046] text-white py-3 px-4 shadow-sm">
        <div className="max-w-xl mx-auto flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="material-symbols-outlined text-amber-400 text-2xl shrink-0">balance</span>
            <div className="min-w-0">
              <div className="text-xs font-bold tracking-wide uppercase truncate">{t('nav.govIndia')}</div>
              <div className="text-[10px] text-slate-300 truncate">{t('nav.deptTitle')}</div>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <LanguageSwitcher />
            {onExit && (
              <button
                onClick={onExit}
                className="text-xs bg-white/10 hover:bg-white/20 text-white px-2.5 py-1 rounded transition-colors"
              >
                {t('common.close')}
              </button>
            )}
          </div>
        </div>
      </header>

      {/* 2. Main Mobile-First Verification Body */}
      <main className="flex-1 max-w-xl w-full mx-auto p-4 sm:p-6 flex flex-col justify-start">
        {loading && (
          <div className="bg-white rounded-2xl p-8 border border-slate-200 shadow-md text-center space-y-4 my-auto">
            <div className="w-16 h-16 rounded-full bg-primary/10 text-primary flex items-center justify-center mx-auto animate-spin">
              <span className="material-symbols-outlined text-3xl">progress_activity</span>
            </div>
            <h2 className="text-base font-bold text-slate-900">{t('certificate.authenticating')}</h2>
            <p className="text-xs text-slate-500 max-w-xs mx-auto">
              {t('certificate.queryingLedger')}
            </p>
          </div>
        )}

        {!loading && (
          <div className="space-y-4 animate-in fade-in duration-200">
            {/* ====================================================
                A. Primary Status Banner (First thing visible to user)
               ==================================================== */}
            {isValid && (
              <div className="bg-emerald-600 text-white rounded-2xl p-6 shadow-md text-center space-y-2">
                <div className="w-14 h-14 rounded-full bg-white/20 text-white flex items-center justify-center mx-auto shadow-inner">
                  <span className="material-symbols-outlined text-3xl font-bold">verified</span>
                </div>
                <div className="text-xs uppercase tracking-widest font-extrabold text-emerald-100">
                  {t('certificate.authSucceeded')}
                </div>
                <h1 className="text-2xl font-black tracking-tight">{t('certificate.validTitle')}</h1>
                <p className="text-xs text-emerald-50 max-w-sm mx-auto leading-relaxed pt-1">
                  {t('certificate.validDesc')}
                </p>
              </div>
            )}

            {isExpired && (
              <div className="bg-amber-600 text-white rounded-2xl p-6 shadow-md text-center space-y-2">
                <div className="w-14 h-14 rounded-full bg-white/20 text-white flex items-center justify-center mx-auto shadow-inner">
                  <span className="material-symbols-outlined text-3xl font-bold">history_toggle_off</span>
                </div>
                <div className="text-xs uppercase tracking-widest font-extrabold text-amber-100">
                  {t('certificate.statutoryConcluded')}
                </div>
                <h1 className="text-2xl font-black tracking-tight">{t('certificate.expiredTitle')}</h1>
                <p className="text-xs text-amber-50 max-w-sm mx-auto leading-relaxed pt-1">
                  {t('certificate.expiredDesc')}
                </p>
              </div>
            )}

            {isNotFound && (
              <div className="bg-rose-700 text-white rounded-2xl p-6 shadow-md text-center space-y-2">
                <div className="w-14 h-14 rounded-full bg-white/20 text-white flex items-center justify-center mx-auto shadow-inner">
                  <span className="material-symbols-outlined text-3xl font-bold">gpp_bad</span>
                </div>
                <div className="text-xs uppercase tracking-widest font-extrabold text-rose-100">
                  {t('certificate.authFailed')}
                </div>
                <h1 className="text-2xl font-black tracking-tight">{t('certificate.notFoundTitle')}</h1>
                <p className="text-xs text-rose-100 max-w-sm mx-auto leading-relaxed pt-1">
                  {t('certificate.notFoundDesc')}
                </p>
              </div>
            )}

            {/* ====================================================
                B. Certified Particulars Card (When record exists)
               ==================================================== */}
            {data && data.certificate_no && (
              <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm space-y-4">
                {/* Certificate Number Header */}
                <div className="pb-3 border-b border-slate-100 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">{t('certificate.number')}</span>
                    <span className="font-mono text-base font-extrabold text-primary">{data.certificate_no}</span>
                  </div>
                  <span className={`px-2.5 py-1 rounded-full text-xs font-extrabold uppercase ${
                    isValid ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                  }`}>
                    {t('status.' + data.status, { defaultValue: data.status })}
                  </span>
                </div>

                {/* Instrument Particulars */}
                <div className="space-y-2.5 text-xs">
                  <div className="flex justify-between py-1 border-b border-slate-100">
                    <span className="text-slate-500">{t('certificate.verifiedEquipment')}:</span>
                    <strong className="text-slate-900 text-right">{data.instrument?.manufacturer} {data.instrument?.model}</strong>
                  </div>

                  <div className="flex justify-between py-1 border-b border-slate-100">
                    <span className="text-slate-500">{t('certificate.serialNumber')}:</span>
                    <span className="font-mono font-bold text-primary">{data.instrument?.serial_number}</span>
                  </div>

                  <div className="flex justify-between py-1 border-b border-slate-100">
                    <span className="text-slate-500">{t('certificate.categoryClass')}:</span>
                    <span className="text-slate-800 font-medium text-right">{data.instrument?.category}</span>
                  </div>

                  <div className="flex justify-between py-1 border-b border-slate-100">
                    <span className="text-slate-500">{t('certificate.capacityInterval')}:</span>
                    <span className="font-medium text-slate-900">
                      {data.instrument?.max_capacity} (e = {data.instrument?.verification_scale_interval_e})
                    </span>
                  </div>

                  <div className="flex justify-between py-1 border-b border-slate-100">
                    <span className="text-slate-500">{t('certificate.verificationDate')}:</span>
                    <span className="font-semibold text-slate-800">{new Date(data.issue_date).toLocaleDateString()}</span>
                  </div>

                  <div className="flex justify-between py-1 border-b border-slate-100">
                    <span className="text-slate-500">{t('certificate.statutoryValidUntil')}:</span>
                    <strong className={isValid ? 'text-emerald-700 font-extrabold' : 'text-rose-600 font-extrabold'}>
                      {new Date(data.valid_until).toLocaleDateString()}
                    </strong>
                  </div>

                  <div className="flex justify-between py-1 border-b border-slate-100">
                    <span className="text-slate-500">{t('certificate.commercialEstablishment')}:</span>
                    <span className="text-slate-800 font-semibold text-right">{data.business?.enterprise_name}</span>
                  </div>

                  <div className="flex justify-between py-1">
                    <span className="text-slate-500">{t('certificate.issuingAuthority')}:</span>
                    <span className="text-slate-700 text-right">{data.verification_authority?.authority || 'Legal Metrology Division'}</span>
                  </div>
                </div>

                {/* Statutory Verification Declaration Statement */}
                <div className="mt-4 p-3.5 bg-slate-50 rounded-xl border border-slate-200/80 text-[11px] text-slate-600 flex items-start gap-2.5">
                  <span className="material-symbols-outlined text-primary text-base shrink-0 mt-0.5">verified_user</span>
                  <p className="leading-relaxed">
                    {data.verification_statement}
                  </p>
                </div>
              </div>
            )}

            {/* Error / Not Found Guidance Card */}
            {isNotFound && (
              <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm space-y-3 text-xs text-slate-600">
                <h4 className="font-bold text-slate-900 text-sm">{t('certificate.consumerAdvisory')}</h4>
                <p className="leading-relaxed">
                  {t('certificate.consumerAdvisoryText')}
                </p>
                <div className="p-3 bg-slate-50 rounded-lg font-mono text-[11px] text-slate-500 break-all">
                  {t('certificate.referenceToken')}: {token}
                </div>
              </div>
            )}

            {/* Verification Timestamp */}
            <div className="text-center text-[10px] text-slate-400 py-2">
              {t('certificate.registryTimestamp')} {new Date().toLocaleTimeString()}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
