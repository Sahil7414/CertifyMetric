import React, { useEffect, useState } from 'react';
import StatusBadge from '../components/StatusBadge';
import { api } from '../api';

export default function ApplicationTimeline({
  applicationId,
  onBack,
  onOpenQR,
  onSelectCertificate
}) {
  const [application, setApplication] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (applicationId) {
      setLoading(true);
      api.getApplication(applicationId)
        .then(setApplication)
        .catch(console.error)
        .finally(() => setLoading(false));
    }
  }, [applicationId]);

  if (loading) {
    return <div className="p-12 text-center text-slate-500 text-xs">Loading application timeline...</div>;
  }

  if (!application) {
    return <div className="p-12 text-center text-rose-500 text-xs">Application not found.</div>;
  }

  const steps = [
    {
      key: 'SUBMITTED',
      title: 'Application Submitted',
      description: 'Trader filed initial application with statutory instrument specifications.',
      date: new Date(application.created_at).toLocaleDateString(),
      icon: 'send',
      isDone: true
    },
    {
      key: 'UNDER_REVIEW',
      title: 'Statutory Review & Eligibility',
      description: 'Jurisdiction authority verified device category against Legal Metrology Schedule.',
      date: ['UNDER_REVIEW', 'ASSIGNED', 'IN_PROGRESS', 'VERIFICATION_COMPLETED', 'VERIFICATION_FAILED'].includes(application.status) ? 'Confirmed' : 'Pending',
      icon: 'verified_user',
      isDone: ['UNDER_REVIEW', 'ASSIGNED', 'IN_PROGRESS', 'VERIFICATION_COMPLETED', 'VERIFICATION_FAILED'].includes(application.status)
    },
    {
      key: 'ASSIGNED',
      title: 'Verifier Allocation',
      description: application.assigned_to_name
        ? `Allocated to ${application.assigned_to_name} ${application.is_override ? '(Authority Override Recorded)' : '(System Recommended)'}`
        : 'Awaiting allocation by statutory authority.',
      date: application.assigned_to_name ? 'Assigned' : 'Pending',
      icon: 'assignment_ind',
      isDone: ['ASSIGNED', 'IN_PROGRESS', 'VERIFICATION_COMPLETED', 'VERIFICATION_FAILED'].includes(application.status)
    },
    {
      key: 'IN_PROGRESS',
      title: 'Verification In Progress',
      description: 'Authorized verifier initiated physical inspection, nominal readings matrix, and evidence capture.',
      date: ['IN_PROGRESS', 'VERIFICATION_COMPLETED', 'VERIFICATION_FAILED'].includes(application.status) ? 'Active Testing' : 'Pending',
      icon: 'hourglass_top',
      isDone: ['IN_PROGRESS', 'VERIFICATION_COMPLETED', 'VERIFICATION_FAILED'].includes(application.status)
    },
    {
      key: 'VERIFICATION_COMPLETED',
      title: 'Verification Result Recorded',
      description: application.status === 'VERIFICATION_COMPLETED'
        ? 'Verification successfully completed with PASS determination.'
        : application.status === 'VERIFICATION_FAILED'
        ? 'Verification completed with FAIL determination. Device rejected.'
        : 'Awaiting testing completion and verifier determination.',
      date: ['VERIFICATION_COMPLETED', 'VERIFICATION_FAILED'].includes(application.status) ? 'Completed' : 'Pending',
      icon: application.status === 'VERIFICATION_FAILED' ? 'cancel' : 'task_alt',
      isDone: ['VERIFICATION_COMPLETED', 'VERIFICATION_FAILED'].includes(application.status),
      isError: application.status === 'VERIFICATION_FAILED'
    }
  ];

  return (
    <div className="space-y-6 max-w-4xl mx-auto animate-in fade-in duration-300">
      {/* Top Header */}
      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-primary transition-colors"
        >
          <span className="material-symbols-outlined text-[16px]">arrow_back</span>
          Back
        </button>
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500 font-medium">Application Status:</span>
          <StatusBadge status={application.status} />
        </div>
      </div>

      {/* Case Header Card */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-100 gap-2">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-sm px-2.5 py-0.5 rounded-md bg-primary text-white font-bold">
                {application.application_no}
              </span>
              <span className="text-xs text-slate-400">•</span>
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">{application.request_type.replace('_', ' ')}</span>
            </div>
            <h1 className="text-lg font-bold text-slate-900 mt-2">
              {application.manufacturer} {application.model} (SN: {application.serial_number})
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Category: <strong>{application.category_name}</strong> • Location: <strong>{application.location}</strong>
            </p>
          </div>

          <div className="text-right sm:self-center">
            <span className="text-slate-400 block text-[10px] uppercase font-bold">Application Filed</span>
            <strong className="text-slate-800 text-xs">{new Date(application.created_at).toLocaleString()}</strong>
          </div>
        </div>

        {/* Multi-stage Stepper */}
        <div className="pt-2">
          <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-6">
            Statutory Lifecycle Stepper
          </h2>

          <div className="relative pl-6 sm:pl-8 space-y-8 before:absolute before:left-3 sm:before:left-4 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
            {steps.map((step, index) => {
              return (
                <div key={step.key} className="relative flex items-start gap-4">
                  {/* Step Icon Node */}
                  <div
                    className={`absolute -left-6 sm:-left-8 w-6 h-6 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all shadow-xs ${
                      step.isError
                        ? 'bg-rose-600 text-white ring-4 ring-rose-100'
                        : step.isDone
                        ? 'bg-emerald-600 text-white ring-4 ring-emerald-100'
                        : 'bg-white border-2 border-slate-300 text-slate-400'
                    }`}
                  >
                    <span className="material-symbols-outlined text-[14px] sm:text-[18px]">
                      {step.icon}
                    </span>
                  </div>

                  {/* Step Content */}
                  <div className="bg-slate-50 rounded-xl p-4 border border-slate-200/80 flex-1 text-xs">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 mb-1">
                      <h3 className={`font-bold ${step.isError ? 'text-rose-700' : step.isDone ? 'text-slate-900' : 'text-slate-500'}`}>
                        {step.title}
                      </h3>
                      <span className="text-[11px] font-medium text-slate-400">{step.date}</span>
                    </div>
                    <p className="text-slate-600 leading-relaxed">{step.description}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
