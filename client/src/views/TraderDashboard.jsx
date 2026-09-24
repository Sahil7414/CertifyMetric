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
  const [selectedDetailApp, setSelectedDetailApp] = useState(null);

  const safeInstruments = Array.isArray(instruments) ? instruments : [];
  const safeApplications = Array.isArray(applications) ? applications : [];
  const safeCertificates = Array.isArray(certificates) ? certificates : [];

  const isAppPaid = (a) =>
    a.fee_status === 'PAID' ||
    a.payment?.payment_status === 'PAID' ||
    a.payment?.payment_status === 'PAYMENT_VERIFIED' ||
    a.status === 'PAYMENT_VERIFIED' ||
    ['VERIFICATION_COMPLETED', 'CERTIFICATE_ISSUED', 'APPROVED'].includes(a.status);

  const isAppPaymentPending = (a) =>
    !isAppPaid(a) &&
    (a.status === 'PAYMENT_PENDING' || a.fee_status === 'PENDING' || a.payment?.payment_status === 'PENDING');

  const expiring = safeInstruments.filter((i) => i.status === 'EXPIRING' || i.status === 'EXPIRED');
  const activeApps = safeApplications.filter((a) =>
    ['SUBMITTED', 'PENDING_VERIFICATION', 'UNDER_REVIEW', 'ASSIGNED', 'IN_PROGRESS', 'DOCUMENT_VERIFIED', 'INSPECTION_SCHEDULED', 'SCHEDULED', 'REPORT_SUBMITTED'].includes(a.status)
  );
  const underVerification = safeApplications.filter((a) =>
    ['ASSIGNED', 'SCHEDULED', 'IN_PROGRESS', 'VERIFICATION_IN_PROGRESS', 'INSPECTION_SCHEDULED'].includes(a.status)
  );
  const approvedApps = safeApplications.filter((a) =>
    ['APPROVED', 'CERTIFICATE_ISSUED', 'VERIFICATION_COMPLETED'].includes(a.status)
  );
  const returnedApps = safeApplications.filter((a) =>
    a.status === 'RETURNED' || a.status === 'REJECTED' || a.status === 'VERIFICATION_FAILED'
  );
  const pendingPaymentApps = safeApplications.filter(isAppPaymentPending);

  const handleApplyClick = (instId = null) => {
    if (onOpenApplyModal) {
      onOpenApplyModal(instId);
    } else if (onRequestVerification) {
      onRequestVerification(instId);
    }
  };

  // Recent 5 applications ordered newest first
  const recentApplications = [...safeApplications]
    .sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0))
    .slice(0, 5);

  return (
    <div className="space-y-6 max-w-7xl mx-auto animate-in fade-in duration-300">
      {/* 1. Header / Welcome Banner */}
      <div className="bg-gradient-to-r from-[#002046] to-[#1b365d] rounded-2xl p-6 md:p-8 text-white shadow-md relative overflow-hidden">
        <div className="absolute -right-8 -bottom-8 opacity-10 text-[200px] leading-none select-none pointer-events-none">
          <span className="material-symbols-outlined">balance</span>
        </div>
        <div className="relative z-10 max-w-3xl">
          <div className="flex items-center gap-2 flex-wrap mb-3">
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-white/10 text-amber-300 text-xs font-semibold backdrop-blur-xs">
              <span className="material-symbols-outlined text-[14px]">storefront</span>
              Trader & Owner Dashboard
            </span>
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-semibold border border-emerald-500/30">
              <span className="material-symbols-outlined text-[14px]">verified_user</span>
              Legal Metrology Compliance
            </span>
          </div>

          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-white">
            Welcome back, {currentUser?.full_name}
          </h1>
          <p className="text-xs sm:text-sm text-slate-300 mt-2 leading-relaxed">
            Overview of your registered commercial instruments, active verification applications, statutory fee payments, and compliance credentials.
          </p>

          {/* Quick Actions in Header */}
          <div className="flex flex-wrap items-center gap-3 mt-6">
            <button
              onClick={() => handleApplyClick(null)}
              className="px-4 py-2.5 bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold rounded-xl text-xs tracking-wide uppercase transition-all shadow-sm flex items-center gap-2 cursor-pointer"
            >
              <span className="material-symbols-outlined text-sm font-bold">post_add</span>
              Apply for Verification
            </button>
            <button
              onClick={onOpenAddModal}
              className="px-4 py-2.5 bg-white/10 hover:bg-white/20 text-white font-semibold rounded-xl text-xs transition-all border border-white/20 flex items-center gap-2 cursor-pointer"
            >
              <span className="material-symbols-outlined text-sm">add_circle</span>
              Register Instrument
            </button>
            {onViewAllApplications && (
              <button
                onClick={onViewAllApplications}
                className="px-4 py-2.5 bg-white/10 hover:bg-white/20 text-white font-semibold rounded-xl text-xs transition-all border border-white/20 flex items-center gap-2 cursor-pointer"
              >
                <span className="material-symbols-outlined text-sm">receipt_long</span>
                View All Applications
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 2. Priority Alerts */}
      {returnedApps.length > 0 && (
        <div className="bg-rose-50 border-2 border-rose-300 rounded-xl p-4 md:p-5 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="w-10 h-10 rounded-lg bg-rose-200 text-rose-900 flex items-center justify-center shrink-0 mt-0.5">
              <span className="material-symbols-outlined text-2xl font-bold">assignment_return</span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-rose-950">Application Returned for Action</h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-200 text-rose-900 uppercase">Action Required</span>
              </div>
              <p className="text-xs text-rose-900/90 mt-1">
                Application <strong className="font-mono">{returnedApps[0].application_no}</strong> ({returnedApps[0].manufacturer} {returnedApps[0].model}) requires resubmission with requested modifications.
              </p>
              {returnedApps[0].return_reason && (
                <div className="mt-1.5 font-semibold text-rose-950 bg-white/80 p-2 rounded-lg border border-rose-200 text-xs">
                  Reason: "{returnedApps[0].return_reason}"
                </div>
              )}
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
              onClick={() => (onResubmitApplication ? onResubmitApplication(returnedApps[0]) : onSelectApplication(returnedApps[0].id))}
              className="px-4 py-2 bg-rose-700 hover:bg-rose-800 text-white rounded-lg text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
            >
              <span className="material-symbols-outlined text-[16px]">replay</span>
              Resubmit Now
            </button>
          </div>
        </div>
      )}

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
                Instrument <strong className="font-semibold">{expiring[0].manufacturer} {expiring[0].model} (SN: {expiring[0].serial_number})</strong> verification requires renewal under Section 24.
              </p>
            </div>
          </div>
          <button
            onClick={() => handleApplyClick(expiring[0].id)}
            className="px-4 py-2 bg-amber-700 hover:bg-amber-800 text-white rounded-lg text-xs font-bold shrink-0 transition-all shadow-xs flex items-center gap-1.5 self-end md:self-center cursor-pointer"
          >
            <span className="material-symbols-outlined text-[16px]">published_with_changes</span>
            Apply for Re-verification
          </button>
        </div>
      )}

      {/* 3. 5 KPI Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5 sm:gap-4">
        {/* KPI 1: Total Instruments */}
        <div
          onClick={onViewAllInstruments}
          className="bg-white rounded-xl p-3.5 sm:p-4 border border-slate-200 shadow-xs hover:border-[#002046]/50 cursor-pointer transition-all hover:shadow-sm group min-w-0"
        >
          <div className="flex items-center justify-between text-slate-500 mb-1.5 min-w-0">
            <span className="text-[10px] sm:text-[11px] font-semibold uppercase tracking-wider truncate">Instruments</span>
            <span className="material-symbols-outlined text-[#002046] text-lg sm:text-xl shrink-0 group-hover:scale-110 transition-transform">scale</span>
          </div>
          <div className="text-xl sm:text-2xl font-extrabold text-[#002046]">{safeInstruments.length}</div>
          <p className="text-[10px] sm:text-[11px] text-slate-500 mt-0.5 truncate">Registered units</p>
        </div>

        {/* KPI 2: Active Applications */}
        <div
          onClick={onViewAllApplications}
          className="bg-white rounded-xl p-3.5 sm:p-4 border border-slate-200 shadow-xs hover:border-purple-300 cursor-pointer transition-all hover:shadow-sm group min-w-0"
        >
          <div className="flex items-center justify-between text-slate-500 mb-1.5 min-w-0">
            <span className="text-[10px] sm:text-[11px] font-semibold uppercase tracking-wider truncate">Active Apps</span>
            <span className="material-symbols-outlined text-purple-600 text-lg sm:text-xl shrink-0 group-hover:scale-110 transition-transform">hourglass_top</span>
          </div>
          <div className="text-xl sm:text-2xl font-extrabold text-purple-600">{activeApps.length}</div>
          <p className="text-[10px] sm:text-[11px] text-slate-500 mt-0.5 truncate">Under review</p>
        </div>

        {/* KPI 3: Pending Payments */}
        <div
          onClick={onViewAllApplications}
          className="bg-white rounded-xl p-3.5 sm:p-4 border border-slate-200 shadow-xs hover:border-amber-300 cursor-pointer transition-all hover:shadow-sm group min-w-0"
        >
          <div className="flex items-center justify-between text-slate-500 mb-1.5 min-w-0">
            <span className="text-[10px] sm:text-[11px] font-semibold uppercase tracking-wider truncate">Payments</span>
            <span className="material-symbols-outlined text-amber-600 text-lg sm:text-xl shrink-0 group-hover:scale-110 transition-transform">payments</span>
          </div>
          <div className="text-xl sm:text-2xl font-extrabold text-amber-600">{pendingPaymentApps.length}</div>
          <p className="text-[10px] sm:text-[11px] text-slate-500 mt-0.5 truncate">Fee pending</p>
        </div>

        {/* KPI 4: Under Verification */}
        <div
          onClick={onViewAllApplications}
          className="bg-white rounded-xl p-3.5 sm:p-4 border border-slate-200 shadow-xs hover:border-blue-300 cursor-pointer transition-all hover:shadow-sm group min-w-0"
        >
          <div className="flex items-center justify-between text-slate-500 mb-1.5 min-w-0">
            <span className="text-[10px] sm:text-[11px] font-semibold uppercase tracking-wider truncate">In Testing</span>
            <span className="material-symbols-outlined text-blue-600 text-lg sm:text-xl shrink-0 group-hover:scale-110 transition-transform">fact_check</span>
          </div>
          <div className="text-xl sm:text-2xl font-extrabold text-blue-600">{underVerification.length}</div>
          <p className="text-[10px] sm:text-[11px] text-slate-500 mt-0.5 truncate">In inspection</p>
        </div>

        {/* KPI 5: Certificates Available */}
        <div
          onClick={onViewAllCertificates}
          className="bg-white rounded-xl p-3.5 sm:p-4 border border-slate-200 shadow-xs hover:border-emerald-300 cursor-pointer transition-all hover:shadow-sm group col-span-2 sm:col-span-1 min-w-0"
        >
          <div className="flex items-center justify-between text-slate-500 mb-1.5 min-w-0">
            <span className="text-[10px] sm:text-[11px] font-semibold uppercase tracking-wider truncate">Certificates</span>
            <span className="material-symbols-outlined text-emerald-600 text-lg sm:text-xl shrink-0 group-hover:scale-110 transition-transform">workspace_premium</span>
          </div>
          <div className="text-xl sm:text-2xl font-extrabold text-emerald-600">{safeCertificates.length || approvedApps.length}</div>
          <p className="text-[10px] sm:text-[11px] text-slate-500 mt-0.5 truncate">Issued credentials</p>
        </div>
      </div>

      {/* 4. Quick Modules Navigation Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <button
          onClick={onOpenAddModal}
          className="p-4 bg-white rounded-xl border border-slate-200 hover:border-primary hover:bg-slate-50/80 transition-all text-left group cursor-pointer flex items-center gap-3 shadow-2xs"
        >
          <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
            <span className="material-symbols-outlined text-xl">add_circle</span>
          </div>
          <div>
            <h4 className="text-xs font-bold text-slate-900 group-hover:text-primary transition-colors">Register Instrument</h4>
            <p className="text-[11px] text-slate-500">Add new equipment</p>
          </div>
        </button>

        <button
          onClick={() => handleApplyClick(null)}
          className="p-4 bg-white rounded-xl border border-slate-200 hover:border-amber-500 hover:bg-amber-50/50 transition-all text-left group cursor-pointer flex items-center gap-3 shadow-2xs"
        >
          <div className="w-10 h-10 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
            <span className="material-symbols-outlined text-xl">post_add</span>
          </div>
          <div>
            <h4 className="text-xs font-bold text-slate-900 group-hover:text-amber-800 transition-colors">Apply for Verification</h4>
            <p className="text-[11px] text-slate-500">Submit new application</p>
          </div>
        </button>

        <button
          onClick={onViewAllApplications}
          className="p-4 bg-white rounded-xl border border-slate-200 hover:border-purple-500 hover:bg-purple-50/50 transition-all text-left group cursor-pointer flex items-center gap-3 shadow-2xs"
        >
          <div className="w-10 h-10 rounded-lg bg-purple-50 text-purple-700 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
            <span className="material-symbols-outlined text-xl">receipt_long</span>
          </div>
          <div>
            <h4 className="text-xs font-bold text-slate-900 group-hover:text-purple-800 transition-colors">View Applications</h4>
            <p className="text-[11px] text-slate-500">Track application status</p>
          </div>
        </button>

        <button
          onClick={onViewAllCertificates}
          className="p-4 bg-white rounded-xl border border-slate-200 hover:border-emerald-500 hover:bg-emerald-50/50 transition-all text-left group cursor-pointer flex items-center gap-3 shadow-2xs"
        >
          <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
            <span className="material-symbols-outlined text-xl">workspace_premium</span>
          </div>
          <div>
            <h4 className="text-xs font-bold text-slate-900 group-hover:text-emerald-800 transition-colors">View Certificates</h4>
            <p className="text-[11px] text-slate-500">Download compliance QR</p>
          </div>
        </button>
      </div>

      {/* 5. Recent Applications Summary List (Limited to 5 items) */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between gap-3 bg-slate-50/50">
          <div>
            <h2 className="text-sm font-bold text-slate-900">Recent Applications</h2>
            <p className="text-xs text-slate-500 mt-0.5">Quick summary of your latest verification requests</p>
          </div>
          {onViewAllApplications && (
            <button
              onClick={onViewAllApplications}
              className="text-xs font-bold text-primary hover:underline flex items-center gap-1 cursor-pointer"
            >
              <span>View All ({safeApplications.length})</span>
              <span className="material-symbols-outlined text-sm">arrow_forward</span>
            </button>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs min-w-[640px]">
            <thead className="bg-slate-100 text-slate-600 font-semibold border-b border-slate-200">
              <tr>
                <th className="px-5 py-3">Application No</th>
                <th className="px-5 py-3">Instrument</th>
                <th className="px-5 py-3">Mode</th>
                <th className="px-5 py-3">Date</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-slate-700">
              {recentApplications.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-slate-400">
                    <span className="material-symbols-outlined text-2xl mb-1 text-slate-300 block">inbox</span>
                    No applications submitted yet.
                  </td>
                </tr>
              ) : (
                recentApplications.map((app) => (
                  <tr key={app.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-5 py-3 font-mono font-bold text-[#002046]">
                      {app.application_no}
                    </td>
                    <td className="px-5 py-3">
                      <span className="font-bold text-slate-900 block">{app.manufacturer} {app.model}</span>
                      <span className="font-mono text-[10px] text-slate-500">SN: {app.serial_number}</span>
                    </td>
                    <td className="px-5 py-3 text-slate-600">
                      {app.verification_mode === 'IN_SITU' ? 'In-situ' : 'Centre'}
                    </td>
                    <td className="px-5 py-3 text-slate-600">
                      {app.created_at ? new Date(app.created_at).toLocaleDateString() : 'N/A'}
                    </td>
                    <td className="px-5 py-3">
                      <StatusBadge status={app.status} />
                    </td>
                    <td className="px-5 py-3 text-right">
                      <button
                        onClick={() => {
                          if (onSelectApplication) {
                            onSelectApplication(app.id);
                          } else {
                            setSelectedDetailApp(app);
                          }
                        }}
                        className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg text-[11px] font-bold transition-all cursor-pointer inline-flex items-center gap-1"
                      >
                        <span className="material-symbols-outlined text-xs">visibility</span>
                        <span>Details</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Application Details Modal */}
      {selectedDetailApp && (
        <ApplicationDetailsModal
          application={selectedDetailApp}
          onClose={() => setSelectedDetailApp(null)}
          onResubmit={() => {
            const app = selectedDetailApp;
            setSelectedDetailApp(null);
            if (onResubmitApplication) onResubmitApplication(app);
          }}
          onPay={() => {
            const app = selectedDetailApp;
            setSelectedDetailApp(null);
            if (onPayApplication) onPayApplication(app);
          }}
        />
      )}
    </div>
  );
}
