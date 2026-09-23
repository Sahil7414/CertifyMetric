import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import StatusBadge from '../components/StatusBadge';
import GeoVisitCard from '../components/GeoVisitCard';
import { api } from '../api';

export default function VerifierDashboard({
  currentUser,
  onOpenCase
}) {
  const { t } = useTranslation();
  const [cases, setCases] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadCases = () => {
    if (currentUser?.id) {
      setLoading(true);
      api.getVerifierCases(currentUser.id)
        .then(setCases)
        .catch(console.error)
        .finally(() => setLoading(false));
    }
  };

  useEffect(() => {
    loadCases();
  }, [currentUser]);

  if (loading) {
    return <div className="p-12 text-center text-slate-500">{t('common.loading')}</div>;
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto animate-in fade-in duration-300">
      {/* Officer / Centre Profile Header */}
      <div className="bg-gradient-to-r from-[#002046] to-[#1b365d] rounded-2xl p-6 text-white shadow-md flex items-center justify-between">
        <div className="flex items-center gap-4">
          <img
            src={currentUser?.avatar || 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150'}
            alt={currentUser?.full_name}
            className="w-14 h-14 rounded-full border-2 border-white/40 object-cover shadow-xs"
          />
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-white">{currentUser?.full_name}</h1>
              <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-white/20 text-white border border-white/20">
                {currentUser?.role === 'GATC' ? t('nav.gatc') : t('nav.lmo')}
              </span>
            </div>
            <p className="text-xs text-slate-300 mt-0.5">
              {t('dashboard.assignedVerifications', { count: cases.length, defaultValue: `Assigned Verifications: ${cases.length} Cases` })}
            </p>
          </div>
        </div>

        <div className="hidden sm:block text-right">
          <span className="text-[11px] text-slate-300 block font-medium">{t('dashboard.dutyStatus', { defaultValue: 'Duty Status' })}</span>
          <span className="text-xs font-bold text-emerald-300 flex items-center gap-1 justify-end">
            <span className="w-2 h-2 rounded-full bg-emerald-400"></span> {t('dashboard.activeDuty', { defaultValue: 'Active Operational Duty' })}
          </span>
        </div>
      </div>

      {/* Case List */}
      <div className="space-y-4">
        <div className="flex items-center justify-between px-1">
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-700">
            {t('dashboard.assignedCases', { count: cases.length, defaultValue: `Assigned Verification Cases (${cases.length})` })}
          </h2>
          <span className="text-xs text-slate-500">{t('dashboard.sortedSchedule', { defaultValue: 'Sorted by appointment schedule' })}</span>
        </div>

        {cases.length === 0 ? (
          <div className="bg-white rounded-2xl p-12 text-center text-slate-400 border border-slate-200">
            <span className="material-symbols-outlined text-4xl mb-2 text-slate-300 block">checklist</span>
            {t('dashboard.noAssignedCases', { defaultValue: 'No pending verifications assigned at present.' })}
          </div>
        ) : (
          cases.map((c) => {
            const isCompleted = ['VERIFICATION_COMPLETED', 'VERIFICATION_FAILED', 'CERTIFICATE_ISSUED', 'APPROVED'].includes(c.application_status);
            const isInProgress = c.application_status === 'IN_PROGRESS';
            const isFieldVisit = c.arrangement_type === 'FIELD_VISIT' || c.verification_mode === 'IN_SITU';

            return (
              <div
                key={c.application_id}
                className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs hover:border-primary/40 transition-all space-y-4"
              >
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                  <div className="space-y-1.5 text-xs flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono font-bold text-primary bg-primary/10 px-2 py-0.5 rounded">
                        {c.application_no}
                      </span>
                      <StatusBadge status={c.application_status} />
                      <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                        {isFieldVisit ? t('verification.onSiteFieldVisit', { defaultValue: 'On-Site Field Visit' }) : t('verification.centrePresentation', { defaultValue: 'Centre Presentation' })}
                      </span>
                    </div>

                    <h3 className="font-bold text-slate-900 text-sm">
                      {c.manufacturer} {c.model} (Max: {c.max_capacity})
                    </h3>

                    <div className="text-slate-600 flex flex-wrap gap-x-4 gap-y-1 pt-1">
                      <span>
                        <strong className="text-slate-700">{t('certificate.serialNumber')}:</strong> <span className="font-mono">{c.serial_number}</span>
                      </span>
                      <span>
                        <strong className="text-slate-700">{t('application.traderName')}:</strong> {c.trader_name}
                      </span>
                      <span>
                        <strong className="text-slate-700">{t('table.location')}:</strong> {c.location}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 text-primary font-semibold pt-1">
                      <span className="material-symbols-outlined text-sm">event</span>
                      <span>
                        {t('verification.scheduled')}: {c.scheduled_date ? new Date(c.scheduled_date).toLocaleDateString() : t('verification.awaitingConfirmation', { defaultValue: 'Awaiting confirmation' })} ({c.time_slot ? c.time_slot.replace('_', ' ') : 'Standard'})
                      </span>
                    </div>
                  </div>

                  <div className="self-end md:self-center shrink-0">
                    <button
                      onClick={() => onOpenCase(c.application_id)}
                      className={`px-4 py-2.5 font-bold rounded-xl text-xs shadow-xs transition-all flex items-center gap-1.5 ${
                        isCompleted
                          ? 'bg-slate-100 hover:bg-slate-200 text-slate-800'
                          : isInProgress
                          ? 'bg-amber-600 hover:bg-amber-700 text-white'
                          : 'bg-primary hover:bg-primary-container text-white'
                      }`}
                    >
                      <span className="material-symbols-outlined text-[16px]">
                        {isCompleted ? 'description' : isInProgress ? 'edit_note' : 'play_circle'}
                      </span>
                      {isCompleted
                        ? t('verification.reviewRecord', { defaultValue: 'Review Inspection Record' })
                        : isInProgress
                        ? t('verification.resumeWorkspace', { defaultValue: 'Resume Workspace' })
                        : t('verification.openWorkspace', { defaultValue: 'Open Verification Workspace' })}
                    </button>
                  </div>
                </div>

                {/* Prominent GeoVisit Section */}
                <div className="pt-2 border-t border-slate-100">
                  <GeoVisitCard
                    applicationId={c.application_id}
                    traderName={c.trader_name}
                    locationAddress={c.location}
                    scheduledDate={c.scheduled_date}
                    timeSlot={c.time_slot ? c.time_slot.replace('_', ' ') : '11:00 AM'}
                    currentUser={currentUser}
                    verificationStatus={c.application_status}
                    onCheckInSuccess={() => loadCases()}
                    onVerificationUnlocked={() => onOpenCase(c.application_id)}
                    onCheckOutSuccess={() => loadCases()}
                    compact={true}
                  />
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
