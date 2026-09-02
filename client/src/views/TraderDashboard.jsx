import React from 'react';
import StatusBadge from '../components/StatusBadge';

export default function TraderDashboard({
  currentUser,
  instruments,
  applications,
  certificates,
  onOpenAddModal,
  onSelectInstrument,
  onSelectApplication,
  onSelectCertificate,
  onRequestVerification,
  onOpenQR,
  onViewAllInstruments
}) {
  const expiring = instruments.filter(i => i.status === 'EXPIRING');
  const verifiedCount = instruments.filter(i => i.status === 'VERIFIED').length;
  const pendingApps = applications.filter(a => !['CERTIFICATE_ISSUED', 'FAILED'].includes(a.status));

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* 1. Welcome Banner */}
      <div className="bg-gradient-to-r from-[#002046] to-[#1b365d] rounded-2xl p-6 md:p-8 text-white shadow-md relative overflow-hidden">
        <div className="absolute -right-8 -bottom-8 opacity-10 text-[200px] leading-none select-none pointer-events-none">
          <span className="material-symbols-outlined">balance</span>
        </div>
        <div className="relative z-10 max-w-2xl">
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-white/10 text-amber-300 text-xs font-semibold backdrop-blur-xs mb-3">
            <span className="material-symbols-outlined text-[14px]">storefront</span>
            Verified Commercial Establishment
          </span>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-white">
            Welcome back, {currentUser?.full_name}
          </h1>
          <p className="text-sm text-slate-300 mt-2 leading-relaxed">
            Manage your weighing and measuring instruments, submit verification applications, and track statutory compliance certificates under the Legal Metrology Act.
          </p>
          <div className="flex flex-wrap items-center gap-3 mt-5">
            <button
              onClick={onOpenAddModal}
              className="px-4 py-2.5 bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold rounded-lg text-xs tracking-wide uppercase transition-all shadow-sm flex items-center gap-2"
            >
              <span className="material-symbols-outlined text-sm font-bold">add</span>
              Register New Instrument
            </button>
            <button
              onClick={onViewAllInstruments || (() => onSelectInstrument(instruments[0]?.id))}
              className="px-4 py-2.5 bg-white/10 hover:bg-white/20 text-white font-semibold rounded-lg text-xs transition-all border border-white/20 flex items-center gap-2"
            >
              <span className="material-symbols-outlined text-sm">inventory_2</span>
              View All Instruments ({instruments.length})
            </button>
          </div>
        </div>
      </div>

      {/* 2. Expiry Warning Alert (Stitch Screen 32fcbb732e8948b5b67c875559d85ddb) */}
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
                Instrument <strong className="font-semibold">{expiring[0].manufacturer} {expiring[0].model} (SN: {expiring[0].serial_number})</strong> verification expires in <span className="font-bold underline text-amber-950">15 days</span>. Please submit a re-verification request to avoid statutory penalties.
              </p>
            </div>
          </div>
          <button
            onClick={() => onRequestVerification(expiring[0].id)}
            className="px-4 py-2 bg-amber-700 hover:bg-amber-800 text-white rounded-lg text-xs font-bold shrink-0 transition-all shadow-xs flex items-center gap-1.5 self-end md:self-center"
          >
            <span className="material-symbols-outlined text-[16px]">published_with_changes</span>
            Apply for Re-verification
          </button>
        </div>
      )}

      {/* 3. Metric KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-3">
            <span className="text-xs font-semibold uppercase tracking-wider">Registered Instruments</span>
            <span className="material-symbols-outlined text-primary text-xl">scale</span>
          </div>
          <div className="text-2xl font-extrabold text-primary">{instruments.length}</div>
          <p className="text-[11px] text-slate-500 mt-1">Total instruments registered</p>
        </div>

        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-3">
            <span className="text-xs font-semibold uppercase tracking-wider">Valid Certificates</span>
            <span className="material-symbols-outlined text-emerald-600 text-xl">verified</span>
          </div>
          <div className="text-2xl font-extrabold text-emerald-600">{verifiedCount}</div>
          <p className="text-[11px] text-slate-500 mt-1">Compliance certified & valid</p>
        </div>

        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-3">
            <span className="text-xs font-semibold uppercase tracking-wider">Pending Requests</span>
            <span className="material-symbols-outlined text-purple-600 text-xl">hourglass_top</span>
          </div>
          <div className="text-2xl font-extrabold text-purple-600">{pendingApps.length}</div>
          <p className="text-[11px] text-slate-500 mt-1">Verification / re-verification pending</p>
        </div>

        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-3">
            <span className="text-xs font-semibold uppercase tracking-wider">Certificates</span>
            <span className="material-symbols-outlined text-sky-600 text-xl">workspace_premium</span>
          </div>
          <div className="text-2xl font-extrabold text-sky-600">{certificates.length}</div>
          <p className="text-[11px] text-slate-500 mt-1">Total certificates issued</p>
        </div>
      </div>

      {/* 4. Active Instruments Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/50">
          <div>
            <h2 className="text-base font-bold text-slate-900">Registered Instruments</h2>
            <p className="text-xs text-slate-500 mt-0.5">Commercial instruments subject to statutory verification</p>
          </div>
          <button
            onClick={onOpenAddModal}
            className="text-xs font-bold text-primary hover:text-primary-container flex items-center gap-1"
          >
            <span className="material-symbols-outlined text-[16px]">add</span>
            + Add New
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
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
              {instruments.map((inst) => {
                // Find latest active application for this instrument
                const relatedApp = applications.find(a => a.instrument_id === inst.id);

                // Differentiate verification pending, under review, assigned, verification in progress, verified, failed, expired, application rejected
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
                          onClick={() => onRequestVerification(inst.id)}
                          className="px-3 py-1 bg-primary text-white rounded text-xs font-bold hover:bg-primary-container transition-all"
                        >
                          Request Verification
                        </button>
                      )}
                      {isExpiring && (
                        <button
                          onClick={() => onRequestVerification(inst.id)}
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
    </div>
  );
}
