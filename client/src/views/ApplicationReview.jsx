import React, { useEffect, useState } from 'react';
import StatusBadge from '../components/StatusBadge';
import StatutoryGuidanceTips from '../components/StatutoryGuidanceTips';
import DocumentPreviewModal from '../components/DocumentPreviewModal';
import { api, getFileUrl } from '../api';

export default function ApplicationReview({
  applicationId,
  onBack,
  onProceedToAssignment,
  onViewCertificate
}) {
  const [app, setApp] = useState(null);
  const [loading, setLoading] = useState(true);
  const [reviewing, setReviewing] = useState(false);
  const [workspaceData, setWorkspaceData] = useState(null);

  // Document preview state
  const [previewDoc, setPreviewDoc] = useState(null);

  // Authority Decision Modals
  const [showReturnModal, setShowReturnModal] = useState(false);
  const [returnReason, setReturnReason] = useState('');
  const [returning, setReturning] = useState(false);

  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [rejecting, setRejecting] = useState(false);

  const [showApproveModal, setShowApproveModal] = useState(false);
  const [approvalRemarks, setApprovalRemarks] = useState('Statutory verification report examined and approved. Conforms to Legal Metrology General Rules, 2011.');
  const [approving, setApproving] = useState(false);
  const [verifyingPayment, setVerifyingPayment] = useState(false);
  const [actionSuccess, setActionSuccess] = useState('');

  const loadCase = () => {
    if (applicationId) {
      setLoading(true);
      Promise.all([
        api.getApplication(applicationId),
        api.getCaseWorkspace(applicationId).catch(() => null)
      ])
        .then(([appData, wsData]) => {
          setApp(appData);
          setWorkspaceData(wsData);
        })
        .catch(console.error)
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCase();
  }, [applicationId]);

  const handleVerifyOfflinePayment = async () => {
    if (!window.confirm('Confirm verification of offline statutory payment / treasury challan remittance?')) return;
    setVerifyingPayment(true);
    try {
      await api.verifyOfflinePayment(applicationId);
      setActionSuccess('Treasury challan payment verified successfully.');
      loadCase();
    } catch (err) {
      alert('Failed to verify payment: ' + err.message);
    } finally {
      setVerifyingPayment(false);
    }
  };

  const handleProceed = async () => {
    setReviewing(true);
    try {
      if (app?.status === 'SUBMITTED') {
        await api.reviewApplication(applicationId);
      }
      onProceedToAssignment(applicationId);
    } catch (err) {
      console.error(err);
      onProceedToAssignment(applicationId);
    } finally {
      setReviewing(false);
    }
  };

  const handleReturnSubmit = async (e) => {
    e.preventDefault();
    if (!returnReason.trim()) {
      alert('A specific deficiency remark is required to return the application.');
      return;
    }
    setReturning(true);
    try {
      await api.returnApplication(applicationId, returnReason);
      setShowReturnModal(false);
      setActionSuccess('Application returned to trader with statutory remarks.');
      loadCase();
    } catch (err) {
      alert('Failed to return application: ' + err.message);
    } finally {
      setReturning(false);
    }
  };

  const handleRejectSubmit = async (e) => {
    e.preventDefault();
    if (!rejectReason.trim()) {
      alert('A specific statutory ground is required to reject the application.');
      return;
    }
    setRejecting(true);
    try {
      await api.rejectApplication(applicationId, rejectReason);
      setShowRejectModal(false);
      setActionSuccess('Application officially rejected under statutory grounds.');
      loadCase();
    } catch (err) {
      alert('Failed to reject application: ' + err.message);
    } finally {
      setRejecting(false);
    }
  };

  const handleApproveSubmit = async (e) => {
    e.preventDefault();
    setApproving(true);
    try {
      await api.approveApplication(applicationId, { approval_remarks: approvalRemarks });
      setShowApproveModal(false);
      setActionSuccess('Application successfully approved and statutory certificate generated!');
      loadCase();
    } catch (err) {
      alert('Failed to approve application: ' + err.message);
    } finally {
      setApproving(false);
    }
  };

  if (loading) {
    return (
      <div className="p-16 text-center text-slate-500 text-xs">
        <span className="material-symbols-outlined text-3xl animate-spin block mb-2 text-primary">progress_activity</span>
        Loading statutory case file...
      </div>
    );
  }

  if (!app) {
    return <div className="p-12 text-center text-rose-500">Application not found.</div>;
  }

  const hasAssignee = Boolean(app.assigned_to_name);
  const isScrutinyPending = ['SUBMITTED', 'UNDER_REVIEW'].includes(app.status)
    || (app.status === 'PENDING_VERIFICATION' && !hasAssignee);
  const isAssignedAwaitingInspection = app.status === 'ASSIGNED'
    || (app.status === 'PENDING_VERIFICATION' && hasAssignee);
  const isReportSubmitted = ['REPORT_SUBMITTED', 'VERIFICATION_COMPLETED', 'GATC_REPORT_SUBMITTED'].includes(app.status);
  const isApproved = ['APPROVED', 'CERTIFICATE_ISSUED'].includes(app.status);
  const isFeePaid = ['PAID', 'EXEMPTED'].includes(app.fee_status);
  const isTechnicalPass = workspaceData?.verification_result === 'PASS' || app.verification_result === 'PASS';
  const canApprove = isFeePaid && (isReportSubmitted || isApproved) && isTechnicalPass;

  const totalFee = app.fee_breakdown?.total_fee || app.payment?.amount || app.amount || 300;

  return (
    <div className="space-y-6 max-w-5xl mx-auto animate-in fade-in duration-300 pb-16">
      {/* Top action header & breadcrumb */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <nav className="flex items-center gap-2 text-xs text-slate-500">
          <button
            onClick={onBack}
            className="hover:text-primary font-semibold transition-colors flex items-center gap-1 cursor-pointer"
          >
            <span className="material-symbols-outlined text-sm">arrow_back</span>
            Operations Queue
          </button>
          <span>/</span>
          <span className="text-slate-400">Statutory Scrutiny</span>
          <span>/</span>
          <span className="font-mono font-bold text-slate-800">{app.application_no}</span>
        </nav>
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500 font-medium">Statutory State:</span>
          <StatusBadge status={app.status} />
        </div>
      </div>

      {actionSuccess && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 flex items-center justify-between">
          <div className="flex items-center gap-2 font-bold">
            <span className="material-symbols-outlined text-emerald-600">check_circle</span>
            {actionSuccess}
          </div>
          <button onClick={() => setActionSuccess('')} className="text-emerald-600 font-bold hover:underline cursor-pointer">Dismiss</button>
        </div>
      )}

      {/* Statutory Guidance Tips for Authority Officers */}
      <StatutoryGuidanceTips
        stage={isReportSubmitted ? 'REPORT_REVIEW' : (isAssignedAwaitingInspection ? 'ASSIGNMENT' : (isApproved ? 'FINAL_APPROVAL' : 'SCRUTINY'))}
      />

      {/* SECTION A: Application Information */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded-lg bg-[#002046] text-white flex items-center justify-center text-xs font-bold font-mono">A</span>
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Application Information</h2>
          </div>
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs px-2.5 py-1 rounded-md bg-[#002046] text-white font-bold">
              {app.application_no}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
          <div>
            <span className="text-slate-400 block text-[10px] uppercase font-bold">Filing Date</span>
            <span className="font-semibold text-slate-800">
              {app.created_at ? new Date(app.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}
            </span>
          </div>
          <div>
            <span className="text-slate-400 block text-[10px] uppercase font-bold">Request Type</span>
            <span className="font-semibold text-slate-800 uppercase">
              {app.request_type ? app.request_type.replace(/_/g, ' ') : 'VERIFICATION'}
            </span>
          </div>
          <div>
            <span className="text-slate-400 block text-[10px] uppercase font-bold">Verification Mode</span>
            <span className="font-semibold text-slate-800">
              {app.verification_mode === 'IN_SITU' ? 'In-Situ (On-Site Visit)' : app.verification_mode === 'GATC_LAB' ? 'GATC Lab Testing' : 'Camp / Centre Presentation'}
            </span>
          </div>
          <div>
            <span className="text-slate-400 block text-[10px] uppercase font-bold">Preferred Inspection Date</span>
            <span className="font-semibold text-slate-800">
              {app.preferred_date ? new Date(app.preferred_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Flexible'}
            </span>
          </div>
        </div>
      </div>

      {/* SECTION B & C: Two Column Grid (Trader / Establishment & Instrument Specifications) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* SECTION B: Trader / Commercial Establishment */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-3 text-xs">
          <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
            <span className="w-6 h-6 rounded-lg bg-[#002046] text-white flex items-center justify-center text-xs font-bold font-mono">B</span>
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Trader & Commercial Establishment</h2>
          </div>

          <div className="space-y-2.5">
            <div className="flex justify-between">
              <span className="text-slate-500">Applicant / Owner:</span>
              <strong className="text-slate-900">{app.trader_name || '—'}</strong>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Commercial Firm:</span>
              <span className="font-semibold text-slate-800">{app.trader_org || '—'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Authorized Contact:</span>
              <span className="font-semibold text-slate-800">{app.trader_phone || '—'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">District Jurisdiction:</span>
              <span className="font-semibold text-slate-800">{app.trader_jurisdiction || app.instrument_district || 'District Legal Metrology'}</span>
            </div>
            <div className="flex justify-between items-start pt-1 border-t border-slate-100">
              <span className="text-slate-500">Premises Address:</span>
              <span className="font-medium text-slate-800 text-right max-w-[220px]">{app.location_address || app.location || '—'}</span>
            </div>
          </div>
        </div>

        {/* SECTION C: Instrument Technical Specifications */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-3 text-xs">
          <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
            <span className="w-6 h-6 rounded-lg bg-[#002046] text-white flex items-center justify-center text-xs font-bold font-mono">C</span>
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Instrument Specifications</h2>
          </div>

          <div className="space-y-2.5">
            <div className="flex justify-between">
              <span className="text-slate-500">Instrument Category:</span>
              <strong className="text-slate-900">{app.category_name || 'Legal Metrology Standard'}</strong>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Make & Model:</span>
              <span className="font-semibold text-slate-800">{app.manufacturer} {app.model}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Device Serial Number:</span>
              <span className="font-mono font-bold text-primary">{app.serial_number}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Capacity / Max Range:</span>
              <span className="font-semibold text-slate-800">{app.capacity || 'Standard Range'}</span>
            </div>
            {(app.spec_fields || []).slice(0, 2).map((f) => (
              <div key={f.label} className="flex justify-between">
                <span className="text-slate-500">{f.label}:</span>
                <span className="font-semibold text-slate-800">{f.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* SECTION D: Statutory Payment Particulars (VIEW ONLY) */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded-lg bg-[#002046] text-white flex items-center justify-center text-xs font-bold font-mono">D</span>
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
              Statutory Remittance & Financial Compliance (View Only)
            </h2>
          </div>
          <div>
            {isFeePaid ? (
              <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                <span className="material-symbols-outlined text-sm">check_circle</span>
                PAID & VERIFIED
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-900 border border-amber-300">
                <span className="material-symbols-outlined text-sm">pending</span>
                REMITTANCE PENDING
              </span>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
            <span className="text-slate-400 block text-[10px] uppercase font-bold">Total Statutory Fee</span>
            <span className="font-mono font-extrabold text-slate-900 text-base">₹{Number(totalFee).toFixed(2)}</span>
            <span className="text-[10px] text-slate-400 block mt-0.5">Schedule V Schedule Fees</span>
          </div>

          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
            <span className="text-slate-400 block text-[10px] uppercase font-bold">Payment Method</span>
            <span className="font-semibold text-slate-800 block mt-1">
              {app.payment?.payment_mode === 'OFFLINE' ? 'Treasury Challan (Offline)' : 'Online Portal (Razorpay)'}
            </span>
          </div>

          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
            <span className="text-slate-400 block text-[10px] uppercase font-bold">Transaction / Challan Ref</span>
            <span className="font-mono text-slate-800 block mt-1 truncate" title={app.payment?.transaction_id || app.payment?.reference || 'Pending remittance'}>
              {app.payment?.transaction_id || app.payment?.reference || '—'}
            </span>
          </div>

          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
            <span className="text-slate-400 block text-[10px] uppercase font-bold">Remittance Date</span>
            <span className="font-semibold text-slate-800 block mt-1">
              {app.payment?.created_at ? new Date(app.payment.created_at).toLocaleDateString('en-IN') : 'Pending'}
            </span>
          </div>
        </div>

        {/* Offline Challan Verification Control for Authority (Strictly non-payment) */}
        {!isFeePaid && app.payment?.payment_mode === 'OFFLINE' && (
          <div className="p-3.5 bg-amber-50 rounded-xl border border-amber-200 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2 text-amber-900">
              <span className="material-symbols-outlined text-amber-700">receipt_long</span>
              <span>Offline Treasury Challan submitted by applicant requires Authority scrutiny.</span>
            </div>
            <button
              onClick={handleVerifyOfflinePayment}
              disabled={verifyingPayment}
              className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold text-xs shadow-xs transition-all flex items-center gap-1 cursor-pointer"
            >
              <span className="material-symbols-outlined text-sm">verified</span>
              {verifyingPayment ? 'Verifying...' : 'Verify Treasury Challan'}
            </button>
          </div>
        )}

        <div className="text-[11px] text-slate-400 italic">
          Note: Payment execution is strictly reserved for the applicant Trader. Authority Officers may only inspect remittance compliance and confirm treasury receipts.
        </div>
      </div>

      {/* SECTION E: Attached Supporting Documents */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded-lg bg-[#002046] text-white flex items-center justify-center text-xs font-bold font-mono">E</span>
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
              Uploaded Supporting Documents ({app.documents?.length || 0})
            </h2>
          </div>
          <span className="text-xs text-slate-400">Statutory filings</span>
        </div>

        {(!app.documents || app.documents.length === 0) ? (
          <div className="py-6 text-center text-slate-400 text-xs">
            No supporting documents uploaded for this application.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {app.documents.map((doc, idx) => {
              const rawDocPath = doc.file_path || `/api/documents/preview/${encodeURIComponent(doc.file_name || 'document.pdf')}`;
              const fileUrl = getFileUrl(rawDocPath);
              return (
                <div key={doc.id || idx} className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between gap-3 shadow-2xs hover:border-primary/40 transition-colors">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-9 h-9 rounded-lg bg-blue-100 text-[#002046] flex items-center justify-center shrink-0 border border-blue-200">
                      <span className="material-symbols-outlined text-lg">description</span>
                    </div>
                    <div className="min-w-0">
                      <span className="font-bold text-slate-800 text-xs block truncate" title={doc.file_name}>
                        {doc.file_name}
                      </span>
                      <span className="text-[10px] text-slate-400 block font-medium">
                        Category: <strong className="text-slate-600">{doc.category || 'General'}</strong>
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => setPreviewDoc({
                        file_name: doc.file_name,
                        file_path: doc.file_path || rawDocPath,
                        file_type: doc.file_type || (doc.file_name?.endsWith('.pdf') ? 'application/pdf' : 'application/pdf'),
                        category: doc.category || 'Applicant Supporting Document',
                        uploaded_by: app.trader_name || 'Trader Applicant',
                        uploaded_at: app.created_at
                      })}
                      className="px-2.5 py-1 rounded-lg bg-white hover:bg-slate-100 text-[#002046] border border-slate-200 font-bold text-[11px] transition-colors flex items-center gap-1 cursor-pointer"
                      title="Preview Document"
                    >
                      <span className="material-symbols-outlined text-xs">visibility</span>
                      <span>Preview</span>
                    </button>
                    {fileUrl && (
                      <a
                        href={fileUrl}
                        download={doc.file_name}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-1 rounded-lg hover:bg-slate-200 text-slate-500 hover:text-slate-800 transition-colors"
                        title="Download / Open"
                      >
                        <span className="material-symbols-outlined text-base">download</span>
                      </a>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* SECTION F: Officer / Laboratory Assignment & Scheduling */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded-lg bg-[#002046] text-white flex items-center justify-center text-xs font-bold font-mono">F</span>
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
              Verification Allocation & Scheduling
            </h2>
          </div>
          {app.assigned_to_name && (
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-blue-900">
              Allocated
            </span>
          )}
        </div>

        {app.assigned_to_name ? (
          <div className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs bg-slate-50 p-4 rounded-xl border border-slate-200">
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Assigned Inspector / Lab</span>
                <strong className="text-slate-900 text-sm">{app.assigned_to_name}</strong>
                <span className="text-[10px] text-slate-500 block mt-0.5">{app.assigned_type === 'GATC' ? 'GATC Testing Laboratory' : 'Legal Metrology Officer'}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Scheduled Inspection</span>
                <span className="font-semibold text-slate-800 text-sm">
                  {app.scheduled_date ? new Date(app.scheduled_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Date Scheduled'}
                </span>
                <span className="text-[10px] text-slate-500 block mt-0.5">{app.time_slot || 'Morning Slot'}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Testing Arrangement</span>
                <span className="font-semibold text-slate-800 text-sm">
                  {app.verification_mode === 'IN_SITU' ? 'Field On-Site Inspection' : 'Center / Camp Presentation'}
                </span>
              </div>
            </div>

            {/* Reassign option before completion */}
            {!isApproved && !isReportSubmitted && (
              <div className="flex justify-end">
                <button
                  onClick={() => onProceedToAssignment(applicationId)}
                  className="px-3.5 py-1.5 border border-slate-300 text-slate-700 hover:bg-slate-50 font-bold rounded-xl text-xs transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[16px]">swap_horiz</span>
                  Reassign / Change Schedule
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="p-5 bg-amber-50/70 border border-amber-200 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div className="flex items-start gap-2.5 text-amber-950">
              <span className="material-symbols-outlined text-amber-700 text-xl shrink-0 mt-0.5">person_alert</span>
              <div>
                <strong className="text-sm block">Case Awaiting Officer / Laboratory Allocation</strong>
                <p className="text-amber-800 mt-0.5">
                  This application has been filed and verified for statutory scrutiny. Assign a qualified Legal Metrology Officer or GATC testing center.
                </p>
              </div>
            </div>
            <button
              onClick={handleProceed}
              disabled={reviewing}
              className="px-4 py-2 bg-[#002046] hover:bg-[#001733] text-white font-bold rounded-xl text-xs shadow-xs transition-all flex items-center gap-1.5 shrink-0 cursor-pointer"
            >
              <span className="material-symbols-outlined text-base text-amber-400 font-bold">person_add</span>
              {reviewing ? 'Opening Allocation...' : 'Assign Officer / GATC'}
            </button>
          </div>
        )}
      </div>

      {/* SECTION G: Technical Verification Findings & Lab Report */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded-lg bg-[#002046] text-white flex items-center justify-center text-xs font-bold font-mono">G</span>
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
              Technical Verification Findings & Laboratory Report
            </h2>
          </div>
          {workspaceData && (
            <span className={`px-2.5 py-0.5 rounded-full font-bold text-xs ${
              workspaceData.verification_result === 'PASS' ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' : 'bg-rose-100 text-rose-800 border border-rose-300'
            }`}>
              Technical Result: {workspaceData.verification_result || 'PENDING'}
            </span>
          )}
        </div>

        {(!isReportSubmitted && !isApproved) ? (
          <div className="py-8 text-center text-slate-400 text-xs space-y-2">
            <span className="material-symbols-outlined text-3xl text-slate-300 block">pending_actions</span>
            <p className="font-semibold text-slate-600">Technical Report Pending Submission</p>
            <p className="text-slate-400 max-w-md mx-auto">
              The assigned officer / test centre has not yet submitted technical measurements, MPE evaluations, or field evidence.
            </p>
          </div>
        ) : workspaceData ? (
          <div className="space-y-4 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 bg-slate-50 rounded-xl border border-slate-200">
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Examined By</span>
                <strong className="text-slate-900">{workspaceData.assigned_by_name || app.assigned_to_name || 'Designated Inspector'}</strong>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Completion Timestamp</span>
                <span className="font-semibold text-slate-800">
                  {workspaceData.completed_at ? new Date(workspaceData.completed_at).toLocaleString() : 'Recent'}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Inspector Remarks</span>
                <span className="italic text-slate-700">{workspaceData.observations || workspaceData.remarks || 'Standard verified.'}</span>
              </div>
            </div>

            {/* GATC Environmental Standards if applicable */}
            {(workspaceData.lab_parameters || workspaceData.verification_type === 'LAB_TEST' || app.assigned_type === 'GATC') && (
              <div className="bg-white rounded-xl p-3.5 border border-indigo-200 grid grid-cols-2 sm:grid-cols-4 gap-3 text-[11px]">
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Chamber Temperature</span>
                  <strong className="text-slate-800">{workspaceData.lab_parameters?.chamber_temperature_c || '23.0'} °C</strong>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Relative Humidity</span>
                  <strong className="text-slate-800">{workspaceData.lab_parameters?.relative_humidity_pct || '50'} %</strong>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Standards Class</span>
                  <strong className="text-indigo-800 font-mono">{workspaceData.lab_parameters?.standards_class || 'CLASS_E2'}</strong>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Calibration Cert Ref</span>
                  <strong className="text-slate-800 font-mono">{workspaceData.lab_parameters?.calibration_certificate_ref || 'NPLI/CAL/2026/894'}</strong>
                </div>
              </div>
            )}

            {/* Readings Matrix with Server MPE Tolerances */}
            {workspaceData.readings && workspaceData.readings.length > 0 && (
              <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                  <span className="font-bold text-slate-900 text-xs uppercase">
                    Statutory Measurement & MPE Tolerance Evaluation ({workspaceData.readings.length} Test Points)
                  </span>
                  <span className="text-[10px] text-slate-400 font-semibold">Legal Metrology Act, 2009</span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-slate-200 text-slate-500 font-semibold bg-slate-50/50">
                        <th className="px-4 py-2">Test Point</th>
                        <th className="px-4 py-2">Reference Load</th>
                        <th className="px-4 py-2">Observed Reading</th>
                        <th className="px-4 py-2">Calculated Error</th>
                        <th className="px-4 py-2">Permissible (MPE)</th>
                        <th className="px-4 py-2 text-right">Result</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {workspaceData.readings.map((r, i) => (
                        <tr key={i} className="hover:bg-slate-50/50">
                          <td className="px-4 py-2 font-medium text-slate-800">{r.test_point}</td>
                          <td className="px-4 py-2 font-mono text-slate-600">{r.reference_value} {r.unit}</td>
                          <td className="px-4 py-2 font-mono font-bold text-slate-900">{r.observed_value} {r.unit}</td>
                          <td className="px-4 py-2 font-mono text-slate-700">
                            {r.error_value !== undefined && r.error_value !== null ? `${r.error_value > 0 ? '+' : ''}${r.error_value} ${r.unit}` : '0.000'}
                          </td>
                          <td className="px-4 py-2 font-mono text-slate-500">
                            {r.permissible_error !== undefined && r.permissible_error !== null ? `±${r.permissible_error} ${r.unit}` : 'Standard'}
                          </td>
                          <td className="px-4 py-2 text-right">
                            <span className={`px-2 py-0.5 rounded font-bold text-[10px] ${
                              r.reading_result === 'PASS' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                            }`}>
                              {r.reading_result}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Evidence photos gallery */}
            {(() => {
              const evidenceItems = (workspaceData?.evidence && workspaceData.evidence.length > 0)
                ? workspaceData.evidence
                : (app?.evidence && app.evidence.length > 0)
                ? app.evidence
                : [];

              if (evidenceItems.length === 0) return null;

              return (
                <div className="space-y-2 pt-2">
                  <span className="font-bold text-slate-900 text-xs uppercase block">
                    Inspection Photographic Evidence ({evidenceItems.length})
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {evidenceItems.map((ev, idx) => {
                      const fileUrl = getFileUrl(ev.file_path);
                      return (
                        <div key={ev.id || idx} className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between gap-2">
                          <div className="min-w-0">
                            <span className="font-bold text-slate-800 text-xs block truncate" title={ev.file_name}>
                              {ev.file_name}
                            </span>
                            <span className="text-[10px] text-slate-400 block">{ev.category || 'Inspection Photo'}</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => setPreviewDoc({
                              file_name: ev.file_name,
                              file_path: ev.file_path,
                              file_type: ev.file_type || 'image/png',
                              category: ev.category || 'Inspection Evidence',
                              uploaded_by: workspaceData?.assigned_by_name || 'Inspector',
                              uploaded_at: ev.created_at
                            })}
                            className="px-2 py-1 rounded bg-white hover:bg-slate-100 text-primary border border-slate-200 text-xs font-bold cursor-pointer"
                          >
                            View
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })()}
          </div>
        ) : null}
      </div>

      {/* SECTION H: Authority Legal Decision Suite */}
      <div className="bg-white rounded-2xl p-6 border-2 border-primary/20 shadow-md space-y-5">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded-lg bg-[#002046] text-white flex items-center justify-center text-xs font-bold font-mono">H</span>
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
              Statutory Authority Legal Determination Suite
            </h2>
          </div>
          <span className="text-xs font-semibold text-slate-500">Legal Metrology Act, 2009 § 24</span>
        </div>

        {/* Validation overview alert */}
        <div className={`p-4 rounded-xl text-xs flex items-start gap-2.5 ${
          isApproved
            ? 'bg-emerald-50 border border-emerald-200 text-emerald-900'
            : canApprove
            ? 'bg-emerald-50/80 border border-emerald-300 text-emerald-900'
            : 'bg-amber-50 border border-amber-200 text-amber-900'
        }`}>
          <span className="material-symbols-outlined text-lg shrink-0 mt-0.5">
            {isApproved || canApprove ? 'verified' : 'info'}
          </span>
          <div className="space-y-1">
            <div className="font-bold">
              {isApproved
                ? 'Statutory Approval Finalized & Certificate Issued'
                : canApprove
                ? 'Statutory Determination Ready: All Conditions Passed'
                : 'Scrutiny & Review In Progress'}
            </div>
            <p className="leading-relaxed">
              {isApproved
                ? `Certificate ${app.certificate_no || 'issued'}. The instrument is certified under the Legal Metrology General Rules, 2011.`
                : canApprove
                ? 'The applicant fee is confirmed PAID, supporting documents scrutinized, and technical inspection report submitted with outcome PASS. You may approve and generate the statutory verification certificate.'
                : 'Approval requires: (1) Statutory fee verified as PAID, (2) Technical inspection report submitted by allocated officer / GATC lab, (3) Technical outcome evaluated as PASS.'}
            </p>
          </div>
        </div>

        {/* Legal Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
          <div className="flex items-center gap-2 w-full sm:w-auto">
            {/* Return action */}
            {!isApproved && (
              <button
                onClick={() => setShowReturnModal(true)}
                className="flex-1 sm:flex-initial px-4 py-2.5 border border-amber-300 text-amber-800 bg-amber-50 hover:bg-amber-100 font-bold rounded-xl text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <span className="material-symbols-outlined text-base">assignment_return</span>
                Return with Remarks
              </button>
            )}

            {/* Reject action */}
            {!isApproved && (
              <button
                onClick={() => setShowRejectModal(true)}
                className="flex-1 sm:flex-initial px-4 py-2.5 border border-rose-300 text-rose-800 bg-rose-50 hover:bg-rose-100 font-bold rounded-xl text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <span className="material-symbols-outlined text-base">cancel</span>
                Reject on Statutory Grounds
              </button>
            )}
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
            {isApproved ? (
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-emerald-700 bg-emerald-100 px-3 py-1.5 rounded-xl border border-emerald-300 flex items-center gap-1">
                  <span className="material-symbols-outlined text-sm">workspace_premium</span>
                  Certificate Issued
                </span>
                {app.certificate_id && onViewCertificate && (
                  <button
                    onClick={() => onViewCertificate(app.certificate_id)}
                    className="px-4 py-2.5 bg-primary text-white font-bold rounded-xl text-xs hover:bg-primary-container shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-base">visibility</span>
                    View Certificate
                  </button>
                )}
              </div>
            ) : (
              <button
                onClick={() => setShowApproveModal(true)}
                disabled={!canApprove}
                className="w-full sm:w-auto px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 disabled:text-slate-500 disabled:cursor-not-allowed text-white font-bold rounded-xl text-xs shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
                title={canApprove ? 'Approve and issue certificate' : 'Requires fee paid and passing technical report'}
              >
                <span className="material-symbols-outlined text-lg">verified</span>
                Approve & Issue Certificate
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Document Preview Lightbox Modal */}
      {previewDoc && (
        <DocumentPreviewModal
          document={previewDoc}
          onClose={() => setPreviewDoc(null)}
        />
      )}

      {/* Return Application Drawer */}
      {showReturnModal && (
        <div className="fixed inset-0 z-50 overflow-hidden">
          <div
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm cursor-pointer animate-backdrop-in"
            onClick={() => setShowReturnModal(false)}
          />
          <div
            className="fixed inset-y-0 right-0 z-50 flex flex-col h-full w-full sm:w-[85vw] md:w-1/2 lg:w-1/2 bg-white shadow-2xl border-l border-slate-200 animate-slide-in-right cursor-default"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-6 py-4 md:px-8 border-b border-slate-200 bg-white/95 backdrop-blur shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center shadow-xs">
                  <span className="material-symbols-outlined text-2xl">assignment_return</span>
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-base">Return Application with Remarks</h3>
                  <p className="text-xs text-slate-500">Applicant will be notified to correct and resubmit</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowReturnModal(false)}
                className="w-8 h-8 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 flex items-center justify-center transition-colors cursor-pointer"
                title="Close"
              >
                <span className="material-symbols-outlined text-xl">close</span>
              </button>
            </div>

            <form id="return-app-form" onSubmit={handleReturnSubmit} className="flex-1 overflow-y-auto p-6 md:p-8 space-y-4 text-xs">
              <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 text-xs leading-relaxed flex items-start gap-2">
                <span className="material-symbols-outlined text-base text-amber-600 shrink-0 mt-0.5">info</span>
                <span>The applicant will receive a statutory deficiency notification with these instructions and can upload corrected documentation.</span>
              </div>
              <div>
                <label className="font-bold text-slate-700 block text-xs mb-1">Deficiency Remarks / Required Action *</label>
                <textarea
                  required
                  rows={6}
                  value={returnReason}
                  onChange={e => setReturnReason(e.target.value)}
                  placeholder="Specify missing documents, discrepancy in serial number, or clarification required..."
                  className="w-full p-3 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                ></textarea>
              </div>
            </form>

            <div className="px-6 py-4 md:px-8 bg-slate-50/95 backdrop-blur border-t border-slate-200 flex items-center justify-end gap-3 shrink-0">
              <button
                type="button"
                onClick={() => setShowReturnModal(false)}
                className="px-4 py-2 border border-slate-300 text-slate-700 text-xs font-semibold rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                form="return-app-form"
                disabled={returning}
                className="px-5 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
              >
                {returning ? 'Returning...' : 'Return Application'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reject Application Drawer */}
      {showRejectModal && (
        <div className="fixed inset-0 z-50 overflow-hidden">
          <div
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm cursor-pointer animate-backdrop-in"
            onClick={() => setShowRejectModal(false)}
          />
          <div
            className="fixed inset-y-0 right-0 z-50 flex flex-col h-full w-full sm:w-[85vw] md:w-1/2 lg:w-1/2 bg-white shadow-2xl border-l border-slate-200 animate-slide-in-right cursor-default"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-6 py-4 md:px-8 border-b border-slate-200 bg-white/95 backdrop-blur shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-800 flex items-center justify-center shadow-xs">
                  <span className="material-symbols-outlined text-2xl">cancel</span>
                </div>
                <div>
                  <h3 className="font-bold text-rose-900 text-base">Reject Verification Application</h3>
                  <p className="text-xs text-slate-500">Statutory rejection records instrument as non-compliant</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowRejectModal(false)}
                className="w-8 h-8 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 flex items-center justify-center transition-colors cursor-pointer"
                title="Close"
              >
                <span className="material-symbols-outlined text-xl">close</span>
              </button>
            </div>

            <form id="reject-app-form" onSubmit={handleRejectSubmit} className="flex-1 overflow-y-auto p-6 md:p-8 space-y-4 text-xs">
              <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-900 text-xs leading-relaxed flex items-start gap-2">
                <span className="material-symbols-outlined text-base text-rose-600 shrink-0 mt-0.5">warning</span>
                <span>Warning: Rejection under the Legal Metrology Act is a permanent determination on this filing and will revoke operational permission for this instrument.</span>
              </div>
              <div>
                <label className="font-bold text-slate-700 block text-xs mb-1">Statutory Rejection Grounds *</label>
                <textarea
                  required
                  rows={6}
                  value={rejectReason}
                  onChange={e => setRejectReason(e.target.value)}
                  placeholder="State the statutory grounds under the Legal Metrology Act (e.g. repeated failure to meet MPE limits, unapproved model)..."
                  className="w-full p-3 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 outline-none"
                ></textarea>
              </div>
            </form>

            <div className="px-6 py-4 md:px-8 bg-slate-50/95 backdrop-blur border-t border-slate-200 flex items-center justify-end gap-3 shrink-0">
              <button
                type="button"
                onClick={() => setShowRejectModal(false)}
                className="px-4 py-2 border border-slate-300 text-slate-700 text-xs font-semibold rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                form="reject-app-form"
                disabled={rejecting}
                className="px-5 py-2 bg-rose-700 hover:bg-rose-800 text-white rounded-lg text-xs font-bold shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
              >
                {rejecting ? 'Rejecting...' : 'Confirm Rejection'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Approve Application Drawer */}
      {showApproveModal && (
        <div className="fixed inset-0 z-50 overflow-hidden">
          <div
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm cursor-pointer animate-backdrop-in"
            onClick={() => setShowApproveModal(false)}
          />
          <div
            className="fixed inset-y-0 right-0 z-50 flex flex-col h-full w-full sm:w-[85vw] md:w-1/2 lg:w-1/2 bg-white shadow-2xl border-l border-slate-200 animate-slide-in-right cursor-default"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-6 py-4 md:px-8 border-b border-slate-200 bg-white/95 backdrop-blur shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center shadow-xs">
                  <span className="material-symbols-outlined text-2xl">verified</span>
                </div>
                <div>
                  <h3 className="font-bold text-emerald-900 text-base">Approve Application & Issue Certificate</h3>
                  <p className="text-xs text-slate-500">Statutory Legal Metrology verification seal</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowApproveModal(false)}
                className="w-8 h-8 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 flex items-center justify-center transition-colors cursor-pointer"
                title="Close"
              >
                <span className="material-symbols-outlined text-xl">close</span>
              </button>
            </div>

            <form id="approve-app-form" onSubmit={handleApproveSubmit} className="flex-1 overflow-y-auto p-6 md:p-8 space-y-4 text-xs">
              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-900 space-y-2">
                <div className="font-bold flex items-center gap-1.5 text-emerald-800">
                  <span className="material-symbols-outlined text-base text-emerald-600">verified</span>
                  Statutory Determination Notice
                </div>
                <p className="text-[11px] text-emerald-800 leading-relaxed">
                  Approving this case will transition the application to <strong>CERTIFICATE_ISSUED</strong>, update instrument state to <strong>VERIFIED</strong>, and issue an official verification certificate with a unique public QR verification token.
                </p>
              </div>

              <div>
                <label className="font-bold text-slate-700 block text-xs mb-1">Official Approval Remarks *</label>
                <textarea
                  required
                  rows={4}
                  value={approvalRemarks}
                  onChange={e => setApprovalRemarks(e.target.value)}
                  placeholder="Enter endorsement details, inspection report reference, or statutory remarks..."
                  className="w-full p-3 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none"
                ></textarea>
              </div>
            </form>

            <div className="px-6 py-4 md:px-8 bg-slate-50/95 backdrop-blur border-t border-slate-200 flex items-center justify-end gap-3 shrink-0">
              <button
                type="button"
                onClick={() => setShowApproveModal(false)}
                className="px-4 py-2 border border-slate-300 text-slate-700 text-xs font-semibold rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                form="approve-app-form"
                disabled={approving}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold shadow-md transition-all flex items-center gap-1.5 cursor-pointer"
              >
                {approving ? 'Authorizing...' : 'Approve & Issue Certificate'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
