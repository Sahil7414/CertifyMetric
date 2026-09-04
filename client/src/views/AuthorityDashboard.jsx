import React from 'react';
import StatusBadge from '../components/StatusBadge';

export default function AuthorityDashboard({
  currentUser,
  applications = [],
  stats,
  onReviewApplication,
  onViewWorkload
}) {
  const safeApplications = Array.isArray(applications) ? applications : [];
  const pendingReview = safeApplications.filter(a => a.status === 'SUBMITTED');
  const awaitingAssign = safeApplications.filter(a => a.status === 'UNDER_REVIEW');
  const activeTesting = safeApplications.filter(a => ['ASSIGNED', 'SCHEDULED', 'VERIFICATION_IN_PROGRESS'].includes(a.status));
  const completed = safeApplications.filter(a => a.status === 'CERTIFICATE_ISSUED');

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Authority Overview Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white rounded-2xl p-6 border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Legal Metrology Administration Console</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900">
            Jurisdiction Operations Overview
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Presiding Officer: <strong>{currentUser?.full_name}</strong> • National Capital Territory Zone
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-right">
            <span className="text-[11px] text-slate-400 block font-medium">Compliance Rate</span>
            <span className="text-lg font-extrabold text-emerald-600">96.8%</span>
          </div>
          <div className="h-8 w-px bg-slate-200"></div>
          <div className="text-right">
            <span className="text-[11px] text-slate-400 block font-medium">Total Registered Units</span>
            <span className="text-lg font-extrabold text-primary">{stats?.totalInstruments || 0}</span>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Awaiting Review</span>
            <span className="material-symbols-outlined text-amber-600 text-xl">pending_actions</span>
          </div>
          <div className="text-2xl font-extrabold text-amber-600">{pendingReview.length}</div>
          <p className="text-[11px] text-slate-500 mt-1">Requires statutory eligibility check</p>
        </div>

        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">In Testing / Queue</span>
            <span className="material-symbols-outlined text-purple-600 text-xl">hourglass_top</span>
          </div>
          <div className="text-2xl font-extrabold text-purple-600">{activeTesting.length}</div>
          <p className="text-[11px] text-slate-500 mt-1">Assigned or scheduled in field/lab</p>
        </div>

        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Certificates Issued</span>
            <span className="material-symbols-outlined text-emerald-600 text-xl">verified</span>
          </div>
          <div className="text-2xl font-extrabold text-emerald-600">{completed.length}</div>
          <p className="text-[11px] text-slate-500 mt-1">Statutory verifications passed</p>
        </div>

        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Expiring / Overdue</span>
            <span className="material-symbols-outlined text-rose-600 text-xl">warning</span>
          </div>
          <div className="text-2xl font-extrabold text-rose-600">{stats?.expiringInstruments || 0}</div>
          <p className="text-[11px] text-slate-500 mt-1">Due for annual re-verification</p>
        </div>
      </div>

      {/* Applications Action Queue */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="text-base font-bold text-slate-900">Verification Applications & Allocations Queue</h2>
            <p className="text-xs text-slate-500 mt-0.5">Review, verify statutory rule eligibility, and assign authorized verification personnel</p>
          </div>
          <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-primary/10 text-primary self-start sm:self-auto">
            {applications.length} Applications Total
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-100 text-slate-600 font-semibold border-b border-slate-200">
              <tr>
                <th className="px-6 py-3.5">Application No</th>
                <th className="px-6 py-3.5">Trader & Establishment</th>
                <th className="px-6 py-3.5">Instrument & Category</th>
                <th className="px-6 py-3.5">Current Status</th>
                <th className="px-6 py-3.5">Assigned Officer / Centre</th>
                <th className="px-6 py-3.5 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-slate-700">
              {applications.map((app) => (
                <tr key={app.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="px-6 py-4">
                    <span className="font-mono font-bold text-primary">{app.application_no}</span>
                    <span className="block text-[10px] text-slate-400 mt-0.5">{new Date(app.created_at).toLocaleDateString()}</span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="font-bold text-slate-900">{app.trader_name}</div>
                    <div className="text-[11px] text-slate-500">{app.trader_org}</div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="font-semibold text-slate-800">{app.manufacturer} {app.model}</span>
                    <span className="block text-[10px] font-mono text-slate-400">SN: {app.serial_number}</span>
                  </td>
                  <td className="px-6 py-4">
                    <StatusBadge status={app.status} />
                  </td>
                  <td className="px-6 py-4">
                    {app.assigned_id ? (
                      <div>
                        <span className="font-semibold text-slate-900">{app.assigned_type === 'GATC' ? 'GATC Lab 04' : 'Vikram Singh (LMO)'}</span>
                        {app.is_override ? (
                          <span className="block text-[10px] text-amber-600 font-medium">Authority Override</span>
                        ) : (
                          <span className="block text-[10px] text-emerald-600 font-medium">System Recommended</span>
                        )}
                      </div>
                    ) : (
                      <span className="text-slate-400 italic">Unassigned</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button
                      onClick={() => onReviewApplication(app.id)}
                      className="px-3.5 py-1.5 bg-primary text-white font-bold rounded-lg hover:bg-primary-container text-xs transition-all shadow-xs inline-flex items-center gap-1.5"
                    >
                      <span className="material-symbols-outlined text-[15px]">rate_review</span>
                      Review & Assign
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
