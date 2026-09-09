import React, { useEffect, useState } from 'react';
import StatusBadge from '../components/StatusBadge';
import { api } from '../api';

export default function GatcDashboard({
  currentUser,
  onOpenCase
}) {
  const [cases, setCases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState('ALL');

  const loadCases = () => {
    if (currentUser?.id) {
      setLoading(true);
      api.getVerifierCases(currentUser.id)
        .then(setCases)
        .catch(console.error)
        .finally(() => setLoading(false));
    }
  };

  useEffect(() => {
    loadCases();
  }, [currentUser]);

  const pendingCases = cases.filter(c => ['ASSIGNED', 'PENDING_VERIFICATION', 'IN_PROGRESS'].includes(c.application_status));
  const submittedCases = cases.filter(c => ['REPORT_SUBMITTED', 'VERIFICATION_COMPLETED', 'VERIFICATION_FAILED'].includes(c.application_status));

  const filteredCases = cases.filter(c => {
    if (activeFilter === 'PENDING') return ['ASSIGNED', 'PENDING_VERIFICATION', 'IN_PROGRESS'].includes(c.application_status);
    if (activeFilter === 'SUBMITTED') return ['REPORT_SUBMITTED', 'VERIFICATION_COMPLETED', 'VERIFICATION_FAILED'].includes(c.application_status);
    return true;
  });

  if (loading) {
    return (
      <div className="p-16 text-center text-slate-500 text-xs">
        <span className="material-symbols-outlined text-3xl animate-spin block mb-2 text-primary">progress_activity</span>
        Loading Government Approved Test Centre Laboratory Console...
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto animate-in fade-in duration-300">
      {/* 1. Laboratory Identity Header */}
      <div className="bg-gradient-to-r from-[#0c2340] via-[#143d66] to-[#00529b] rounded-2xl p-6 text-white shadow-md flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-white/10 backdrop-blur-xs border border-white/20 flex items-center justify-center text-cyan-300 shadow-inner shrink-0">
            <span className="material-symbols-outlined text-4xl">biotech</span>
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl font-bold text-white tracking-tight">{currentUser?.full_name}</h1>
              <span className="text-[10px] uppercase font-mono font-extrabold px-2.5 py-0.5 rounded-full bg-cyan-400/20 text-cyan-200 border border-cyan-400/30">
                GATC Test Facility • NABL Traceable
              </span>
            </div>
            <p className="text-xs text-slate-300 mt-1">
              Statutory Laboratory Metrology Testing Centre • Department of Legal Metrology
            </p>
            <div className="flex items-center gap-3 text-[11px] text-slate-300 pt-1">
              <span>Station ID: <strong className="text-white font-mono">{currentUser?.id}</strong></span>
              <span>•</span>
              <span className="text-emerald-300 font-semibold flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                Chamber Environment: 20.1°C • 52% RH (Calibrated)
              </span>
            </div>
          </div>
        </div>

        <div className="text-left md:text-right border-t md:border-t-0 pt-3 md:pt-0 border-white/10">
          <span className="text-[10px] text-cyan-200 uppercase font-bold tracking-wider block">Lab Testing Mandate</span>
          <span className="text-xs font-semibold text-white/90">
            Schedule VII & OIML Technical Evaluations
          </span>
          <span className="block text-[11px] text-slate-300 mt-0.5">
            Reports Transmitted to Legal Metrology Officer
          </span>
        </div>
      </div>

      {/* 2. Statutory Role Separation Notice */}
      <div className="p-4 rounded-xl bg-amber-50 border border-amber-200/80 text-xs text-amber-900 flex items-start gap-3">
        <span className="material-symbols-outlined text-amber-600 text-lg shrink-0 mt-0.5">info</span>
        <div className="space-y-0.5">
          <strong className="font-bold text-amber-950">Statutory Boundary Notification — Technical Test Reports:</strong>
          <p className="text-amber-800 leading-relaxed">
            As a Government Approved Test Centre (GATC), your findings and measurements are recorded as <strong>Technical Laboratory Reports</strong>. Final statutory legal verification decisions, certificate generation, and legal stamp authorizations are reserved for the designated Legal Metrology Authority Officer.
          </p>
        </div>
      </div>

      {/* 3. Laboratory Performance & Workload KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Active Lab Requests</span>
            <span className="material-symbols-outlined text-primary text-xl">pending_actions</span>
          </div>
          <div className="text-2xl font-extrabold text-slate-900 font-mono">{pendingCases.length}</div>
          <span className="text-[10px] text-slate-400">Awaiting technical evaluation</span>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Reports Forwarded</span>
            <span className="material-symbols-outlined text-emerald-600 text-xl">fact_check</span>
          </div>
          <div className="text-2xl font-extrabold text-slate-900 font-mono">{submittedCases.length}</div>
          <span className="text-[10px] text-slate-400">Transmitted to Authority</span>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Mass Standards</span>
            <span className="material-symbols-outlined text-cyan-600 text-xl">balance</span>
          </div>
          <div className="text-2xl font-extrabold text-slate-900 font-mono">Class E2 / F1</div>
          <span className="text-[10px] text-slate-400">NPL Traceable Reference</span>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Chamber Status</span>
            <span className="material-symbols-outlined text-indigo-600 text-xl">thermostat</span>
          </div>
          <div className="text-base font-extrabold text-emerald-600 flex items-center gap-1 mt-1">
            <span className="material-symbols-outlined text-sm">check_circle</span> In Spec (ISO 17025)
          </div>
          <span className="text-[10px] text-slate-400">20°C ± 0.5°C • 50% RH</span>
        </div>
      </div>

      {/* 4. Laboratory Testing Queue */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-1">
          <div>
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-800">
              Laboratory Testing Queue ({filteredCases.length})
            </h2>
            <p className="text-xs text-slate-500">Technical metrological test cases dispatched by District Legal Metrology Officers</p>
          </div>

          <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl text-xs font-semibold">
            <button
              onClick={() => setActiveFilter('ALL')}
              className={`px-3 py-1 rounded-lg transition-all ${activeFilter === 'ALL' ? 'bg-white text-slate-900 shadow-xs font-bold' : 'text-slate-600 hover:text-slate-900'}`}
            >
              All Cases ({cases.length})
            </button>
            <button
              onClick={() => setActiveFilter('PENDING')}
              className={`px-3 py-1 rounded-lg transition-all ${activeFilter === 'PENDING' ? 'bg-white text-slate-900 shadow-xs font-bold' : 'text-slate-600 hover:text-slate-900'}`}
            >
              Testing Active ({pendingCases.length})
            </button>
            <button
              onClick={() => setActiveFilter('SUBMITTED')}
              className={`px-3 py-1 rounded-lg transition-all ${activeFilter === 'SUBMITTED' ? 'bg-white text-slate-900 shadow-xs font-bold' : 'text-slate-600 hover:text-slate-900'}`}
            >
              Submitted Reports ({submittedCases.length})
            </button>
          </div>
        </div>

        {filteredCases.length === 0 ? (
          <div className="bg-white rounded-2xl p-12 text-center text-slate-400 border border-slate-200">
            <span className="material-symbols-outlined text-4xl mb-2 text-slate-300 block">science</span>
            No laboratory testing cases match the selected filter.
          </div>
        ) : (
          filteredCases.map((c) => {
            const isSubmitted = ['REPORT_SUBMITTED', 'VERIFICATION_COMPLETED', 'VERIFICATION_FAILED'].includes(c.application_status);
            const isInProgress = c.application_status === 'IN_PROGRESS';

            return (
              <div
                key={c.application_id}
                className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs hover:border-cyan-500/40 transition-all flex flex-col md:flex-row items-start md:items-center justify-between gap-4"
              >
                <div className="space-y-2 text-xs flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono font-bold text-cyan-800 bg-cyan-50 border border-cyan-200 px-2 py-0.5 rounded">
                      {c.application_no}
                    </span>
                    <StatusBadge status={c.application_status} />
                    <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                      Laboratory Specimen Presentation
                    </span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono text-slate-500 bg-slate-50">
                      Standard: OIML R76 / Class III
                    </span>
                  </div>

                  <div>
                    <h3 className="font-bold text-slate-900 text-sm">
                      {c.manufacturer} {c.model}
                    </h3>
                    <p className="text-slate-500 text-[11px] mt-0.5">
                      Serial Number: <strong className="font-mono text-slate-700">{c.serial_number}</strong> • Max Capacity: <strong>{c.max_capacity}</strong>
                    </p>
                  </div>

                  <div className="text-slate-600 grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1 pt-1 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                    <div>
                      <span className="text-slate-400 block text-[10px] uppercase font-bold">Applicant Establishment</span>
                      <span className="font-semibold text-slate-800">{c.trader_name}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px] uppercase font-bold">Testing Premises</span>
                      <span className="text-slate-700 truncate block">{c.location || 'Central Metrology Testing Lab'}</span>
                    </div>
                  </div>
                </div>

                <div className="self-end md:self-center shrink-0">
                  <button
                    onClick={() => onOpenCase(c.application_id)}
                    className={`px-4 py-2.5 font-bold rounded-xl text-xs shadow-xs transition-all flex items-center gap-1.5 ${
                      isSubmitted
                        ? 'bg-slate-100 hover:bg-slate-200 text-slate-800'
                        : isInProgress
                        ? 'bg-amber-600 hover:bg-amber-700 text-white'
                        : 'bg-primary hover:bg-primary-container text-white'
                    }`}
                  >
                    <span className="material-symbols-outlined text-[16px]">
                      {isSubmitted ? 'fact_check' : isInProgress ? 'edit_note' : 'biotech'}
                    </span>
                    {isSubmitted
                      ? 'Review Technical Report'
                      : isInProgress
                      ? 'Resume Lab Testing'
                      : 'Open Technical Workspace'}
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
