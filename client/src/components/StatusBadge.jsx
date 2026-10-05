import React from 'react';
import { useTranslation } from 'react-i18next';

const statusConfig = {
  // Instrument Lifecycle & Compliance Statuses
  REGISTERED: { label: 'Registered', bg: 'bg-slate-100 text-slate-700 border-slate-300', icon: 'app_registration' },
  DRAFT: { label: 'Draft', bg: 'bg-slate-50 text-slate-700 border-slate-200', icon: 'draft' },
  SUBMITTED: { label: 'Submitted', bg: 'bg-blue-50 text-blue-700 border-blue-200', icon: 'send' },
  PAYMENT_PENDING: { label: 'Payment Pending', bg: 'bg-amber-50 text-amber-800 border-amber-300', icon: 'payment' },
  PAYMENT_VERIFIED: { label: 'Payment Verified', bg: 'bg-emerald-50 text-emerald-800 border-emerald-300', icon: 'paid' },
  PENDING_VERIFICATION: { label: 'Payment Verified', bg: 'bg-emerald-50 text-emerald-800 border-emerald-300', icon: 'paid' },
  UNDER_REVIEW: { label: 'Under Review', bg: 'bg-indigo-50 text-indigo-700 border-indigo-200', icon: 'fact_check' },
  ASSIGNED: { label: 'Assigned', bg: 'bg-sky-50 text-sky-700 border-sky-200', icon: 'assignment_ind' },
  UNDER_VERIFICATION: { label: 'In Verification', bg: 'bg-amber-50 text-amber-800 border-amber-300', icon: 'hourglass_top' },
  IN_PROGRESS: { label: 'In Verification', bg: 'bg-amber-50 text-amber-800 border-amber-300', icon: 'hourglass_top' },
  VERIFICATION_IN_PROGRESS: { label: 'In Verification', bg: 'bg-amber-50 text-amber-800 border-amber-300', icon: 'hourglass_top' },
  VERIFICATION_SCHEDULED: { label: 'Verification Scheduled', bg: 'bg-indigo-50 text-indigo-800 border-indigo-300', icon: 'event' },
  REPORT_SUBMITTED: { label: 'Field Report Submitted', bg: 'bg-purple-50 text-purple-700 border-purple-200', icon: 'assignment_turned_in' },
  GATC_REPORT_SUBMITTED: { label: 'Lab Report Submitted', bg: 'bg-purple-50 text-purple-700 border-purple-200', icon: 'science' },
  APPROVED: { label: 'Approved', bg: 'bg-emerald-50 text-emerald-800 border-emerald-300', icon: 'verified' },
  CERTIFICATE_ISSUED: { label: 'Certificate Issued', bg: 'bg-emerald-50 text-emerald-800 border-emerald-300', icon: 'verified' },
  VERIFIED: { label: 'Verified', bg: 'bg-emerald-50 text-emerald-800 border-emerald-300', icon: 'verified' },
  VALID: { label: 'Valid', bg: 'bg-emerald-50 text-emerald-800 border-emerald-300', icon: 'verified' },
  RETURNED: { label: 'Returned for Correction', bg: 'bg-amber-50 text-amber-800 border-amber-300', icon: 'assignment_return' },
  REJECTED: { label: 'Rejected', bg: 'bg-rose-50 text-rose-800 border-rose-300', icon: 'cancel' },
  APPLICATION_REJECTED: { label: 'Rejected', bg: 'bg-rose-50 text-rose-800 border-rose-300', icon: 'cancel' },
  FAILED: { label: 'Failed', bg: 'bg-rose-50 text-rose-800 border-rose-300', icon: 'cancel' },
  VERIFICATION_FAILED: { label: 'Failed', bg: 'bg-rose-50 text-rose-800 border-rose-300', icon: 'cancel' },
  EXPIRING: { label: 'Expiring Soon', bg: 'bg-amber-50 text-amber-800 border-amber-300', icon: 'warning' },
  EXPIRED: { label: 'Expired', bg: 'bg-rose-50 text-rose-700 border-rose-300', icon: 'history_toggle_off' },
  PASS: { label: 'PASS', bg: 'bg-emerald-50 text-emerald-800 border-emerald-300', icon: 'check_circle' },
  FAIL: { label: 'FAIL', bg: 'bg-rose-50 text-rose-800 border-rose-300', icon: 'cancel' },
  PENDING_FEE: { label: 'Pending Fee Payment', bg: 'bg-amber-50 text-amber-800 border-amber-300', icon: 'payments' },
  FEE_PAID: { label: 'Fee Paid', bg: 'bg-emerald-50 text-emerald-800 border-emerald-300', icon: 'price_check' }
};

export default function StatusBadge({ status, className = '', showIcon = true }) {
  const { t } = useTranslation();
  const config = statusConfig[status] || { label: status?.replace('_', ' ') || 'Unknown', bg: 'bg-slate-50 text-slate-700 border-slate-200', icon: 'info' };
  const translatedLabel = t(`status.${status}`, config.label);

  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border whitespace-nowrap ${config.bg} ${className}`}>
      {showIcon && (
        <span className="material-symbols-outlined text-[14px]">
          {config.icon}
        </span>
      )}
      {translatedLabel}
    </span>
  );
}
