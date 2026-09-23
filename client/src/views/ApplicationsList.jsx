import React, { useState, useMemo } from 'react';
import StatusBadge from '../components/StatusBadge';
import ApplicationDetailsModal from '../components/ApplicationDetailsModal';
import ListToolbar from '../components/ListToolbar';
import PageHeader from '../components/PageHeader';

export default function ApplicationsList({
  applications = [],
  currentRole = null,
  onSelectApplication,
  onAssignApplication,
  onReviewApplication,
  onOpenApplyModal,
  onSelectCertificate,
  onResubmitApplication,
  onPayApplication
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [modeFilter, setModeFilter] = useState('ALL');
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [sortOption, setSortOption] = useState('NEWEST');
  const [selectedDetailApp, setSelectedDetailApp] = useState(null);

  const isAuthority = currentRole === 'AUTHORITY' || currentRole === 'PLATFORM_ADMIN';
  const isTrader = currentRole === 'TRADER';
  const [allocationFilter, setAllocationFilter] = useState('ALL');
  const safeApplications = Array.isArray(applications) ? applications : [];

  const returnedCount = safeApplications.filter(a => a.status === 'RETURNED').length;
  const paymentPendingCount = safeApplications.filter(a => a.status === 'PAYMENT_PENDING' || a.fee_status === 'PENDING' || a.payment?.payment_status === 'PENDING').length;

  const filteredApps = useMemo(() => {
    return safeApplications.filter((app) => {
      const q = searchTerm.toLowerCase().trim();
      const matchesSearch =
        !q ||
        app.application_no?.toLowerCase().includes(q) ||
        app.manufacturer?.toLowerCase().includes(q) ||
        app.model?.toLowerCase().includes(q) ||
        app.serial_number?.toLowerCase().includes(q) ||
        app.trader_name?.toLowerCase().includes(q) ||
        app.location?.toLowerCase().includes(q) ||
        app.assigned_to_name?.toLowerCase().includes(q);

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

      let matchesMode = true;
      if (modeFilter !== 'ALL') {
        matchesMode = app.verification_mode === modeFilter;
      }

      let matchesType = true;
      if (typeFilter !== 'ALL') {
        const isReVer = app.verification_type === 'RE_VERIFICATION' || app.request_type === 'RE_VERIFICATION';
        matchesType = typeFilter === 'RE_VERIFICATION' ? isReVer : !isReVer;
      }

      let matchesAllocation = true;
      if (allocationFilter === 'UNASSIGNED') {
        matchesAllocation = !app.assigned_id;
      } else if (allocationFilter === 'ASSIGNED') {
        matchesAllocation = Boolean(app.assigned_id);
      }

      return matchesSearch && matchesStatus && matchesMode && matchesType && matchesAllocation;
    }).sort((a, b) => {
      if (sortOption === 'NEWEST') {
        return new Date(b.created_at || 0) - new Date(a.created_at || 0);
      }
      if (sortOption === 'OLDEST') {
        return new Date(a.created_at || 0) - new Date(b.created_at || 0);
      }
      if (sortOption === 'FEE_DESC') {
        const feeA = a.fee_breakdown?.total_fee || a.payment?.amount || 0;
        const feeB = b.fee_breakdown?.total_fee || b.payment?.amount || 0;
        return feeB - feeA;
      }
      if (sortOption === 'APP_NO') {
        return (a.application_no || '').localeCompare(b.application_no || '');
      }
      return 0;
    });
  }, [safeApplications, searchTerm, statusFilter, modeFilter, typeFilter, allocationFilter, sortOption]);

  const handleResetFilters = () => {
    setSearchTerm('');
    setStatusFilter('ALL');
    setModeFilter('ALL');
    setTypeFilter('ALL');
    setAllocationFilter('ALL');
    setSortOption('NEWEST');
  };

  return (
    <div className="space-y-5 animate-in fade-in duration-300">
      {/* Page Header */}
      <PageHeader
        icon={isAuthority ? "assignment" : "receipt_long"}
        title={isAuthority ? "Statutory Applications & Allocation Queue" : "Verification Applications & Tracking"}
        subtitle={
          isAuthority
            ? "Review filed verification applications, scrutinize compliance, and assign Field Officers or GATC Testing Laboratories"
            : "Monitor filed applications, statutory fee remittance, return clarifications, and verification decisions"
        }
        badge={{ text: `${safeApplications.length} Total`, variant: 'primary' }}
        actions={
          !isAuthority && onOpenApplyModal && (
            <button
              onClick={() => onOpenApplyModal(null)}
              className="btn btn-primary btn-sm"
            >
              <span className="material-symbols-outlined text-[15px]">add_circle</span>
              Apply for Verification
            </button>
          )
        }
      />

      {/* Filter and Search Bar using ListToolbar */}
      <ListToolbar
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        searchPlaceholder="Search by APP No, Model, SN, Trader..."
        filters={[
          {
            id: 'status',
            label: 'Status',
            value: statusFilter,
            onChange: setStatusFilter,
            options: [
              { label: 'All Applications', value: 'ALL' },
              { label: 'Under Review', value: 'PENDING' },
              { label: 'Payment Pending', value: 'PAYMENT_PENDING', badge: paymentPendingCount > 0 ? paymentPendingCount : null },
              { label: 'Returned for Clarification', value: 'RETURNED', badge: returnedCount > 0 ? returnedCount : null },
              { label: 'Approved / Certified', value: 'COMPLETED' },
              { label: 'Rejected', value: 'REJECTED' }
            ]
          },
          {
            id: 'type',
            label: 'Type',
            value: typeFilter,
            onChange: setTypeFilter,
            options: [
              { label: 'All Verification Types', value: 'ALL' },
              { label: 'Original Verification', value: 'ORIGINAL' },
              { label: 'Re-Verification', value: 'RE_VERIFICATION' }
            ]
          },
          {
            id: 'mode',
            label: 'Mode',
            value: modeFilter,
            onChange: setModeFilter,
            options: [
              { label: 'All Modes', value: 'ALL' },
              { label: 'In-Situ (On-Site)', value: 'IN_SITU' },
              { label: 'Camp / Presentation', value: 'CAMP' },
              { label: 'GATC Lab Testing', value: 'GATC_LAB' }
            ]
          },
          ...(isAuthority ? [{
            id: 'allocation',
            label: 'Allocation',
            value: allocationFilter,
            onChange: setAllocationFilter,
            options: [
              { label: 'All Allocation', value: 'ALL' },
              { label: 'Needs Allocation (Unassigned)', value: 'UNASSIGNED' },
              { label: 'Assigned to Officer / Lab', value: 'ASSIGNED' }
            ]
          }] : [])
        ]}
        sortOptions={[
          { label: 'Newest Applied', value: 'NEWEST' },
          { label: 'Oldest Applied', value: 'OLDEST' },
          { label: 'Fee: High to Low', value: 'FEE_DESC' },
          { label: 'Application ID', value: 'APP_NO' }
        ]}
        sortValue={sortOption}
        onSortChange={setSortOption}
        onReset={handleResetFilters}
        totalCount={safeApplications.length}
        filteredCount={filteredApps.length}
      />

      {/* Applications Table (LMOMS Format) */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="data-table min-w-[1000px]">
            <thead>
              <tr>
                <th>Application ID</th>
                <th>Instrument & SN</th>
                <th>Verification Type</th>
                <th>Applied Date</th>
                <th>Total Fee</th>
                <th>Payment Status</th>
                <th>Application Status</th>
                <th>Assigned Office / Verifier</th>
                <th className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredApps.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-0">
                    <div className="empty-state">
                      <div className="empty-state-icon">
                        <span className="material-symbols-outlined text-3xl text-slate-400">receipt_long</span>
                      </div>
                      <p className="text-sm font-semibold text-slate-600 mb-1">No Applications Found</p>
                      <p className="text-xs text-slate-400 max-w-xs">
                        {searchTerm || statusFilter !== 'ALL'
                          ? 'No applications match the current search and filter criteria.'
                          : 'No applications filed yet. Click "Apply for Verification" to submit your first application.'}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredApps.map((app) => {
                  const isApproved = ['VERIFICATION_COMPLETED', 'CERTIFICATE_ISSUED', 'APPROVED'].includes(app.status);
                  const isReturned = app.status === 'RETURNED';
                  const isPaid = app.fee_status === 'PAID' || app.payment?.payment_status === 'PAID' || app.payment?.payment_status === 'PAYMENT_VERIFIED' || app.status === 'PAYMENT_VERIFIED' || isApproved;
                  const isPaymentPending = !isPaid && (app.status === 'PAYMENT_PENDING' || app.fee_status === 'PENDING' || app.payment?.payment_status === 'PENDING');

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
                          <span className="font-mono text-[10px] text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded inline-block mt-0.5">SN: {app.serial_number}</span>
                          {app.location && (
                            <span className="text-[10px] text-slate-400 truncate max-w-[180px] block mt-0.5" title={app.location}>
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
                              {isTrader && onPayApplication && (
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
                          {isAuthority ? (
                            /* AUTHORITY ACTIONS ON APPLICATIONS QUEUE */
                            <>
                              {(!app.assigned_id || ['SUBMITTED', 'UNDER_REVIEW', 'PAYMENT_VERIFIED', 'PENDING_VERIFICATION'].includes(app.status)) ? (
                                <>
                                  <button
                                    onClick={() => onAssignApplication ? onAssignApplication(app.id) : onSelectApplication(app.id)}
                                    className="px-3 py-1.5 bg-[#002046] hover:bg-[#001733] text-white font-bold rounded-lg text-xs transition-all inline-flex items-center gap-1.5 shadow-2xs cursor-pointer border border-[#002046]"
                                    title="Allocate to Field Officer or GATC Lab"
                                  >
                                    <span className="material-symbols-outlined text-sm text-amber-400 font-bold">person_add</span>
                                    <span>Assign Officer / GATC</span>
                                  </button>
                                  <button
                                    onClick={() => setSelectedDetailApp(app)}
                                    className="px-2.5 py-1.5 text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-lg text-xs font-semibold transition-all cursor-pointer"
                                  >
                                    Details
                                  </button>
                                </>
                              ) : ['REPORT_SUBMITTED', 'VERIFICATION_COMPLETED'].includes(app.status) ? (
                                <>
                                  <button
                                    onClick={() => onReviewApplication ? onReviewApplication(app.id) : onSelectApplication(app.id)}
                                    className="px-3 py-1.5 bg-indigo-700 hover:bg-indigo-800 text-white font-bold rounded-lg text-xs transition-all inline-flex items-center gap-1.5 shadow-2xs cursor-pointer"
                                    title="Review submitted inspection report and issue certificate"
                                  >
                                    <span className="material-symbols-outlined text-sm text-amber-300">rate_review</span>
                                    <span>Review & Issue</span>
                                  </button>
                                  <button
                                    onClick={() => setSelectedDetailApp(app)}
                                    className="px-2.5 py-1.5 text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-lg text-xs font-semibold transition-all cursor-pointer"
                                  >
                                    Details
                                  </button>
                                </>
                              ) : ['ASSIGNED', 'IN_PROGRESS', 'SCHEDULED', 'INSPECTION_SCHEDULED'].includes(app.status) ? (
                                <>
                                  <button
                                    onClick={() => onAssignApplication ? onAssignApplication(app.id) : onSelectApplication(app.id)}
                                    className="px-2.5 py-1.5 bg-blue-50 hover:bg-blue-100 text-[#002046] border border-blue-200 font-bold rounded-lg text-xs transition-all inline-flex items-center gap-1 cursor-pointer shadow-2xs"
                                    title="Reassign or change assigned officer / lab"
                                  >
                                    <span className="material-symbols-outlined text-sm text-blue-700">edit_attributes</span>
                                    <span>Reassign</span>
                                  </button>
                                  <button
                                    onClick={() => onReviewApplication ? onReviewApplication(app.id) : onSelectApplication(app.id)}
                                    className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300 font-bold rounded-lg text-xs transition-all inline-flex items-center gap-1 cursor-pointer"
                                  >
                                    <span>Review</span>
                                  </button>
                                  <button
                                    onClick={() => setSelectedDetailApp(app)}
                                    className="px-2.5 py-1.5 text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-lg text-xs font-semibold transition-all cursor-pointer"
                                  >
                                    Details
                                  </button>
                                </>
                              ) : isApproved ? (
                                <>
                                  {(app.certificate_id || app.status === 'CERTIFICATE_ISSUED') && onSelectCertificate && (
                                    <button
                                      onClick={() => onSelectCertificate(app.certificate_id)}
                                      className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg font-bold text-xs transition-all inline-flex items-center gap-1 shadow-2xs cursor-pointer"
                                    >
                                      <span className="material-symbols-outlined text-sm">workspace_premium</span>
                                      Certificate
                                    </button>
                                  )}
                                  <button
                                    onClick={() => setSelectedDetailApp(app)}
                                    className="px-2.5 py-1.5 text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-lg text-xs font-semibold transition-all cursor-pointer"
                                  >
                                    Details
                                  </button>
                                </>
                              ) : (
                                <>
                                  <button
                                    onClick={() => onSelectApplication(app.id)}
                                    className="px-3 py-1.5 bg-[#002046] hover:bg-[#1b365d] text-white rounded-lg font-bold text-xs transition-all inline-flex items-center gap-1 cursor-pointer"
                                  >
                                    <span className="material-symbols-outlined text-xs">visibility</span>
                                    <span>Review</span>
                                  </button>
                                  <button
                                    onClick={() => setSelectedDetailApp(app)}
                                    className="px-2.5 py-1.5 text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-lg text-xs font-semibold transition-all cursor-pointer"
                                  >
                                    Details
                                  </button>
                                </>
                              )}
                            </>
                          ) : (
                            /* TRADER ACTIONS */
                            <>
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
                                  {onPayApplication ? (
                                    <button
                                      onClick={() => onPayApplication(app)}
                                      className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded text-xs transition-all inline-flex items-center gap-1 shadow-2xs cursor-pointer"
                                    >
                                      <span className="material-symbols-outlined text-sm font-bold">payments</span>
                                      Pay
                                    </button>
                                  ) : (
                                    <button
                                      onClick={() => onSelectApplication(app.id)}
                                      className="px-3 py-1 bg-[#002046] hover:bg-[#1b365d] text-white font-bold rounded text-xs transition-all inline-flex items-center gap-1 shadow-2xs cursor-pointer"
                                    >
                                      <span className="material-symbols-outlined text-sm font-bold">visibility</span>
                                      Review
                                    </button>
                                  )}
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
                            </>
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
        currentRole={currentRole}
        onClose={() => setSelectedDetailApp(null)}
        onAssignApplication={(id) => {
          setSelectedDetailApp(null);
          if (onAssignApplication) onAssignApplication(id);
        }}
        onReviewApplication={(id) => {
          setSelectedDetailApp(null);
          if (onReviewApplication) onReviewApplication(id);
        }}
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
