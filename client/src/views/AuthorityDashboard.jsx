import React, { useMemo } from 'react';
import StatusBadge from '../components/StatusBadge';

export default function AuthorityDashboard({
  currentUser,
  applications = [],
  stats = {},
  onReviewApplication,
  onAssignApplication,
  onViewQueue,
  onViewCertificates,
  onViewAuditLogs
}) {
  const safeApplications = Array.isArray(applications) ? applications : [];

  // 8 Canonical Authority KPIs from MongoDB-backed applications
  const awaitingScrutiny = useMemo(
    () => safeApplications.filter((a) => a.status === 'SUBMITTED'),
    [safeApplications]
  );

  const pendingAssignment = useMemo(
    () => safeApplications.filter((a) => a.status === 'UNDER_REVIEW' || (['SUBMITTED', 'PENDING_VERIFICATION'].includes(a.status) && !a.assigned_id)),
    [safeApplications]
  );

  const scheduledVerifications = useMemo(
    () => safeApplications.filter((a) =>
      ['ASSIGNED', 'SCHEDULED', 'VERIFICATION_IN_PROGRESS', 'IN_PROGRESS', 'INSPECTION_SCHEDULED'].includes(a.status)
    ),
    [safeApplications]
  );

  const reportsAwaitingReview = useMemo(
    () => safeApplications.filter((a) =>
      ['REPORT_SUBMITTED', 'VERIFICATION_COMPLETED', 'GATC_REPORT_SUBMITTED'].includes(a.status)
    ),
    [safeApplications]
  );

  const returnedApplications = useMemo(
    () => safeApplications.filter((a) => a.status === 'RETURNED'),
    [safeApplications]
  );

  const pendingDecisions = useMemo(
    () => safeApplications.filter((a) =>
      ['REPORT_SUBMITTED', 'VERIFICATION_COMPLETED', 'GATC_REPORT_SUBMITTED', 'APPROVED'].includes(a.status)
    ),
    [safeApplications]
  );

  const certificatesPending = useMemo(
    () => safeApplications.filter((a) => a.status === 'APPROVED'),
    [safeApplications]
  );

  const recentlyCompleted = useMemo(
    () => safeApplications.filter((a) => ['CERTIFICATE_ISSUED', 'COMPLETED'].includes(a.status)),
    [safeApplications]
  );

  // Status Distribution Calculation for Real Application Status Chart
  const totalApps = safeApplications.length;
  const statusDistribution = useMemo(() => {
    if (totalApps === 0) return [];
    return [
      { label: 'Scrutiny', count: awaitingScrutiny.length, color: 'bg-amber-500', textColor: 'text-amber-700' },
      { label: 'Allocation', count: pendingAssignment.length, color: 'bg-blue-500', textColor: 'text-blue-700' },
      { label: 'In Inspection', count: scheduledVerifications.length, color: 'bg-purple-500', textColor: 'text-purple-700' },
      { label: 'Report Review', count: reportsAwaitingReview.length, color: 'bg-indigo-500', textColor: 'text-indigo-700' },
      { label: 'Certified', count: recentlyCompleted.length, color: 'bg-emerald-500', textColor: 'text-emerald-700' },
      { label: 'Returned', count: returnedApplications.length, color: 'bg-rose-500', textColor: 'text-rose-700' }
    ].filter(s => s.count > 0);
  }, [totalApps, awaitingScrutiny, pendingAssignment, scheduledVerifications, reportsAwaitingReview, recentlyCompleted, returnedApplications]);

  // Top 5 priority applications needing officer attention
  const priorityApplications = useMemo(() => {
    return [...safeApplications]
      .filter((a) => ['SUBMITTED', 'REPORT_SUBMITTED', 'GATC_REPORT_SUBMITTED', 'UNDER_REVIEW', 'VERIFICATION_COMPLETED'].includes(a.status))
      .sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0))
      .slice(0, 5);
  }, [safeApplications]);

  // Upcoming scheduled inspections (sorted by date)
  const upcomingInspections = useMemo(() => {
    return [...scheduledVerifications]
      .sort((a, b) => new Date(a.scheduled_date || a.preferred_date || 0) - new Date(b.scheduled_date || b.preferred_date || 0))
      .slice(0, 4);
  }, [scheduledVerifications]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto animate-in fade-in duration-300">
      {/* 1. Authority Header / Operational Overview */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white rounded-2xl p-6 border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
              Legal Metrology Administration Console
            </span>
          </div>
          <h1 className="text-xl font-bold text-slate-900">Jurisdiction Operations Summary</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Presiding Officer: <strong className="text-slate-800">{currentUser?.full_name || 'Designated Authority'}</strong> · Statutory Authority
          </p>
        </div>

        <div className="flex items-center gap-4 shrink-0 bg-slate-50 p-3 rounded-xl border border-slate-200/80">
          <div className="text-right">
            <span className="text-[10px] text-slate-400 block font-semibold uppercase tracking-wider">Total Applications</span>
            <span className="text-xl font-extrabold text-[#002046]">{totalApps}</span>
          </div>
          <div className="h-8 w-px bg-slate-200"></div>
          <div
            className="text-right cursor-pointer hover:opacity-80 transition-opacity"
            onClick={onViewCertificates}
            title="View all issued statutory certificates"
          >
            <span className="text-[10px] text-slate-400 block font-semibold uppercase tracking-wider">Issued Credentials</span>
            <span className="text-xl font-extrabold text-emerald-600">{recentlyCompleted.length}</span>
          </div>
        </div>
      </div>

      {/* 2. 8 Canonical Operational KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2.5 sm:gap-3">
        {/* KPI 1: Awaiting Scrutiny */}
        <div
          onClick={onViewQueue}
          className="bg-white rounded-xl p-3 border border-slate-200 shadow-xs hover:border-amber-400 cursor-pointer transition-all group min-w-0"
        >
          <div className="flex items-center justify-between text-slate-500 mb-1 min-w-0">
            <span className="text-[10px] font-bold uppercase tracking-wider truncate">Scrutiny</span>
            <span className="material-symbols-outlined text-amber-600 text-base group-hover:scale-110 transition-transform shrink-0">find_in_page</span>
          </div>
          <div className="text-lg sm:text-xl font-extrabold text-amber-600">{awaitingScrutiny.length}</div>
          <p className="text-[9.5px] text-slate-500 mt-0.5 truncate">New filings</p>
        </div>

        {/* KPI 2: Pending Assignment */}
        <div
          onClick={onViewQueue}
          className="bg-white rounded-xl p-3 border border-slate-200 shadow-xs hover:border-blue-400 cursor-pointer transition-all group min-w-0"
        >
          <div className="flex items-center justify-between text-slate-500 mb-1 min-w-0">
            <span className="text-[10px] font-bold uppercase tracking-wider truncate">Assignment</span>
            <span className="material-symbols-outlined text-blue-600 text-base group-hover:scale-110 transition-transform shrink-0">person_add</span>
          </div>
          <div className="text-lg sm:text-xl font-extrabold text-blue-600">{pendingAssignment.length}</div>
          <p className="text-[9.5px] text-slate-500 mt-0.5 truncate">Needs allocation</p>
        </div>

        {/* KPI 3: Scheduled Verifications */}
        <div
          onClick={onViewQueue}
          className="bg-white rounded-xl p-3 border border-slate-200 shadow-xs hover:border-purple-400 cursor-pointer transition-all group min-w-0"
        >
          <div className="flex items-center justify-between text-slate-500 mb-1 min-w-0">
            <span className="text-[10px] font-bold uppercase tracking-wider truncate">In Testing</span>
            <span className="material-symbols-outlined text-purple-600 text-base group-hover:scale-110 transition-transform shrink-0">hourglass_top</span>
          </div>
          <div className="text-lg sm:text-xl font-extrabold text-purple-600">{scheduledVerifications.length}</div>
          <p className="text-[9.5px] text-slate-500 mt-0.5 truncate">Field & GATC</p>
        </div>

        {/* KPI 4: Reports Awaiting Review */}
        <div
          onClick={onViewQueue}
          className="bg-white rounded-xl p-3 border border-slate-200 shadow-xs hover:border-indigo-400 cursor-pointer transition-all group min-w-0"
        >
          <div className="flex items-center justify-between text-slate-500 mb-1 min-w-0">
            <span className="text-[10px] font-bold uppercase tracking-wider truncate">Reports</span>
            <span className="material-symbols-outlined text-indigo-600 text-base group-hover:scale-110 transition-transform shrink-0">rate_review</span>
          </div>
          <div className="text-lg sm:text-xl font-extrabold text-indigo-600">{reportsAwaitingReview.length}</div>
          <p className="text-[9.5px] text-slate-500 mt-0.5 truncate">Submitted findings</p>
        </div>

        {/* KPI 5: Returned Applications */}
        <div
          onClick={onViewQueue}
          className="bg-white rounded-xl p-3 border border-slate-200 shadow-xs hover:border-rose-400 cursor-pointer transition-all group min-w-0"
        >
          <div className="flex items-center justify-between text-slate-500 mb-1 min-w-0">
            <span className="text-[10px] font-bold uppercase tracking-wider truncate">Returned</span>
            <span className="material-symbols-outlined text-rose-600 text-base group-hover:scale-110 transition-transform shrink-0">assignment_return</span>
          </div>
          <div className="text-lg sm:text-xl font-extrabold text-rose-600">{returnedApplications.length}</div>
          <p className="text-[9.5px] text-slate-500 mt-0.5 truncate">Deficiencies cited</p>
        </div>

        {/* KPI 6: Pending Decisions */}
        <div
          onClick={onViewQueue}
          className="bg-white rounded-xl p-3 border border-slate-200 shadow-xs hover:border-teal-400 cursor-pointer transition-all group min-w-0"
        >
          <div className="flex items-center justify-between text-slate-500 mb-1 min-w-0">
            <span className="text-[10px] font-bold uppercase tracking-wider truncate">Decisions</span>
            <span className="material-symbols-outlined text-teal-600 text-base group-hover:scale-110 transition-transform shrink-0">gavel</span>
          </div>
          <div className="text-lg sm:text-xl font-extrabold text-teal-600">{pendingDecisions.length}</div>
          <p className="text-[9.5px] text-slate-500 mt-0.5 truncate">Legal determinations</p>
        </div>

        {/* KPI 7: Certificates Pending Issuance */}
        <div
          onClick={onViewCertificates || onViewQueue}
          className="bg-white rounded-xl p-3 border border-slate-200 shadow-xs hover:border-emerald-400 cursor-pointer transition-all group min-w-0"
        >
          <div className="flex items-center justify-between text-slate-500 mb-1 min-w-0">
            <span className="text-[10px] font-bold uppercase tracking-wider truncate">Pending Cert</span>
            <span className="material-symbols-outlined text-emerald-600 text-base group-hover:scale-110 transition-transform shrink-0">workspace_premium</span>
          </div>
          <div className="text-lg sm:text-xl font-extrabold text-emerald-600">{certificatesPending.length}</div>
          <p className="text-[9.5px] text-slate-500 mt-0.5 truncate">Approved cases</p>
        </div>

        {/* KPI 8: Recently Completed */}
        <div
          onClick={onViewCertificates}
          className="bg-white rounded-xl p-3 border border-slate-200 shadow-xs hover:border-[#002046] cursor-pointer transition-all group min-w-0"
        >
          <div className="flex items-center justify-between text-slate-500 mb-1 min-w-0">
            <span className="text-[10px] font-bold uppercase tracking-wider truncate">Certified</span>
            <span className="material-symbols-outlined text-[#002046] text-base group-hover:scale-110 transition-transform shrink-0">verified</span>
          </div>
          <div className="text-lg sm:text-xl font-extrabold text-[#002046]">{recentlyCompleted.length}</div>
          <p className="text-[9.5px] text-slate-500 mt-0.5 truncate">Compliant instruments</p>
        </div>
      </div>

      {/* 3. Operational Distribution Meter (Status Chart) */}
      <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
              <span className="material-symbols-outlined text-primary text-base">donut_large</span>
              Operational Application Lifecycle Distribution
            </h3>
            <p className="text-[11px] text-slate-500">Live breakdown of filed instruments across legal verification stages</p>
          </div>
          <span className="text-xs font-bold text-slate-700 bg-slate-100 px-2.5 py-1 rounded-lg">
            {totalApps} Total Registered Cases
          </span>
        </div>

        {totalApps === 0 ? (
          <div className="py-6 text-center text-slate-400 text-xs">
            No application data available yet in MongoDB.
          </div>
        ) : (
          <>
            {/* Multi-segment progress bar */}
            <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden flex shadow-inner">
              {statusDistribution.map((item, idx) => {
                const pct = (item.count / totalApps) * 100;
                return (
                  <div
                    key={idx}
                    className={`${item.color} h-full transition-all duration-500`}
                    style={{ width: `${pct}%` }}
                    title={`${item.label}: ${item.count} (${pct.toFixed(1)}%)`}
                  />
                );
              })}
            </div>

            {/* Segment legend with exact counts and percentages */}
            <div className="flex items-center gap-3 sm:gap-4 flex-wrap text-xs pt-1">
              {statusDistribution.map((item, idx) => {
                const pct = ((item.count / totalApps) * 100).toFixed(0);
                return (
                  <div key={idx} className="flex items-center gap-1.5">
                    <span className={`w-2.5 h-2.5 rounded-full ${item.color}`}></span>
                    <span className="font-semibold text-slate-700">{item.label}:</span>
                    <strong className="text-slate-900 font-mono">{item.count}</strong>
                    <span className="text-[10px] text-slate-400 font-medium">({pct}%)</span>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* 4. Quick Action Navigation Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <button
          onClick={onViewQueue}
          className="p-4 bg-white rounded-xl border border-slate-200 hover:border-[#002046] hover:bg-slate-50/80 transition-all text-left group cursor-pointer flex items-center gap-3 shadow-2xs"
        >
          <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-800 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
            <span className="material-symbols-outlined text-xl">assignment</span>
          </div>
          <div>
            <h4 className="text-xs font-bold text-slate-900 group-hover:text-primary transition-colors">Applications Queue</h4>
            <p className="text-[11px] text-slate-500">Scrutiny & Allocation Queue</p>
          </div>
        </button>

        <button
          onClick={onViewCertificates || onViewQueue}
          className="p-4 bg-white rounded-xl border border-slate-200 hover:border-emerald-500 hover:bg-emerald-50/50 transition-all text-left group cursor-pointer flex items-center gap-3 shadow-2xs"
        >
          <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-800 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
            <span className="material-symbols-outlined text-xl">workspace_premium</span>
          </div>
          <div>
            <h4 className="text-xs font-bold text-slate-900 group-hover:text-emerald-800 transition-colors">Issued Certificates</h4>
            <p className="text-[11px] text-slate-500">Compliance register & QR tokens</p>
          </div>
        </button>

        <button
          onClick={onViewAuditLogs || onViewQueue}
          className="p-4 bg-white rounded-xl border border-slate-200 hover:border-purple-500 hover:bg-purple-50/50 transition-all text-left group cursor-pointer flex items-center gap-3 shadow-2xs"
        >
          <div className="w-10 h-10 rounded-lg bg-purple-50 text-purple-800 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
            <span className="material-symbols-outlined text-xl">history_edu</span>
          </div>
          <div>
            <h4 className="text-xs font-bold text-slate-900 group-hover:text-purple-800 transition-colors">Audit & Governance</h4>
            <p className="text-[11px] text-slate-500">Statutory log & overrides</p>
          </div>
        </button>

        <button
          onClick={onViewQueue}
          className="p-4 bg-white rounded-xl border border-slate-200 hover:border-amber-500 hover:bg-amber-50/50 transition-all text-left group cursor-pointer flex items-center gap-3 shadow-2xs"
        >
          <div className="w-10 h-10 rounded-lg bg-amber-50 text-amber-800 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
            <span className="material-symbols-outlined text-xl">rate_review</span>
          </div>
          <div>
            <h4 className="text-xs font-bold text-slate-900 group-hover:text-amber-800 transition-colors">Report Determinations</h4>
            <p className="text-[11px] text-slate-500">Legal approval / return suite</p>
          </div>
        </button>
      </div>

      {/* 5. Priority Work Items & Upcoming Schedule (2 Column Grid) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Priority Operational Queue (2 cols on large screen) */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between gap-3 bg-slate-50/50">
            <div>
              <h2 className="text-sm font-bold text-slate-900">Priority Operational Queue</h2>
              <p className="text-xs text-slate-500 mt-0.5">Top applications requiring scrutiny, assignment, or report determination</p>
            </div>
            <button
              onClick={onViewQueue}
              className="text-xs font-bold text-primary hover:underline flex items-center gap-1 cursor-pointer"
            >
              <span>Full Queue ({safeApplications.length})</span>
              <span className="material-symbols-outlined text-sm">arrow_forward</span>
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs min-w-[640px]">
              <thead className="bg-slate-100 text-slate-600 font-semibold border-b border-slate-200">
                <tr>
                  <th className="px-5 py-3">Application No</th>
                  <th className="px-5 py-3">Trader & Establishment</th>
                  <th className="px-5 py-3">Instrument</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3">Assigned Personnel</th>
                  <th className="px-5 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-slate-700">
                {priorityApplications.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-8 text-center text-slate-400">
                      <span className="material-symbols-outlined text-2xl mb-1 text-slate-300 block">task_alt</span>
                      No pending priority items requiring officer action.
                    </td>
                  </tr>
                ) : (
                  priorityApplications.map((app) => (
                    <tr key={app.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-5 py-3 font-mono font-bold text-[#002046]">
                        {app.application_no}
                      </td>
                      <td className="px-5 py-3">
                        <span className="font-bold text-slate-900 block">{app.trader_name}</span>
                        <span className="text-[10px] text-slate-500">{app.trader_org}</span>
                      </td>
                      <td className="px-5 py-3">
                        <span className="font-bold text-slate-900 block">{app.manufacturer} {app.model}</span>
                        <span className="font-mono text-[10px] text-slate-500">SN: {app.serial_number}</span>
                      </td>
                      <td className="px-5 py-3">
                        <StatusBadge status={app.status} />
                      </td>
                      <td className="px-5 py-3 text-slate-600">
                        {app.assigned_to_name ? (
                          <span className="font-medium text-slate-900">{app.assigned_to_name}</span>
                        ) : (
                          <span className="text-amber-600 italic">Unassigned</span>
                        )}
                      </td>
                      <td className="px-5 py-3 text-right space-x-1.5 whitespace-nowrap">
                        {(!app.assigned_id || ['SUBMITTED', 'UNDER_REVIEW', 'PAYMENT_VERIFIED'].includes(app.status)) ? (
                          <button
                            onClick={() => onAssignApplication ? onAssignApplication(app.id) : onReviewApplication(app.id)}
                            className="px-3 py-1.5 bg-[#002046] hover:bg-[#001733] text-white rounded-lg text-[11px] font-bold transition-all cursor-pointer inline-flex items-center gap-1.5 shadow-2xs border border-[#002046]"
                          >
                            <span className="material-symbols-outlined text-xs text-amber-400 font-bold">person_add</span>
                            <span>Assign Officer / GATC</span>
                          </button>
                        ) : ['REPORT_SUBMITTED', 'VERIFICATION_COMPLETED', 'GATC_REPORT_SUBMITTED'].includes(app.status) ? (
                          <button
                            onClick={() => onReviewApplication(app.id)}
                            className="px-3 py-1.5 bg-indigo-700 hover:bg-indigo-800 text-white rounded-lg text-[11px] font-bold transition-all cursor-pointer inline-flex items-center gap-1.5 shadow-2xs"
                          >
                            <span className="material-symbols-outlined text-xs text-amber-300">rate_review</span>
                            <span>Review & Issue</span>
                          </button>
                        ) : (
                          <button
                            onClick={() => onReviewApplication(app.id)}
                            className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg text-[11px] font-bold transition-all cursor-pointer inline-flex items-center gap-1"
                          >
                            <span className="material-symbols-outlined text-xs">visibility</span>
                            <span>Review Case</span>
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Upcoming Verification Schedule (1 col on large screen) */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs flex flex-col">
          <div className="px-5 py-4 border-b border-slate-200 bg-slate-50/50">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
              <span className="material-symbols-outlined text-purple-700 text-base">calendar_month</span>
              Upcoming Inspection Schedule
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">Assigned field inspections & laboratory test slots</p>
          </div>

          <div className="p-4 flex-1 space-y-3">
            {upcomingInspections.length === 0 ? (
              <div className="py-10 text-center text-slate-400 text-xs">
                <span className="material-symbols-outlined text-3xl mb-1 text-slate-300 block">event_busy</span>
                No upcoming inspections currently scheduled in this jurisdiction.
              </div>
            ) : (
              upcomingInspections.map((app) => (
                <div
                  key={app.id}
                  onClick={() => onReviewApplication(app.id)}
                  className="p-3 rounded-xl border border-slate-200 bg-slate-50/60 hover:bg-slate-100/80 hover:border-primary/40 transition-all cursor-pointer space-y-1.5 text-xs"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-bold text-[#002046] text-[11px]">{app.application_no}</span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-100 text-purple-800">
                      {app.verification_mode === 'IN_SITU' ? 'On-Site Inspection' : 'Camp / Presentation'}
                    </span>
                  </div>
                  <div className="font-semibold text-slate-900 text-xs">
                    {app.manufacturer} {app.model}
                  </div>
                  <div className="text-[11px] text-slate-500 flex items-center justify-between">
                    <span>Officer: <strong className="text-slate-800">{app.assigned_to_name || 'Designated Verifier'}</strong></span>
                    <span className="text-slate-600 font-medium">{app.scheduled_date || app.preferred_date || 'Date Pending'}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
