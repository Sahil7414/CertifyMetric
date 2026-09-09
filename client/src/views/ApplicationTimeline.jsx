import React, { useEffect, useState } from 'react';
import StatusBadge from '../components/StatusBadge';
import { api } from '../api';

export default function ApplicationTimeline({
  applicationId,
  onBack,
  onOpenQR,
  onSelectCertificate,
  onResubmitApplication,
  onPayApplication
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
    return <div className="p-12 text-center text-slate-500 text-xs">Loading application lifecycle status...</div>;
  }

  if (!application) {
    return <div className="p-12 text-center text-rose-500 text-xs">Application record not found.</div>;
  }

  const isCompleted = ['VERIFICATION_COMPLETED', 'CERTIFICATE_ISSUED', 'APPROVED'].includes(application.status);
  const isFailed = application.status === 'VERIFICATION_FAILED' || application.status === 'REJECTED';
  const isReturned = application.status === 'RETURNED';
  const isPaymentPending = application.status === 'PAYMENT_PENDING' || application.fee_status === 'PENDING' || application.payment?.payment_status === 'PENDING';
  const isPaid = application.fee_status === 'PAID' || application.payment?.payment_status === 'PAID' || application.payment?.payment_status === 'PAYMENT_VERIFIED';

  const totalFee = application.payment?.amount || application.fee_breakdown?.total_fee || 300;

  const steps = [
    {
      key: 'SUBMITTED',
      title: 'Application Submitted',
      description: `Applicant filed statutory verification request (${application.verification_type === 'RE_VERIFICATION' || application.request_type === 'RE_VERIFICATION' ? 'Re-Verification' : 'Original Verification'}).`,
      date: new Date(application.created_at).toLocaleDateString(),
      icon: 'send',
      isDone: true
    },
    {
      key: 'PAYMENT',
      title: 'Statutory Fee Remittance',
      description: isPaid
        ? `Remittance recorded successfully (Ref: ${application.payment?.transaction_id || 'OFFLINE/ONLINE'}) under Legal Metrology General Rules Schedule V.`
        : 'Statutory verification fee pending payment by applicant.',
      date: isPaid ? (application.payment?.paid_at ? new Date(application.payment.paid_at).toLocaleDateString() : 'Paid') : 'Payment Required',
      icon: 'payments',
      isDone: isPaid,
      isPending: isPaymentPending
    },
    {
      key: 'UNDER_REVIEW',
      title: 'Statutory Review & Schedule Eligibility',
      description: isReturned
        ? `Application returned by Legal Metrology Officer: "${application.return_reason || 'Discrepancy in particulars/evidence.'}". Resubmission required.`
        : 'Jurisdiction Legal Metrology Authority verified instrument parameters against Schedule V (Commercial NAWI Class III).',
      date: isReturned ? 'Returned' : ['UNDER_REVIEW', 'ASSIGNED', 'IN_PROGRESS', 'VERIFICATION_COMPLETED', 'VERIFICATION_FAILED', 'CERTIFICATE_ISSUED', 'APPROVED'].includes(application.status) ? 'Passed' : 'Pending',
      icon: isReturned ? 'assignment_return' : 'verified_user',
      isDone: ['UNDER_REVIEW', 'ASSIGNED', 'IN_PROGRESS', 'VERIFICATION_COMPLETED', 'VERIFICATION_FAILED', 'CERTIFICATE_ISSUED', 'APPROVED'].includes(application.status),
      isError: isReturned
    },
    {
      key: 'ASSIGNED',
      title: 'Verifier Allocation & Appointment',
      description: application.assigned_to_name
        ? `Allocated to ${application.assigned_to_name} (${application.verification_mode === 'IN_SITU' ? 'In-Situ On-Premises Visit' : 'Camp / Centre Presentation'})${application.is_override ? ' • (Authority Override Recorded)' : ' • (Statutory Load-Balanced Allocation)'}`
        : 'Awaiting allocation of authorized Legal Metrology Officer / GATC by authority.',
      date: application.assigned_to_name ? (application.scheduled_date ? new Date(application.scheduled_date).toLocaleDateString() : 'Allocated') : 'Pending',
      icon: 'assignment_ind',
      isDone: ['ASSIGNED', 'IN_PROGRESS', 'VERIFICATION_COMPLETED', 'VERIFICATION_FAILED', 'CERTIFICATE_ISSUED', 'APPROVED'].includes(application.status)
    },
    {
      key: 'IN_PROGRESS',
      title: 'Physical Verification & Inspection',
      description: 'Authorized verifier conducts nominal testing matrix (Zero, Min, Quarter, Half, Max Capacity), visual checklist, and evidence capture.',
      date: ['IN_PROGRESS', 'VERIFICATION_COMPLETED', 'VERIFICATION_FAILED', 'CERTIFICATE_ISSUED', 'APPROVED'].includes(application.status) ? 'Active Testing' : 'Pending',
      icon: 'hourglass_top',
      isDone: ['IN_PROGRESS', 'VERIFICATION_COMPLETED', 'VERIFICATION_FAILED', 'CERTIFICATE_ISSUED', 'APPROVED'].includes(application.status)
    },
    {
      key: 'VERIFICATION_COMPLETED',
      title: 'Verification Determination',
      description: isFailed
        ? `Verification rejected. Device does not satisfy Maximum Permissible Error (MPE) tolerances.${application.rejection_reason ? ` Reason: ${application.rejection_reason}` : ''}`
        : isCompleted
        ? 'Physical testing successfully concluded with statutory PASS determination.'
        : 'Awaiting inspector determination and test point records.',
      date: (isCompleted || isFailed) ? 'Determined' : 'Pending',
      icon: isFailed ? 'cancel' : 'task_alt',
      isDone: isCompleted || isFailed,
      isError: isFailed
    },
    {
      key: 'CERTIFICATE_ISSUED',
      title: 'Digital Certificate Issuance',
      description: application.certificate_no
        ? `Official Verification Certificate (${application.certificate_no}) issued with cryptographically verifiable QR compliance token.`
        : 'Certificate will be generated following authorized verification approval.',
      date: application.certificate_no ? 'Issued' : 'Pending',
      icon: 'workspace_premium',
      isDone: Boolean(application.certificate_no)
    }
  ];

  return (
    <div className="space-y-6 max-w-4xl mx-auto animate-in fade-in duration-300">
      {/* Breadcrumbs Navigation */}
      <nav className="flex items-center gap-2 text-xs text-slate-500 print:hidden">
        <button
          onClick={onBack}
          className="hover:text-primary font-semibold transition-colors flex items-center gap-1 cursor-pointer"
        >
          <span className="material-symbols-outlined text-sm">arrow_back</span>
          Back to Applications
        </button>
        <span>/</span>
        <span className="text-slate-400">Applications</span>
        <span>/</span>
        <span className="font-mono font-bold text-slate-800">{application.application_no}</span>
      </nav>

      {/* Main Status & Action Header */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-100 gap-3">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-mono text-sm px-2.5 py-0.5 rounded-md bg-[#002046] text-white font-bold">
                {application.application_no}
              </span>
              <span className="text-xs text-slate-400">•</span>
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                {application.verification_type === 'RE_VERIFICATION' || application.request_type === 'RE_VERIFICATION' ? 'Re-Verification' : 'Original Verification'}
              </span>
              <span className="text-xs text-slate-400">•</span>
              <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                {application.verification_mode === 'IN_SITU' ? 'In-situ (On-Premises)' : 'Camp / Centre Presentation'}
              </span>
            </div>
            <h1 className="text-lg font-bold text-slate-900 mt-2">
              {application.manufacturer} {application.model} (SN: {application.serial_number})
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Applicant: <strong>{application.trader_name || application.contact_person}</strong> • Premises: <strong>{application.location_address || application.location}</strong>
            </p>
          </div>

          <div className="flex flex-col sm:items-end justify-between gap-1.5 shrink-0">
            <StatusBadge status={application.status} />
            <span className="text-[11px] text-slate-400">
              Filed: {new Date(application.created_at).toLocaleDateString()}
            </span>
          </div>
        </div>

        {/* Action Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-1 print:hidden">
          <div className="flex items-center gap-2 flex-wrap">
            {isReturned && (
              <button
                onClick={() => onResubmitApplication ? onResubmitApplication(application) : null}
                className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold rounded-lg text-xs transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
              >
                <span className="material-symbols-outlined text-base">replay</span>
                Resubmit Application
              </button>
            )}

            {isPaymentPending && (
              <button
                onClick={() => onPayApplication ? onPayApplication(application) : null}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg text-xs transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
              >
                <span className="material-symbols-outlined text-base">payments</span>
                Pay Statutory Fee (₹{Number(totalFee).toFixed(2)})
              </button>
            )}

            {application.certificate_id && onSelectCertificate && (
              <button
                onClick={() => onSelectCertificate(application.certificate_id)}
                className="px-4 py-2 bg-[#002046] text-white font-bold rounded-lg text-xs hover:bg-[#1b365d] transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
              >
                <span className="material-symbols-outlined text-base">workspace_premium</span>
                View Official Certificate
              </button>
            )}

            {application.certificate_no && onOpenQR && (
              <button
                onClick={() => onOpenQR({
                  certificate_no: application.certificate_no,
                  public_token: application.public_token || application.certificate_no,
                  status: application.certificate_status || 'VALID'
                })}
                className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold rounded-lg text-xs transition-all flex items-center gap-1.5 border border-slate-300 cursor-pointer"
              >
                <span className="material-symbols-outlined text-base">qr_code_2</span>
                QR Code
              </button>
            )}
          </div>

          <button
            onClick={() => window.print()}
            className="px-3 py-1.5 border border-slate-300 text-slate-700 hover:bg-slate-50 font-semibold rounded-lg text-xs transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <span className="material-symbols-outlined text-base">print</span>
            Print Acknowledgement Slip
          </button>
        </div>
      </div>

      {/* Return Reason Callout Banner (Requirement 12) */}
      {isReturned && (
        <div className="bg-rose-50 border-2 border-rose-300 rounded-2xl p-5 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-rose-200 text-rose-900 flex items-center justify-center shrink-0 mt-0.5">
              <span className="material-symbols-outlined text-2xl font-bold">assignment_return</span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] uppercase font-bold tracking-wider text-rose-900 bg-rose-200 px-2 py-0.5 rounded-full">
                  Application Returned for Rectification
                </span>
              </div>
              <h3 className="text-sm font-bold text-rose-950 mt-1">
                Reason: "{application.return_reason || 'Discrepancy identified in submitted invoice or specification particulars.'}"
              </h3>
              <p className="text-xs text-rose-800 mt-0.5">
                Under statutory rules, you may update your documents or details and resubmit without filing a fresh application.
              </p>
            </div>
          </div>
          {onResubmitApplication && (
            <button
              onClick={() => onResubmitApplication(application)}
              className="px-4 py-2 bg-rose-700 hover:bg-rose-800 text-white font-bold rounded-lg text-xs transition-all shadow-xs shrink-0 self-end sm:self-center flex items-center gap-1.5 cursor-pointer"
            >
              <span className="material-symbols-outlined text-base">replay</span>
              Resubmit Now
            </button>
          )}
        </div>
      )}

      {/* Payment Pending Callout Banner */}
      {isPaymentPending && (
        <div className="bg-amber-50 border-2 border-amber-300 rounded-2xl p-5 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-amber-200 text-amber-900 flex items-center justify-center shrink-0 mt-0.5">
              <span className="material-symbols-outlined text-2xl font-bold">payments</span>
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold tracking-wider text-amber-900 bg-amber-200 px-2 py-0.5 rounded-full">
                Statutory Fee Remittance Pending
              </span>
              <h3 className="text-sm font-bold text-amber-950 mt-1">
                Amount Payable: ₹{Number(totalFee).toFixed(2)} (Schedule V Metrological Verification)
              </h3>
              <p className="text-xs text-amber-800 mt-0.5">
                Please authorize payment online or submit an e-Treasury Challan to proceed to officer allocation.
              </p>
            </div>
          </div>
          {onPayApplication && (
            <button
              onClick={() => onPayApplication(application)}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg text-xs transition-all shadow-xs shrink-0 self-end sm:self-center flex items-center gap-1.5 cursor-pointer"
            >
              <span className="material-symbols-outlined text-base">lock</span>
              Pay Fee Now
            </button>
          )}
        </div>
      )}

      {/* Certificate Success Callout Banner */}
      {application.certificate_no && (
        <div className="bg-emerald-50 border border-emerald-300 rounded-2xl p-5 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-200 text-emerald-900 flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-2xl font-bold">verified</span>
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold tracking-wider text-emerald-800 bg-emerald-200/80 px-2 py-0.5 rounded-full">
                Statutory Certificate Ready
              </span>
              <h3 className="text-sm font-bold text-emerald-950 mt-1">
                Certificate No: <span className="font-mono">{application.certificate_no}</span>
              </h3>
              <p className="text-xs text-emerald-800 mt-0.5">
                Valid until {application.certificate_valid_until ? new Date(application.certificate_valid_until).toLocaleDateString() : 'Annual Expiration'}. The digital certificate and QR code are ready for download or public inspection.
              </p>
            </div>
          </div>
          {onSelectCertificate && application.certificate_id && (
            <button
              onClick={() => onSelectCertificate(application.certificate_id)}
              className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-lg text-xs transition-all shrink-0 self-end sm:self-center cursor-pointer"
            >
              Open Certificate
            </button>
          )}
        </div>
      )}

      {/* Statutory Fee & Payment Particulars Card */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-slate-100">
          <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
            <span className="material-symbols-outlined text-base text-primary">receipt_long</span>
            Statutory Fee & Payment Particulars
          </h2>
          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${isPaid ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-900'}`}>
            {isPaid ? 'PAID & VERIFIED' : 'PAYMENT PENDING'}
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
            <span className="text-slate-400 block text-[10px]">Total Amount</span>
            <strong className="text-slate-900 mt-0.5 block font-mono text-sm">
              ₹{Number(totalFee).toFixed(2)}
            </strong>
          </div>
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
            <span className="text-slate-400 block text-[10px]">Payment Mode</span>
            <strong className="text-slate-900 mt-0.5 block">
              {application.payment?.payment_mode || (isPaid ? 'ONLINE GATEWAY' : 'Awaiting Selection')}
            </strong>
          </div>
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
            <span className="text-slate-400 block text-[10px]">Transaction / Challan ID</span>
            <strong className="text-slate-900 mt-0.5 block font-mono text-[11px] truncate" title={application.payment?.transaction_id}>
              {application.payment?.transaction_id || (isPaid ? 'TXN_VERIFIED' : 'Pending')}
            </strong>
          </div>
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
            <span className="text-slate-400 block text-[10px]">Remittance Timestamp</span>
            <strong className="text-slate-900 mt-0.5 block">
              {application.payment?.paid_at ? new Date(application.payment.paid_at).toLocaleString() : (isPaid ? 'Confirmed' : 'Pending')}
            </strong>
          </div>
        </div>

        {/* Breakdown Items */}
        {application.fee_breakdown?.breakdown && (
          <div className="pt-2 border-t border-slate-100 text-[11px] space-y-1 text-slate-600">
            {application.fee_breakdown.breakdown.map((item, idx) => (
              <div key={idx} className="flex justify-between py-0.5">
                <span>{item.label}</span>
                <span className="font-mono font-medium">₹{Number(item.amount).toFixed(2)}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Instrument Technical Specifications Card */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-4">
        <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
          <span className="material-symbols-outlined text-primary text-base">scale</span>
          Instrument & Technical Specifications
        </h2>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
            <span className="text-slate-400 block text-[10px]">Manufacturer & Model</span>
            <strong className="text-slate-900 mt-0.5 block truncate" title={`${application.manufacturer} ${application.model}`}>
              {application.manufacturer} {application.model}
            </strong>
          </div>
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
            <span className="text-slate-400 block text-[10px]">Serial Number</span>
            <strong className="text-slate-900 mt-0.5 block font-mono">
              {application.serial_number || 'N/A'}
            </strong>
          </div>
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
            <span className="text-slate-400 block text-[10px]">Category</span>
            <strong className="text-slate-900 mt-0.5 block truncate" title={application.category_name || 'Commercial NAWI'}>
              {application.category_name || 'Commercial NAWI (Class III)'}
            </strong>
          </div>
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
            <span className="text-slate-400 block text-[10px]">Capacity (Max / Min)</span>
            <strong className="text-slate-900 mt-0.5 block">
              {application.max_capacity ? `${application.max_capacity} / ${application.min_capacity || '0'}` : '30 kg / 100 g'}
            </strong>
          </div>
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
            <span className="text-slate-400 block text-[10px]">Verification Scale Interval (e)</span>
            <strong className="text-slate-900 mt-0.5 block">
              {application.verification_scale_interval_e || '5 g (e = 5g)'}
            </strong>
          </div>
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
            <span className="text-slate-400 block text-[10px]">Premises / Location</span>
            <strong className="text-slate-900 mt-0.5 block truncate" title={application.location || application.location_address}>
              {application.location || application.location_address || 'Main Commercial Facility'}
            </strong>
          </div>
        </div>
      </div>

      {/* Trader & Business Particulars */}
      {(application.trader_name || application.trader_org || application.trader_jurisdiction) && (
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-4">
          <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
            <span className="material-symbols-outlined text-primary text-base">store</span>
            Trader & Establishment Particulars
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
              <span className="text-slate-400 block text-[10px]">Applicant Name</span>
              <strong className="text-slate-900 mt-0.5 block">
                {application.trader_name || application.contact_person || 'Sahil Trader'}
              </strong>
            </div>
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
              <span className="text-slate-400 block text-[10px]">Organization / Establishment</span>
              <strong className="text-slate-900 mt-0.5 block truncate" title={application.trader_org}>
                {application.trader_org || 'Kochi Retail Traders Ltd'}
              </strong>
            </div>
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
              <span className="text-slate-400 block text-[10px]">Jurisdiction Office</span>
              <strong className="text-slate-900 mt-0.5 block truncate" title={application.trader_jurisdiction}>
                {application.trader_jurisdiction || 'District Legal Metrology Ernakulam'}
              </strong>
            </div>
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
              <span className="text-slate-400 block text-[10px]">Contact</span>
              <strong className="text-slate-900 mt-0.5 block truncate">
                {application.trader_phone || application.trader_email || '+91 98765 43210'}
              </strong>
            </div>
          </div>
        </div>
      )}

      {/* Application Specifications Matrix */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-4">
        <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
          <span className="material-symbols-outlined text-primary text-base">verified_user</span>
          Statutory Application & Arrangement Particulars
        </h2>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
            <span className="text-slate-400 block text-[10px]">Verification Type</span>
            <strong className="text-slate-900 mt-0.5 block">
              {application.verification_type === 'RE_VERIFICATION' || application.request_type === 'RE_VERIFICATION' ? 'Re-Verification' : 'Original Verification'}
            </strong>
          </div>
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
            <span className="text-slate-400 block text-[10px]">Arrangement Mode</span>
            <strong className="text-slate-900 mt-0.5 block">
              {application.verification_mode === 'IN_SITU' ? 'In-situ (On-Site)' : 'Camp / Centre Presentation'}
            </strong>
          </div>
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
            <span className="text-slate-400 block text-[10px]">Assigned Officer / Lab</span>
            <strong className="text-slate-900 mt-0.5 block truncate" title={application.assigned_to_name || 'Pending Allocation'}>
              {application.assigned_to_name || 'Pending Allocation'}
            </strong>
          </div>
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
            <span className="text-slate-400 block text-[10px]">Preferred / Scheduled Date</span>
            <strong className="text-slate-900 mt-0.5 block">
              {application.scheduled_date
                ? new Date(application.scheduled_date).toLocaleDateString()
                : application.preferred_date
                ? new Date(application.preferred_date).toLocaleDateString()
                : 'To be confirmed'}
            </strong>
          </div>
        </div>

        {/* Attached Documents if present */}
        {application.documents && application.documents.length > 0 && (
          <div className="pt-2 border-t border-slate-100">
            <span className="text-[11px] font-bold text-slate-700 block mb-2">
              Attached Supporting Documents ({application.documents.length})
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {application.documents.map((doc, idx) => (
                <div key={doc.id || idx} className="p-2.5 bg-slate-50 rounded-lg border border-slate-200 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2 truncate">
                    <span className="material-symbols-outlined text-primary text-base">description</span>
                    <span className="font-semibold text-slate-800 truncate">{doc.file_name}</span>
                  </div>
                  <span className="text-[10px] text-slate-400 font-medium shrink-0">{doc.category}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Statutory Lifecycle Stepper */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-4">
        <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-6">
          Statutory Verification Lifecycle Stepper
        </h2>

        <div className="relative pl-6 sm:pl-8 space-y-8 before:absolute before:left-3 sm:before:left-4 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
          {steps.map((step) => (
            <div key={step.key} className="relative flex items-start gap-4">
              {/* Step Icon Node */}
              <div
                className={`absolute -left-6 sm:-left-8 w-6 h-6 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all shadow-xs ${
                  step.isError
                    ? 'bg-rose-600 text-white ring-4 ring-rose-100'
                    : step.isPending
                    ? 'bg-amber-500 text-white ring-4 ring-amber-100'
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
                  <h3 className={`font-bold ${step.isError ? 'text-rose-700' : step.isPending ? 'text-amber-800' : step.isDone ? 'text-slate-900' : 'text-slate-500'}`}>
                    {step.title}
                  </h3>
                  <span className={`text-[11px] font-medium ${step.isError ? 'text-rose-600 font-bold' : 'text-slate-400'}`}>
                    {step.date}
                  </span>
                </div>
                <p className="text-slate-600 leading-relaxed">{step.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
