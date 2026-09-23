import React, { useEffect, useMemo, useState } from 'react';
import { api } from '../api';

const TIME_SLOTS = ['10:00 AM - 01:00 PM', '02:00 PM - 05:00 PM'];

const inTwoDays = () => new Date(Date.now() + 2 * 24 * 3600 * 1000).toISOString().split('T')[0];

const formatDate = (value) => {
  if (!value) return 'Not specified';
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? value : d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
};

function SummaryItem({ icon, label, value, sub }) {
  return (
    <div className="flex items-start gap-3 min-w-0">
      <div className="w-9 h-9 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center shrink-0">
        <span className="material-symbols-outlined text-[18px]">{icon}</span>
      </div>
      <div className="min-w-0">
        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{label}</p>
        <p className="text-sm font-semibold text-slate-900 truncate" title={value}>{value}</p>
        {sub && <p className="text-[11px] text-slate-500 truncate" title={sub}>{sub}</p>}
      </div>
    </div>
  );
}

function CandidateRow({ candidate, isRecommended, isSelected, onSelect }) {
  const isGatc = candidate.role === 'GATC';
  return (
    <label
      className={`block rounded-xl border-2 p-4 cursor-pointer transition-all ${
        isSelected ? 'border-primary bg-primary/[0.03] shadow-sm' : 'border-slate-200 bg-white hover:border-slate-300'
      }`}
    >
      <div className="flex items-start gap-3">
        <input
          type="radio"
          name="candidate"
          checked={isSelected}
          onChange={onSelect}
          className="mt-3 w-4 h-4 accent-[#002046] shrink-0"
        />

        <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${isGatc ? 'bg-amber-100 text-amber-800' : 'bg-blue-100 text-blue-800'}`}>
          <span className="material-symbols-outlined text-[20px]">{isGatc ? 'science' : 'badge'}</span>
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-bold text-slate-900 text-sm">{candidate.full_name}</h3>
            {isRecommended && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wide bg-emerald-600 text-white">
                Recommended
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500">
            {candidate.designation_label}{candidate.organization_name ? ` · ${candidate.organization_name}` : ''}
          </p>

          <div className="flex flex-wrap gap-1.5 mt-2.5">
            {candidate.score_factors.filter(f => f.key !== 'base').map(f => (
              <span
                key={f.key}
                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium border ${
                  f.points >= 10 || (f.key === 'workload' && f.points >= 20)
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                    : f.points > 0
                      ? 'bg-slate-50 border-slate-200 text-slate-700'
                      : 'bg-amber-50 border-amber-200 text-amber-800'
                }`}
              >
                {f.label}
                <span className="font-bold opacity-70">+{f.points}</span>
              </span>
            ))}
          </div>
        </div>

        <div className="text-right shrink-0">
          <p className="text-2xl font-extrabold text-slate-900 leading-none">{candidate.score}</p>
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mt-1">Match</p>
        </div>
      </div>
    </label>
  );
}

export default function AssignmentDecisionSupport({
  applicationId,
  currentUser,
  onBack,
  onAssignmentComplete
}) {
  const [data, setData] = useState(null);
  const [loadError, setLoadError] = useState('');
  const [loading, setLoading] = useState(true);

  const [selectedId, setSelectedId] = useState('');
  const [reason, setReason] = useState('');
  const [scheduleDate, setScheduleDate] = useState(inTwoDays());
  const [scheduleSlot, setScheduleSlot] = useState(TIME_SLOTS[0]);
  const [showIneligible, setShowIneligible] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  useEffect(() => {
    if (!applicationId) return;
    setLoading(true);
    setLoadError('');
    api.getCandidates(applicationId)
      .then((res) => {
        setData(res);
        setSelectedId(res.current_assignee_id && res.candidates.some(c => c.id === res.current_assignee_id && c.is_eligible)
          ? res.current_assignee_id
          : (res.recommended_id || ''));
        const preferred = res.application?.preferred_date;
        const today = new Date().toISOString().split('T')[0];
        if (preferred && preferred >= today) setScheduleDate(preferred);
        // If no officer is strictly eligible, automatically open the list for Authority override
        const hasEligible = (res.candidates || []).some(c => c.is_eligible);
        if (!hasEligible) {
          setShowIneligible(true);
        }
      })
      .catch((err) => setLoadError(err.message || 'Could not load candidates.'))
      .finally(() => setLoading(false));
  }, [applicationId]);

  const eligible = useMemo(() => (data?.candidates || []).filter(c => c.is_eligible), [data]);
  const ineligible = useMemo(() => (data?.candidates || []).filter(c => !c.is_eligible), [data]);
  // Allow selecting any candidate (eligible or authority override from ineligible)
  const selected = useMemo(() => (data?.candidates || []).find(c => c.id === selectedId) || null, [data, selectedId]);

  if (loading) {
    return (
      <div className="p-16 text-center text-slate-500 text-xs">
        <span className="material-symbols-outlined text-3xl animate-spin block mb-2 text-primary">progress_activity</span>
        Checking which officers can verify this instrument...
      </div>
    );
  }

  if (loadError || !data) {
    return (
      <div className="max-w-3xl mx-auto p-8 text-center bg-white rounded-2xl border border-rose-200">
        <p className="text-rose-700 font-semibold text-sm">{loadError || 'Application not found.'}</p>
        <button onClick={onBack} className="mt-4 text-xs font-bold text-primary hover:underline">Back to application</button>
      </div>
    );
  }

  const { application, instrument, requirement } = data;
  const isReassign = Boolean(data.current_assignee_id);
  const isOverrideAssignment = Boolean(selected && !selected.is_eligible);
  const deviates = Boolean(selected && ((data.recommended_id && selectedId !== data.recommended_id) || isOverrideAssignment));
  const needsReason = deviates && !reason.trim();
  const isInSitu = application.verification_mode === 'IN_SITU';
  const canSubmit = Boolean(selected) && !needsReason && Boolean(scheduleDate) && !submitting;

  const handleAssign = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    setSubmitError('');
    try {
      await api.assignVerifier(applicationId, {
        assigned_id: selected.id,
        recommended_id: data.recommended_id,
        is_override: deviates,
        override_reason: reason.trim(),
        scheduled_date: scheduleDate,
        time_slot: scheduleSlot,
        arrangement_type: selected.role === 'GATC' && !isInSitu ? 'CENTRE_PRESENTATION' : 'FIELD_INSPECTION',
        authority_id: currentUser?.id
      });
      onAssignmentComplete(applicationId);
    } catch (err) {
      setSubmitError(err.message || 'Could not record the assignment.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-5 pb-4 animate-in fade-in duration-300">
      {/* Header */}
      <div>
        <button
          onClick={onBack}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-primary transition-colors"
        >
          <span className="material-symbols-outlined text-[16px]">arrow_back</span>
          Back to application
        </button>
        <div className="flex items-center gap-3 mt-3 flex-wrap">
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
            {isReassign ? 'Reassign Verifier' : 'Assign Verifier'}
          </h1>
          <span className="font-mono text-xs px-2.5 py-1 rounded-md bg-primary text-white font-bold">
            {application.application_no}
          </span>
        </div>
        <p className="text-sm text-slate-500 mt-1">
          Officers are ranked by jurisdiction, workload, location and availability. When no officer is deployed in a jurisdiction, the Authority can assign out-of-area officers under an administrative override.
        </p>
      </div>

      {/* Case summary + requirement */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 p-5">
          <SummaryItem
            icon="scale"
            label="Instrument"
            value={instrument ? `${instrument.manufacturer} ${instrument.model}`.trim() : 'Unknown'}
            sub={requirement.category_name}
          />
          <SummaryItem
            icon="location_on"
            label="District"
            value={data.instrument_district || 'Not recorded'}
            sub={application.location_address}
          />
          <SummaryItem
            icon={isInSitu ? 'directions_car' : 'storefront'}
            label="Mode"
            value={isInSitu ? 'On-site visit' : 'Camp / centre'}
            sub={`Preferred: ${formatDate(application.preferred_date)}`}
          />
          <SummaryItem
            icon="person"
            label="Applicant"
            value={application.trader_name || '—'}
          />
        </div>

        <div className="border-t border-slate-100 bg-slate-50/70 px-5 py-4">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">Who can verify this instrument</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            <div className="flex items-start gap-2 text-xs">
              <span className="material-symbols-outlined text-[18px] text-emerald-600">check_circle</span>
              <span className="text-slate-700">
                <strong className="text-slate-900">Legal Metrology Officer</strong> — {requirement.min_designation_label} or above
              </span>
            </div>
            <div className="flex items-start gap-2 text-xs">
              <span className={`material-symbols-outlined text-[18px] ${requirement.gatc_allowed ? 'text-emerald-600' : 'text-slate-400'}`}>
                {requirement.gatc_allowed ? 'check_circle' : 'block'}
              </span>
              <span className="text-slate-700">
                <strong className="text-slate-900">GATC</strong> — {requirement.gatc_note}
              </span>
            </div>
          </div>
          <p className="text-[11px] text-slate-500 mt-2">
            Standard eligibility requires active status and jurisdiction over {data.instrument_district || 'the instrument district'}. When no local officer exists, the Authority may assign additional charge.
          </p>
        </div>
      </div>

      {/* Eligible candidates */}
      <section className="space-y-3">
        <div className="flex items-end justify-between">
          <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider">
            Eligible officers <span className="text-slate-400">({eligible.length})</span>
          </h2>
          {eligible.length > 0 && (
            <span className="text-[11px] text-slate-500">Match score out of 100</span>
          )}
        </div>

        {eligible.length === 0 ? (
          <div className="bg-amber-50/80 border border-amber-300 rounded-2xl p-6 text-center space-y-2">
            <div className="w-12 h-12 mx-auto rounded-full bg-amber-100 flex items-center justify-center text-amber-700">
              <span className="material-symbols-outlined text-2xl">gavel</span>
            </div>
            <p className="font-bold text-amber-950 text-base">No strictly eligible officer in {data.instrument_district || 'this area'}</p>
            <p className="text-xs text-amber-900 max-w-xl mx-auto leading-relaxed">
              No officer is officially notified for {data.instrument_district || 'this jurisdiction'}. However, as an <strong>Authority Officer</strong>,
              you may exercise statutory discretion to assign an out-of-jurisdiction or adjacent-district officer below under an <strong>Administrative Override / Additional Charge</strong>.
            </p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {eligible.map(c => (
              <CandidateRow
                key={c.id}
                candidate={c}
                isRecommended={c.id === data.recommended_id}
                isSelected={c.id === selectedId}
                onSelect={() => setSelectedId(c.id)}
              />
            ))}
          </div>
        )}
      </section>

      {/* Ineligible candidates (collapsible with selection for Authority override) */}
      {ineligible.length > 0 && (
        <section className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
          <button
            type="button"
            onClick={() => setShowIneligible(v => !v)}
            className="w-full flex items-center justify-between px-5 py-3.5 text-left cursor-pointer hover:bg-slate-50 transition-colors"
            aria-expanded={showIneligible}
          >
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-bold text-slate-700">
                Not eligible <span className="text-slate-400">({ineligible.length})</span>
              </span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200 uppercase tracking-wide">
                Authority Override Enabled
              </span>
            </div>
            <span className="flex items-center gap-1 text-xs text-slate-500">
              {showIneligible ? 'Hide' : 'Show candidates & override'}
              <span className="material-symbols-outlined text-[18px]">{showIneligible ? 'expand_less' : 'expand_more'}</span>
            </span>
          </button>
          {showIneligible && (
            <div className="border-t border-slate-100 divide-y divide-slate-100">
              {ineligible.map(c => {
                const isSelected = c.id === selectedId;
                return (
                  <div
                    key={c.id}
                    onClick={() => setSelectedId(c.id)}
                    className={`px-5 py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 cursor-pointer transition-colors ${
                      isSelected
                        ? 'bg-amber-50/70 border-l-4 border-l-amber-600'
                        : 'hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-start gap-3 min-w-0">
                      <input
                        type="radio"
                        name="candidate"
                        checked={isSelected}
                        onChange={() => setSelectedId(c.id)}
                        className="mt-1 w-4 h-4 accent-amber-600 shrink-0 cursor-pointer"
                      />
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-sm font-bold text-slate-900">{c.full_name}</p>
                          {isSelected && (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-200 text-amber-900 uppercase tracking-wide">
                              Selected for Override
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-500">{c.designation_label}{c.organization_name ? ` · ${c.organization_name}` : ''}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 sm:self-center shrink-0">
                      <p className="text-xs text-rose-700 flex items-center gap-1 max-w-md sm:text-right">
                        <span className="material-symbols-outlined text-[16px] shrink-0">cancel</span>
                        <span>{c.ineligible_reason}</span>
                      </p>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedId(c.id);
                        }}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all shrink-0 cursor-pointer ${
                          isSelected
                            ? 'bg-amber-600 text-white shadow-2xs'
                            : 'border border-amber-300 text-amber-800 hover:bg-amber-100'
                        }`}
                      >
                        {isSelected ? 'Selected' : 'Assign (Override)'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      )}

      {/* Reason when deviating from recommendation or assigning outside eligibility */}
      {deviates && selected && (
        <div className="bg-amber-50 border border-amber-300 rounded-2xl p-5 space-y-3 animate-in fade-in duration-200">
          <div className="flex items-start gap-2.5">
            <span className="material-symbols-outlined text-[22px] text-amber-700 shrink-0 mt-0.5">
              {isOverrideAssignment ? 'verified_user' : 'edit_note'}
            </span>
            <div className="flex-1">
              <label htmlFor="override-reason" className="text-sm font-bold text-amber-950 block">
                {isOverrideAssignment
                  ? `Statutory Override Reason for ${selected.full_name}`
                  : `Why ${selected.full_name} instead of the recommended officer?`}
              </label>
              <p className="text-xs text-amber-800 mt-0.5">
                {isOverrideAssignment
                  ? `Officer is outside standard eligibility (${selected.ineligible_reason}). Please provide the statutory or administrative reason for this assignment.`
                  : 'Required for audit governance whenever deviating from the algorithmic allocation recommendation.'}
              </p>
            </div>
          </div>

          <input
            id="override-reason"
            type="text"
            placeholder={
              isOverrideAssignment
                ? `e.g. No officer available in ${data.instrument_district || 'Vikhroli'}; assigned additional charge.`
                : 'e.g. Recommended officer is on leave that week'
            }
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="w-full h-10 px-3 rounded-lg border border-amber-300 bg-white focus:ring-2 focus:ring-amber-500 outline-none text-sm text-slate-800 font-medium"
          />

          {isOverrideAssignment && (
            <div className="flex flex-wrap gap-2 pt-1">
              <span className="text-[11px] font-semibold text-amber-900 self-center">Quick fill:</span>
              {[
                `No officer stationed in ${data.instrument_district || 'Vikhroli'} — assigned additional charge`,
                `Assigned nearest available officer for urgent verification`,
                `Special administrative allocation by Controller / Authority`
              ].map((text, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setReason(text)}
                  className="px-2.5 py-1 text-[11px] bg-white border border-amber-300 text-amber-900 rounded-md hover:bg-amber-100 transition-colors font-medium cursor-pointer shadow-2xs"
                >
                  {text}
                </button>
              ))}
            </div>
          )}

          <p className="text-[11px] text-amber-800 font-medium">
            * Recorded permanently in statutory audit log with Authority digital signature.
          </p>
        </div>
      )}

      {/* Schedule */}
      {(eligible.length > 0 || selected) && (
        <section className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5">
          <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-4">Schedule the inspection</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label htmlFor="schedule-date" className="font-semibold text-slate-700 block mb-1">Date</label>
              <input
                id="schedule-date"
                type="date"
                value={scheduleDate}
                min={new Date().toISOString().split('T')[0]}
                onChange={(e) => setScheduleDate(e.target.value)}
                className="w-full h-10 px-3 rounded-lg border border-slate-300 focus:ring-2 focus:ring-primary outline-none"
              />
            </div>
            <div>
              <label htmlFor="schedule-slot" className="font-semibold text-slate-700 block mb-1">Time slot</label>
              <select
                id="schedule-slot"
                value={scheduleSlot}
                onChange={(e) => setScheduleSlot(e.target.value)}
                className="w-full h-10 px-3 rounded-lg border border-slate-300 focus:ring-2 focus:ring-primary outline-none bg-white"
              >
                {TIME_SLOTS.map(slot => <option key={slot} value={slot}>{slot}</option>)}
              </select>
            </div>
          </div>
          {selected && (
            <p className="text-[11px] text-slate-500 mt-3 flex items-center gap-1">
              <span className="material-symbols-outlined text-[14px]">info</span>
              {selected.role === 'GATC' && !isInSitu
                ? 'The trader will present the instrument at the test centre.'
                : 'The officer will visit the premises and record geotagged evidence.'}
              {isOverrideAssignment && (
                <span className="font-semibold text-amber-700 ml-1">
                  (Assigned under Authority Override)
                </span>
              )}
            </p>
          )}
        </section>
      )}

      {/* Sticky action bar */}
      <div className="sticky bottom-3 z-20">
        <div>
          <div className="bg-white border border-slate-200 shadow-lg rounded-2xl px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="text-xs min-w-0">
              {submitError ? (
                <span className="text-rose-700 font-semibold">{submitError}</span>
              ) : selected ? (
                <span className="text-slate-600">
                  Assign <strong className="text-slate-900">{selected.full_name}</strong>
                  {isOverrideAssignment && (
                    <span className="mx-1.5 px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
                      Authority Override
                    </span>
                  )}{' '}
                  on <strong className="text-slate-900">{formatDate(scheduleDate)}</strong>, {scheduleSlot}
                  {needsReason && <span className="text-amber-700 font-semibold"> · reason required</span>}
                </span>
              ) : (
                <span className="text-slate-500">
                  Select an officer to continue (Authority override available for out-of-area officers).
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={onBack}
                className="px-4 py-2.5 border border-slate-300 text-slate-700 rounded-lg text-xs font-semibold hover:bg-slate-50 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleAssign}
                disabled={!canSubmit}
                className="px-5 py-2.5 bg-primary text-white rounded-lg text-xs font-bold hover:bg-primary-container shadow-sm transition-all flex items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              >
                <span className="material-symbols-outlined text-[18px]">
                  {isOverrideAssignment ? 'verified_user' : 'check_circle'}
                </span>
                {submitting ? 'Assigning...' : isOverrideAssignment ? 'Confirm override assignment' : (isReassign ? 'Confirm reassignment' : 'Confirm assignment')}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
