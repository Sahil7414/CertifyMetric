import React, { useEffect, useState } from 'react';
import QRCode from 'qrcode';

export default function AcknowledgementSlipModal({
  application,
  instrument,
  onClose
}) {
  const [qrDataUrl, setQrDataUrl] = useState('');

  const app = application || {};
  const inst = instrument || app.instrument || {};
  const fee = app.fee_breakdown || {};
  const pay = app.payment || {};

  const appNo = app.application_no || app.id || 'APP-2026-XXXX';
  const appDate = app.created_at ? new Date(app.created_at).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  }) : new Date().toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });

  const generatedTime = new Date().toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });

  const feeStatus = (app.fee_status || pay.payment_status || 'PENDING').toUpperCase();
  const isPaid = feeStatus === 'PAID' || feeStatus === 'PAYMENT_VERIFIED' || app.status === 'PAYMENT_VERIFIED' || app.status === 'APPROVED' || app.status === 'CERTIFICATE_ISSUED';

  // Resolved Particulars
  const categoryDisplay = inst.category_name || app.category_name || inst.category_id || 'Non-Automatic Weighing Instrument (NAWI)';
  const makeModelDisplay = [inst.manufacturer || app.manufacturer, inst.model || app.model].filter(Boolean).join(' ') || 'Standard Measuring Instrument';
  const serialNoDisplay = inst.serial_number || app.serial_number || app.instrument_serial || '—';

  const rawVerificationType = app.verification_type || app.request_type || 'ORIGINAL';
  const verificationTypeDisplay = (rawVerificationType === 'RE_VERIFICATION')
    ? 'Re-Verification'
    : 'Original Verification (Initial)';

  const verificationModeDisplay = (app.verification_mode === 'IN_SITU')
    ? 'In-Situ (On-Premises Inspection)'
    : 'Camp / Department Office Presentation';

  const capacityDisplay = (inst.max_capacity || app.max_capacity)
    ? `${inst.max_capacity || app.max_capacity} (e = ${inst.verification_scale_interval_e || app.verification_scale_interval_e || '5 g'})`
    : '30 kg (e = 5 g)';

  const applicantName = app.contact_person || inst.owner_name || app.trader_name || 'Authorized Commercial Trader';
  const establishmentName = app.establishment_name || inst.owner_org || app.trader_org || 'Registered Commercial Enterprise';
  const contactPhone = app.contact_phone || app.trader_phone || inst.trader_phone || '—';
  const locationAddress = app.location_address || inst.location || app.location || '—';
  const districtJurisdiction = app.district || inst.district || app.trader_jurisdiction || (locationAddress && locationAddress.includes(',') ? locationAddress.split(',').slice(-2).join(', ').trim() : 'Central Delhi, Delhi');

  useEffect(() => {
    const trackingInfo = `CERTIFYMETRIC|APP:${appNo}|STATUS:${app.status || 'SUBMITTED'}|INST:${serialNoDisplay}|FEE:${feeStatus}`;
    QRCode.toDataURL(trackingInfo, {
      width: 130,
      margin: 1,
      color: { dark: '#002046', light: '#ffffff' }
    }).then(setQrDataUrl).catch(console.error);
  }, [appNo, app.status, serialNoDisplay, feeStatus]);

  // Handle escape key to close
  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.key === 'Escape' && onClose) {
        onClose();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/75 backdrop-blur-xs flex min-h-screen items-start justify-center p-3 sm:p-6 py-6 sm:py-10 print:p-0 print:bg-white print:static print:overflow-visible"
      onClick={onClose}
    >
      {/* Container Dialog */}
      <div
        className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full border border-slate-200 overflow-hidden print:border-none print:shadow-none print:max-w-none print:rounded-none relative my-auto animate-in fade-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Action Header Bar - Hidden during print */}
        <div className="bg-[#002046] text-white px-5 sm:px-6 py-3.5 flex items-center justify-between border-b-2 border-amber-400 print:hidden">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center text-amber-400">
              <span className="material-symbols-outlined text-xl">receipt_long</span>
            </div>
            <div>
              <h3 className="text-sm font-bold tracking-wide text-white">Application Acknowledgement Slip</h3>
              <p className="text-[10.5px] text-slate-300">Section 24 • Legal Metrology Act, 2009</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrint}
              className="px-3.5 py-1.5 bg-amber-400 hover:bg-amber-300 text-[#002046] rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-xs cursor-pointer"
            >
              <span className="material-symbols-outlined text-base">print</span>
              <span>Print / Save PDF</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-semibold transition-colors flex items-center gap-1 cursor-pointer border border-white/20"
              title="Close Dialog"
            >
              <span className="material-symbols-outlined text-base">close</span>
              <span>Close</span>
            </button>
          </div>
        </div>

        {/* =========================================================================
            Official Printable Acknowledgement Document Sheet
            ========================================================================= */}
        <div className="p-6 sm:p-10 text-slate-800 printable-acknowledgement-slip print:p-0">
          {/* 1. Official Header */}
          <div className="text-center pb-4 border-b-2 border-[#002046] relative">
            <div className="flex items-center justify-center gap-2 mb-1">
              <span className="material-symbols-outlined text-3xl text-[#002046]">balance</span>
            </div>
            <h2 className="text-xs uppercase tracking-widest font-extrabold text-slate-700">
              Government of India • Department of Consumer Affairs
            </h2>
            <h1 className="text-base sm:text-lg font-extrabold text-[#002046] tracking-tight mt-0.5">
              LEGAL METROLOGY DIVISION — ONLINE VERIFICATION PORTAL (CERTIFYMETRIC)
            </h1>
            <p className="text-[11px] font-serif italic text-slate-500 mt-0.5">
              Issued under Rule 14 of the Legal Metrology (General) Rules, 2011 & Section 24 of The Legal Metrology Act, 2009
            </p>
            <div className="inline-block mt-2.5 px-4 py-1 bg-slate-100 border border-slate-300 text-slate-900 text-xs font-bold uppercase tracking-wider rounded-sm shadow-2xs">
              Official Application Acknowledgement Slip
            </div>
          </div>

          {/* 2. Reference & Date Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 py-3 border-b border-slate-200 text-xs bg-slate-50/80 px-4 rounded-xl mt-4">
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-500 block">Application No.</span>
              <strong className="font-mono text-sm sm:text-base text-[#002046]">{appNo}</strong>
            </div>
            <div className="sm:text-center">
              <span className="text-[10px] uppercase font-bold text-slate-500 block">Application Date</span>
              <strong className="text-slate-800 text-xs sm:text-sm">{appDate}</strong>
            </div>
            <div className="sm:text-right">
              <span className="text-[10px] uppercase font-bold text-slate-500 block">Current Status</span>
              <span className={`inline-block px-2.5 py-0.5 rounded text-[11px] font-extrabold uppercase ${
                isPaid ? 'bg-emerald-100 text-emerald-900 border border-emerald-300' : 'bg-amber-100 text-amber-900 border border-amber-300'
              }`}>
                {app.status || (isPaid ? 'PAYMENT_VERIFIED' : 'SUBMITTED')}
              </span>
            </div>
          </div>

          {/* 3. Two-Column Particulars Section */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 py-4 border-b border-slate-200 text-xs">
            {/* Left: Applicant Information */}
            <div className="space-y-2">
              <h4 className="text-[11px] font-extrabold uppercase tracking-wider text-[#002046] border-b border-slate-200 pb-1.5 flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[15px] text-primary">person</span>
                1. Applicant / Trader Particulars
              </h4>
              <div className="space-y-1.5 text-slate-700">
                <div className="flex justify-between py-0.5">
                  <span className="text-slate-500">Applicant / Owner:</span>
                  <strong className="text-slate-900">{applicantName}</strong>
                </div>
                <div className="flex justify-between py-0.5">
                  <span className="text-slate-500">Commercial Establishment:</span>
                  <span className="font-semibold text-slate-800">{establishmentName}</span>
                </div>
                <div className="flex justify-between py-0.5">
                  <span className="text-slate-500">Contact Phone:</span>
                  <span className="font-mono text-slate-800">{contactPhone}</span>
                </div>
                <div className="flex justify-between py-0.5">
                  <span className="text-slate-500">Location Address:</span>
                  <span className="text-slate-800 text-right max-w-[200px] truncate" title={locationAddress}>{locationAddress}</span>
                </div>
                <div className="flex justify-between py-0.5">
                  <span className="text-slate-500">Jurisdiction / District:</span>
                  <strong className="text-slate-900">{districtJurisdiction}</strong>
                </div>
              </div>
            </div>

            {/* Right: Instrument Particulars */}
            <div className="space-y-2">
              <h4 className="text-[11px] font-extrabold uppercase tracking-wider text-[#002046] border-b border-slate-200 pb-1.5 flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[15px] text-primary">scale</span>
                2. Instrument & Service Specifications
              </h4>
              <div className="space-y-1.5 text-slate-700">
                <div className="flex justify-between py-0.5">
                  <span className="text-slate-500">Instrument Category:</span>
                  <strong className="text-slate-900">{categoryDisplay}</strong>
                </div>
                <div className="flex justify-between py-0.5">
                  <span className="text-slate-500">Make & Model:</span>
                  <span className="font-semibold text-slate-900">{makeModelDisplay}</span>
                </div>
                <div className="flex justify-between py-0.5">
                  <span className="text-slate-500">Serial Number:</span>
                  <strong className="font-mono text-primary bg-primary/10 px-1.5 py-0.2 rounded">{serialNoDisplay}</strong>
                </div>
                <div className="flex justify-between py-0.5">
                  <span className="text-slate-500">Verification Type:</span>
                  <span className="font-bold text-slate-800">{verificationTypeDisplay}</span>
                </div>
                <div className="flex justify-between py-0.5">
                  <span className="text-slate-500">Verification Mode:</span>
                  <span className="font-semibold text-slate-800">{verificationModeDisplay}</span>
                </div>
                <div className="flex justify-between py-0.5">
                  <span className="text-slate-500">Max Capacity / e:</span>
                  <span className="font-mono text-slate-800">{capacityDisplay}</span>
                </div>
              </div>
            </div>
          </div>

          {/* 4. Statutory Fee & Payment Particulars */}
          <div className="py-4 border-b border-slate-200 text-xs">
            <h4 className="text-[11px] font-extrabold uppercase tracking-wider text-[#002046] pb-2 flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[15px] text-primary">payments</span>
              3. Statutory Fee & Remittance Summary
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-3.5 rounded-xl border border-slate-200">
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-500 block">Total Fee</span>
                <strong className="text-emerald-700 font-mono text-sm sm:text-base">₹{Number(fee.total_fee || pay.amount || 350).toFixed(2)}</strong>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-500 block">Payment Mode</span>
                <span className="font-semibold text-slate-800">{pay.payment_mode || pay.payment_method || 'ONLINE'}</span>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-500 block">Transaction / Ref No</span>
                <span className="font-mono text-slate-800 text-[11px] block truncate" title={pay.transaction_id || pay.challan_number || pay.razorpay_payment_id || 'PENDING'}>
                  {pay.transaction_id || pay.challan_number || pay.razorpay_payment_id || 'PENDING'}
                </span>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-500 block">Payment Status</span>
                <strong className={isPaid ? 'text-emerald-700 font-extrabold' : 'text-amber-700 font-bold'}>
                  {isPaid ? 'PAID' : feeStatus}
                </strong>
              </div>
            </div>
          </div>

          {/* 5. Assigned Office & Instructions */}
          <div className="py-4 border-b border-slate-200 text-xs grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
            <div className="md:col-span-2 space-y-1.5 text-slate-600 text-[11px]">
              <div className="font-bold text-slate-900 text-xs">Statutory Notice & Departmental Instructions:</div>
              <ul className="list-disc list-inside space-y-1 text-slate-600 leading-relaxed">
                <li>This slip serves as proof of statutory submission under the Legal Metrology Act, 2009.</li>
                <li>The Assistant Controller will review the application and allocate an Inspector or GATC testing laboratory.</li>
                <li>Ensure the instrument is accessible and test weights/facilities are available on the scheduled inspection date.</li>
                <li>Upon successful verification, an official digital certificate with a QR security stamp will be issued.</li>
              </ul>
            </div>
            <div className="flex flex-col items-center justify-center p-3 bg-slate-50 rounded-xl border border-slate-200 text-center">
              {qrDataUrl && (
                <img src={qrDataUrl} alt="Application QR" className="w-24 h-24 mb-1.5 shadow-2xs rounded" />
              )}
              <span className="text-[9px] font-mono text-slate-500 font-bold tracking-wider">DIGITAL VERIFICATION REF</span>
            </div>
          </div>

          {/* 6. Official Footer & Authentication Seal Area */}
          <div className="pt-4 flex items-end justify-between text-[10px] text-slate-500">
            <div>
              <div><strong>Issuing Office:</strong> Office of the Assistant Controller of Legal Metrology</div>
              <div><strong>Generated At:</strong> {generatedTime}</div>
              <div className="text-slate-400 mt-1">Computer-generated official document. Retain for departmental inspection.</div>
            </div>
            <div className="text-right">
              <div className="w-36 border-b border-slate-400 pb-8 text-center font-serif text-[10px] italic text-slate-400">
                [Digital Registry Stamp]
              </div>
              <div className="text-[10px] font-bold text-slate-700 mt-1">Legal Metrology Officer</div>
              <div className="text-[9px] text-slate-500">National Metrology Registry</div>
            </div>
          </div>

          {/* 7. Modal Bottom Action Row - Hidden during print */}
          <div className="mt-6 pt-4 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 print:hidden">
            <span className="text-xs text-slate-400">Press ESC or click below to return</span>
            <div className="flex items-center gap-2.5 w-full sm:w-auto">
              <button
                type="button"
                onClick={handlePrint}
                className="flex-1 sm:flex-initial px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 border border-slate-300 cursor-pointer shadow-2xs"
              >
                <span className="material-symbols-outlined text-base">print</span>
                <span>Print / Save PDF</span>
              </button>
              <button
                type="button"
                onClick={onClose}
                className="flex-1 sm:flex-initial px-6 py-2.5 bg-[#002046] hover:bg-[#1b365d] text-white text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 shadow-sm cursor-pointer"
              >
                <span className="material-symbols-outlined text-base">close</span>
                <span>Close Acknowledgement</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

