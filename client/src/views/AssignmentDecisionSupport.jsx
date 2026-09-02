import React, { useEffect, useState } from 'react';
import { api } from '../api';

export default function AssignmentDecisionSupport({
  applicationId,
  currentUser,
  onBack,
  onAssignmentComplete
}) {
  const [data, setData] = useState(null);
  const [selectedCandidateId, setSelectedCandidateId] = useState('');
  const [overrideReason, setOverrideReason] = useState('');
  const [scheduleDate, setScheduleDate] = useState(new Date(Date.now() + 2 * 24 * 3600 * 1000).toISOString().split('T')[0]);
  const [scheduleSlot, setScheduleSlot] = useState('10:00 AM - 01:00 PM');
  const [arrangementType, setArrangementType] = useState('FIELD_INSPECTION');
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (applicationId) {
      setLoading(true);
      api.getCandidates(applicationId)
        .then((res) => {
          setData(res);
          setSelectedCandidateId(res.recommended_id);
        })
        .catch(console.error)
        .finally(() => setLoading(false));
    }
  }, [applicationId]);

  if (loading) {
    return <div className="p-12 text-center text-slate-500">Evaluating eligible verifier candidates...</div>;
  }

  const isOverride = selectedCandidateId !== data?.recommended_id;

  const handleConfirmAssignment = async () => {
    if (!selectedCandidateId) return;

    setSubmitting(true);
    try {
      // 1. Assign verifier
      await api.assignVerifier(applicationId, {
        assigned_id: selectedCandidateId,
        recommended_id: data.recommended_id,
        is_override: isOverride,
        override_reason: overrideReason,
        authority_id: currentUser?.id
      });

      // 2. Schedule appointment
      await api.scheduleAppointment(applicationId, {
        scheduled_date: scheduleDate,
        time_slot: scheduleSlot,
        arrangement_type: arrangementType,
        authority_id: currentUser?.id
      });

      onAssignmentComplete(applicationId);
    } catch (err) {
      console.error(err);
      alert('Error recording assignment: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto animate-in fade-in duration-300">
      {/* Top Back Navigation */}
      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-primary transition-colors"
        >
          <span className="material-symbols-outlined text-[16px]">arrow_back</span>
          Back to Application Review
        </button>
        <span className="text-xs font-mono font-bold text-primary bg-primary/10 px-2.5 py-1 rounded-md">
          Case #{applicationId}
        </span>
      </div>

      {/* Decision Support Banner */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
            <span className="material-symbols-outlined text-2xl">neurology</span>
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900">
              Verifier Allocation Decision Support Engine
            </h1>
            <p className="text-xs text-slate-500">
              Statutory verification tasks must be allocated to an authorized Legal Metrology Officer or approved test centre (GATC).
            </p>
          </div>
        </div>

        <div className="mt-4 p-3.5 rounded-xl bg-blue-50 border border-blue-200 text-xs text-blue-900 flex items-start gap-2">
          <span className="material-symbols-outlined text-base text-blue-600 shrink-0 mt-0.5">smart_toy</span>
          <div>
            <span className="font-bold">Algorithmic Workload & Jurisdiction Balancing: </span>
            The system evaluated statutory authorizations, current case backlogs, and geographic proximity. As the administrative authority, you retain legal authority to confirm or override the candidate.
          </div>
        </div>
      </div>

      {/* Candidate Selection Cards */}
      <div className="space-y-4">
        <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider">
          Eligible Statutory Verification Candidates
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {data?.candidates.map((c) => {
            const isRecommended = c.id === data.recommended_id;
            const isSelected = c.id === selectedCandidateId;

            return (
              <div
                key={c.id}
                onClick={() => setSelectedCandidateId(c.id)}
                className={`relative rounded-2xl p-5 border-2 transition-all cursor-pointer flex flex-col justify-between ${
                  isSelected
                    ? 'border-primary bg-primary/[0.02] shadow-md ring-2 ring-primary/20'
                    : 'border-slate-200 bg-white hover:border-slate-300'
                }`}
              >
                <div>
                  {isRecommended && (
                    <span className="absolute -top-3 left-4 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wide bg-emerald-600 text-white shadow-xs">
                      ★ System Recommended
                    </span>
                  )}

                  <div className="flex items-center justify-between mt-1 mb-3">
                    <div className="flex items-center gap-2.5">
                      <div className={`w-9 h-9 rounded-lg flex items-center justify-center font-bold text-xs ${
                        c.role === 'GATC' ? 'bg-amber-100 text-amber-800' : 'bg-blue-100 text-blue-800'
                      }`}>
                        <span className="material-symbols-outlined text-[18px]">
                          {c.role === 'GATC' ? 'science' : 'person'}
                        </span>
                      </div>
                      <div>
                        <h3 className="font-bold text-slate-900 text-sm">{c.full_name}</h3>
                        <span className="text-[10px] text-slate-500 block">{c.organization_name}</span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2 py-3 border-y border-slate-100 text-xs">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Jurisdiction:</span>
                      <span className="font-medium text-slate-700">{c.jurisdiction}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Active Workload:</span>
                      <span className="font-bold text-slate-800">{c.current_workload} Active Cases</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Suitability Score:</span>
                      <span className="font-extrabold text-emerald-600">{c.suitability_score} / 100</span>
                    </div>
                  </div>

                  <p className="text-[11px] text-slate-500 italic mt-3">
                    "{c.match_reason}"
                  </p>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                  <span className={`text-xs font-bold ${isSelected ? 'text-primary' : 'text-slate-400'}`}>
                    {isSelected ? 'Selected Candidate' : 'Click to Select'}
                  </span>
                  <div className={`w-5 h-5 rounded-full border flex items-center justify-center ${
                    isSelected ? 'border-primary bg-primary text-white' : 'border-slate-300'
                  }`}>
                    {isSelected && <span className="material-symbols-outlined text-xs">check</span>}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Override Justification Field (if selected differs from recommendation) */}
      {isOverride && (
        <div className="bg-amber-50 border border-amber-300 rounded-2xl p-5 shadow-xs text-xs space-y-3 animate-in fade-in duration-200">
          <div className="flex items-center gap-2 text-amber-900 font-bold">
            <span className="material-symbols-outlined text-amber-700">warning</span>
            Authority Override Notice
          </div>
          <p className="text-amber-800">
            You are selecting an assignee other than the top recommended candidate. An immutable entry will be recorded in the statutory audit log.
          </p>
          <div>
            <label className="font-bold text-amber-950 block mb-1">
              Override Justification / Administrative Reason (Optional)
            </label>
            <input
              type="text"
              placeholder="e.g. Inspector Vikram Singh is on scheduled duty in Connaught Place sector today."
              value={overrideReason}
              onChange={(e) => setOverrideReason(e.target.value)}
              className="w-full h-10 px-3 rounded-lg border border-amber-300 bg-white focus:ring-2 focus:ring-amber-500 outline-none text-slate-800"
            />
          </div>
        </div>
      )}

      {/* Scheduling & Arrangement Configuration */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-4">
        <h3 className="font-bold text-slate-900 text-sm uppercase tracking-wider pb-3 border-b border-slate-100">
          Verification Appointment & Arrangement
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          <div>
            <label className="font-semibold text-slate-700 block mb-1">Inspection Arrangement Mode</label>
            <select
              value={arrangementType}
              onChange={(e) => setArrangementType(e.target.value)}
              className="w-full h-10 px-3 rounded-lg border border-slate-300 focus:ring-2 focus:ring-primary outline-none bg-white font-medium"
            >
              <option value="FIELD_INSPECTION">On-Site Field Visit by LMO</option>
              <option value="CENTRE_PRESENTATION">Trader Presentation at GATC Lab</option>
            </select>
          </div>

          <div>
            <label className="font-semibold text-slate-700 block mb-1">Scheduled Date</label>
            <input
              type="date"
              value={scheduleDate}
              onChange={(e) => setScheduleDate(e.target.value)}
              className="w-full h-10 px-3 rounded-lg border border-slate-300 focus:ring-2 focus:ring-primary outline-none"
            />
          </div>

          <div>
            <label className="font-semibold text-slate-700 block mb-1">Time Slot</label>
            <select
              value={scheduleSlot}
              onChange={(e) => setScheduleSlot(e.target.value)}
              className="w-full h-10 px-3 rounded-lg border border-slate-300 focus:ring-2 focus:ring-primary outline-none bg-white font-medium"
            >
              <option value="10:00 AM - 01:00 PM">Morning Slot (10:00 AM - 01:00 PM)</option>
              <option value="02:00 PM - 05:00 PM">Afternoon Slot (02:00 PM - 05:00 PM)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Confirmation CTA Footer */}
      <div className="flex items-center justify-end gap-3 pt-4">
        <button
          onClick={onBack}
          className="px-5 py-2.5 border border-slate-300 text-slate-700 rounded-lg text-xs font-semibold hover:bg-slate-50 transition-colors"
        >
          Cancel
        </button>
        <button
          onClick={handleConfirmAssignment}
          disabled={submitting}
          className="px-6 py-2.5 bg-primary text-white rounded-lg text-xs font-bold hover:bg-primary-container shadow-md transition-all flex items-center gap-2"
        >
          <span className="material-symbols-outlined text-[18px]">check_circle</span>
          {submitting ? 'Recording Assignment...' : isOverride ? 'Confirm Authority Override & Schedule' : 'Accept Recommendation & Schedule'}
        </button>
      </div>
    </div>
  );
}
