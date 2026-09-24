import React, { useEffect, useState, useMemo } from 'react';
import StatusBadge from '../components/StatusBadge';
import Pagination from '../components/Pagination';
import { api } from '../api';

export default function VerifierDashboard({ currentUser, onOpenCase, onViewAllCases, onSelectCertificate }) {
  const [cases, setCases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('QUEUE'); // 'QUEUE' | 'HISTORY'
  const [searchQuery, setSearchQuery] = useState('');
  const [outcomeFilter, setOutcomeFilter] = useState('ALL'); // 'ALL' | 'PASS' | 'FAIL' | 'IN_PROGRESS'

  // Pagination states
  const [historyPage, setHistoryPage] = useState(1);
  const [historyPageSize, setHistoryPageSize] = useState(10);

  const loadCases = () => {
    if (currentUser?.id) {
      setLoading(true);
      api
        .getVerifierCases(currentUser.id)
        .then(setCases)
        .catch(console.error)
        .finally(() => setLoading(false));
    }
  };

  useEffect(() => {
    loadCases();
  }, [currentUser]);

  const safeCases = Array.isArray(cases) ? cases : [];

  const todayStr = new Date().toISOString().split('T')[0];
  const todaysCases = safeCases.filter((c) => c.scheduled_date && c.scheduled_date.startsWith(todayStr));
  const pendingCases = safeCases.filter((c) =>
    ['ASSIGNED', 'PENDING_VERIFICATION', 'SCHEDULED'].includes(c.application_status)
  );
  const inProgressCases = safeCases.filter((c) => c.application_status === 'IN_PROGRESS');
  const submittedCases = safeCases.filter((c) =>
    ['VERIFICATION_COMPLETED', 'REPORT_SUBMITTED', 'VERIFICATION_FAILED', 'APPROVED'].includes(c.application_status)
  );

  // Worked Instruments: Any case where the officer has recorded testing or completed report
  const workedInstruments = safeCases.filter((c) =>
    ['IN_PROGRESS', 'REPORT_SUBMITTED', 'VERIFICATION_COMPLETED', 'VERIFICATION_FAILED', 'APPROVED'].includes(c.application_status) ||
    Boolean(c.verification_id) || Boolean(c.verification_result)
  );

  // Top 5 upcoming or active field cases
  const priorityCases = safeCases
    .filter((c) => !['APPROVED', 'VERIFICATION_COMPLETED', 'VERIFICATION_FAILED'].includes(c.application_status))
    .sort((a, b) => new Date(a.scheduled_date || 0) - new Date(b.scheduled_date || 0))
    .slice(0, 5);

  // Filtered Worked Instruments History
  const filteredHistory = workedInstruments.filter((c) => {
    const q = searchQuery.toLowerCase().trim();
    const matchQuery = !q ||
      (c.serial_number && c.serial_number.toLowerCase().includes(q)) ||
      (c.manufacturer && c.manufacturer.toLowerCase().includes(q)) ||
      (c.model && c.model.toLowerCase().includes(q)) ||
      (c.trader_name && c.trader_name.toLowerCase().includes(q)) ||
      (c.application_no && c.application_no.toLowerCase().includes(q)) ||
      (c.certificate_no && c.certificate_no.toLowerCase().includes(q));

    let matchOutcome = true;
    if (outcomeFilter === 'PASS') matchOutcome = c.verification_result === 'PASS' || c.application_status === 'APPROVED';
    else if (outcomeFilter === 'FAIL') matchOutcome = c.verification_result === 'FAIL' || c.application_status === 'VERIFICATION_FAILED';
    else if (outcomeFilter === 'IN_PROGRESS') matchOutcome = c.application_status === 'IN_PROGRESS';

    return matchQuery && matchOutcome;
  });

  // Reset to page 1 on filter changes
  useEffect(() => {
    setHistoryPage(1);
  }, [searchQuery, outcomeFilter]);

  const totalHistoryPages = Math.ceil(filteredHistory.length / historyPageSize) || 1;
  const paginatedHistory = useMemo(() => {
    const startIndex = (historyPage - 1) * historyPageSize;
    return filteredHistory.slice(startIndex, startIndex + historyPageSize);
  }, [filteredHistory, historyPage, historyPageSize]);

  const passedCount = workedInstruments.filter(c => c.verification_result === 'PASS' || c.application_status === 'APPROVED').length;
  const failedCount = workedInstruments.filter(c => c.verification_result === 'FAIL' || c.application_status === 'VERIFICATION_FAILED').length;
  const certifiedCount = workedInstruments.filter(c => Boolean(c.certificate_no) || c.application_status === 'APPROVED').length;

  if (loading) {
    return (
      <div className="space-y-4 w-full animate-pulse">
        <div className="h-32 skeleton rounded-2xl"></div>
        <div className="grid grid-cols-5 gap-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-24 skeleton rounded-2xl"></div>
          ))}
        </div>
        <div className="h-64 skeleton rounded-2xl"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 w-full animate-in fade-in duration-300">
      {/* ====================================================
          1. Officer Identity Header (No Profile Image)
         ==================================================== */}
      <div className="bg-gradient-to-r from-[#002046] via-[#0d2e57] to-[#1b365d] rounded-2xl p-5 sm:p-6 text-white shadow-md flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          {/* Statutory Officer Badge Icon (Replaces profile photo) */}
          <div className="w-14 h-14 rounded-2xl bg-white/10 backdrop-blur-xs border-2 border-white/25 flex items-center justify-center text-amber-400 shadow-inner shrink-0">
            <span className="material-symbols-outlined text-3xl">shield_person</span>
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-lg sm:text-xl font-bold text-white">{currentUser?.full_name}</h1>
              <span className="text-[10px] uppercase font-bold px-2.5 py-0.5 rounded-full bg-white/20 text-white border border-white/20">
                Authorized Field Verifier
              </span>
            </div>
            <p className="text-xs text-slate-300 mt-0.5">
              Legal Metrology Field Operations • <strong className="text-white font-bold">{workedInstruments.length} Instruments Worked</strong> ({safeCases.length} total assignments)
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={loadCases}
          className="px-3.5 py-2 bg-white/10 hover:bg-white/20 text-white text-xs font-semibold rounded-xl border border-white/20 flex items-center gap-1.5 cursor-pointer transition-all self-end sm:self-center shadow-2xs"
        >
          <span className="material-symbols-outlined text-sm">sync</span>
          <span>Refresh Workload</span>
        </button>
      </div>

      {/* ====================================================
          2. Field Officer KPIs
         ==================================================== */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5 sm:gap-4">
        <div className="bg-white rounded-xl p-3.5 sm:p-4 border border-slate-200 shadow-xs min-w-0">
          <div className="flex items-center justify-between text-slate-500 mb-1.5 min-w-0">
            <span className="text-[10px] font-bold uppercase tracking-wider truncate">Assigned</span>
            <span className="material-symbols-outlined text-[#002046] text-lg sm:text-xl shrink-0">assignment</span>
          </div>
          <div className="text-xl sm:text-2xl font-extrabold text-[#002046]">{safeCases.length}</div>
          <p className="text-[10px] text-slate-500 mt-0.5 truncate">Total cases</p>
        </div>

        <div className="bg-white rounded-xl p-3.5 sm:p-4 border border-slate-200 shadow-xs min-w-0">
          <div className="flex items-center justify-between text-slate-500 mb-1.5 min-w-0">
            <span className="text-[10px] font-bold uppercase tracking-wider truncate">Today's</span>
            <span className="material-symbols-outlined text-amber-600 text-lg sm:text-xl shrink-0">today</span>
          </div>
          <div className="text-xl sm:text-2xl font-extrabold text-amber-600">{todaysCases.length}</div>
          <p className="text-[10px] text-slate-500 mt-0.5 truncate">Scheduled today</p>
        </div>

        <div className="bg-white rounded-xl p-3.5 sm:p-4 border border-slate-200 shadow-xs min-w-0">
          <div className="flex items-center justify-between text-slate-500 mb-1.5 min-w-0">
            <span className="text-[10px] font-bold uppercase tracking-wider truncate">In Progress</span>
            <span className="material-symbols-outlined text-purple-600 text-lg sm:text-xl shrink-0">edit_note</span>
          </div>
          <div className="text-xl sm:text-2xl font-extrabold text-purple-600">{inProgressCases.length}</div>
          <p className="text-[10px] text-slate-500 mt-0.5 truncate">Draft testing</p>
        </div>

        <div className="bg-white rounded-xl p-3.5 sm:p-4 border border-slate-200 shadow-xs min-w-0">
          <div className="flex items-center justify-between text-slate-500 mb-1.5 min-w-0">
            <span className="text-[10px] font-bold uppercase tracking-wider truncate">Worked</span>
            <span className="material-symbols-outlined text-blue-600 text-lg sm:text-xl shrink-0">history</span>
          </div>
          <div className="text-xl sm:text-2xl font-extrabold text-blue-600">{workedInstruments.length}</div>
          <p className="text-[10px] text-slate-500 mt-0.5 truncate">Total inspected</p>
        </div>

        <div className="bg-white rounded-xl p-3.5 sm:p-4 border border-slate-200 shadow-xs col-span-2 sm:col-span-1 min-w-0">
          <div className="flex items-center justify-between text-slate-500 mb-1.5 min-w-0">
            <span className="text-[10px] font-bold uppercase tracking-wider truncate">Certified</span>
            <span className="material-symbols-outlined text-emerald-600 text-lg sm:text-xl shrink-0">verified</span>
          </div>
          <div className="text-xl sm:text-2xl font-extrabold text-emerald-600">{certifiedCount}</div>
          <p className="text-[10px] text-slate-500 mt-0.5 truncate">Form 6 issued</p>
        </div>
      </div>

      {/* ====================================================
          3. Workload vs History Segmented Switcher
         ==================================================== */}
      <div className="flex items-center gap-2 p-1.5 bg-slate-200/70 rounded-xl w-full sm:w-auto self-start">
        <button
          type="button"
          onClick={() => setActiveTab('QUEUE')}
          className={`flex-1 sm:flex-initial px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
            activeTab === 'QUEUE'
              ? 'bg-white text-[#002046] shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <span className="material-symbols-outlined text-base">checklist</span>
          <span>Active Field Queue ({priorityCases.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('HISTORY')}
          className={`flex-1 sm:flex-initial px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
            activeTab === 'HISTORY'
              ? 'bg-white text-[#002046] shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <span className="material-symbols-outlined text-base text-blue-600">history_edu</span>
          <span>Worked Instruments History ({workedInstruments.length})</span>
        </button>
      </div>

      {/* ====================================================
          4A. TAB 1: ACTIVE QUEUE (Priority Cases)
         ==================================================== */}
      {activeTab === 'QUEUE' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between gap-3 bg-slate-50/50">
            <div>
              <h2 className="text-sm font-bold text-slate-900">Priority & Upcoming Field Cases</h2>
              <p className="text-xs text-slate-500 mt-0.5">Assigned verification inspections requiring on-site MPE testing</p>
            </div>
            {onViewAllCases && (
              <button
                type="button"
                onClick={onViewAllCases}
                className="text-xs font-bold text-primary hover:underline flex items-center gap-1 cursor-pointer"
              >
                <span>Full Workspace ({safeCases.length})</span>
                <span className="material-symbols-outlined text-sm">arrow_forward</span>
              </button>
            )}
          </div>

          <div className="divide-y divide-slate-200">
            {priorityCases.length === 0 ? (
              <div className="p-8 text-center text-slate-400">
                <span className="material-symbols-outlined text-3xl mb-1 text-slate-300 block">checklist</span>
                No pending verification assignments in your active queue.
              </div>
            ) : (
              priorityCases.map((c) => {
                const isInProgress = c.application_status === 'IN_PROGRESS';
                const hasSchedule = c.scheduled_date || c.time_slot;
                const isToday = c.scheduled_date && c.scheduled_date.startsWith(todayStr);
                const scheduleLabel = c.scheduled_date
                  ? new Date(c.scheduled_date + 'T00:00:00').toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', weekday: 'short' })
                  : null;

                return (
                  <div
                    key={c.application_id}
                    className="p-4 sm:p-5 hover:bg-slate-50/80 transition-colors flex flex-col md:flex-row items-start md:items-center justify-between gap-4"
                  >
                    <div className="space-y-1.5 text-xs flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono font-bold text-primary bg-primary/10 px-2 py-0.5 rounded">
                          {c.application_no}
                        </span>
                        <StatusBadge status={c.application_status} />
                        <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                          {c.arrangement_type === 'FIELD_VISIT' || c.verification_mode === 'IN_SITU'
                            ? 'On-Site Field Visit'
                            : 'Centre Presentation'}
                        </span>
                      </div>

                      <h3 className="font-bold text-slate-900 text-sm">
                        {c.manufacturer} {c.model}
                      </h3>

                      {/* Scheduled Date / Time — prominently displayed */}
                      {hasSchedule ? (
                        <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border text-[11px] font-semibold ${
                          isToday
                            ? 'bg-amber-50 border-amber-300 text-amber-900'
                            : 'bg-blue-50 border-blue-200 text-blue-900'
                        }`}>
                          <span className="material-symbols-outlined text-[14px]">
                            {isToday ? 'today' : 'event'}
                          </span>
                          <span>
                            {isToday ? 'TODAY' : scheduleLabel || 'Scheduled'}
                            {c.time_slot && (
                              <> &nbsp;&bull;&nbsp; <strong>{c.time_slot}</strong></>
                            )}
                          </span>
                        </div>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] text-slate-400 italic">
                          <span className="material-symbols-outlined text-[12px]">schedule</span>
                          Awaiting schedule from Authority
                        </span>
                      )}

                      <div className="text-slate-600 flex flex-wrap gap-x-4 gap-y-1">
                        <span>
                          <strong className="text-slate-700">Serial:</strong>{' '}
                          <span className="font-mono">{c.serial_number}</span>
                        </span>
                        <span>
                          <strong className="text-slate-700">Trader:</strong> {c.trader_name}
                        </span>
                        <span>
                          <strong className="text-slate-700">Location:</strong> {c.location}
                        </span>
                      </div>
                    </div>

                    <div className="self-end md:self-center shrink-0">
                      <button
                        type="button"
                        onClick={() => onOpenCase(c.application_id)}
                        className={`px-4 py-2 rounded-lg text-xs font-bold transition-all shadow-2xs flex items-center gap-1.5 cursor-pointer ${
                          isInProgress
                            ? 'bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold'
                            : 'bg-primary hover:bg-[#001733] text-white'
                        }`}
                      >
                        <span className="material-symbols-outlined text-[15px]">
                          {isInProgress ? 'edit_note' : 'play_circle'}
                        </span>
                        <span>{isInProgress ? 'Resume Inspection' : 'Open Inspection'}</span>
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* ====================================================
          4B. TAB 2: WORKED INSTRUMENTS HISTORY
         ==================================================== */}
      {activeTab === 'HISTORY' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden space-y-4 p-4 sm:p-5">
          {/* Header & Description */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
            <div>
              <h2 className="text-base font-bold text-[#002046] flex items-center gap-2">
                <span className="material-symbols-outlined text-blue-600">history_edu</span>
                <span>Worked Instruments Record</span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Statutory history of instruments inspected, calibrated, and evaluated by this officer
              </p>
            </div>

            {/* Quick Metrics */}
            <div className="flex items-center gap-3 text-xs">
              <span className="px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200 font-semibold">
                <strong>{passedCount}</strong> Passed
              </span>
              <span className="px-2.5 py-1 rounded-lg bg-rose-50 text-rose-800 border border-rose-200 font-semibold">
                <strong>{failedCount}</strong> Failed MPE
              </span>
              <span className="px-2.5 py-1 rounded-lg bg-blue-50 text-blue-800 border border-blue-200 font-semibold">
                <strong>{certifiedCount}</strong> Certified
              </span>
            </div>
          </div>

          {/* Search & Filter Toolbar */}
          <div className="flex flex-col sm:flex-row gap-2.5">
            <div className="relative flex-1">
              <span className="material-symbols-outlined absolute left-3 top-2.5 text-slate-400 text-sm">
                search
              </span>
              <input
                type="text"
                placeholder="Search worked instruments by serial number, model, trader, or certificate..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              />
            </div>

            <div className="flex items-center gap-2">
              <select
                value={outcomeFilter}
                onChange={(e) => setOutcomeFilter(e.target.value)}
                className="px-3 py-2 text-xs border border-slate-300 rounded-xl bg-white font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary/20"
              >
                <option value="ALL">All Determinations</option>
                <option value="PASS">Pass Only</option>
                <option value="FAIL">Failed MPE Only</option>
                <option value="IN_PROGRESS">In Progress</option>
              </select>

              {(searchQuery || outcomeFilter !== 'ALL') && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('');
                    setOutcomeFilter('ALL');
                  }}
                  className="px-3 py-2 text-xs text-slate-500 hover:text-slate-800 font-semibold hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                >
                  Clear
                </button>
              )}
            </div>
          </div>

          {/* Worked Instruments History Table / List */}
          <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden">
            {paginatedHistory.length === 0 ? (
              <div className="p-8 text-center text-slate-400">
                <span className="material-symbols-outlined text-3xl mb-1 text-slate-300 block">search_off</span>
                No worked instrument records match the selected criteria.
              </div>
            ) : (
              paginatedHistory.map((item) => {
                const isPassed = item.verification_result === 'PASS' || item.application_status === 'APPROVED';
                const isFailed = item.verification_result === 'FAIL' || item.application_status === 'VERIFICATION_FAILED';
                const isInProgress = item.application_status === 'IN_PROGRESS';

                return (
                  <div
                    key={item.application_id}
                    className="p-4 hover:bg-slate-50/70 transition-colors flex flex-col md:flex-row items-start md:items-center justify-between gap-3 text-xs"
                  >
                    {/* Left: Instrument & Trader particulars */}
                    <div className="space-y-1.5 flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono font-bold text-[#002046] bg-slate-100 px-2 py-0.5 rounded border border-slate-200 text-xs">
                          {item.serial_number || item.instrument_id}
                        </span>
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-800 border border-blue-200">
                          {item.category_name}
                        </span>
                        {item.certificate_no && (
                          <span className="font-mono text-[10px] font-extrabold bg-emerald-50 text-emerald-800 border border-emerald-300 px-2 py-0.5 rounded flex items-center gap-1">
                            <span className="material-symbols-outlined text-xs">verified</span>
                            <span>{item.certificate_no}</span>
                          </span>
                        )}
                      </div>

                      <div className="font-bold text-slate-900 text-sm">
                        {item.manufacturer} {item.model}
                      </div>

                      <div className="flex flex-wrap gap-x-4 gap-y-1 text-slate-600 text-[11px]">
                        <span>
                          <strong className="text-slate-700">Trader:</strong> {item.trader_name}
                        </span>
                        <span>
                          <strong className="text-slate-700">Premises:</strong> {item.location}
                        </span>
                        <span>
                          <strong className="text-slate-700">Inspected:</strong>{' '}
                          {item.tested_at ? new Date(item.tested_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
                        </span>
                        {item.certificate_valid_until && (
                          <span className="text-emerald-700 font-bold">
                            Valid Until: {new Date(item.certificate_valid_until).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Right: Determination Badge & Action Button */}
                    <div className="flex items-center gap-3 self-end md:self-center shrink-0">
                      {isPassed && (
                        <span className="px-2.5 py-1 rounded-full text-[11px] font-extrabold bg-emerald-100 text-emerald-800 flex items-center gap-1">
                          <span className="material-symbols-outlined text-xs">check_circle</span>
                          PASS
                        </span>
                      )}
                      {isFailed && (
                        <span className="px-2.5 py-1 rounded-full text-[11px] font-extrabold bg-rose-100 text-rose-800 flex items-center gap-1">
                          <span className="material-symbols-outlined text-xs">cancel</span>
                          FAIL MPE
                        </span>
                      )}
                      {isInProgress && (
                        <span className="px-2.5 py-1 rounded-full text-[11px] font-extrabold bg-amber-100 text-amber-800 flex items-center gap-1">
                          <span className="material-symbols-outlined text-xs">pending</span>
                          IN PROGRESS
                        </span>
                      )}

                      <button
                        type="button"
                        onClick={() => onOpenCase(item.application_id)}
                        className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs rounded-lg transition-colors flex items-center gap-1 border border-slate-200 cursor-pointer shadow-2xs"
                      >
                        <span className="material-symbols-outlined text-xs">visibility</span>
                        <span>View Record</span>
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Responsive Pagination Component */}
          <Pagination
            currentPage={historyPage}
            totalPages={totalHistoryPages}
            totalItems={filteredHistory.length}
            itemsPerPage={historyPageSize}
            onPageChange={setHistoryPage}
            onItemsPerPageChange={setHistoryPageSize}
            pageSizeOptions={[10, 20, 50]}
            itemName="records"
          />
        </div>
      )}
    </div>
  );
}
