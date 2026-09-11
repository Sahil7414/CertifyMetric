import React, { useState, useEffect } from 'react';
import StatusBadge from './StatusBadge';

export default function ApplicationDetailsModal({
  application,
  isOpen,
  onClose,
  onResubmitApplication,
  onPayApplication,
  onSelectCertificate,
  onViewTimeline
}) {
  const [isClosing, setIsClosing] = useState(false);

  const handleClose = () => {
    if (isClosing) return;
    setIsClosing(true);
    setTimeout(() => {
      onClose();
    }, 240);
  };

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        handleClose();
      }
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }
  }, [isOpen, isClosing]);

  useEffect(() => {
    if (!isOpen) return;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [isOpen]);

  if (!isOpen || !application) return null;

  const isReturned = application.status === 'RETURNED';
  const isPaymentPending = application.status === 'PAYMENT_PENDING' || application.fee_status === 'PENDING' || application.payment?.payment_status === 'PENDING';
  const isPaid = application.fee_status === 'PAID' || application.payment?.payment_status === 'PAID' || application.payment?.payment_status === 'PAYMENT_VERIFIED';
  const isApproved = ['VERIFICATION_COMPLETED', 'CERTIFICATE_ISSUED', 'APPROVED'].includes(application.status);
  const isFailed = application.status === 'VERIFICATION_FAILED' || application.status === 'REJECTED';

  const totalFee = application.fee_breakdown?.total_fee || application.payment?.amount || application.amount || 300;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop overlay */}
      <div
        className={`fixed inset-0 bg-slate-900/60 backdrop-blur-sm cursor-pointer transition-opacity duration-300 ${
          isClosing ? 'animate-backdrop-out' : 'animate-backdrop-in'
        }`}
        onClick={handleClose}
      />

      {/* Slide-over Drawer Panel occupying half the screen on desktop */}
      <div
        className={`fixed inset-y-0 right-0 z-50 flex flex-col h-full w-full sm:w-[85vw] md:w-1/2 lg:w-1/2 xl:w-1/2 bg-white shadow-2xl border-l border-slate-200 cursor-default ${
          isClosing ? 'animate-slide-out-right' : 'animate-slide-in-right'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="bg-[#002046] text-white px-6 py-4 flex items-center justify-between shrink-0">
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-mono text-xs font-extrabold px-2.5 py-0.5 rounded bg-white/20 text-white tracking-wide">
                {application.application_no}
              </span>
              <span className="text-white/60 text-xs">•</span>
              <span className="text-xs font-semibold text-white/90">
                {application.verification_type === 'RE_VERIFICATION' || application.request_type === 'RE_VERIFICATION'
                  ? 'Re-Verification'
                  : 'Original Verification'}
              </span>
            </div>
            <h2 className="text-base font-bold text-white">
              Application Details & Statutory Status
            </h2>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <StatusBadge status={application.status} />
            <kbd className="hidden sm:inline-flex items-center px-2 py-0.5 text-[10px] font-medium text-white/70 bg-white/10 border border-white/20 rounded">
              ESC
            </kbd>
            <button
              onClick={handleClose}
              className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors cursor-pointer"
              title="Close panel (ESC)"
            >
              <span className="material-symbols-outlined text-lg">close</span>
            </button>
          </div>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-6 flex-1 overflow-y-auto space-y-6 text-xs text-slate-700">
          
          {/* 1. RETURN DEFICIENCY BANNER (When Status is RETURNED) */}
          {isReturned && (
            <div className="bg-rose-50 border-2 border-rose-300 rounded-2xl p-5 shadow-xs space-y-3">
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-xl bg-rose-200 text-rose-900 flex items-center justify-center shrink-0 mt-0.5">
                  <span className="material-symbols-outlined text-xl font-bold">assignment_return</span>
                </div>
                <div className="space-y-1 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded bg-rose-200 text-rose-900">
                      Action Required • Statutory Return Notice
                    </span>
                    <span className="text-[11px] text-rose-800 font-medium">
                      Returned by Legal Metrology Officer
                    </span>
                  </div>
                  <h3 className="text-sm font-bold text-rose-950">
                    Deficiency & Return Reason:
                  </h3>
                  <div className="p-3 bg-white/90 rounded-xl border border-rose-200 text-xs text-rose-950 leading-relaxed font-medium">
                    "{application.return_reason || 'Previous calibration certificate illegible and commercial invoice is incomplete. Please re-upload verified documents.'}"
                  </div>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t border-rose-200 text-[11px] text-rose-800">
                <p>
                  You can update the deficient particulars or documents and resubmit without incurring additional statutory fees.
                </p>
                {onResubmitApplication && (
                  <button
                    onClick={() => {
                      onClose();
                      onResubmitApplication(application);
                    }}
                    className="px-4 py-2 bg-rose-700 hover:bg-rose-800 text-white font-bold rounded-xl text-xs shadow-xs transition-all flex items-center gap-1.5 shrink-0 cursor-pointer self-start sm:self-auto"
                  >
                    <span className="material-symbols-outlined text-base">replay</span>
                    Resubmit Application Now
                  </button>
                )}
              </div>
            </div>
          )}

          {/* 2. PAYMENT PENDING BANNER */}
          {isPaymentPending && (
            <div className="bg-amber-50 border-2 border-amber-300 rounded-2xl p-5 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-xl bg-amber-200 text-amber-900 flex items-center justify-center shrink-0 mt-0.5">
                  <span className="material-symbols-outlined text-xl font-bold">payments</span>
                </div>
                <div>
                  <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded bg-amber-200 text-amber-900">
                    Remittance Pending
                  </span>
                  <h3 className="text-sm font-bold text-amber-950 mt-1">
                    Statutory Fee Payable: ₹{Number(totalFee).toFixed(2)}
                  </h3>
                  <p className="text-[11px] text-amber-800 mt-0.5">
                    Remit statutory verification fee to advance your application to officer verification.
                  </p>
                </div>
              </div>
              {onPayApplication && (
                <button
                  onClick={() => {
                    onClose();
                    onPayApplication(application);
                  }}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs shadow-xs transition-all flex items-center gap-1.5 shrink-0 cursor-pointer"
                >
                  <span className="material-symbols-outlined text-base">payments</span>
                  Pay Fee Now
                </button>
              )}
            </div>
          )}

          {/* 3. INSTRUMENT TECHNICAL SPECIFICATIONS */}
          <div className="bg-slate-50 rounded-2xl p-5 border border-slate-200 space-y-3">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
              <span className="material-symbols-outlined text-primary text-base">scale</span>
              Instrument & Technical Particulars
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div className="p-3 bg-white rounded-xl border border-slate-200">
                <span className="text-[10px] text-slate-400 block">Manufacturer & Model</span>
                <strong className="text-slate-900 block text-xs mt-0.5 truncate" title={`${application.manufacturer} ${application.model}`}>
                  {application.manufacturer} {application.model}
                </strong>
              </div>
              <div className="p-3 bg-white rounded-xl border border-slate-200">
                <span className="text-[10px] text-slate-400 block">Serial Number</span>
                <strong className="text-slate-900 block font-mono text-xs mt-0.5 truncate" title={application.serial_number}>
                  {application.serial_number || 'N/A'}
                </strong>
              </div>
              <div className="p-3 bg-white rounded-xl border border-slate-200">
                <span className="text-[10px] text-slate-400 block">Category / Type</span>
                <strong className="text-slate-900 block text-xs mt-0.5 truncate" title={application.category_name || 'Commercial NAWI'}>
                  {application.category_name || 'Commercial NAWI (Class III)'}
                </strong>
              </div>
              <div className="p-3 bg-white rounded-xl border border-slate-200">
                <span className="text-[10px] text-slate-400 block">Max / Min Capacity</span>
                <strong className="text-slate-900 block text-xs mt-0.5">
                  {application.max_capacity ? `${application.max_capacity} / ${application.min_capacity || '0'}` : '30 kg / 100 g'}
                </strong>
              </div>
              <div className="p-3 bg-white rounded-xl border border-slate-200">
                <span className="text-[10px] text-slate-400 block">Verification Scale Interval (e)</span>
                <strong className="text-slate-900 block text-xs mt-0.5">
                  {application.verification_scale_interval_e || '5 g (e = 5g)'}
                </strong>
              </div>
              <div className="p-3 bg-white rounded-xl border border-slate-200">
                <span className="text-[10px] text-slate-400 block">Premises / Location</span>
                <strong className="text-slate-900 block text-xs mt-0.5 truncate" title={application.location || application.location_address}>
                  {application.location || application.location_address || 'Main Commercial Facility'}
                </strong>
              </div>
            </div>
          </div>

          {/* 4. VERIFICATION & STATUTORY ARRANGEMENT */}
          <div className="bg-slate-50 rounded-2xl p-5 border border-slate-200 space-y-3">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
              <span className="material-symbols-outlined text-primary text-base">verified_user</span>
              Statutory Verification Arrangement
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3 bg-white rounded-xl border border-slate-200">
                <span className="text-[10px] text-slate-400 block">Verification Type</span>
                <strong className="text-slate-900 block text-xs mt-0.5">
                  {application.verification_type === 'RE_VERIFICATION' || application.request_type === 'RE_VERIFICATION' ? 'Re-Verification' : 'Original Verification'}
                </strong>
              </div>
              <div className="p-3 bg-white rounded-xl border border-slate-200">
                <span className="text-[10px] text-slate-400 block">Arrangement Mode</span>
                <strong className="text-slate-900 block text-xs mt-0.5">
                  {application.verification_mode === 'IN_SITU' ? 'In-situ (On-Site)' : 'Camp / Centre Presentation'}
                </strong>
              </div>
              <div className="p-3 bg-white rounded-xl border border-slate-200">
                <span className="text-[10px] text-slate-400 block">Assigned Verifier</span>
                <strong className="text-slate-900 block text-xs mt-0.5 truncate" title={application.assigned_to_name || 'Pending Allocation'}>
                  {application.assigned_to_name || 'Pending Allocation'}
                </strong>
              </div>
              <div className="p-3 bg-white rounded-xl border border-slate-200">
                <span className="text-[10px] text-slate-400 block">Scheduled / Applied Date</span>
                <strong className="text-slate-900 block text-xs mt-0.5">
                  {application.scheduled_date ? new Date(application.scheduled_date).toLocaleDateString() : new Date(application.created_at).toLocaleDateString()}
                </strong>
              </div>
            </div>
          </div>

          {/* 5. STATUTORY FEE & PAYMENT PARTICULARS */}
          <div className="bg-slate-50 rounded-2xl p-5 border border-slate-200 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                <span className="material-symbols-outlined text-primary text-base">receipt_long</span>
                Statutory Fee & Payment Particulars
              </h3>
              <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${isPaid ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-900'}`}>
                {isPaid ? 'PAID & CONFIRMED' : 'UNPAID / PENDING'}
              </span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3 bg-white rounded-xl border border-slate-200">
                <span className="text-[10px] text-slate-400 block">Total Amount</span>
                <strong className="text-slate-900 font-mono block text-sm mt-0.5">
                  ₹{Number(totalFee).toFixed(2)}
                </strong>
              </div>
              <div className="p-3 bg-white rounded-xl border border-slate-200">
                <span className="text-[10px] text-slate-400 block">Payment Mode</span>
                <strong className="text-slate-900 block text-xs mt-0.5">
                  {application.payment?.payment_mode || (isPaid ? 'ONLINE GATEWAY' : 'Pending')}
                </strong>
              </div>
              <div className="p-3 bg-white rounded-xl border border-slate-200">
                <span className="text-[10px] text-slate-400 block">Transaction Reference</span>
                <strong className="text-slate-900 font-mono block text-[11px] mt-0.5 truncate" title={application.payment?.transaction_id}>
                  {application.payment?.transaction_id || (isPaid ? 'TXN_VERIFIED' : 'Pending')}
                </strong>
              </div>
              <div className="p-3 bg-white rounded-xl border border-slate-200">
                <span className="text-[10px] text-slate-400 block">Payment Timestamp</span>
                <strong className="text-slate-900 block text-xs mt-0.5">
                  {application.payment?.paid_at ? new Date(application.payment.paid_at).toLocaleString() : (isPaid ? 'Confirmed' : 'Pending')}
                </strong>
              </div>
            </div>
          </div>

          {/* 6. SUPPORTING DOCUMENTS */}
          {application.documents && application.documents.length > 0 && (
            <div className="bg-slate-50 rounded-2xl p-5 border border-slate-200 space-y-3">
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                <span className="material-symbols-outlined text-primary text-base">folder_open</span>
                Attached Supporting Documents ({application.documents.length})
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {application.documents.map((doc, idx) => (
                  <div key={doc.id || idx} className="p-3 bg-white rounded-xl border border-slate-200 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 truncate">
                      <span className="material-symbols-outlined text-primary text-base shrink-0">description</span>
                      <div className="truncate">
                        <span className="font-semibold text-slate-900 block truncate">{doc.file_name}</span>
                        <span className="text-[10px] text-slate-400">{doc.category} {doc.file_size ? `• ${doc.file_size}` : ''}</span>
                      </div>
                    </div>
                    <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-600 shrink-0">
                      Uploaded
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>

        {/* Modal Footer Actions */}
        <div className="bg-slate-100 px-6 py-4 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2">
            {onViewTimeline && (
              <button
                onClick={() => {
                  onClose();
                  onViewTimeline(application.id);
                }}
                className="px-3.5 py-2 bg-white hover:bg-slate-50 text-slate-800 border border-slate-300 font-bold rounded-xl text-xs transition-all shadow-2xs flex items-center gap-1.5 cursor-pointer"
              >
                <span className="material-symbols-outlined text-base">timeline</span>
                View Full Timeline
              </button>
            )}
            {isApproved && application.certificate_id && onSelectCertificate && (
              <button
                onClick={() => {
                  onClose();
                  onSelectCertificate(application.certificate_id);
                }}
                className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-xl text-xs transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
              >
                <span className="material-symbols-outlined text-base">workspace_premium</span>
                View Official Certificate
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            {isReturned && onResubmitApplication && (
              <button
                onClick={() => {
                  onClose();
                  onResubmitApplication(application);
                }}
                className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold rounded-xl text-xs shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <span className="material-symbols-outlined text-base font-bold">replay</span>
                Resubmit Application
              </button>
            )}
            {isPaymentPending && onPayApplication && (
              <button
                onClick={() => {
                  onClose();
                  onPayApplication(application);
                }}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <span className="material-symbols-outlined text-base">payments</span>
                Pay Now
              </button>
            )}
            <button
              onClick={handleClose}
              className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold rounded-xl text-xs transition-all cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
