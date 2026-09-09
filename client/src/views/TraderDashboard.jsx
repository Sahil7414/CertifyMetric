import React, { useState } from 'react';
import StatusBadge from '../components/StatusBadge';
import ApplicationDetailsModal from '../components/ApplicationDetailsModal';

export default function TraderDashboard({
  currentUser,
  instruments = [],
  applications = [],
  certificates = [],
  onOpenAddModal,
  onOpenApplyModal,
  onSelectInstrument,
  onSelectApplication,
  onSelectCertificate,
  onResubmitApplication,
  onPayApplication,
  onRequestVerification,
  onOpenQR,
  onViewAllInstruments,
  onViewAllApplications,
  onViewAllCertificates
}) {
  const [trackSearch, setTrackSearch] = useState('');
  const [selectedDetailApp, setSelectedDetailApp] = useState(null);

  const safeInstruments = Array.isArray(instruments) ? instruments : [];
  const safeApplications = Array.isArray(applications) ? applications : [];
  const safeCertificates = Array.isArray(certificates) ? certificates : [];

  const expiring = safeInstruments.filter(i => i.status === 'EXPIRING' || i.status === 'EXPIRED');
  const pendingApps = safeApplications.filter(a => ['SUBMITTED', 'PENDING_VERIFICATION', 'UNDER_REVIEW', 'ASSIGNED', 'IN_PROGRESS', 'DOCUMENT_VERIFIED', 'INSPECTION_SCHEDULED'].includes(a.status));
  const approvedApps = safeApplications.filter(a => ['APPROVED', 'CERTIFICATE_ISSUED', 'VERIFICATION_COMPLETED'].includes(a.status));
  const returnedApps = safeApplications.filter(a => a.status === 'RETURNED' || a.status === 'REJECTED' || a.status === 'VERIFICATION_FAILED');
  const pendingPaymentApps = safeApplications.filter(a => a.status === 'PAYMENT_PENDING' || a.fee_status === 'PENDING' || a.payment?.payment_status === 'PENDING');
  const recentApplications = safeApplications.slice(0, 6);

  const handleApplyClick = (instId) => {
    if (onOpenApplyModal) {
      onOpenApplyModal(instId);
    } else if (onRequestVerification) {
      onRequestVerification(instId);
    }
  };

  const handleTrackSubmit = (e) => {
    e.preventDefault();
    if (!trackSearch.trim()) return;
    const clean = trackSearch.trim().toLowerCase();
    const matched = safeApplications.find(a =>
      a.application_no?.toLowerCase() === clean ||
      a.id?.toLowerCase() === clean
    );
    if (matched) {
      onSelectApplication(matched.id);
    } else {
      alert(`No application found with reference "${trackSearch}". Please check the number.`);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* 1. Official Government Header / Welcome Banner */}
      <div className="bg-gradient-to-r from-[#002046] to-[#1b365d] rounded-2xl p-6 md:p-8 text-white shadow-md relative overflow-hidden">
        <div className="absolute -right-8 -bottom-8 opacity-10 text-[200px] leading-none select-none pointer-events-none">
          <span className="material-symbols-outlined">balance</span>
        </div>
        <div className="relative z-10 max-w-3xl">
          <div className="flex items-center gap-2 flex-wrap mb-3">
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-white/10 text-amber-300 text-xs font-semibold backdrop-blur-xs">
              <span className="material-symbols-outlined text-[14px]">storefront</span>
              Registered Commercial Establishment
            </span>
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-semibold border border-emerald-500/30">
              <span className="material-symbols-outlined text-[14px]">verified_user</span>
              Section 24 Metrology Registry
            </span>
          </div>

          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-white">
            Welcome back, {currentUser?.full_name}
          </h1>
          <p className="text-xs sm:text-sm text-slate-300 mt-2 leading-relaxed">
            Manage your registered weighing & measuring instruments, file statutory verification and re-verification applications, and track digital compliance certificates under the Legal Metrology Act, 2009.
          </p>

          <div className="flex flex-wrap items-center gap-3 mt-6">
            <button
              onClick={() => handleApplyClick(null)}
              className="px-4 py-2.5 bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold rounded-xl text-xs tracking-wide uppercase transition-all shadow-sm flex items-center gap-2"
            >
              <span className="material-symbols-outlined text-sm font-bold">post_add</span>
              Apply for Verification
            </button>
            <button
              onClick={onOpenAddModal}
              className="px-4 py-2.5 bg-white/10 hover:bg-white/20 text-white font-semibold rounded-xl text-xs transition-all border border-white/20 flex items-center gap-2"
            >
              <span className="material-symbols-outlined text-sm">add_circle</span>
              Register New Instrument
            </button>
            <button
              onClick={onViewAllApplications || (() => {})}
              className="px-4 py-2.5 bg-white/10 hover:bg-white/20 text-white font-semibold rounded-xl text-xs transition-all border border-white/20 flex items-center gap-2"
            >
              <span className="material-symbols-outlined text-sm">receipt_long</span>
              Track Applications ({safeApplications.length})
            </button>
          </div>
        </div>
      </div>

      {/* 2. Returned Application Notice (Priority Action) */}
      {returnedApps.length > 0 && (
        <div className="bg-rose-50 border-2 border-rose-300 rounded-xl p-4 md:p-5 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="w-10 h-10 rounded-lg bg-rose-200 text-rose-900 flex items-center justify-center shrink-0 mt-0.5">
              <span className="material-symbols-outlined text-2xl font-bold">assignment_return</span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-rose-950">Application Returned by Legal Metrology Officer</h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-200 text-rose-900 uppercase">Action Required</span>
              </div>
              <p className="text-xs text-rose-900/90 mt-1">
                Application <strong className="font-mono">{returnedApps[0].application_no}</strong> for <strong>{returnedApps[0].manufacturer} {returnedApps[0].model}</strong> requires resubmission with clarifications.
                {returnedApps[0].return_reason && (
                  <span className="block mt-1 font-semibold text-rose-950 bg-white/70 p-2 rounded-lg border border-rose-200 text-xs">
                    Officer's Return Reason: "{returnedApps[0].return_reason}"
                  </span>
                )}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0 self-end md:self-center">
            <button
              onClick={() => setSelectedDetailApp(returnedApps[0])}
              className="px-3.5 py-2 bg-white hover:bg-rose-100 text-rose-900 border border-rose-300 rounded-lg text-xs font-bold transition-all shadow-xs cursor-pointer flex items-center gap-1"
            >
              <span className="material-symbols-outlined text-sm">visibility</span>
              View Details
            </button>
            <button
              onClick={() => onResubmitApplication ? onResubmitApplication(returnedApps[0]) : onSelectApplication(returnedApps[0].id)}
              className="px-4 py-2 bg-rose-700 hover:bg-rose-800 text-white rounded-lg text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
            >
              <span className="material-symbols-outlined text-[16px]">replay</span>
              Resubmit Now
            </button>
          </div>
        </div>
      )}

      {/* 3. Expiry Warning Alert (Statutory Notice) */}
      {expiring.length > 0 && (
        <div className="bg-amber-50 border border-amber-300 rounded-xl p-4 md:p-5 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="w-10 h-10 rounded-lg bg-amber-200/80 flex items-center justify-center text-amber-900 shrink-0 mt-0.5">
              <span className="material-symbols-outlined text-2xl font-bold">notification_important</span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-amber-950">Statutory Re-Verification Notice</h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-200 text-amber-900 uppercase">Action Required</span>
              </div>
              <p className="text-xs text-amber-900/90 mt-1">
                Instrument <strong className="font-semibold">{expiring[0].manufacturer} {expiring[0].model} (SN: {expiring[0].serial_number})</strong> verification requires renewal under Section 24. Submit an online re-verification application to maintain commercial compliance.
              </p>
            </div>
          </div>
          <button
            onClick={() => handleApplyClick(expiring[0].id)}
            className="px-4 py-2 bg-amber-700 hover:bg-amber-800 text-white rounded-lg text-xs font-bold shrink-0 transition-all shadow-xs flex items-center gap-1.5 self-end md:self-center"
          >
            <span className="material-symbols-outlined text-[16px]">published_with_changes</span>
            Apply for Re-verification
          </button>
        </div>
      )}

      {/* 4. LMOMS-Style 5 Metric KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5 sm:gap-4">
        {/* Card 1: Total Instruments */}
        <div
          onClick={onViewAllInstruments}
          className="bg-white rounded-xl p-4 border border-slate-200 shadow-xs hover:border-[#002046]/40 cursor-pointer transition-all"
        >
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Total Instruments</span>
            <span className="material-symbols-outlined text-[#002046] text-xl">scale</span>
          </div>
          <div className="text-2xl font-extrabold text-[#002046]">{safeInstruments.length}</div>
          <p className="text-[11px] text-slate-500 mt-1">Registered instruments</p>
        </div>

        {/* Card 2: Pending Applications */}
        <div
          onClick={onViewAllApplications}
          className="bg-white rounded-xl p-4 border border-slate-200 shadow-xs hover:border-purple-300 cursor-pointer transition-all"
        >
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Pending Apps</span>
            <span className="material-symbols-outlined text-purple-600 text-xl">hourglass_top</span>
          </div>
          <div className="text-2xl font-extrabold text-purple-600">{pendingApps.length}</div>
          <p className="text-[11px] text-slate-500 mt-1">Under statutory review</p>
        </div>

        {/* Card 3: Approved Applications */}
        <div
          onClick={onViewAllCertificates}
          className="bg-white rounded-xl p-4 border border-slate-200 shadow-xs hover:border-emerald-300 cursor-pointer transition-all"
        >
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Approved Apps</span>
            <span className="material-symbols-outlined text-emerald-600 text-xl">task_alt</span>
          </div>
          <div className="text-2xl font-extrabold text-emerald-600">{approvedApps.length}</div>
          <p className="text-[11px] text-slate-500 mt-1">Passed verification</p>
        </div>

        {/* Card 4: Returned / Rejected Applications */}
        <div
          onClick={onViewAllApplications}
          className="bg-white rounded-xl p-4 border border-slate-200 shadow-xs hover:border-rose-300 cursor-pointer transition-all"
        >
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Returned / Rejected</span>
            <span className="material-symbols-outlined text-rose-600 text-xl">assignment_late</span>
          </div>
          <div className="text-2xl font-extrabold text-rose-600">{returnedApps.length}</div>
          <p className="text-[11px] text-slate-500 mt-1">Action / Resubmit required</p>
        </div>

        {/* Card 5: Pending Payments */}
        <div
          onClick={onViewAllApplications}
          className="bg-white rounded-xl p-4 border border-slate-200 shadow-xs hover:border-amber-300 cursor-pointer transition-all col-span-2 sm:col-span-1"
        >
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Pending Payments</span>
            <span className="material-symbols-outlined text-amber-600 text-xl">payments</span>
          </div>
          <div className="text-2xl font-extrabold text-amber-600">{pendingPaymentApps.length}</div>
          <p className="text-[11px] text-slate-500 mt-1">Fee remittance pending</p>
        </div>
      </div>

      {/* 5. Instant Application Search Widget */}
      <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-primary text-xl">travel_explore</span>
          <div>
            <span className="text-xs font-bold text-slate-800 block">Instant Status Tracking</span>
            <span className="text-[11px] text-slate-500">Track any application by Reference Number (e.g. APP-2026-XXXX)</span>
          </div>
        </div>

        <form onSubmit={handleTrackSubmit} className="flex items-center gap-2 w-full sm:w-auto">
          <input
            type="text"
            placeholder="Enter Application No..."
            value={trackSearch}
            onChange={(e) => setTrackSearch(e.target.value)}
            className="px-3 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-lg outline-none font-mono focus:border-primary w-full sm:w-60"
          />
          <button
            type="submit"
            className="px-4 py-1.5 bg-primary hover:bg-primary-container text-white font-bold text-xs rounded-lg transition-all whitespace-nowrap shadow-2xs"
          >
            Track Status
          </button>
        </form>
      </div>

      {/* 6. Recent Applications Section */}
      {safeApplications.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 bg-slate-50/50">
            <div>
              <h2 className="text-base font-bold text-slate-900">Recent Verification Applications</h2>
              <p className="text-xs text-slate-500 mt-0.5">Track filed applications through statutory review and verifier allocation</p>
            </div>
            {onViewAllApplications && (
              <button
                onClick={onViewAllApplications}
                className="text-xs font-bold text-primary hover:underline flex items-center gap-1"
              >
                <span>View All ({safeApplications.length})</span>
                <span className="material-symbols-outlined text-sm">arrow_forward</span>
              </button>
            )}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs min-w-[680px]">
              <thead className="bg-slate-100 text-slate-600 font-semibold border-b border-slate-200">
                <tr>
                  <th className="px-6 py-3">Application No</th>
                  <th className="px-6 py-3">Instrument Details</th>
                  <th className="px-6 py-3">Type & Mode</th>
                  <th className="px-6 py-3">Filed Date</th>
                  <th className="px-6 py-3">Current Status</th>
                  <th className="px-6 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-slate-700">
                {recentApplications.map((app) => (
                  <tr key={app.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-6 py-3.5">
                      <button
                        onClick={() => setSelectedDetailApp(app)}
                        className="font-mono font-bold text-primary hover:underline cursor-pointer text-left"
                        title="Click to view details"
                      >
                        {app.application_no}
                      </button>
                    </td>
                    <td className="px-6 py-3.5">
                      <span className="font-bold text-slate-900 block">{app.manufacturer} {app.model}</span>
                      <span className="font-mono text-[10px] text-slate-500">SN: {app.serial_number}</span>
                    </td>
                    <td className="px-6 py-3.5">
                      <span className="font-semibold text-slate-800 block">
                        {app.request_type === 'INITIAL_VERIFICATION' ? 'Original Verification' : 'Re-verification'}
                      </span>
                      <span className="text-[10px] text-slate-400">
                        {app.verification_mode === 'IN_SITU' ? 'In-situ (On-Site)' : 'Camp / Centre'}
                      </span>
                    </td>
                    <td className="px-6 py-3.5 text-slate-600">
                      {new Date(app.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-3.5">
                      <StatusBadge status={app.status} />
                    </td>
                    <td className="px-6 py-3.5 text-right space-x-2 whitespace-nowrap">
                      {app.status === 'RETURNED' && (
                        <button
                          onClick={() => onResubmitApplication ? onResubmitApplication(app) : onSelectApplication(app.id)}
                          className="px-3 py-1 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold rounded text-xs transition-all inline-flex items-center gap-1 shadow-2xs cursor-pointer"
                        >
                          <span className="material-symbols-outlined text-sm font-bold">replay</span>
                          Resubmit
                        </button>
                      )}
                      {app.status === 'PAYMENT_PENDING' && (
                        <button
                          onClick={() => onPayApplication ? onPayApplication(app) : onSelectApplication(app.id)}
                          className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded text-xs transition-all inline-flex items-center gap-1 shadow-2xs cursor-pointer"
                        >
                          <span className="material-symbols-outlined text-sm font-bold">payment</span>
                          Pay Fee
                        </button>
                      )}
                      <button
                        onClick={() => setSelectedDetailApp(app)}
                        className="px-3 py-1 bg-primary text-white rounded text-xs font-bold hover:bg-primary-container transition-all cursor-pointer"
                      >
                        Details
                      </button>
                      {(app.certificate_id || app.status === 'CERTIFICATE_ISSUED') && onSelectCertificate && (
                        <button
                          onClick={() => onSelectCertificate(app.certificate_id)}
                          className="px-2.5 py-1 bg-emerald-50 text-emerald-700 border border-emerald-300 rounded text-xs font-semibold hover:bg-emerald-100 transition-colors cursor-pointer"
                        >
                          Certificate
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 6. Active Instruments Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 bg-slate-50/50">
          <div>
            <h2 className="text-base font-bold text-slate-900">Registered Instruments Registry</h2>
            <p className="text-xs text-slate-500 mt-0.5">Commercial instruments subject to statutory verification</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleApplyClick(null)}
              className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold rounded-lg text-xs transition-colors flex items-center gap-1.5 shadow-2xs"
            >
              <span className="material-symbols-outlined text-[16px]">post_add</span>
              Apply for Verification
            </button>
            <button
              onClick={onOpenAddModal}
              className="px-3 py-1.5 bg-primary/10 hover:bg-primary/20 text-primary font-bold rounded-lg text-xs transition-colors flex items-center gap-1.5 shadow-2xs"
            >
              <span className="material-symbols-outlined text-[16px]">add_circle</span>
              Register Instrument
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs min-w-[680px]">
            <thead className="bg-slate-100 text-slate-600 font-semibold border-b border-slate-200">
              <tr>
                <th className="px-6 py-3">Device & Model</th>
                <th className="px-6 py-3">Serial Number</th>
                <th className="px-6 py-3">Capacity / Interval</th>
                <th className="px-6 py-3">Location</th>
                <th className="px-6 py-3">Compliance Status</th>
                <th className="px-6 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-slate-700">
              {safeInstruments.map((inst) => {
                const relatedApp = safeApplications.find(a => a.instrument_id === inst.id);

                let complianceStatus = inst.status;
                if (inst.status === 'VERIFIED') {
                  complianceStatus = 'VERIFIED';
                } else if (inst.status === 'EXPIRED') {
                  complianceStatus = 'EXPIRED';
                } else if (inst.status === 'EXPIRING') {
                  complianceStatus = 'EXPIRING';
                } else if (relatedApp) {
                  complianceStatus = relatedApp.status;
                } else if (inst.status === 'REGISTERED') {
                  complianceStatus = 'VERIFICATION_PENDING';
                }

                const canRequestVerification = !relatedApp || ['VERIFICATION_FAILED', 'REJECTED', 'APPLICATION_REJECTED'].includes(relatedApp.status) || inst.status === 'REGISTERED';
                const isExpiring = inst.status === 'EXPIRING' || inst.status === 'EXPIRED';

                return (
                  <tr key={inst.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-bold text-slate-900">{inst.manufacturer}</div>
                      <div className="text-[11px] text-slate-500 font-medium">{inst.model}</div>
                    </td>
                    <td className="px-6 py-4 font-mono font-medium text-slate-800">
                      {inst.serial_number}
                    </td>
                    <td className="px-6 py-4">
                      <span className="font-semibold text-slate-900">{inst.max_capacity}</span>
                      <span className="text-slate-400 text-[11px] block">e = {inst.verification_scale_interval_e}</span>
                    </td>
                    <td className="px-6 py-4 text-slate-600 max-w-[200px] truncate" title={inst.location}>
                      {inst.location}
                    </td>
                    <td className="px-6 py-4">
                      <StatusBadge status={complianceStatus} />
                    </td>
                    <td className="px-6 py-4 text-right space-x-2">
                      <button
                        onClick={() => onSelectInstrument(inst.id)}
                        className="px-2.5 py-1 text-slate-700 hover:text-primary hover:bg-slate-100 rounded text-xs font-semibold transition-colors"
                      >
                        Details
                      </button>
                      {canRequestVerification && !isExpiring && inst.status !== 'VERIFIED' && (
                        <button
                          onClick={() => handleApplyClick(inst.id)}
                          className="px-3 py-1 bg-primary text-white rounded text-xs font-bold hover:bg-primary-container transition-all"
                        >
                          Apply
                        </button>
                      )}
                      {isExpiring && (
                        <button
                          onClick={() => handleApplyClick(inst.id)}
                          className="px-3 py-1 bg-amber-600 text-white rounded text-xs font-bold hover:bg-amber-700 transition-all"
                        >
                          Re-verify
                        </button>
                      )}
                      {inst.certificate_no && (
                        <button
                          onClick={() => onOpenQR({
                            certificate_no: inst.certificate_no,
                            public_token: inst.public_token,
                            status: inst.cert_status || 'VALID'
                          })}
                          className="p-1 text-primary hover:bg-primary/10 rounded inline-flex items-center"
                          title="View Certificate QR"
                        >
                          <span className="material-symbols-outlined text-[18px]">qr_code_2</span>
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Application Details Inspection Modal */}
      <ApplicationDetailsModal
        application={selectedDetailApp}
        isOpen={Boolean(selectedDetailApp)}
        onClose={() => setSelectedDetailApp(null)}
        onResubmitApplication={onResubmitApplication}
        onPayApplication={onPayApplication}
        onSelectCertificate={onSelectCertificate}
        onViewTimeline={(id) => {
          setSelectedDetailApp(null);
          onSelectApplication(id);
        }}
      />
    </div>
  );
}
