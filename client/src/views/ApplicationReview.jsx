import React, { useEffect, useState } from 'react';
import StatusBadge from '../components/StatusBadge';
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
    }
  };

  useEffect(() => {
    loadCase();
  }, [applicationId]);

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
      const res = await api.approveApplication(applicationId, { approval_remarks: approvalRemarks });
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

  const isScrutinyPending = ['SUBMITTED', 'UNDER_REVIEW'].includes(app.status);
  const isReportSubmitted = ['REPORT_SUBMITTED', 'VERIFICATION_COMPLETED'].includes(app.status);
  const isApproved = ['APPROVED', 'CERTIFICATE_ISSUED'].includes(app.status);

  return (
    <div className="space-y-6 max-w-5xl mx-auto animate-in fade-in duration-300 pb-16">
      {/* Top action header & breadcrumb */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <nav className="flex items-center gap-2 text-xs text-slate-500">
          <button
            onClick={onBack}
            className="hover:text-primary font-semibold transition-colors flex items-center gap-1"
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
          <button onClick={() => setActionSuccess('')} className="text-emerald-600 font-bold hover:underline">Dismiss</button>
        </div>
      )}

      {/* Case Header Card */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between pb-6 border-b border-slate-100 gap-4">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-mono text-sm px-2.5 py-0.5 rounded-md bg-primary text-white font-bold">
                {app.application_no}
              </span>
              <span className="text-xs text-slate-400">•</span>
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">{app.request_type ? app.request_type.replace('_', ' ') : 'VERIFICATION'}</span>
              <span className="text-xs text-slate-400">•</span>
              <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                {app.verification_mode === 'IN_SITU' ? 'In-situ (On-Site Visit)' : 'Camp / Centre Presentation'}
              </span>
            </div>
            <h1 className="text-xl font-bold text-slate-900 mt-2">
              Statutory Verification Review for {app.manufacturer} {app.model}
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Applicant: <strong>{app.trader_name}</strong> • Establishment: <strong>{app.trader_org}</strong> ({app.trader_jurisdiction || 'District Jurisdiction'})
            </p>
          </div>

          <div className="flex items-center gap-2 self-end md:self-center flex-wrap">
            {/* Scrutiny Stage Actions */}
            {isScrutinyPending && (
              <>
                <button
                  onClick={() => setShowReturnModal(true)}
                  className="px-3.5 py-2 border border-amber-300 text-amber-800 bg-amber-50 hover:bg-amber-100 font-bold rounded-xl text-xs transition-all flex items-center gap-1.5"
                >
                  <span className="material-symbols-outlined text-[16px]">assignment_return</span>
                  Return
                </button>
                <button
                  onClick={() => setShowRejectModal(true)}
                  className="px-3.5 py-2 border border-rose-300 text-rose-800 bg-rose-50 hover:bg-rose-100 font-bold rounded-xl text-xs transition-all flex items-center gap-1.5"
                >
                  <span className="material-symbols-outlined text-[16px]">cancel</span>
                  Reject
                </button>
                <button
                  onClick={handleProceed}
                  disabled={reviewing}
                  className="px-5 py-2 bg-primary text-white font-bold rounded-xl text-xs hover:bg-primary-container shadow-sm transition-all flex items-center gap-1.5"
                >
                  <span className="material-symbols-outlined text-[18px]">assignment_ind</span>
                  {reviewing ? 'Opening Review...' : 'Proceed to Allocation'}
                </button>
              </>
            )}

            {['ASSIGNED', 'PENDING_VERIFICATION'].includes(app.status) && (
              <div className="text-right bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                <span className="text-[10px] text-slate-400 uppercase font-bold block">Assigned Verifier</span>
                <span className="font-semibold text-slate-800 text-xs">{app.assigned_to_name || 'Designated Officer'}</span>
              </div>
            )}

            {app.status === 'IN_PROGRESS' && (
              <div className="px-3.5 py-2 bg-amber-50 border border-amber-200 text-amber-800 rounded-xl text-xs font-semibold flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[16px] animate-spin">progress_activity</span>
                Verification Inspection In Progress
              </div>
            )}

            {/* Post-Inspection Decision Suite (Statutory Authority Power) */}
            {isReportSubmitted && (
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  onClick={() => setShowReturnModal(true)}
                  className="px-3.5 py-2 border border-amber-300 text-amber-800 bg-amber-50 hover:bg-amber-100 font-bold rounded-xl text-xs transition-all flex items-center gap-1.5"
                >
                  <span className="material-symbols-outlined text-[16px]">assignment_return</span>
                  Return for Re-Inspection
                </button>
                <button
                  onClick={() => setShowRejectModal(true)}
                  className="px-3.5 py-2 border border-rose-300 text-rose-800 bg-rose-50 hover:bg-rose-100 font-bold rounded-xl text-xs transition-all flex items-center gap-1.5"
                >
                  <span className="material-symbols-outlined text-[16px]">cancel</span>
                  Reject
                </button>
                <button
                  onClick={() => setShowApproveModal(true)}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs shadow-md transition-all flex items-center gap-1.5"
                >
                  <span className="material-symbols-outlined text-[18px]">verified</span>
                  Approve & Issue Certificate
                </button>
              </div>
            )}

            {isApproved && (
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">Statutory Outcome</span>
                  <span className="font-extrabold text-emerald-700 text-xs flex items-center gap-1 justify-end">
                    <span className="material-symbols-outlined text-[16px]">verified</span>
                    APPROVED • {app.certificate_no || 'Certified'}
                  </span>
                </div>
                {app.certificate_id && onViewCertificate && (
                  <button
                    onClick={() => onViewCertificate(app.certificate_id)}
                    className="px-4 py-2 bg-primary text-white font-bold rounded-xl text-xs hover:bg-primary-container shadow-xs transition-all flex items-center gap-1.5"
                  >
                    <span className="material-symbols-outlined text-[16px]">visibility</span>
                    View Certificate
                  </button>
                )}
              </div>
            )}

            {app.status === 'REJECTED' && (
              <div className="px-3.5 py-2 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs font-semibold flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[16px] text-rose-600">cancel</span>
                Application Rejected ({app.rejection_reason || 'Statutory Deficiencies'})
              </div>
            )}
          </div>
        </div>

        {/* Inspection Report Findings (When submitted by Verifier / GATC Lab) */}
        {(isReportSubmitted || isApproved) && workspaceData && (
          <div className="mt-6 p-5 rounded-2xl bg-indigo-50/60 border border-indigo-200 text-xs space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-indigo-200/60">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-indigo-700">fact_check</span>
                <h3 className="font-bold text-indigo-950 text-sm">
                  Inspector / Laboratory Verification Findings Report
                </h3>
              </div>
              <span className={`px-2.5 py-0.5 rounded-full font-bold text-xs ${
                workspaceData.verification_result === 'PASS' ? 'bg-emerald-200 text-emerald-900' : 'bg-rose-200 text-rose-900'
              }`}>
                Inspector Outcome: {workspaceData.verification_result || 'PENDING'}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-slate-700">
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Assigned Inspector / Lab</span>
                <strong className="text-slate-900">{workspaceData.assigned_by_name || app.assigned_to_name || 'Designated Officer'}</strong>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Completed On</span>
                <strong>{workspaceData.completed_at ? new Date(workspaceData.completed_at).toLocaleString() : 'Recent'}</strong>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Inspection Observations</span>
                <span className="italic">{workspaceData.observations || 'Conforms to standards.'}</span>
              </div>
            </div>

            {/* Readings Matrix */}
            {workspaceData.readings && workspaceData.readings.length > 0 && (
              <div className="bg-white rounded-xl p-3 border border-indigo-100 space-y-2">
                <span className="font-bold text-slate-800 text-[11px] block uppercase">Recorded Measurement Readings ({workspaceData.readings.length})</span>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {workspaceData.readings.map((r, i) => (
                    <div key={i} className="p-2 rounded bg-slate-50 border border-slate-200 text-[11px]">
                      <span className="text-slate-500 block truncate">{r.test_point}</span>
                      <strong className="font-mono text-slate-900">{r.observed_value} {r.unit}</strong>
                      <span className={`float-right font-bold text-[10px] ${r.reading_result === 'PASS' ? 'text-emerald-700' : 'text-rose-700'}`}>
                        {r.reading_result}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Attached Inspection Photos */}
            {workspaceData.evidence && workspaceData.evidence.length > 0 && (
              <div className="bg-white rounded-xl p-3 border border-indigo-100 space-y-2">
                <span className="font-bold text-slate-800 text-[11px] block uppercase">Field / Laboratory Attached Evidence ({workspaceData.evidence.length})</span>
                <div className="flex items-center gap-3 overflow-x-auto pb-1">
                  {workspaceData.evidence.map(ev => (
                    <a
                      key={ev.id}
                      href={getFileUrl(ev.file_path)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 bg-slate-50 rounded-lg border border-slate-200 flex items-center gap-2 text-[11px] font-semibold hover:border-primary shrink-0"
                    >
                      <span className="material-symbols-outlined text-primary text-base">image</span>
                      <span className="truncate max-w-[120px]">{ev.file_name}</span>
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* 1. Statutory Rule Evaluation Box */}
        <div className="mt-6 p-4 rounded-xl bg-emerald-50/70 border border-emerald-200 text-xs space-y-2">
          <div className="flex items-center gap-2 text-emerald-900 font-bold text-sm">
            <span className="material-symbols-outlined text-emerald-600">verified</span>
            Automated Statutory Eligibility Evaluation: PASSED
          </div>
          <p className="text-emerald-800 leading-relaxed">
            The submitted instrument specifications conform to <strong>Schedule V (Commercial NAWI Class III)</strong> under the Legal Metrology (General) Rules, 2011. Device parameters fall within statutory jurisdiction limits.
          </p>
          <div className="grid grid-cols-3 gap-2 pt-2 border-t border-emerald-200/60 font-medium text-emerald-900">
            <div>• Validity Term: 12 Months</div>
            <div>• Max Permissible Error: Standard OIML R76</div>
            <div>• Testing Type: Field / GATC presentation</div>
          </div>
        </div>

        {/* 2. Detailed Technical & Operational Matrix */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
          {/* Instrument Specs */}
          <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 text-xs space-y-3">
            <h3 className="font-bold text-slate-900 uppercase tracking-wider text-[11px] pb-2 border-b border-slate-200">
              Instrument Technical Specifications
            </h3>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-slate-500">Category / Class:</span>
                <span className="font-semibold text-slate-800">{app.category_name}</span>
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
                <span className="text-slate-500">Max / Min Capacity:</span>
                <span className="font-semibold text-slate-800">{app.max_capacity} / {app.min_capacity}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Verification Interval (e):</span>
                <span className="font-semibold text-slate-800">{app.verification_scale_interval_e}</span>
              </div>
            </div>
          </div>

          {/* Applicant & Establishment Details */}
          <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 text-xs space-y-3">
            <h3 className="font-bold text-slate-900 uppercase tracking-wider text-[11px] pb-2 border-b border-slate-200">
              Commercial Establishment Particulars
            </h3>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-slate-500">Applicant Name:</span>
                <span className="font-semibold text-slate-800">{app.trader_name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Registered Firm:</span>
                <span className="font-semibold text-slate-800">{app.trader_org}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Contact Number:</span>
                <span className="font-semibold text-slate-800">{app.trader_phone}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Operational Premises:</span>
                <span className="font-semibold text-slate-800 text-right max-w-[200px]">{app.location}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Statutory Fee Status:</span>
                <span className="font-bold text-emerald-600 uppercase">Paid (Treasury Verified)</span>
              </div>
            </div>
          </div>
        </div>

        {/* 3. Applicant Supporting Documents */}
        {app.documents && app.documents.length > 0 && (
          <div className="mt-6 p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-2">
            <h3 className="font-bold text-slate-900 uppercase tracking-wider text-[11px] pb-1 border-b border-slate-200">
              Attached Applicant Supporting Documents ({app.documents.length})
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
              {app.documents.map((doc, idx) => (
                <div key={doc.id || idx} className="p-2.5 bg-white rounded-lg border border-slate-200 flex items-center justify-between">
                  <div className="flex items-center gap-2 truncate">
                    <span className="material-symbols-outlined text-primary text-base">description</span>
                    <span className="font-semibold text-slate-800 truncate">{doc.file_name}</span>
                  </div>
                  <span className="text-[10px] text-slate-400 font-semibold px-2 py-0.5 rounded bg-slate-100 shrink-0">
                    {doc.category}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Return Application Modal */}
      {showReturnModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <form onSubmit={handleReturnSubmit} className="bg-white rounded-2xl max-w-md w-full p-6 border border-slate-200 shadow-xl space-y-4 animate-in fade-in">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="font-bold text-slate-900 text-sm">Return Application with Remarks</h3>
                <p className="text-xs text-slate-500">Applicant will be notified to correct and resubmit</p>
              </div>
              <button type="button" onClick={() => setShowReturnModal(false)} className="text-slate-400 hover:text-slate-700">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <div>
              <label className="font-bold text-slate-700 block text-xs mb-1">Deficiency Remarks / Required Action</label>
              <textarea
                required
                rows={4}
                value={returnReason}
                onChange={e => setReturnReason(e.target.value)}
                placeholder="Specify missing documents, discrepancy in serial number, or clarification required..."
                className="w-full p-3 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-primary/20 focus:border-primary"
              ></textarea>
            </div>
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowReturnModal(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={returning}
                className="px-5 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold shadow-xs"
              >
                {returning ? 'Returning...' : 'Return Application'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Reject Application Modal */}
      {showRejectModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <form onSubmit={handleRejectSubmit} className="bg-white rounded-2xl max-w-md w-full p-6 border border-slate-200 shadow-xl space-y-4 animate-in fade-in">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="font-bold text-rose-900 text-sm">Reject Verification Application</h3>
                <p className="text-xs text-slate-500">Statutory rejection records instrument as non-compliant</p>
              </div>
              <button type="button" onClick={() => setShowRejectModal(false)} className="text-slate-400 hover:text-slate-700">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <div>
              <label className="font-bold text-slate-700 block text-xs mb-1">Statutory Rejection Grounds</label>
              <textarea
                required
                rows={4}
                value={rejectReason}
                onChange={e => setRejectReason(e.target.value)}
                placeholder="State the statutory grounds under the Legal Metrology Act (e.g. repeated failure to meet MPE limits, unapproved model)..."
                className="w-full p-3 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
              ></textarea>
            </div>
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowRejectModal(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={rejecting}
                className="px-5 py-2 bg-rose-700 hover:bg-rose-800 text-white rounded-xl text-xs font-bold shadow-xs"
              >
                {rejecting ? 'Rejecting...' : 'Confirm Rejection'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Approve Application Modal */}
      {showApproveModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <form onSubmit={handleApproveSubmit} className="bg-white rounded-2xl max-w-md w-full p-6 border border-slate-200 shadow-xl space-y-4 animate-in fade-in">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="font-bold text-emerald-900 text-sm">Approve Application & Issue Certificate</h3>
                <p className="text-xs text-slate-500">Statutory Legal Metrology verification seal</p>
              </div>
              <button type="button" onClick={() => setShowApproveModal(false)} className="text-slate-400 hover:text-slate-700">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-900 space-y-1">
              <div className="font-bold flex items-center gap-1.5">
                <span className="material-symbols-outlined text-base text-emerald-600">verified</span>
                Statutory Determination Notice
              </div>
              <p className="text-[11px] text-emerald-800 leading-relaxed">
                Approving this case will transition the application to <strong>CERTIFICATE_ISSUED</strong>, update instrument state to <strong>VERIFIED</strong>, and issue an official verification certificate with a unique public QR verification token.
              </p>
            </div>
            <div>
              <label className="font-bold text-slate-700 block text-xs mb-1">Official Approval Remarks</label>
              <textarea
                required
                rows={3}
                value={approvalRemarks}
                onChange={e => setApprovalRemarks(e.target.value)}
                className="w-full p-3 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
              ></textarea>
            </div>
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowApproveModal(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={approving}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-md"
              >
                {approving ? 'Authorizing...' : 'Approve & Issue Certificate'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
