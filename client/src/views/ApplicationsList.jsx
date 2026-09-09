import React, { useState } from 'react';
import StatusBadge from '../components/StatusBadge';
import ApplicationDetailsModal from '../components/ApplicationDetailsModal';

export default function ApplicationsList({
  applications = [],
  onSelectApplication,
  onOpenApplyModal,
  onSelectCertificate,
  onResubmitApplication,
  onPayApplication
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [selectedDetailApp, setSelectedDetailApp] = useState(null);

  const safeApplications = Array.isArray(applications) ? applications : [];

  const filteredApps = safeApplications.filter((app) => {
    const matchesSearch =
      !searchTerm ||
      app.application_no?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      app.manufacturer?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      app.model?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      app.serial_number?.toLowerCase().includes(searchTerm.toLowerCase());

    let matchesStatus = true;
    if (statusFilter === 'ALL') {
      matchesStatus = true;
    } else if (statusFilter === 'PENDING') {
      matchesStatus = ['SUBMITTED', 'PENDING_VERIFICATION', 'UNDER_REVIEW', 'ASSIGNED', 'IN_PROGRESS', 'DOCUMENT_VERIFIED', 'INSPECTION_SCHEDULED'].includes(app.status);
    } else if (statusFilter === 'PAYMENT_PENDING') {
      matchesStatus = app.status === 'PAYMENT_PENDING' || app.fee_status === 'PENDING' || app.payment?.payment_status === 'PENDING';
    } else if (statusFilter === 'RETURNED') {
      matchesStatus = app.status === 'RETURNED';
    } else if (statusFilter === 'COMPLETED') {
      matchesStatus = ['VERIFICATION_COMPLETED', 'CERTIFICATE_ISSUED', 'APPROVED'].includes(app.status);
    } else if (statusFilter === 'REJECTED') {
      matchesStatus = app.status === 'VERIFICATION_FAILED' || app.status === 'REJECTED';
    }

    return matchesSearch && matchesStatus;
  });

  const returnedCount = safeApplications.filter(a => a.status === 'RETURNED').length;
  const paymentPendingCount = safeApplications.filter(a => a.status === 'PAYMENT_PENDING' || a.fee_status === 'PENDING' || a.payment?.payment_status === 'PENDING').length;

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-slate-900">Verification Applications & Tracking</h1>
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#002046] text-white">
              {safeApplications.length} Total
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Monitor filed applications, statutory fee remittance, return clarifications, and verification decisions
          </p>
        </div>
        {onOpenApplyModal && (
          <button
            onClick={() => onOpenApplyModal(null)}
            className="px-4 py-2.5 bg-[#002046] hover:bg-[#1b365d] text-white font-bold rounded-xl text-xs shadow-xs transition-all flex items-center gap-1.5 self-start sm:self-auto cursor-pointer"
          >
            <span className="material-symbols-outlined text-[16px]">add_circle</span>
            Apply for Verification
          </button>
        )}
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Status Filter Chips */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 text-xs">
            {[
              { key: 'ALL', label: 'All Applications', badge: null },
              { key: 'PENDING', label: 'Under Review', badge: null },
              { key: 'PAYMENT_PENDING', label: 'Payment Pending', badge: paymentPendingCount > 0 ? paymentPendingCount : null, color: 'bg-amber-100 text-amber-900' },
              { key: 'RETURNED', label: 'Returned', badge: returnedCount > 0 ? returnedCount : null, color: 'bg-rose-100 text-rose-900 font-bold' },
              { key: 'COMPLETED', label: 'Approved / Certified', badge: null },
              { key: 'REJECTED', label: 'Rejected', badge: null }
            ].map(tab => (
              <button
                key={tab.key}
                onClick={() => setStatusFilter(tab.key)}
                className={`px-3 py-1.5 rounded-lg font-semibold text-xs whitespace-nowrap transition-colors flex items-center gap-1.5 cursor-pointer ${
                  statusFilter === tab.key
                    ? 'bg-[#002046] text-white shadow-2xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                <span>{tab.label}</span>
                {tab.badge && (
                  <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${statusFilter === tab.key ? 'bg-white text-slate-900 font-bold' : tab.color}`}>
                    {tab.badge}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Search Box */}
          <div className="relative min-w-[240px]">
            <span className="material-symbols-outlined absolute left-3 top-2 text-slate-400 text-base pointer-events-none">
              search
            </span>
            <input
              type="text"
              placeholder="Search by APP No, Model, SN..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-lg outline-none focus:border-primary font-mono"
            />
          </div>
        </div>
      </div>

      {/* Applications Table (LMOMS Format: Application ID, Instrument, Verification Type, Applied Date, Total Fee, Payment Status, Application Status, Assigned Office/Verifier, Action) */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs min-w-[1000px]">
            <thead className="bg-slate-100 text-slate-700 font-semibold border-b border-slate-200 uppercase tracking-wider text-[11px]">
              <tr>
                <th className="px-5 py-3.5">Application ID</th>
                <th className="px-5 py-3.5">Instrument & SN</th>
                <th className="px-5 py-3.5">Verification Type</th>
                <th className="px-5 py-3.5">Applied Date</th>
                <th className="px-5 py-3.5">Total Fee</th>
                <th className="px-5 py-3.5">Payment Status</th>
                <th className="px-5 py-3.5">Application Status</th>
                <th className="px-5 py-3.5">Assigned Office / Verifier</th>
                <th className="px-5 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-slate-700">
              {filteredApps.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-6 py-12 text-center text-slate-400">
                    <span className="material-symbols-outlined text-3xl mb-1 text-slate-300 block">inbox</span>
                    No applications match the selected filter criteria.
                  </td>
                </tr>
              ) : (
                filteredApps.map((app) => {
                  const isApproved = ['VERIFICATION_COMPLETED', 'CERTIFICATE_ISSUED', 'APPROVED'].includes(app.status);
                  const isReturned = app.status === 'RETURNED';
                  const isPaymentPending = app.status === 'PAYMENT_PENDING' || app.fee_status === 'PENDING' || app.payment?.payment_status === 'PENDING';
                  const isPaid = app.fee_status === 'PAID' || app.payment?.payment_status === 'PAID' || app.payment?.payment_status === 'PAYMENT_VERIFIED';

                  const totalFee = app.fee_breakdown?.total_fee || app.payment?.amount || app.amount || 300;

                  return (
                    <React.Fragment key={app.id}>
                      <tr className={`hover:bg-slate-50/90 transition-colors border-b border-slate-100 ${isReturned ? 'bg-rose-50/20' : ''}`}>
                        {/* 1. Application ID */}
                        <td className="px-5 py-3.5 align-middle">
                          <button
                            onClick={() => setSelectedDetailApp(app)}
                            className="font-mono font-bold text-[#002046] hover:text-blue-700 hover:underline block text-xs cursor-pointer text-left"
                            title="Click to view full application particulars"
                          >
                            {app.application_no}
                          </button>
                          <span className="font-mono text-[10px] text-slate-400 block">ID: {app.id}</span>
                        </td>

                        {/* 2. Instrument & SN */}
                        <td className="px-5 py-3.5 align-middle">
                          <span className="font-bold text-slate-900 block truncate max-w-[200px]" title={`${app.manufacturer} ${app.model}`}>
                            {app.manufacturer} {app.model}
                          </span>
                          <span className="font-mono text-[11px] text-slate-500 block">SN: {app.serial_number}</span>
                          {app.location && (
                            <span className="text-[10px] text-slate-400 truncate max-w-[180px] block" title={app.location}>
                              {app.location}
                            </span>
                          )}
                        </td>

                        {/* 3. Verification Type & Mode */}
                        <td className="px-5 py-3.5 align-middle">
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-slate-100 text-slate-800 inline-block">
                            {app.verification_type === 'RE_VERIFICATION' || app.request_type === 'RE_VERIFICATION'
                              ? 'Re-Verification'
                              : 'Original Verification'}
                          </span>
                          <span className="text-[10px] font-medium text-slate-500 block mt-0.5">
                            {app.verification_mode === 'IN_SITU' ? 'In-situ (On-Site)' : 'Camp / Centre Presentation'}
                          </span>
                        </td>

                        {/* 4. Applied Date */}
                        <td className="px-5 py-3.5 align-middle text-slate-600 whitespace-nowrap">
                          <div className="font-medium text-slate-800">{new Date(app.created_at).toLocaleDateString()}</div>
                          <div className="text-[10px] text-slate-400">{new Date(app.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                        </td>

                        {/* 5. Total Fee */}
                        <td className="px-5 py-3.5 align-middle whitespace-nowrap">
                          <span className="font-mono font-bold text-slate-900 text-xs block">
                            ₹{Number(totalFee).toFixed(2)}
                          </span>
                          <span className="text-[10px] text-slate-400 block">Sched. V</span>
                        </td>

                        {/* 6. Payment Status */}
                        <td className="px-5 py-3.5 align-middle whitespace-nowrap">
                          {isPaid ? (
                            <div>
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                                <span className="material-symbols-outlined text-[12px]">check_circle</span>
                                PAID
                              </span>
                              {app.payment?.transaction_id && (
                                <span className="font-mono text-[9px] text-slate-400 block mt-0.5 truncate max-w-[110px]" title={app.payment.transaction_id}>
                                  {app.payment.transaction_id}
                                </span>
                              )}
                            </div>
                          ) : isPaymentPending ? (
                            <div className="space-y-1">
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
                                <span className="material-symbols-outlined text-[12px]">pending</span>
                                PENDING
                              </span>
                              {onPayApplication && (
                                <button
                                  onClick={() => onPayApplication(app)}
                                  className="block px-2.5 py-0.5 rounded bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[10px] transition-all shadow-2xs cursor-pointer"
                                >
                                  Pay Now
                                </button>
                              )}
                            </div>
                          ) : (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-600">
                              UNPAID
                            </span>
                          )}
                        </td>

                        {/* 7. Application Status */}
                        <td className="px-5 py-3.5 align-middle">
                          <StatusBadge status={app.status} />
                        </td>

                        {/* 8. Assigned Office / Verifier */}
                        <td className="px-5 py-3.5 align-middle text-slate-700">
                          <span className="font-semibold block text-slate-900 text-xs truncate max-w-[160px]" title={app.assigned_to_name || 'Pending Allocation'}>
                            {app.assigned_to_name || 'Pending Allocation'}
                          </span>
                          <span className="text-[10px] text-slate-400 block truncate max-w-[160px]" title={app.trader_jurisdiction || 'District Legal Metrology'}>
                            {app.trader_jurisdiction || 'District Legal Metrology'}
                          </span>
                        </td>

                        {/* 9. Actions */}
                        <td className="px-5 py-3.5 align-middle text-right space-x-1.5 whitespace-nowrap">
                          {isReturned ? (
                            <>
                              <button
                                onClick={() => setSelectedDetailApp(app)}
                                className="px-2.5 py-1 text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded text-xs font-semibold transition-all cursor-pointer"
                              >
                                Details
                              </button>
                              <button
                                onClick={() => onResubmitApplication ? onResubmitApplication(app) : onSelectApplication(app.id)}
                                className="px-3 py-1 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold rounded text-xs transition-all inline-flex items-center gap-1 shadow-2xs cursor-pointer"
                              >
                                <span className="material-symbols-outlined text-sm font-bold">replay</span>
                                Resubmit
                              </button>
                            </>
                          ) : isPaymentPending ? (
                            <>
                              <button
                                onClick={() => setSelectedDetailApp(app)}
                                className="px-2.5 py-1 text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded text-xs font-semibold transition-all cursor-pointer"
                              >
                                Details
                              </button>
                              <button
                                onClick={() => onPayApplication ? onPayApplication(app) : onSelectApplication(app.id)}
                                className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded text-xs transition-all inline-flex items-center gap-1 shadow-2xs cursor-pointer"
                              >
                                <span className="material-symbols-outlined text-sm font-bold">payments</span>
                                Pay
                              </button>
                            </>
                          ) : isApproved ? (
                            <>
                              <button
                                onClick={() => setSelectedDetailApp(app)}
                                className="px-2.5 py-1 text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded text-xs font-semibold transition-all cursor-pointer"
                              >
                                Details
                              </button>
                              {(app.certificate_id || app.status === 'CERTIFICATE_ISSUED') && onSelectCertificate && (
                                <button
                                  onClick={() => onSelectCertificate(app.certificate_id)}
                                  className="px-3 py-1 bg-emerald-700 hover:bg-emerald-800 text-white rounded font-bold text-xs transition-all inline-flex items-center gap-1 shadow-2xs cursor-pointer"
                                >
                                  <span className="material-symbols-outlined text-sm">workspace_premium</span>
                                  Certificate
                                </button>
                              )}
                            </>
                          ) : (
                            <button
                              onClick={() => setSelectedDetailApp(app)}
                              className="px-3 py-1 bg-[#002046] hover:bg-[#1b365d] text-white rounded font-bold text-xs transition-all cursor-pointer"
                            >
                              Details
                            </button>
                          )}
                        </td>
                      </tr>

                      {/* Full-width Return Reason Notice Banner Row */}
                      {isReturned && (
                        <tr className="bg-rose-50/90 border-b-2 border-rose-300">
                          <td colSpan={9} className="px-5 py-3">
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
                              <div className="flex items-start gap-2.5 text-rose-950 max-w-4xl">
                                <div className="w-7 h-7 rounded-lg bg-rose-200 text-rose-800 flex items-center justify-center shrink-0 mt-0.5">
                                  <span className="material-symbols-outlined text-base font-bold">assignment_return</span>
                                </div>
                                <div className="space-y-0.5">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <strong className="font-extrabold text-rose-950 text-xs">
                                      Statutory Return Notice for Application {app.application_no}:
                                    </strong>
                                    <span className="px-2 py-0.2 rounded text-[10px] font-bold bg-rose-200 text-rose-900 uppercase">
                                      Action Required
                                    </span>
                                    <span className="text-slate-600 text-[11px]">
                                      ({app.manufacturer} {app.model} • SN: {app.serial_number})
                                    </span>
                                  </div>
                                  <p className="text-rose-900 text-xs leading-relaxed">
                                    <strong>Officer's Return Remarks:</strong> "{app.return_reason || 'Previous calibration certificate illegible and commercial invoice is incomplete. Please re-upload verified documents.'}"
                                  </p>
                                </div>
                              </div>
                              <div className="flex items-center gap-2 shrink-0 self-start md:self-auto">
                                <button
                                  onClick={() => setSelectedDetailApp(app)}
                                  className="px-3 py-1.5 bg-white hover:bg-rose-100 text-rose-900 border border-rose-300 rounded-lg text-xs font-bold transition-all shadow-2xs cursor-pointer flex items-center gap-1"
                                >
                                  <span className="material-symbols-outlined text-sm">visibility</span>
                                  View Details
                                </button>
                                {onResubmitApplication && (
                                  <button
                                    onClick={() => onResubmitApplication(app)}
                                    className="px-3.5 py-1.5 bg-rose-700 hover:bg-rose-800 text-white font-bold rounded-lg text-xs shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
                                  >
                                    <span className="material-symbols-outlined text-sm">replay</span>
                                    Resubmit Application
                                  </button>
                                )}
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Application Details Modal */}
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
