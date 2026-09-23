import React, { useEffect, useState } from 'react';
import StatusBadge from '../components/StatusBadge';
import DocumentPreviewModal from '../components/DocumentPreviewModal';
import { api, getFileUrl } from '../api';

const DEFAULT_CHECKLIST_SCHEMA = [
  { id: 'VISUAL_MARKING', title: 'Visual & Nameplate Inspection', description: 'Verify manufacturer nameplate, serial number, model, class marking, and capacity legibility.', required: true },
  { id: 'SEAL_INTEGRITY', title: 'Tamper-Evident Seal Verification', description: 'Inspect lead/wire seals or security calibration seals for physical integrity.', required: true },
  { id: 'ZERO_SETTING', title: 'Zero Balance & Setting Accuracy', description: 'Confirm zero-setting and zero-tracking devices operate within ±0.25e.', required: true },
  { id: 'ECCENTRICITY', title: 'Eccentricity (Corner Load) Test', description: 'Apply 1/3 max load at key load receptor points and check variation limits.', required: true },
  { id: 'ACCURACY_MPE', title: 'Indication Accuracy & MPE Compliance', description: 'Verify error of indication at test loads does not exceed Maximum Permissible Error (MPE).', required: true }
];

const parseCapacity = (capStr) => {
  if (!capStr) return { val: 30, unit: 'kg' };
  const match = String(capStr).match(/([\d.]+)\s*([a-zA-Z]+)?/);
  if (!match) return { val: 30, unit: 'kg' };
  const val = parseFloat(match[1]) || 30;
  const unit = match[2] || 'kg';
  return { val, unit };
};

const generateDefaultReadings = (capStr) => {
  const { val, unit } = parseCapacity(capStr);
  const minVal = Number((val * 0.01).toFixed(3)) || 0.1;
  const qVal = Number((val * 0.25).toFixed(3)) || 7.5;
  const hVal = Number((val * 0.5).toFixed(3)) || 15;

  return [
    { test_point: 'Zero Load Test', reference_value: 0, observed_value: '0.000', unit, reading_result: 'PASS' },
    { test_point: `Min Capacity (${minVal}${unit})`, reference_value: minVal, observed_value: String(minVal), unit, reading_result: 'PASS' },
    { test_point: `Quarter Load (${qVal}${unit})`, reference_value: qVal, observed_value: String(qVal), unit, reading_result: 'PASS' },
    { test_point: `Half Capacity (${hVal}${unit})`, reference_value: hVal, observed_value: String(hVal), unit, reading_result: 'PASS' },
    { test_point: `Max Capacity (${val}${unit})`, reference_value: val, observed_value: String(val), unit, reading_result: 'PASS' }
  ];
};

export default function VerificationWorkspace({
  applicationId,
  currentUser,
  onBack,
  onVerificationCompleted,
  onViewCertificate
}) {
  const [selectedAppId, setSelectedAppId] = useState(applicationId || null);
  const [assignedCases, setAssignedCases] = useState([]);
  const [caseData, setCaseData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeStep, setActiveStep] = useState('checklist'); // 'checklist' | 'readings' | 'observations' | 'evidence' | 'review'

  // Workspace Form State
  const [checklistResponses, setChecklistResponses] = useState({});
  const [readings, setReadings] = useState([]);
  const [observations, setObservations] = useState('');
  const [evidenceList, setEvidenceList] = useState([]);

  // Evidence preview state
  const [previewDoc, setPreviewDoc] = useState(null);

  // GATC Laboratory Environmental & Reference Standards State
  const [chamberTemperature, setChamberTemperature] = useState('23.0');
  const [relativeHumidity, setRelativeHumidity] = useState('50');
  const [standardsClass, setStandardsClass] = useState('CLASS_E2');
  const [calibrationCertRef, setCalibrationCertRef] = useState('NPLI/CAL/2026/894');

  // Evidence upload state
  const [uploadCategory, setUploadCategory] = useState('DEVICE_SETUP');
  const [uploadCaption, setUploadCaption] = useState('');
  const [uploading, setUploading] = useState(false);

  // Submission state
  const [submitting, setSubmitting] = useState(false);
  const [savingDraft, setSavingDraft] = useState(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState('');

  // Normalized Checklist Schema (handles text vs title, mandatory vs required)
  const effectiveChecklistSchema = React.useMemo(() => {
    const raw = caseData?.checklist_schema;
    const list = (Array.isArray(raw) && raw.length > 0) ? raw : DEFAULT_CHECKLIST_SCHEMA;
    return list.map((item, idx) => ({
      id: item.id || `ITEM_${idx + 1}`,
      title: item.title || item.text || item.item_name || `Checklist Item ${idx + 1}`,
      description: item.description || item.instruction || item.details || 'Inspect compliance against legal metrology rules.',
      required: item.required !== undefined ? Boolean(item.required) : (item.mandatory !== undefined ? Boolean(item.mandatory) : true)
    }));
  }, [caseData]);

  const hasExplicitEmptyChecklist = Array.isArray(caseData?.checklist_schema) && caseData.checklist_schema.length === 0;

  // Keep prop in sync with selected internal ID
  useEffect(() => {
    if (applicationId) {
      setSelectedAppId(applicationId);
    }
  }, [applicationId]);

  // Load list of assigned cases for switcher or fallback
  useEffect(() => {
    if (currentUser?.id) {
      api.getVerifierCases(currentUser.id)
        .then(list => {
          const arr = Array.isArray(list) ? list : [];
          setAssignedCases(arr);
          if (!applicationId && arr.length > 0) {
            setSelectedAppId(arr[0].application_id);
          } else if (!applicationId && arr.length === 0) {
            setLoading(false);
          }
        })
        .catch(console.error);
    }
  }, [currentUser, applicationId]);

  const loadCase = async (appIdToFetch) => {
    const idToUse = appIdToFetch || selectedAppId;
    if (!idToUse) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError('');
      const data = await api.getCaseWorkspace(idToUse);
      setCaseData(data);

      const effectiveSchema = (data.checklist_schema && data.checklist_schema.length > 0)
        ? data.checklist_schema
        : DEFAULT_CHECKLIST_SCHEMA;

      // Populate checklist responses
      const initialResponses = {};
      effectiveSchema.forEach(item => {
        const saved = (data.checklist_responses || []).find(r => r.item_id === item.id);
        initialResponses[item.id] = {
          status: saved ? saved.status : '',
          note: saved ? saved.note : ''
        };
      });
      setChecklistResponses(initialResponses);

      // Populate readings
      if (data.readings && data.readings.length > 0) {
        setReadings(data.readings);
      } else {
        setReadings(generateDefaultReadings(data.max_capacity));
      }

      // Populate observations
      setObservations(data.observations || '');

      // Populate evidence
      setEvidenceList(data.evidence || []);

    } catch (err) {
      setError(err.message || 'Failed to load case workspace');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedAppId) {
      loadCase(selectedAppId);
    }
  }, [selectedAppId]);

  // Handle Start Verification (ASSIGNED -> IN_PROGRESS)
  const handleStartVerification = async () => {
    if (!selectedAppId) return;
    try {
      setLoading(true);
      await api.startVerification(selectedAppId);
      await loadCase(selectedAppId);
    } catch (err) {
      alert('Error starting verification: ' + err.message);
      setLoading(false);
    }
  };

  // Handle Checklist change
  const handleChecklistChange = (itemId, status, note) => {
    setChecklistResponses(prev => ({
      ...prev,
      [itemId]: {
        status: status !== undefined ? status : prev[itemId]?.status || '',
        note: note !== undefined ? note : prev[itemId]?.note || ''
      }
    }));
  };

  // Handle Reading change
  const handleReadingChange = (index, field, value) => {
    setReadings(prev => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: value };
      return copy;
    });
  };

  // Add custom reading test point
  const handleAddReading = () => {
    const { unit } = parseCapacity(caseData?.max_capacity);
    setReadings(prev => [
      ...prev,
      { test_point: `Custom Test Point ${prev.length + 1}`, reference_value: 0, observed_value: '', unit, reading_result: 'PASS' }
    ]);
  };

  // Delete reading test point
  const handleDeleteReading = (index) => {
    setReadings(prev => prev.filter((_, i) => i !== index));
  };

  // Save Draft
  const handleSaveDraft = async () => {
    if (!selectedAppId) return;
    try {
      setSavingDraft(true);
      setSaveSuccessMsg('');

      const formattedResponses = Object.entries(checklistResponses).map(([item_id, val]) => ({
        item_id,
        status: val.status,
        note: val.note
      }));

      await api.saveDraft(selectedAppId, {
        checklist_responses: formattedResponses,
        readings,
        observations
      });

      setSaveSuccessMsg('Verification draft saved successfully.');
      setTimeout(() => setSaveSuccessMsg(''), 4000);
    } catch (err) {
      alert('Failed to save draft: ' + err.message);
    } finally {
      setSavingDraft(false);
    }
  };

  // Evidence Upload
  const handleEvidenceUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !selectedAppId) return;

    try {
      setUploading(true);
      const formData = new FormData();
      formData.append('file', file);
      formData.append('category', uploadCategory);
      formData.append('caption', uploadCaption || file.name);

      const uploaded = await api.uploadEvidence(selectedAppId, formData);
      setEvidenceList(prev => [uploaded, ...prev]);
      setUploadCaption('');
      e.target.value = '';
    } catch (err) {
      alert('Failed to upload evidence: ' + err.message);
    } finally {
      setUploading(false);
    }
  };

  // Evidence Delete
  const handleDeleteEvidence = async (evidenceId) => {
    if (!selectedAppId) return;
    if (!window.confirm('Are you sure you want to remove this evidence file?')) return;
    try {
      await api.deleteEvidence(selectedAppId, evidenceId);
      setEvidenceList(prev => prev.filter(e => e.id !== evidenceId));
    } catch (err) {
      alert('Failed to delete evidence: ' + err.message);
    }
  };

  // Validation before submission
  const getValidationErrors = () => {
    const errors = [];
    const schema = (caseData?.checklist_schema && caseData.checklist_schema.length > 0)
      ? caseData.checklist_schema
      : DEFAULT_CHECKLIST_SCHEMA;

    // Required checklist items
    const requiredItems = schema.filter(item => item.required);
    for (const req of requiredItems) {
      if (!checklistResponses[req.id]?.status) {
        errors.push(`Checklist "${req.title}" must be evaluated (Pass, Fail, or N/A).`);
      }
    }

    // Readings
    if (!readings || readings.length === 0) {
      errors.push('At least one measurement reading is required.');
    } else {
      const hasEmpty = readings.some(r => r.observed_value === undefined || r.observed_value === '');
      if (hasEmpty) {
        errors.push('All measurement test points must have an observed value.');
      }
    }

    return errors;
  };

  // Submit Result (PASS / FAIL)
  const handleSubmitResult = async (resultOutcome) => {
    if (!selectedAppId) return;
    const errors = getValidationErrors();
    if (errors.length > 0) {
      alert('Cannot submit verification:\n• ' + errors.join('\n• '));
      return;
    }

    if (resultOutcome === 'FAIL' && (!observations || !observations.trim())) {
      alert('Mandatory Requirement: Please provide specific observations and failure rationale before submitting a FAIL determination.');
      setActiveStep('observations');
      return;
    }

    const confirmMsg = resultOutcome === 'PASS'
      ? 'Confirm submission of PASS verification report to the Legal Metrology Authority for statutory scrutiny?'
      : 'Confirm submission of FAIL verification report to the Legal Metrology Authority? The report will be forwarded with failure observations.';

    if (!window.confirm(confirmMsg)) return;

    try {
      setSubmitting(true);
      const formattedResponses = Object.entries(checklistResponses).map(([item_id, val]) => ({
        item_id,
        status: val.status,
        note: val.note
      }));

      await api.submitVerification(selectedAppId, {
        result: resultOutcome,
        remarks: observations,
        checklist_responses: formattedResponses,
        readings,
        lab_parameters: (currentUser?.role === 'GATC' || caseData?.assigned_type === 'GATC') ? {
          chamber_temperature_c: chamberTemperature,
          relative_humidity_pct: relativeHumidity,
          standards_class: standardsClass,
          calibration_certificate_ref: calibrationCertRef
        } : null
      });

      await loadCase(selectedAppId);
      if (onVerificationCompleted) onVerificationCompleted(selectedAppId);
    } catch (err) {
      alert('Failed to submit verification report: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="p-16 text-center text-slate-500 text-xs">
        <span className="material-symbols-outlined text-3xl animate-spin block mb-2 text-primary">progress_activity</span>
        Loading statutory verification case...
      </div>
    );
  }

  // Handle case where no case is selected and no assigned cases exist
  if (!selectedAppId && assignedCases.length === 0) {
    return (
      <div className="card p-8 text-center space-y-3 max-w-lg mx-auto my-12">
        <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mx-auto text-slate-400">
          <span className="material-symbols-outlined text-3xl">assignment_late</span>
        </div>
        <h3 className="text-base font-bold text-slate-900">No Verification Cases Assigned</h3>
        <p className="text-xs text-slate-500 max-w-sm mx-auto">
          You currently have no pending verification assignments in your queue. Please check back when new cases are assigned by the Authority.
        </p>
        <button onClick={onBack} className="btn btn-primary btn-sm mx-auto">
          Return to Queue
        </button>
      </div>
    );
  }

  if (error || !caseData) {
    return (
      <div className="bg-rose-50 border border-rose-200 rounded-2xl p-8 text-center text-rose-700 text-xs space-y-3 max-w-xl mx-auto">
        <span className="material-symbols-outlined text-3xl text-rose-500">error</span>
        <h3 className="font-bold text-sm">Cannot Access Verification Workspace</h3>
        <p>{error || 'Case not found or access denied.'}</p>
        <button onClick={onBack} className="px-4 py-2 bg-rose-600 text-white rounded-lg font-bold">
          Return to Queue
        </button>
      </div>
    );
  }

  const isAssigned = ['ASSIGNED', 'PENDING_VERIFICATION'].includes(caseData.application_status);
  const isInProgress = caseData.application_status === 'IN_PROGRESS';
  const isCompleted = ['REPORT_SUBMITTED', 'VERIFICATION_COMPLETED', 'VERIFICATION_FAILED', 'APPROVED', 'CERTIFICATE_ISSUED'].includes(caseData.application_status);
  const validationErrors = getValidationErrors();

  return (
    <div className="space-y-6 max-w-5xl mx-auto animate-in fade-in duration-300 pb-16">
      {/* Top Header Navigation */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-primary transition-colors cursor-pointer"
        >
          <span className="material-symbols-outlined text-[16px]">arrow_back</span>
          Back to Assigned Queue
        </button>
        <div className="flex items-center gap-2.5 flex-wrap">
          {assignedCases.length > 0 && (
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Select Case:</span>
              <select
                value={selectedAppId || ''}
                onChange={(e) => setSelectedAppId(e.target.value)}
                className="bg-white border border-slate-300 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-800 focus:outline-none focus:border-primary shadow-xs"
              >
                {assignedCases.map(c => (
                  <option key={c.application_id} value={c.application_id}>
                    {c.application_no} • {c.manufacturer} {c.model} ({c.application_status})
                  </option>
                ))}
              </select>
            </div>
          )}
          <span className="font-mono text-xs font-bold text-primary bg-primary/10 px-2.5 py-1 rounded-md">
            {caseData.application_no}
          </span>
          <StatusBadge status={caseData.application_status} />
        </div>
      </div>

      {/* 1. Comprehensive Context Banner (Stitch Spec) */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-4">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between pb-4 border-b border-slate-100 gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
              <span className="material-symbols-outlined text-3xl">scale</span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-bold text-slate-900">
                  {caseData.manufacturer} {caseData.model}
                </h1>
                <span className="font-mono text-xs px-2.5 py-0.5 rounded bg-slate-100 text-slate-800 font-semibold">
                  SN: {caseData.serial_number}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Category: <strong>{caseData.category_name}</strong> • Type: <strong>{caseData.request_type.replace('_', ' ')}</strong>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4 text-xs">
            <div className="text-right">
              <span className="text-slate-400 block text-[10px] uppercase font-bold">Max Capacity</span>
              <span className="font-bold text-slate-800 text-sm">{caseData.max_capacity}</span>
            </div>
            <div className="h-8 w-px bg-slate-200"></div>
            <div className="text-right">
              <span className="text-slate-400 block text-[10px] uppercase font-bold">Scale Interval (e)</span>
              <span className="font-bold text-primary text-sm">{caseData.verification_scale_interval_e}</span>
            </div>
          </div>
        </div>

        {/* Operational, Appointment & Assignment Information */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 text-xs text-slate-600 pt-1">
          <div>
            <span className="font-bold text-slate-700 block text-[11px]">Commercial Trader</span>
            <span>{caseData.trader_name} • {caseData.trader_org}</span>
            <span className="block text-[11px] text-slate-400">{caseData.trader_phone}</span>
          </div>
          <div>
            <span className="font-bold text-slate-700 block text-[11px]">Testing Arrangement</span>
            <span className="capitalize">{caseData.arrangement_type ? caseData.arrangement_type.replace('_', ' ') : 'On-Site Field Visit'}</span>
            <span className="block text-[11px] text-slate-400">{caseData.location}</span>
          </div>
          <div>
            <span className="font-bold text-slate-700 block text-[11px]">Scheduled Appointment</span>
            <span>{caseData.scheduled_date ? new Date(caseData.scheduled_date).toLocaleDateString() : 'Scheduled by Authority'}</span>
            <span className="block text-[11px] text-slate-400 font-mono">{caseData.time_slot ? caseData.time_slot.replace('_', ' ') : 'Standard Slot'}</span>
          </div>
        </div>
      </div>

      {/* 2. State Actions: Start Verification or Completed Summary */}
      {isAssigned && (
        <div className="bg-amber-50 border-2 border-amber-300 rounded-2xl p-6 text-center space-y-3">
          <div className="w-12 h-12 rounded-full bg-amber-500 text-white flex items-center justify-center mx-auto shadow-xs">
            <span className="material-symbols-outlined text-2xl font-bold">play_arrow</span>
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900">Case Assigned & Ready for Physical Inspection</h3>
            <p className="text-xs text-slate-600 mt-1 max-w-md mx-auto">
              Click below to initiate the statutory verification. The application will transition to <strong>IN PROGRESS</strong>, unlocking the checklist, measurement readings matrix, and evidence capture.
            </p>
          </div>
          <button
            onClick={handleStartVerification}
            className="px-6 py-2.5 bg-primary text-white font-bold rounded-xl text-xs hover:bg-primary-container shadow-md transition-all inline-flex items-center gap-2"
          >
            <span className="material-symbols-outlined text-[18px]">play_circle</span>
            Start Statutory Verification
          </button>
        </div>
      )}

      {/* Completed Verification Outcome View */}
      {isCompleted && (
        <div className={`p-6 rounded-2xl border-2 shadow-xs space-y-4 ${
          caseData.verification_result === 'PASS'
            ? 'bg-emerald-50/70 border-emerald-300'
            : 'bg-rose-50/70 border-rose-300'
        }`}>
          <div className="flex items-center justify-between pb-4 border-b border-slate-200/60">
            <div className="flex items-center gap-3">
              <div className={`w-12 h-12 rounded-full flex items-center justify-center text-white ${
                caseData.verification_result === 'PASS' ? 'bg-emerald-600' : 'bg-rose-600'
              }`}>
                <span className="material-symbols-outlined text-2xl font-bold">
                  {caseData.verification_result === 'PASS' ? 'verified' : 'cancel'}
                </span>
              </div>
              <div>
                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${
                  caseData.verification_result === 'PASS' ? 'bg-emerald-200 text-emerald-900' : 'bg-rose-200 text-rose-900'
                }`}>
                  Verification Completed • Outcome: {caseData.verification_result}
                </span>
                <h2 className="text-base font-bold text-slate-900 mt-1">
                  {caseData.verification_result === 'PASS' ? 'Statutory Verification Succeeded' : 'Instrument Failed Verification'}
                </h2>
              </div>
            </div>
            <div className="text-right text-xs">
              <span className="text-slate-500 block text-[10px]">Completed At</span>
              <strong className="text-slate-800">{new Date(caseData.completed_at).toLocaleString()}</strong>
            </div>
          </div>

          <div className="text-xs space-y-2">
            <h4 className="font-bold text-slate-900 uppercase tracking-wider text-[11px]">Recorded Verifier Observations</h4>
            <div className="p-3.5 rounded-xl bg-white border border-slate-200 text-slate-700">
              {caseData.observations || 'No additional remarks recorded.'}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs pt-2">
            {/* Checklist summary */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-2">
              <h5 className="font-bold text-slate-900 text-[11px] uppercase">Statutory Checklist Outcomes</h5>
              <div className="space-y-1">
                {caseData.checklist_schema?.map(chk => {
                  const res = caseData.checklist_responses?.find(r => r.item_id === chk.id);
                  return (
                    <div key={chk.id} className="flex justify-between items-center py-1 border-b border-slate-100 last:border-0">
                      <span className="text-slate-600 truncate max-w-[220px]">{chk.title}</span>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        res?.status === 'PASS' ? 'bg-emerald-100 text-emerald-800' : res?.status === 'FAIL' ? 'bg-rose-100 text-rose-800' : 'bg-slate-100 text-slate-600'
                      }`}>
                        {res?.status || 'N/A'}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Readings summary */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-2">
              <h5 className="font-bold text-slate-900 text-[11px] uppercase">Measurement Observations</h5>
              <div className="space-y-1">
                {caseData.readings?.map((r, i) => (
                  <div key={i} className="flex justify-between items-center py-1 border-b border-slate-100 last:border-0">
                    <span className="text-slate-600">{r.test_point}</span>
                    <span className="font-mono font-bold text-slate-900">{r.observed_value} {r.unit}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Certificate Status Section: Visible only to Authority or Trader */}
          {caseData.verification_result === 'PASS' && (currentUser?.role === 'AUTHORITY' || currentUser?.role === 'TRADER') && (
            <div className="bg-white p-5 rounded-xl border border-emerald-200 shadow-xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    Statutory Certification Status
                  </span>
                  <div className="flex items-center gap-2 mt-0.5">
                    {caseData.certificate_no ? (
                      <>
                        <span className="font-mono text-base font-extrabold text-primary">
                          {caseData.certificate_no}
                        </span>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-300">
                          {caseData.certificate_status || 'VALID'}
                        </span>
                      </>
                    ) : (
                      <span className="text-xs font-semibold text-amber-700 bg-amber-50 px-2.5 py-1 rounded-md border border-amber-200 flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-[15px]">pending_actions</span>
                        Awaiting Authority Scrutiny & Statutory Issuance
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {!caseData.certificate_no ? (
                    <div className="px-3.5 py-2 bg-slate-50 text-slate-700 border border-slate-200 rounded-xl text-xs font-medium flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-[16px] text-amber-600">hourglass_top</span>
                      <span>Report Forwarded to Authority Officer</span>
                    </div>
                  ) : (
                    <>
                      <button
                        onClick={() => {
                          if (onViewCertificate && caseData.certificate_id) {
                            onViewCertificate(caseData.certificate_id);
                          } else {
                            window.print();
                          }
                        }}
                        className="px-4 py-2 bg-primary text-white font-bold rounded-xl text-xs hover:bg-primary-container shadow-xs transition-all flex items-center gap-1.5"
                      >
                        <span className="material-symbols-outlined text-[16px]">visibility</span>
                        View Certificate
                      </button>
                      <button
                        onClick={() => window.print()}
                        className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold rounded-xl text-xs border border-slate-300 transition-all flex items-center gap-1.5"
                      >
                        <span className="material-symbols-outlined text-[16px]">print</span>
                        Print
                      </button>
                    </>
                  )}
                </div>
              </div>

              {caseData.certificate_no && (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-3 border-t border-slate-100 text-xs text-slate-600">
                  <div>
                    <span className="text-slate-400 block text-[10px]">Issue Date</span>
                    <strong className="text-slate-800">{new Date(caseData.issue_date || caseData.completed_at).toLocaleDateString()}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">Valid Until</span>
                    <strong className="text-emerald-700 font-extrabold">{new Date(caseData.valid_until).toLocaleDateString()}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">QR Verification Token</span>
                    <span className="font-mono text-[11px] text-slate-500 truncate block" title={caseData.public_token}>
                      {caseData.public_token?.slice(0, 16)}...
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Submission confirmation indicator for Field Verifier & GATC */}
          {caseData.verification_result === 'PASS' && (currentUser?.role === 'VERIFIER' || currentUser?.role === 'GATC') && (
            <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs text-emerald-950 font-semibold">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-emerald-600 text-lg">verified</span>
                <span>Verification Report Submitted to Authority Officer for Scrutiny & Approval.</span>
              </div>
              <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-emerald-200 text-emerald-900 uppercase shrink-0">
                REPORT SUBMITTED
              </span>
            </div>
          )}

          {caseData.verification_result === 'FAIL' && (
            <div className="p-3.5 bg-rose-100/70 border border-rose-300 rounded-xl text-xs text-rose-900 flex items-center gap-2">
              <span className="material-symbols-outlined text-rose-600 text-lg">block</span>
              <span><strong>Statutory Rule:</strong> Certificate generation is strictly prohibited for instruments that have failed verification.</span>
            </div>
          )}
        </div>
      )}

      {/* 3. In-Progress Step Navigation & Interactive Workspace */}
      {isInProgress && (
        <div className="space-y-6">
          {/* Step Selector Tab Bar */}
          <div className="bg-white rounded-2xl border border-slate-200 p-1.5 flex items-center justify-between text-xs shadow-xs overflow-x-auto">
            <button
              onClick={() => setActiveStep('checklist')}
              className={`flex-1 min-w-[120px] py-2.5 px-3 rounded-xl font-bold flex items-center justify-center gap-1.5 transition-all ${
                activeStep === 'checklist' ? 'bg-primary text-white shadow-xs' : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <span className="material-symbols-outlined text-[18px]">checklist</span>
              1. Checklist
            </button>
            <button
              onClick={() => setActiveStep('readings')}
              className={`flex-1 min-w-[120px] py-2.5 px-3 rounded-xl font-bold flex items-center justify-center gap-1.5 transition-all ${
                activeStep === 'readings' ? 'bg-primary text-white shadow-xs' : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <span className="material-symbols-outlined text-[18px]">speed</span>
              2. Readings
            </button>
            <button
              onClick={() => setActiveStep('observations')}
              className={`flex-1 min-w-[120px] py-2.5 px-3 rounded-xl font-bold flex items-center justify-center gap-1.5 transition-all ${
                activeStep === 'observations' ? 'bg-primary text-white shadow-xs' : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <span className="material-symbols-outlined text-[18px]">note_alt</span>
              3. Observations
            </button>
            <button
              onClick={() => setActiveStep('evidence')}
              className={`flex-1 min-w-[120px] py-2.5 px-3 rounded-xl font-bold flex items-center justify-center gap-1.5 transition-all ${
                activeStep === 'evidence' ? 'bg-primary text-white shadow-xs' : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <span className="material-symbols-outlined text-[18px]">photo_camera</span>
              4. Evidence ({evidenceList.length})
            </button>
            <button
              onClick={() => setActiveStep('review')}
              className={`flex-1 min-w-[120px] py-2.5 px-3 rounded-xl font-bold flex items-center justify-center gap-1.5 transition-all ${
                activeStep === 'review' ? 'bg-primary text-white shadow-xs' : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <span className="material-symbols-outlined text-[18px]">fact_check</span>
              5. Review & Submit
            </button>
          </div>

          {/* Feedback banner */}
          {saveSuccessMsg && (
            <div className="p-3 bg-emerald-100 text-emerald-900 border border-emerald-300 rounded-xl text-xs flex items-center gap-2 animate-in fade-in">
              <span className="material-symbols-outlined text-base">check_circle</span>
              {saveSuccessMsg}
            </div>
          )}

          {/* ========================================================
              STEP 1: CHECKLIST
             ======================================================== */}
          {/* ========================================================
              STEP 1: CHECKLIST
             ======================================================== */}
          {activeStep === 'checklist' && (
            <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-5 animate-in fade-in duration-200">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                    Statutory Inspection Checklist
                  </h3>
                  <p className="text-xs text-slate-500">
                    Evaluate all statutory compliance points. Required items are marked with an asterisk (*).
                  </p>
                </div>
                <span className="text-xs font-semibold px-2.5 py-1 bg-slate-100 rounded-full text-slate-700">
                  {Object.values(checklistResponses).filter(v => Boolean(v?.status)).length} / {effectiveChecklistSchema.length} Evaluated
                </span>
              </div>

              {hasExplicitEmptyChecklist && (
                <div className="p-4 bg-amber-50 border border-amber-300 rounded-xl text-xs text-amber-900 flex items-start gap-2.5">
                  <span className="material-symbols-outlined text-amber-700 text-lg shrink-0 mt-0.5">warning</span>
                  <div>
                    <strong className="block font-bold">Unconfigured Category Checklist</strong>
                    <p className="mt-0.5">
                      No statutory verification checklist has been configured for this instrument category in the master RuleSet. The standard default inspection template below is displayed.
                    </p>
                  </div>
                </div>
              )}

              <div className="space-y-4">
                {effectiveChecklistSchema.map((item) => {
                  const current = checklistResponses[item.id] || { status: '', note: '' };
                  const isFailWithoutNote = current.status === 'FAIL' && !current.note?.trim();

                  return (
                    <div key={item.id} className={`p-4 rounded-xl text-xs space-y-3 border transition-colors ${
                      isFailWithoutNote ? 'bg-rose-50/70 border-rose-300' : 'bg-slate-50 border-slate-200'
                    }`}>
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div>
                          <h4 className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                            {item.title}
                            {item.required && <span className="text-rose-500 font-extrabold text-sm" title="Mandatory">*</span>}
                          </h4>
                          <p className="text-slate-500 mt-0.5">{item.description}</p>
                        </div>

                        {/* Pass / Fail / NA Button Toggle Group */}
                        <div className="flex items-center gap-1.5 shrink-0 self-start sm:self-center">
                          <button
                            type="button"
                            onClick={() => handleChecklistChange(item.id, 'PASS')}
                            className={`px-3 py-1.5 rounded-lg font-bold text-xs transition-all flex items-center gap-1 cursor-pointer ${
                              current.status === 'PASS'
                                ? 'bg-emerald-600 text-white shadow-xs'
                                : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
                            }`}
                          >
                            <span className="material-symbols-outlined text-[15px]">check</span>
                            Pass
                          </button>
                          <button
                            type="button"
                            onClick={() => handleChecklistChange(item.id, 'FAIL')}
                            className={`px-3 py-1.5 rounded-lg font-bold text-xs transition-all flex items-center gap-1 cursor-pointer ${
                              current.status === 'FAIL'
                                ? 'bg-rose-600 text-white shadow-xs'
                                : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
                            }`}
                          >
                            <span className="material-symbols-outlined text-[15px]">close</span>
                            Fail
                          </button>
                          <button
                            type="button"
                            onClick={() => handleChecklistChange(item.id, 'NA')}
                            className={`px-3 py-1.5 rounded-lg font-bold text-xs transition-all flex items-center gap-1 cursor-pointer ${
                              current.status === 'NA'
                                ? 'bg-slate-700 text-white shadow-xs'
                                : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
                            }`}
                          >
                            N/A
                          </button>
                        </div>
                      </div>

                      {/* Note Input */}
                      <div>
                        <input
                          type="text"
                          placeholder={current.status === 'FAIL' ? 'Failure rationale is mandatory for FAIL items...' : 'Add specific observation or note for this check (optional)...'}
                          value={current.note}
                          onChange={(e) => handleChecklistChange(item.id, undefined, e.target.value)}
                          className={`w-full bg-white border rounded-lg px-3 py-1.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-hidden ${
                            isFailWithoutNote ? 'border-rose-400 focus:border-rose-600' : 'border-slate-200 focus:border-primary'
                          }`}
                        />
                        {isFailWithoutNote && (
                          <p className="text-[10px] text-rose-600 font-bold mt-1">Please enter an observation note explaining why this item failed.</p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Bottom Nav */}
              <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                <button
                  onClick={handleSaveDraft}
                  disabled={savingDraft}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs flex items-center gap-1.5"
                >
                  <span className="material-symbols-outlined text-[16px]">save</span>
                  {savingDraft ? 'Saving...' : 'Save Draft'}
                </button>
                <button
                  onClick={() => setActiveStep('readings')}
                  className="px-5 py-2.5 bg-primary text-white font-bold rounded-xl text-xs hover:bg-primary-container shadow-xs flex items-center gap-1.5"
                >
                  Next: Enter Readings
                  <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
                </button>
              </div>
            </div>
          )}

          {/* ========================================================
              STEP 2: MEASUREMENT READINGS
             ======================================================== */}
          {activeStep === 'readings' && (
            <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-5 animate-in fade-in duration-200">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                    Measurement Readings & Test Observations
                  </h3>
                  <p className="text-xs text-slate-500">
                    Record observed values against standard reference loads for this NAWI Class III instrument.
                  </p>
                </div>
                <span className="font-mono text-xs font-semibold px-2.5 py-1 bg-slate-100 rounded-full text-slate-700">
                  Capacity: {caseData.max_capacity} (e = {caseData.verification_scale_interval_e})
                </span>
              </div>

              <div className="space-y-3">
                {readings.map((reading, idx) => {
                  const refNum = parseFloat(reading.reference_value) || 0;
                  const obsNum = parseFloat(reading.observed_value);
                  const hasObs = reading.observed_value !== '' && reading.observed_value !== undefined && !isNaN(obsNum);
                  const diff = hasObs ? (obsNum - refNum).toFixed(4) : null;

                  return (
                    <div key={idx} className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs grid grid-cols-1 sm:grid-cols-5 gap-3 items-center">
                      <div className="sm:col-span-2">
                        <span className="text-[10px] text-slate-400 uppercase font-bold block">Check / Reference Test Point</span>
                        <input
                          type="text"
                          value={reading.test_point}
                          onChange={(e) => handleReadingChange(idx, 'test_point', e.target.value)}
                          className="font-bold text-slate-900 text-sm bg-transparent border-b border-transparent hover:border-slate-300 focus:border-primary focus:bg-white focus:outline-none w-full"
                        />
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-[11px] text-slate-500 font-mono flex items-center gap-1">
                            Ref:
                            <input
                              type="number"
                              step="any"
                              value={reading.reference_value}
                              onChange={(e) => handleReadingChange(idx, 'reference_value', e.target.value)}
                              className="w-16 px-1.5 py-0.5 bg-white border border-slate-200 rounded font-mono font-bold text-xs"
                            />
                            {reading.unit}
                          </span>
                          {hasObs && (
                            <span className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded ${
                              Math.abs(parseFloat(diff)) > 0.05 ? 'bg-rose-100 text-rose-800' : 'bg-emerald-100 text-emerald-800'
                            }`}>
                              Error: {parseFloat(diff) > 0 ? `+${diff}` : diff} {reading.unit}
                            </span>
                          )}
                        </div>
                      </div>

                      <div>
                        <span className="text-[10px] text-slate-400 uppercase font-bold block">Observed Value</span>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <input
                            type="number"
                            step="any"
                            value={reading.observed_value}
                            onChange={(e) => handleReadingChange(idx, 'observed_value', e.target.value)}
                            placeholder="0.000"
                            className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm font-mono font-bold text-primary focus:outline-none focus:border-primary shadow-xs"
                          />
                          <span className="text-xs font-bold text-slate-500">{reading.unit}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <div className="flex-1">
                          <span className="text-[10px] text-slate-400 uppercase font-bold block">Point Result</span>
                          <select
                            value={reading.reading_result || 'PASS'}
                            onChange={(e) => handleReadingChange(idx, 'reading_result', e.target.value)}
                            className="w-full mt-0.5 bg-white border border-slate-300 rounded-lg px-2.5 py-2 text-xs font-semibold text-slate-800 focus:outline-none focus:border-primary shadow-xs"
                          >
                            <option value="PASS">PASS (Within Tolerance)</option>
                            <option value="FAIL">FAIL (Exceeds Error)</option>
                            <option value="ACCEPTABLE">ACCEPTABLE</option>
                          </select>
                        </div>
                        {readings.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleDeleteReading(idx)}
                            title="Remove test point"
                            className="mt-4 p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors"
                          >
                            <span className="material-symbols-outlined text-base">delete</span>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}

                <div className="pt-2 flex justify-start">
                  <button
                    type="button"
                    onClick={handleAddReading}
                    className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs flex items-center gap-1 border border-slate-200 cursor-pointer transition-colors"
                  >
                    <span className="material-symbols-outlined text-[16px]">add</span>
                    Add Measurement Test Point
                  </button>
                </div>
              </div>

              {/* Bottom Nav */}
              <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                <button
                  onClick={() => setActiveStep('checklist')}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs flex items-center gap-1.5"
                >
                  <span className="material-symbols-outlined text-[16px]">arrow_back</span>
                  Back to Checklist
                </button>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleSaveDraft}
                    disabled={savingDraft}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs flex items-center gap-1.5"
                  >
                    <span className="material-symbols-outlined text-[16px]">save</span>
                    {savingDraft ? 'Saving...' : 'Save Draft'}
                  </button>
                  <button
                    onClick={() => setActiveStep('observations')}
                    className="px-5 py-2.5 bg-primary text-white font-bold rounded-xl text-xs hover:bg-primary-container shadow-xs flex items-center gap-1.5"
                  >
                    Next: Observations
                    <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================
              STEP 3: OBSERVATIONS
             ======================================================== */}
          {activeStep === 'observations' && (
            <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-5 animate-in fade-in duration-200">
              <div className="pb-3 border-b border-slate-100">
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                  Verification Observations & Remarks
                </h3>
                <p className="text-xs text-slate-500">
                  Record overall findings, environmental context, or specific rationale (mandatory if issuing a FAIL outcome).
                </p>
              </div>

              {/* GATC Lab Testing Environment & Standards (when role is GATC) */}
              {(currentUser?.role === 'GATC' || caseData?.assigned_type === 'GATC') && (
                <div className="p-4 bg-indigo-50/70 border border-indigo-200 rounded-xl space-y-3">
                  <div className="flex items-center gap-2 text-indigo-900 font-bold text-xs">
                    <span className="material-symbols-outlined text-base text-indigo-700">science</span>
                    Laboratory Metrological Environment & Working Standards
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                    <div>
                      <label className="text-slate-500 block text-[10px] font-bold uppercase mb-1">Chamber Temp (°C)</label>
                      <input
                        type="text"
                        value={chamberTemperature}
                        onChange={e => setChamberTemperature(e.target.value)}
                        className="w-full p-2 bg-white border border-slate-300 rounded-lg text-xs font-semibold"
                        placeholder="23.0"
                      />
                    </div>
                    <div>
                      <label className="text-slate-500 block text-[10px] font-bold uppercase mb-1">Relative Humidity (%)</label>
                      <input
                        type="text"
                        value={relativeHumidity}
                        onChange={e => setRelativeHumidity(e.target.value)}
                        className="w-full p-2 bg-white border border-slate-300 rounded-lg text-xs font-semibold"
                        placeholder="50"
                      />
                    </div>
                    <div>
                      <label className="text-slate-500 block text-[10px] font-bold uppercase mb-1">Standards Class</label>
                      <select
                        value={standardsClass}
                        onChange={e => setStandardsClass(e.target.value)}
                        className="w-full p-2 bg-white border border-slate-300 rounded-lg text-xs font-semibold"
                      >
                        <option value="CLASS_E1">Class E1 (Primary Metrology)</option>
                        <option value="CLASS_E2">Class E2 (High Precision)</option>
                        <option value="CLASS_F1">Class F1 (Standard Precision)</option>
                        <option value="CLASS_F2">Class F2 (Industrial Lab)</option>
                        <option value="CLASS_M1">Class M1 (Working Standards)</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-slate-500 block text-[10px] font-bold uppercase mb-1">Calibration Cert Ref</label>
                      <input
                        type="text"
                        value={calibrationCertRef}
                        onChange={e => setCalibrationCertRef(e.target.value)}
                        className="w-full p-2 bg-white border border-slate-300 rounded-lg text-xs font-semibold"
                        placeholder="NPLI/CAL/2026/894"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Quick Tap Chips for Mobile Verifiers */}
              <div>
                <span className="text-[11px] text-slate-400 font-bold uppercase block mb-1.5">Quick Observation Chips:</span>
                <div className="flex flex-wrap gap-1.5 text-xs">
                  {[
                    'Zero return verified within ±0.25e',
                    'Level bubble centered on firm counter',
                    'Calibration port lead seal verified intact',
                    'All corner eccentricity loads within limits',
                    'Nameplate markings legible & complete',
                    'Tamper-evident seal damaged / broken',
                    'Observed error exceeded maximum permissible error'
                  ].map((chip, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => {
                        setObservations(prev => (prev ? `${prev}. ${chip}` : chip));
                      }}
                      className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-medium transition-colors border border-slate-200"
                    >
                      + {chip}
                    </button>
                  ))}
                </div>
              </div>

              {/* Main Textarea */}
              <div>
                <textarea
                  rows={6}
                  value={observations}
                  onChange={(e) => setObservations(e.target.value)}
                  placeholder="Enter detailed statutory verification remarks, notes, or failure reasons here..."
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl p-4 text-xs text-slate-900 focus:outline-hidden focus:border-primary focus:bg-white shadow-xs leading-relaxed"
                />
              </div>

              {/* Bottom Nav */}
              <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                <button
                  onClick={() => setActiveStep('readings')}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs flex items-center gap-1.5"
                >
                  <span className="material-symbols-outlined text-[16px]">arrow_back</span>
                  Back to Readings
                </button>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleSaveDraft}
                    disabled={savingDraft}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs flex items-center gap-1.5"
                  >
                    <span className="material-symbols-outlined text-[16px]">save</span>
                    {savingDraft ? 'Saving...' : 'Save Draft'}
                  </button>
                  <button
                    onClick={() => setActiveStep('evidence')}
                    className="px-5 py-2.5 bg-primary text-white font-bold rounded-xl text-xs hover:bg-primary-container shadow-xs flex items-center gap-1.5"
                  >
                    Next: Evidence Upload
                    <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================
              STEP 4: EVIDENCE UPLOAD
             ======================================================== */}
          {activeStep === 'evidence' && (
            <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-6 animate-in fade-in duration-200">
              <div className="pb-3 border-b border-slate-100">
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                  Photographic & Document Evidence
                </h3>
                <p className="text-xs text-slate-500">
                  Attach field photographs of the instrument setup, stamped nameplate, and tamper seals to substantiate the verification.
                </p>
              </div>

              {/* Upload Form Box */}
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
                <h4 className="font-bold text-slate-800 text-xs uppercase tracking-wide">Attach New Evidence Photo / File</h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="text-[10px] text-slate-400 font-bold uppercase block mb-1">Category</label>
                    <select
                      value={uploadCategory}
                      onChange={(e) => setUploadCategory(e.target.value)}
                      className="w-full bg-white border border-slate-300 rounded-lg p-2 text-xs font-semibold text-slate-800 focus:outline-hidden focus:border-primary"
                    >
                      <option value="DEVICE_SETUP">Overall Device Setup</option>
                      <option value="NAMEPLATE_STAMP">Nameplate & Serial Stamping</option>
                      <option value="TAMPER_SEAL">Wire / Lead Tamper Seal</option>
                      <option value="TEST_WEIGHTS">Mass Standards / Weights</option>
                      <option value="OTHER">Other Field Document</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-400 font-bold uppercase block mb-1">Caption / Description</label>
                    <input
                      type="text"
                      placeholder="e.g., Platter with 30kg test mass applied"
                      value={uploadCaption}
                      onChange={(e) => setUploadCaption(e.target.value)}
                      className="w-full bg-white border border-slate-300 rounded-lg p-2 text-xs text-slate-800 focus:outline-hidden focus:border-primary"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-400 font-bold uppercase block mb-1">Select File / Camera</label>
                    <input
                      type="file"
                      accept="image/*,.pdf"
                      onChange={handleEvidenceUpload}
                      disabled={uploading}
                      className="w-full text-xs text-slate-600 file:mr-2 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-primary file:text-white hover:file:bg-primary-container cursor-pointer"
                    />
                  </div>
                </div>
                {uploading && (
                  <p className="text-[11px] text-primary font-bold animate-pulse">Uploading evidence file...</p>
                )}
              </div>

              {/* Uploaded Evidence Grid */}
              <div className="space-y-3">
                <h4 className="font-bold text-slate-800 text-xs uppercase tracking-wide">
                  Attached Evidence Records ({evidenceList.length})
                </h4>

                {evidenceList.length === 0 ? (
                  <div className="p-8 text-center text-slate-400 text-xs bg-slate-50 rounded-xl border border-dashed border-slate-200">
                    No photographs or documents attached yet.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                    {evidenceList.map((ev) => {
                      const isImage = /\.(jpg|jpeg|png|webp|gif)$/i.test(ev.file_path || ev.file_name);

                      return (
                        <div key={ev.id} className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs group flex flex-col justify-between">
                          <div className="h-32 bg-slate-100 flex items-center justify-center overflow-hidden relative">
                            {isImage ? (
                              <img
                                src={getFileUrl(ev.file_path)}
                                alt={ev.caption || ev.file_name}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="text-center p-4 text-slate-400">
                                <span className="material-symbols-outlined text-4xl">description</span>
                                <span className="block text-[10px] truncate max-w-[140px]">{ev.file_name}</span>
                              </div>
                            )}
                            <span className="absolute top-2 left-2 px-2 py-0.5 rounded text-[9px] font-bold bg-slate-900/80 text-white uppercase backdrop-blur-xs">
                              {ev.category?.replace('_', ' ')}
                            </span>
                          </div>

                          <div className="p-3 text-xs space-y-1">
                            <p className="font-bold text-slate-900 truncate" title={ev.caption || ev.file_name}>
                              {ev.caption || ev.file_name}
                            </p>
                            <p className="text-[10px] text-slate-400">{new Date(ev.created_at).toLocaleDateString()}</p>
                          </div>

                          <div className="px-3 pb-3 pt-1 border-t border-slate-100 flex items-center justify-between">
                            <button
                              type="button"
                              onClick={() =>
                                setPreviewDoc({
                                  file_name: ev.file_name,
                                  file_path: ev.file_path,
                                  file_type: ev.file_type,
                                  category: ev.category || 'Inspection Evidence',
                                  uploaded_at: ev.created_at
                                })
                              }
                              className="text-[11px] text-primary hover:underline font-bold flex items-center gap-1 cursor-pointer"
                            >
                              <span className="material-symbols-outlined text-xs">visibility</span>
                              <span>Preview File</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteEvidence(ev.id)}
                              className="text-[11px] text-rose-600 hover:text-rose-800 font-bold"
                            >
                              Remove
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Bottom Nav */}
              <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                <button
                  onClick={() => setActiveStep('observations')}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs flex items-center gap-1.5"
                >
                  <span className="material-symbols-outlined text-[16px]">arrow_back</span>
                  Back to Observations
                </button>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleSaveDraft}
                    disabled={savingDraft}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs flex items-center gap-1.5"
                  >
                    <span className="material-symbols-outlined text-[16px]">save</span>
                    {savingDraft ? 'Saving...' : 'Save Draft'}
                  </button>
                  <button
                    onClick={() => setActiveStep('review')}
                    className="px-5 py-2.5 bg-primary text-white font-bold rounded-xl text-xs hover:bg-primary-container shadow-xs flex items-center gap-1.5"
                  >
                    Next: Final Review
                    <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================
              STEP 5: REVIEW BEFORE SUBMISSION
             ======================================================== */}
          {activeStep === 'review' && (
            <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-6 animate-in fade-in duration-200">
              <div className="pb-3 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                    Final Statutory Verification Review
                  </h3>
                  <p className="text-xs text-slate-500">
                    Verify all recorded checklist checkpoints, measurement readings, observations, and evidence before submitting outcome.
                  </p>
                </div>
                <button
                  onClick={handleSaveDraft}
                  disabled={savingDraft}
                  className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg text-xs flex items-center gap-1"
                >
                  <span className="material-symbols-outlined text-[15px]">save</span>
                  Save Draft
                </button>
              </div>

              {/* Completeness Warning if errors exist */}
              {validationErrors.length > 0 && (
                <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800 space-y-1.5">
                  <div className="flex items-center gap-2 font-bold text-sm text-rose-900">
                    <span className="material-symbols-outlined text-rose-600">error</span>
                    Incomplete Verification Requirements ({validationErrors.length})
                  </div>
                  <ul className="list-disc pl-5 space-y-0.5">
                    {validationErrors.map((err, i) => (
                      <li key={i}>{err}</li>
                    ))}
                  </ul>
                  <p className="pt-1 text-[11px] text-rose-700">
                    <em>You must complete the missing required fields before final determination submission.</em>
                  </p>
                </div>
              )}

              {/* Review Summary Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
                {/* 1. Instrument & Trader summary */}
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                  <h4 className="font-bold text-slate-900 uppercase text-[11px]">Instrument Particulars</h4>
                  <div className="space-y-1.5">
                    <div className="flex justify-between"><span className="text-slate-500">Make & Model:</span> <strong className="text-slate-800">{caseData.manufacturer} {caseData.model}</strong></div>
                    <div className="flex justify-between"><span className="text-slate-500">Serial Number:</span> <strong className="font-mono text-primary">{caseData.serial_number}</strong></div>
                    <div className="flex justify-between"><span className="text-slate-500">Capacity & Scale (e):</span> <strong className="text-slate-800">{caseData.max_capacity} (e = {caseData.verification_scale_interval_e})</strong></div>
                    <div className="flex justify-between"><span className="text-slate-500">Commercial Trader:</span> <strong className="text-slate-800">{caseData.trader_name} ({caseData.trader_org})</strong></div>
                    <div className="flex justify-between"><span className="text-slate-500">Premises Location:</span> <strong className="text-slate-800 text-right max-w-[180px] truncate">{caseData.location}</strong></div>
                  </div>
                </div>

                {/* 2. Checklist summary */}
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="font-bold text-slate-900 uppercase text-[11px]">Checklist Evaluation</h4>
                    <button onClick={() => setActiveStep('checklist')} className="text-primary text-[11px] font-bold hover:underline">Edit</button>
                  </div>
                  <div className="space-y-1">
                    {caseData.checklist_schema?.map(item => {
                      const res = checklistResponses[item.id];
                      return (
                        <div key={item.id} className="flex justify-between items-center py-0.5">
                          <span className="text-slate-600 truncate max-w-[200px]">{item.title}</span>
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            res?.status === 'PASS' ? 'bg-emerald-100 text-emerald-800' : res?.status === 'FAIL' ? 'bg-rose-100 text-rose-800' : res?.status === 'NA' ? 'bg-slate-200 text-slate-700' : 'bg-rose-200 text-rose-900 animate-pulse'
                          }`}>
                            {res?.status || 'PENDING'}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* 3. Readings summary */}
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="font-bold text-slate-900 uppercase text-[11px]">Recorded Measurements</h4>
                    <button onClick={() => setActiveStep('readings')} className="text-primary text-[11px] font-bold hover:underline">Edit</button>
                  </div>
                  <div className="space-y-1">
                    {readings.map((r, i) => (
                      <div key={i} className="flex justify-between items-center py-0.5">
                        <span className="text-slate-600">{r.test_point}</span>
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-slate-800">{r.observed_value !== '' ? `${r.observed_value} ${r.unit}` : 'Missing'}</span>
                          <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                            r.reading_result === 'PASS' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                          }`}>
                            {r.reading_result || 'PASS'}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 4. Observations & Evidence summary */}
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <h4 className="font-bold text-slate-900 uppercase text-[11px]">Observations</h4>
                      <button onClick={() => setActiveStep('observations')} className="text-primary text-[11px] font-bold hover:underline">Edit</button>
                    </div>
                    <p className="text-slate-700 italic bg-white p-2.5 rounded-lg border border-slate-200 min-h-[48px]">
                      {observations || 'No additional remarks recorded.'}
                    </p>
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <h4 className="font-bold text-slate-900 uppercase text-[11px]">Attached Evidence</h4>
                      <button onClick={() => setActiveStep('evidence')} className="text-primary text-[11px] font-bold hover:underline">Edit</button>
                    </div>
                    <span className="text-slate-700 font-semibold">{evidenceList.length} files attached</span>
                  </div>
                </div>
              </div>

              {/* Submission Action Bar */}
              <div className="p-6 rounded-2xl bg-slate-900 text-white space-y-4 shadow-md">
                <div>
                  <h4 className="text-sm font-bold uppercase tracking-wider text-slate-200 flex items-center gap-2">
                    <span className="material-symbols-outlined text-[18px] text-primary">assignment_turned_in</span>
                    Field Verification Report Submission
                  </h4>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Submit your field inspection findings and test readings. The Legal Metrology Authority Officer will scrutinize this report to make the final statutory approval and certificate issuance decision.
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row items-center justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => handleSubmitResult('FAIL')}
                    disabled={submitting}
                    className="w-full sm:w-auto px-6 py-2.5 bg-rose-700 hover:bg-rose-800 text-white font-bold rounded-xl text-xs shadow-xs transition-all flex items-center justify-center gap-1.5"
                  >
                    <span className="material-symbols-outlined text-[18px]">cancel</span>
                    {submitting ? 'Submitting...' : 'Submit FAIL Report to Authority'}
                  </button>

                  <button
                    type="button"
                    onClick={() => handleSubmitResult('PASS')}
                    disabled={submitting || validationErrors.length > 0}
                    className={`w-full sm:w-auto px-6 py-2.5 font-bold rounded-xl text-xs shadow-md transition-all flex items-center justify-center gap-1.5 ${
                      validationErrors.length > 0
                        ? 'bg-slate-700 text-slate-400 cursor-not-allowed'
                        : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                    }`}
                  >
                    <span className="material-symbols-outlined text-[18px]">verified</span>
                    {submitting ? 'Submitting...' : 'Submit PASS Report to Authority'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Document Preview Lightbox Modal */}
      {previewDoc && (
        <DocumentPreviewModal
          document={previewDoc}
          onClose={() => setPreviewDoc(null)}
        />
      )}
    </div>
  );
}
