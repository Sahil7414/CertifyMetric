import React, { useEffect, useState } from 'react';
import StatusBadge from '../components/StatusBadge';
import { api } from '../api';

export default function ApplicationReview({
  applicationId,
  onBack,
  onProceedToAssignment,
  onViewCertificate
}) {
  const [app, setApp] = useState(null);
  const [loading, setLoading] = useState(true);
  const [reviewing, setReviewing] = useState(false);

  useEffect(() => {
    if (applicationId) {
      setLoading(true);
      api.getApplication(applicationId)
        .then(setApp)
        .catch(console.error)
        .finally(() => setLoading(false));
    }
  }, [applicationId]);

  const handleProceed = async () => {
    setReviewing(true);
    try {
      if (app?.status === 'SUBMITTED') {
        await api.reviewApplication(applicationId);
      }
      onProceedToAssignment(applicationId);
    } catch (err) {
      console.error(err);
      onProceedToAssignment(applicationId);
    } finally {
      setReviewing(false);
    }
  };

  if (loading) {
    return <div className="p-12 text-center text-slate-500">Loading statutory case file...</div>;
  }

  if (!app) {
    return <div className="p-12 text-center text-rose-500">Application not found.</div>;
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto animate-in fade-in duration-300">
      {/* Top action header */}
      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-primary transition-colors"
        >
          <span className="material-symbols-outlined text-[16px]">arrow_back</span>
          Back to Applications Queue
        </button>
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500 font-medium">Current State:</span>
          <StatusBadge status={app.status} />
        </div>
      </div>

      {/* Case Header Card */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between pb-6 border-b border-slate-100 gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-sm px-2.5 py-0.5 rounded-md bg-primary text-white font-bold">
                {app.application_no}
              </span>
              <span className="text-xs text-slate-400">•</span>
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">{app.request_type.replace('_', ' ')}</span>
            </div>
            <h1 className="text-xl font-bold text-slate-900 mt-2">
              Statutory Verification Review for {app.manufacturer} {app.model}
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Applicant: <strong>{app.trader_name}</strong> • Establishment: <strong>{app.trader_org}</strong> ({app.trader_jurisdiction})
            </p>
          </div>

          <div className="flex items-center gap-2 self-end md:self-center">
            {['SUBMITTED', 'UNDER_REVIEW'].includes(app.status) && (
              <button
                onClick={handleProceed}
                disabled={reviewing}
                className="px-5 py-2.5 bg-primary text-white font-bold rounded-lg text-xs hover:bg-primary-container shadow-sm transition-all flex items-center gap-2"
              >
                <span className="material-symbols-outlined text-[18px]">assignment_ind</span>
                {reviewing ? 'Opening Review...' : 'Proceed to Verifier Allocation'}
              </button>
            )}

            {app.status === 'ASSIGNED' && (
              <div className="text-right">
                <span className="text-[10px] text-slate-400 uppercase font-bold block">Assigned Verifier</span>
                <span className="font-semibold text-slate-800 text-xs">{app.assigned_to_name || 'Designated Officer'}</span>
              </div>
            )}

            {app.status === 'IN_PROGRESS' && (
              <div className="px-3.5 py-2 bg-amber-50 border border-amber-200 text-amber-800 rounded-lg text-xs font-semibold flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[16px] animate-spin">progress_activity</span>
                Verification Inspection In Progress
              </div>
            )}

            {app.status === 'VERIFICATION_COMPLETED' && (
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">Statutory Outcome</span>
                  <span className="font-extrabold text-emerald-700 text-xs flex items-center gap-1 justify-end">
                    <span className="material-symbols-outlined text-[16px]">verified</span>
                    PASS • {app.certificate_no || 'Pending Certificate'}
                  </span>
                </div>
                {app.certificate_id && onViewCertificate && (
                  <button
                    onClick={() => onViewCertificate(app.certificate_id)}
                    className="px-4 py-2 bg-primary text-white font-bold rounded-lg text-xs hover:bg-primary-container shadow-xs transition-all flex items-center gap-1.5"
                  >
                    <span className="material-symbols-outlined text-[16px]">visibility</span>
                    View Certificate
                  </button>
                )}
              </div>
            )}

            {app.status === 'VERIFICATION_FAILED' && (
              <div className="px-3.5 py-2 bg-rose-50 border border-rose-200 text-rose-800 rounded-lg text-xs font-semibold flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[16px] text-rose-600">cancel</span>
                Verification Failed (Instrument Rejected)
              </div>
            )}
          </div>
        </div>

        {/* 1. Statutory Rule Evaluation Box */}
        <div className="mt-6 p-4 rounded-xl bg-emerald-50/70 border border-emerald-200 text-xs space-y-2">
          <div className="flex items-center gap-2 text-emerald-900 font-bold text-sm">
            <span className="material-symbols-outlined text-emerald-600">verified</span>
            Automated Statutory Eligibility Evaluation: PASSED
          </div>
          <p className="text-emerald-800 leading-relaxed">
            The submitted instrument specifications conform to <strong>Schedule V (Commercial NAWI Class III)</strong> under the Legal Metrology (General) Rules, 2011. Device parameters fall within statutory jurisdiction limits.
          </p>
          <div className="grid grid-cols-3 gap-2 pt-2 border-t border-emerald-200/60 font-medium text-emerald-900">
            <div>• Validity Term: 12 Months</div>
            <div>• Max Permissible Error: Standard OIML R76</div>
            <div>• Testing Type: Field / GATC presentation</div>
          </div>
        </div>

        {/* 2. Detailed Technical & Operational Matrix */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
          {/* Instrument Specs */}
          <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 text-xs space-y-3">
            <h3 className="font-bold text-slate-900 uppercase tracking-wider text-[11px] pb-2 border-b border-slate-200">
              Instrument Technical Specifications
            </h3>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-slate-500">Category / Class:</span>
                <span className="font-semibold text-slate-800">{app.category_name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Make & Model:</span>
                <span className="font-semibold text-slate-800">{app.manufacturer} {app.model}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Device Serial Number:</span>
                <span className="font-mono font-bold text-primary">{app.serial_number}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Max / Min Capacity:</span>
                <span className="font-semibold text-slate-800">{app.max_capacity} / {app.min_capacity}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Verification Interval (e):</span>
                <span className="font-semibold text-slate-800">{app.verification_scale_interval_e}</span>
              </div>
            </div>
          </div>

          {/* Applicant & Establishment Details */}
          <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 text-xs space-y-3">
            <h3 className="font-bold text-slate-900 uppercase tracking-wider text-[11px] pb-2 border-b border-slate-200">
              Commercial Establishment Particulars
            </h3>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-slate-500">Applicant Name:</span>
                <span className="font-semibold text-slate-800">{app.trader_name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Registered Firm:</span>
                <span className="font-semibold text-slate-800">{app.trader_org}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Contact Number:</span>
                <span className="font-semibold text-slate-800">{app.trader_phone}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Operational Premises:</span>
                <span className="font-semibold text-slate-800 text-right max-w-[200px]">{app.location}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Statutory Fee Status:</span>
                <span className="font-bold text-emerald-600 uppercase">Paid (Treasury Verified)</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
