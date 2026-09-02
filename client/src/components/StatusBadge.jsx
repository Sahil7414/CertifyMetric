import React from 'react';

const statusConfig = {
  // Instrument Lifecycle & Compliance Statuses
  REGISTERED: { label: 'Verification Pending', bg: 'bg-slate-100 text-slate-700 border-slate-300', icon: 'pending' },
  VERIFICATION_PENDING: { label: 'Verification Pending', bg: 'bg-blue-50 text-blue-700 border-blue-200', icon: 'hourglass_empty' },
  SUBMITTED: { label: 'Verification Pending', bg: 'bg-blue-50 text-blue-700 border-blue-200', icon: 'hourglass_empty' },
  UNDER_REVIEW: { label: 'Under Review', bg: 'bg-indigo-50 text-indigo-700 border-indigo-200', icon: 'fact_check' },
  ASSIGNED: { label: 'Assigned', bg: 'bg-sky-50 text-sky-700 border-sky-200', icon: 'assignment_ind' },
  UNDER_VERIFICATION: { label: 'Verification in Progress', bg: 'bg-amber-50 text-amber-800 border-amber-300', icon: 'hourglass_top' },
  IN_PROGRESS: { label: 'Verification in Progress', bg: 'bg-amber-50 text-amber-800 border-amber-300', icon: 'hourglass_top' },
  VERIFICATION_IN_PROGRESS: { label: 'Verification in Progress', bg: 'bg-amber-50 text-amber-800 border-amber-300', icon: 'hourglass_top' },
  VERIFIED: { label: 'Verified', bg: 'bg-emerald-50 text-emerald-800 border-emerald-300', icon: 'verified' },
  VALID: { label: 'Verified', bg: 'bg-emerald-50 text-emerald-800 border-emerald-300', icon: 'verified' },
  VERIFICATION_COMPLETED: { label: 'Verified', bg: 'bg-emerald-50 text-emerald-800 border-emerald-300', icon: 'verified' },
  FAILED: { label: 'Failed', bg: 'bg-rose-50 text-rose-800 border-rose-300', icon: 'cancel' },
  VERIFICATION_FAILED: { label: 'Failed', bg: 'bg-rose-50 text-rose-800 border-rose-300', icon: 'cancel' },
  EXPIRING: { label: 'Expiring Soon', bg: 'bg-amber-50 text-amber-800 border-amber-300', icon: 'warning' },
  EXPIRED: { label: 'Expired', bg: 'bg-rose-50 text-rose-700 border-rose-300', icon: 'history_toggle_off' },
  APPLICATION_REJECTED: { label: 'Application Rejected', bg: 'bg-rose-50 text-rose-800 border-rose-300', icon: 'block' },
  REJECTED: { label: 'Application Rejected', bg: 'bg-rose-50 text-rose-800 border-rose-300', icon: 'block' },

  // Workflow Specific Badges
  DRAFT: { label: 'Draft', bg: 'bg-slate-50 text-slate-700 border-slate-200', icon: 'draft' },
  PASS: { label: 'PASS', bg: 'bg-emerald-50 text-emerald-800 border-emerald-300', icon: 'check_circle' },
  FAIL: { label: 'FAIL', bg: 'bg-rose-50 text-rose-800 border-rose-300', icon: 'cancel' }
};

export default function StatusBadge({ status, className = '', showIcon = true }) {
  const config = statusConfig[status] || { label: status?.replace('_', ' ') || 'Unknown', bg: 'bg-slate-50 text-slate-700 border-slate-200', icon: 'info' };

  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${config.bg} ${className}`}>
      {showIcon && (
        <span className="material-symbols-outlined text-[14px]">
          {config.icon}
        </span>
      )}
      {config.label}
    </span>
  );
}
