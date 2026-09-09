import React, { useState, useEffect } from 'react';
import { api } from '../api';
import StatusBadge from '../components/StatusBadge';

const STEPS = [
  { id: 1, title: 'Type', label: 'Verification Type', icon: 'verified' },
  { id: 2, title: 'Mode', label: 'Verification Mode', icon: 'business' },
  { id: 3, title: 'Instrument', label: 'Select Instrument', icon: 'scale' },
  { id: 4, title: 'Details', label: 'Premises & Contact', icon: 'description' },
  { id: 5, title: 'Documents', label: 'Upload Documents', icon: 'upload_file' },
  { id: 6, title: 'Fees', label: 'Fee Calculation', icon: 'calculate' },
  { id: 7, title: 'Review', label: 'Review & Declaration', icon: 'rate_review' },
  { id: 8, title: 'Submit', label: 'Submission', icon: 'send' },
  { id: 9, title: 'Payment', label: 'Statutory Payment', icon: 'payments' },
  { id: 10, title: 'Status', label: 'Acknowledgement', icon: 'receipt_long' }
];

export default function ApplyVerificationView({
  currentUser,
  instruments = [],
  preselectedInstrumentId = null,
  resubmitApplicationData = null,
  pendingPaymentApplication = null,
  onClose,
  onApplicationCreated,
  onOpenAddInstrument,
  onViewApplicationTimeline
}) {
  const isResubmitMode = Boolean(resubmitApplicationData);
  const isPaymentMode = Boolean(pendingPaymentApplication);
  const [currentStep, setCurrentStep] = useState(
    isPaymentMode ? 9 : (isResubmitMode ? 4 : 1)
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // 1. Verification Type: 'ORIGINAL' | 'RE_VERIFICATION'
  const [verificationType, setVerificationType] = useState(() => {
    if (pendingPaymentApplication?.verification_type) return pendingPaymentApplication.verification_type;
    if (resubmitApplicationData?.verification_type) return resubmitApplicationData.verification_type;
    return 'ORIGINAL';
  });

  // 2. Verification Mode: 'IN_SITU' | 'CAMP'
  const [verificationMode, setVerificationMode] = useState(() => {
    if (pendingPaymentApplication?.verification_mode) return pendingPaymentApplication.verification_mode;
    if (resubmitApplicationData?.verification_mode) return resubmitApplicationData.verification_mode;
    return 'CAMP';
  });

  // 3. Selected Instrument
  const [selectedInstrumentId, setSelectedInstrumentId] = useState(() => {
    if (pendingPaymentApplication?.instrument_id) return pendingPaymentApplication.instrument_id;
    if (resubmitApplicationData?.instrument_id) return resubmitApplicationData.instrument_id;
    return preselectedInstrumentId || instruments[0]?.id || '';
  });

  // 4. Establishment & Contact Details
  const [applicantName, setApplicantName] = useState(currentUser?.full_name || 'Authorized Trader');
  const [firmName, setFirmName] = useState(currentUser?.organization_id || 'Commercial Enterprise');
  const [contactPerson, setContactPerson] = useState(() => {
    return pendingPaymentApplication?.contact_person || resubmitApplicationData?.contact_person || currentUser?.full_name || '';
  });
  const [contactPhone, setContactPhone] = useState(() => {
    return pendingPaymentApplication?.contact_phone || resubmitApplicationData?.contact_phone || currentUser?.phone || '9876543210';
  });
  const [premisesAddress, setPremisesAddress] = useState(() => {
    return pendingPaymentApplication?.location_address || resubmitApplicationData?.location_address || '';
  });
  const [preferredDate, setPreferredDate] = useState(() => {
    if (pendingPaymentApplication?.preferred_date) return pendingPaymentApplication.preferred_date;
    if (resubmitApplicationData?.preferred_date) return resubmitApplicationData.preferred_date;
    const d = new Date();
    d.setDate(d.getDate() + 3);
    return d.toISOString().split('T')[0];
  });
  const [remarks, setRemarks] = useState(() => {
    return pendingPaymentApplication?.remarks || resubmitApplicationData?.remarks || '';
  });

  // 5. Documents / Evidence
  const [documents, setDocuments] = useState(() => {
    if (Array.isArray(pendingPaymentApplication?.documents) && pendingPaymentApplication.documents.length > 0) {
      return pendingPaymentApplication.documents;
    }
    if (Array.isArray(resubmitApplicationData?.documents) && resubmitApplicationData.documents.length > 0) {
      return resubmitApplicationData.documents;
    }
    return [
      {
        id: 'DOC_INIT_01',
        category: 'INVOICE',
        file_name: 'Commercial_Purchase_Invoice.pdf',
        file_size: '245 KB',
        uploaded_at: new Date().toISOString()
      }
    ];
  });
  const [docCategory, setDocCategory] = useState('INVOICE');
  const [docFile, setDocFile] = useState(null);

  // 6. Fee Structure
  const [feeBreakdown, setFeeBreakdown] = useState(null);

  // 7. Review & Declaration
  const [agreeDeclaration, setAgreeDeclaration] = useState(false);
  const [agreeAccuracy, setAgreeAccuracy] = useState(false);
  const [agreePremisesAccess, setAgreePremisesAccess] = useState(false);

  // 9. Payment
  const [paymentMethod, setPaymentMethod] = useState('ONLINE');
  const [offlineChallanNo, setOfflineChallanNo] = useState('');
  const [offlineBankName, setOfflineBankName] = useState('State Bank of India');
  const [offlineDate, setOfflineDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [paymentProcessing, setPaymentProcessing] = useState(false);

  // Result / Output
  const [createdApp, setCreatedApp] = useState(
    pendingPaymentApplication || resubmitApplicationData || null
  );
  const [paymentResult, setPaymentResult] = useState(null);

  // Find currently selected instrument
  const selectedInst = instruments.find(i => i.id === selectedInstrumentId) || instruments[0] || null;

  // Auto-fill premises address when instrument is picked
  useEffect(() => {
    if (selectedInst && !premisesAddress) {
      setPremisesAddress(selectedInst.location || '');
    }
  }, [selectedInst]);

  // If preselected instrument passed, use it
  useEffect(() => {
    if (preselectedInstrumentId) {
      setSelectedInstrumentId(preselectedInstrumentId);
    }
  }, [preselectedInstrumentId]);

  // Recalculate fees whenever instrument, type, or mode changes
  useEffect(() => {
    if (!selectedInst) return;

    let baseFee = 300;
    const capacityNum = parseFloat(selectedInst.max_capacity) || 30;

    if (capacityNum <= 50) baseFee = 300;
    else if (capacityNum <= 500) baseFee = 500;
    else if (capacityNum <= 2000) baseFee = 800;
    else baseFee = 1500;

    let inSituCharge = 0;
    if (verificationMode === 'IN_SITU') {
      inSituCharge = 200; // Schedule V on-site conveyance charge
    }

    let userFee = 50; // IT / State Portal Facilitation Charge
    let totalFee = baseFee + inSituCharge + userFee;

    setFeeBreakdown({
      base_verification_fee: baseFee,
      in_situ_inspection_charge: inSituCharge,
      portal_service_fee: userFee,
      total_fee: totalFee,
      rule_reference: 'Schedule V, Non-Automatic Weighing Instruments (NAWI)'
    });
  }, [selectedInst, verificationType, verificationMode]);

  // Handle Document Upload simulation
  const handleAddDocument = (e) => {
    e.preventDefault();
    const fakeFileName = docFile ? docFile.name : `${docCategory.toLowerCase()}_verified_${Date.now().toString().slice(-4)}.pdf`;
    const newDoc = {
      id: `DOC_${Date.now()}`,
      category: docCategory,
      file_name: fakeFileName,
      file_size: '320 KB',
      uploaded_at: new Date().toISOString()
    };
    setDocuments(prev => [...prev, newDoc]);
    setDocFile(null);
  };

  const handleRemoveDocument = (id) => {
    setDocuments(prev => prev.filter(d => d.id !== id));
  };

  // Step Validation logic
  const validateStep = (step) => {
    setError('');

    if (step === 1) {
      if (!verificationType) {
        setError('Please select a statutory verification type.');
        return false;
      }
    } else if (step === 2) {
      if (!verificationMode) {
        setError('Please select an inspection verification mode (In-situ or Camp).');
        return false;
      }
    } else if (step === 3) {
      if (!selectedInstrumentId && instruments.length > 0) {
        setError('Please select an instrument from your registered inventory.');
        return false;
      }
      if (instruments.length === 0) {
        setError('You have no registered instruments. Please register an instrument first.');
        return false;
      }
    } else if (step === 4) {
      if (!contactPerson.trim()) {
        setError('Contact person name is required.');
        return false;
      }
      if (!contactPhone.trim() || contactPhone.trim().length < 10) {
        setError('A valid 10-digit mobile number is required.');
        return false;
      }
      if (!premisesAddress.trim()) {
        setError('Complete premises address is required.');
        return false;
      }
      if (!preferredDate) {
        setError('Preferred verification date is required.');
        return false;
      }
    } else if (step === 5) {
      if (documents.length === 0) {
        setError('Please upload at least one required statutory document (e.g. Invoice or Calibration certificate).');
        return false;
      }
    } else if (step === 7) {
      if (!agreeDeclaration || !agreeAccuracy || !agreePremisesAccess) {
        setError('Please accept all statutory declarations and undertakings before proceeding to submission.');
        return false;
      }
    }

    return true;
  };

  const handleNext = () => {
    if (validateStep(currentStep)) {
      setError('');
      setCurrentStep(prev => Math.min(prev + 1, 10));
    }
  };

  const handleBack = () => {
    setError('');
    setCurrentStep(prev => Math.max(prev - 1, 1));
  };

  // Handle Step 8: Submit Application
  const handleSubmitApplication = async () => {
    if (!validateStep(7)) return;
    setLoading(true);
    setError('');

    try {
      if (isResubmitMode) {
        // Resubmit flow
        const result = await api.resubmitApplication(resubmitApplicationData.id, {
          documents,
          remarks: remarks.trim(),
          contact_person: contactPerson,
          contact_phone: contactPhone,
          location_address: premisesAddress,
          preferred_date: preferredDate
        });
        setCreatedApp(result.application);
        if (onApplicationCreated) {
          onApplicationCreated(result.application.id, result.application.application_no);
        }
        setCurrentStep(10); // Go straight to acknowledgement
      } else {
        // New Application Submission
        const payload = {
          instrument_id: selectedInstrumentId,
          trader_id: currentUser?.id,
          request_type: verificationType === 'RE_VERIFICATION' ? 'RE_VERIFICATION' : 'INITIAL_VERIFICATION',
          verification_type: verificationType,
          verification_mode: verificationMode,
          preferred_date: preferredDate,
          contact_person: contactPerson,
          contact_phone: contactPhone,
          location_address: premisesAddress,
          remarks: remarks.trim(),
          documents: documents,
          fee_breakdown: feeBreakdown,
          payment: {
            payment_status: 'PENDING',
            amount: feeBreakdown?.total_fee || 300
          }
        };

        const result = await api.createApplication(payload);
        setCreatedApp(result);
        if (onApplicationCreated) {
          onApplicationCreated(result.id, result.application_no);
        }
        setCurrentStep(9); // Move to Payment Step
      }
    } catch (err) {
      setError(err.message || 'Failed to submit verification application.');
    } finally {
      setLoading(false);
    }
  };

  // Handle Step 9: Authorize Payment
  const handleProcessPayment = async () => {
    if (!createdApp?.id) {
      setError('Missing application reference for payment.');
      return;
    }

    if (paymentMethod === 'OFFLINE' && !offlineChallanNo.trim()) {
      setError('Please provide the Treasury Challan or Demand Draft reference number.');
      return;
    }

    setPaymentProcessing(true);
    setError('');

    try {
      const paymentData = {
        payment_mode: paymentMethod,
        payment_status: paymentMethod === 'ONLINE' ? 'PAID' : 'PAYMENT_VERIFIED',
        transaction_id: paymentMethod === 'ONLINE'
          ? `TXN_${Date.now()}_${Math.floor(1000 + Math.random() * 9000)}`
          : offlineChallanNo.trim(),
        reference_no: `REF-${Math.floor(100000 + Math.random() * 900000)}`,
        amount: feeBreakdown?.total_fee || createdApp?.payment?.amount || createdApp?.amount || 300,
        paid_at: new Date().toISOString()
      };

      const res = await api.recordPayment(createdApp.id, paymentData);
      setPaymentResult(res.payment);
      setCreatedApp(res.application);
      setCurrentStep(10); // Move to Acknowledgement step
    } catch (err) {
      setError(err.message || 'Payment processing failed. Please try again.');
    } finally {
      setPaymentProcessing(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300 pb-12">
      {/* 1. Page Header & Breadcrumb Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-200">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onClose}
            className="w-10 h-10 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 flex items-center justify-center text-slate-700 transition-colors shadow-2xs cursor-pointer shrink-0"
            title="Return to Dashboard"
          >
            <span className="material-symbols-outlined text-xl">arrow_back</span>
          </button>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
                {isPaymentMode ? 'Statutory Fee Remittance' : isResubmitMode ? 'Resubmit Verification Application' : 'Apply for Verification'}
              </h1>
              <span className="px-2.5 py-0.5 rounded text-[10.5px] font-bold bg-amber-400 text-[#002046] uppercase tracking-wide shadow-2xs">
                Schedule V NAWI
              </span>
              <span className="px-2.5 py-0.5 rounded text-[10.5px] font-bold bg-blue-100 text-blue-800 uppercase tracking-wide">
                Section 24
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Statutory verification & certification under the Legal Metrology Act, 2009 & General Rules, 2011
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-2 text-xs font-bold text-slate-700 hover:text-slate-900 bg-white border border-slate-300 rounded-xl hover:bg-slate-50 transition-all flex items-center gap-1.5 shadow-2xs cursor-pointer"
          >
            <span className="material-symbols-outlined text-sm">dashboard</span>
            Return to Dashboard
          </button>
        </div>
      </div>

      {/* 2. Main Multi-Step Form Card */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        
        {/* Top Header Banner Inside Card */}
        <div className="bg-gradient-to-r from-[#002046] via-[#1b365d] to-[#002046] text-white p-5 sm:p-6 flex items-center justify-between shrink-0 border-b-2 border-amber-400">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-xl bg-white/10 border border-white/20 flex items-center justify-center text-amber-400 font-bold shadow-xs shrink-0">
              <span className="material-symbols-outlined text-3xl">balance</span>
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base sm:text-lg font-extrabold tracking-tight text-white">
                  {isResubmitMode ? 'Resubmit Verification Application' : isPaymentMode ? 'Statutory Payment Gateway' : 'Verification Application Form'}
                </h2>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-400 text-[#002046] uppercase">
                  Schedule V NAWI
                </span>
              </div>
              <p className="text-[11px] sm:text-xs text-slate-300 font-medium mt-0.5">
                Statutory filing under Legal Metrology Act, 2009 & General Rules, 2011 (Form under Rule 14 / Rule 21)
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white text-xs font-semibold transition-colors flex items-center gap-1 cursor-pointer"
            title="Exit to Dashboard"
          >
            <span className="material-symbols-outlined text-sm">close</span>
            <span className="hidden sm:inline">Exit Form</span>
          </button>
        </div>

        {/* 10-Step Progress Stepper Header */}
        {currentStep <= 8 && (
          <div className="bg-slate-50 border-b border-slate-200 px-4 sm:px-6 py-3.5 overflow-x-auto scrollbar-thin">
            <div className="flex items-center min-w-[760px] gap-2 justify-between">
              {STEPS.slice(0, 8).map((step) => {
                const isActive = currentStep === step.id;
                const isPassed = currentStep > step.id;

                return (
                  <div key={step.id} className="flex items-center gap-2 flex-1">
                    <button
                      type="button"
                      disabled={!isPassed && !isActive}
                      onClick={() => {
                        if (isPassed) setCurrentStep(step.id);
                      }}
                      className={`
                        w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 transition-all
                        ${
                          isPassed
                            ? 'bg-emerald-600 text-white cursor-pointer hover:bg-emerald-700 shadow-2xs'
                            : isActive
                            ? 'bg-[#002046] text-amber-400 ring-2 ring-[#002046]/30 shadow-2xs font-extrabold'
                            : 'bg-white border border-slate-300 text-slate-400 cursor-not-allowed'
                        }
                      `}
                    >
                      {isPassed ? (
                        <span className="material-symbols-outlined text-[15px]">check</span>
                      ) : (
                        step.id
                      )}
                    </button>
                    <span className={`text-[11px] font-bold truncate ${
                      isActive ? 'text-[#002046]' : isPassed ? 'text-slate-700' : 'text-slate-400'
                    }`}>
                      {step.title}
                    </span>
                    {step.id < 8 && (
                      <div className={`h-0.5 flex-1 min-w-[14px] ${isPassed ? 'bg-emerald-500' : 'bg-slate-200'}`} />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Form Body Area */}
        <div className="p-6 sm:p-8 text-xs">
          {/* Error Banner */}
          {error && (
            <div className="mb-5 p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 flex items-start gap-2.5 animate-in fade-in">
              <span className="material-symbols-outlined text-base text-rose-600 shrink-0 mt-0.5">error</span>
              <span className="font-semibold">{error}</span>
            </div>
          )}

          {/* Returned Notice Banner (if in resubmit mode) */}
          {isResubmitMode && resubmitApplicationData?.return_reason && (
            <div className="mb-5 p-4 bg-amber-50 border-2 border-amber-300 rounded-xl text-amber-950 shadow-xs animate-in fade-in">
              <div className="flex items-center gap-2 mb-1.5 text-amber-900 font-bold">
                <span className="material-symbols-outlined text-xl text-amber-600">assignment_return</span>
                <span className="text-sm">Returned for Correction by Statutory Authority</span>
              </div>
              <p className="text-xs text-amber-900/90 font-medium">
                <strong>Return Remarks:</strong> "{resubmitApplicationData.return_reason}"
              </p>
              <p className="text-[11px] text-amber-800/80 mt-1">
                Please update the necessary fields or documents below, then proceed to review and resubmit.
              </p>
            </div>
          )}

          {/* ====================================================
              STEP 1: VERIFICATION TYPE
             ==================================================== */}
          {currentStep === 1 && (
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Step 1: Select Verification Type</h3>
                <p className="text-slate-500 text-[11px] mt-0.5">
                  Specify whether this instrument is being submitted for its initial verification or a recurring statutory re-verification.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                {/* Option 1: Original Verification */}
                <div
                  onClick={() => setVerificationType('ORIGINAL')}
                  className={`p-5 rounded-xl border-2 cursor-pointer transition-all flex flex-col justify-between ${
                    verificationType === 'ORIGINAL'
                      ? 'border-[#002046] bg-[#002046]/5 shadow-sm'
                      : 'border-slate-200 hover:border-slate-300 bg-white'
                  }`}
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="px-2.5 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-800 uppercase">
                        Rule 14 • First Filing
                      </span>
                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                        verificationType === 'ORIGINAL' ? 'border-[#002046] bg-[#002046]' : 'border-slate-300'
                      }`}>
                        {verificationType === 'ORIGINAL' && <span className="w-2 h-2 rounded-full bg-white"></span>}
                      </div>
                    </div>
                    <h4 className="text-sm font-extrabold text-slate-900 flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-lg text-[#002046]">verified</span>
                      Original / Initial Verification
                    </h4>
                    <p className="text-slate-600 text-[11px] leading-relaxed">
                      For newly acquired, newly imported, or freshly manufactured weights and measures before first commercial transaction use.
                    </p>
                  </div>
                  <div className="mt-4 pt-3 border-t border-slate-200/80 text-[10.5px] text-slate-500">
                    Requires: Purchase Invoice, Model Approval Number, Factory Specs.
                  </div>
                </div>

                {/* Option 2: Re-Verification */}
                <div
                  onClick={() => setVerificationType('RE_VERIFICATION')}
                  className={`p-5 rounded-xl border-2 cursor-pointer transition-all flex flex-col justify-between ${
                    verificationType === 'RE_VERIFICATION'
                      ? 'border-[#002046] bg-[#002046]/5 shadow-sm'
                      : 'border-slate-200 hover:border-slate-300 bg-white'
                  }`}
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="px-2.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 uppercase">
                        Rule 21 • Periodic Renewal
                      </span>
                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                        verificationType === 'RE_VERIFICATION' ? 'border-[#002046] bg-[#002046]' : 'border-slate-300'
                      }`}>
                        {verificationType === 'RE_VERIFICATION' && <span className="w-2 h-2 rounded-full bg-white"></span>}
                      </div>
                    </div>
                    <h4 className="text-sm font-extrabold text-slate-900 flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-lg text-amber-600">published_with_changes</span>
                      Periodic Re-Verification
                    </h4>
                    <p className="text-slate-600 text-[11px] leading-relaxed">
                      For weights and measures currently in commercial service due for annual or biennial statutory calibration renewal.
                    </p>
                  </div>
                  <div className="mt-4 pt-3 border-t border-slate-200/80 text-[10.5px] text-slate-500">
                    Requires: Previous Certificate of Verification number and expiry details.
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ====================================================
              STEP 2: VERIFICATION MODE
             ==================================================== */}
          {currentStep === 2 && (
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Step 2: Select Verification Mode</h3>
                <p className="text-slate-500 text-[11px] mt-0.5">
                  Choose where the physical testing and calibration verification will be conducted by the Legal Metrology Officer.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                {/* Option 1: Camp / Verification Centre */}
                <div
                  onClick={() => setVerificationMode('CAMP')}
                  className={`p-5 rounded-xl border-2 cursor-pointer transition-all flex flex-col justify-between ${
                    verificationMode === 'CAMP'
                      ? 'border-[#002046] bg-[#002046]/5 shadow-sm'
                      : 'border-slate-200 hover:border-slate-300 bg-white'
                  }`}
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="px-2.5 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 uppercase">
                        Standard Statutory Fee
                      </span>
                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                        verificationMode === 'CAMP' ? 'border-[#002046] bg-[#002046]' : 'border-slate-300'
                      }`}>
                        {verificationMode === 'CAMP' && <span className="w-2 h-2 rounded-full bg-white"></span>}
                      </div>
                    </div>
                    <h4 className="text-sm font-extrabold text-slate-900 flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-lg text-emerald-600">store</span>
                      Camp / Department Centre Presentation
                    </h4>
                    <p className="text-slate-600 text-[11px] leading-relaxed">
                      Instrument is physically presented at the notified Legal Metrology Verification Centre or periodic verification camp.
                    </p>
                  </div>
                  <div className="mt-4 pt-3 border-t border-slate-200/80 text-[10.5px] text-slate-500">
                    Recommended for: Counter bench scales, portable electronic balances, retail weights.
                  </div>
                </div>

                {/* Option 2: In-situ (On-Site Verification) */}
                <div
                  onClick={() => setVerificationMode('IN_SITU')}
                  className={`p-5 rounded-xl border-2 cursor-pointer transition-all flex flex-col justify-between ${
                    verificationMode === 'IN_SITU'
                      ? 'border-[#002046] bg-[#002046]/5 shadow-sm'
                      : 'border-slate-200 hover:border-slate-300 bg-white'
                  }`}
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="px-2.5 py-0.5 rounded text-[10px] font-bold bg-purple-100 text-purple-800 uppercase">
                        Conveyance Charge Applicable
                      </span>
                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                        verificationMode === 'IN_SITU' ? 'border-[#002046] bg-[#002046]' : 'border-slate-300'
                      }`}>
                        {verificationMode === 'IN_SITU' && <span className="w-2 h-2 rounded-full bg-white"></span>}
                      </div>
                    </div>
                    <h4 className="text-sm font-extrabold text-slate-900 flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-lg text-purple-600">location_city</span>
                      In-situ (On-Premises Testing)
                    </h4>
                    <p className="text-slate-600 text-[11px] leading-relaxed">
                      Verification Officer visits your commercial premises to test fixed, bulky, or high-capacity instruments.
                    </p>
                  </div>
                  <div className="mt-4 pt-3 border-t border-slate-200/80 text-[10.5px] text-slate-500">
                    Mandatory for: Weighbridges, fuel dispensers, bulk storage tanks, heavy platform scales.
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ====================================================
              STEP 3: SELECT INSTRUMENT
             ==================================================== */}
          {currentStep === 3 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Step 3: Select Registered Instrument</h3>
                  <p className="text-slate-500 text-[11px] mt-0.5">
                    Pick the registered weighing or measuring instrument from your commercial inventory.
                  </p>
                </div>
                {onOpenAddInstrument && (
                  <button
                    type="button"
                    onClick={onOpenAddInstrument}
                    className="px-3 py-1.5 bg-primary/10 hover:bg-primary/20 text-primary font-bold rounded-lg text-xs transition-colors flex items-center gap-1 cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-sm">add_circle</span>
                    <span>Register New</span>
                  </button>
                )}
              </div>

              {instruments.length === 0 ? (
                <div className="p-8 text-center bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                  <span className="material-symbols-outlined text-4xl text-slate-400">scale</span>
                  <p className="text-xs text-slate-600 font-semibold">No registered instruments found in your account.</p>
                  <p className="text-[11px] text-slate-400">Under Legal Metrology Rules, an instrument must be registered before filing for verification.</p>
                  {onOpenAddInstrument && (
                    <button
                      type="button"
                      onClick={onOpenAddInstrument}
                      className="px-4 py-2 bg-primary text-white font-bold rounded-lg text-xs hover:bg-primary-container transition-all inline-flex items-center gap-1.5"
                    >
                      <span className="material-symbols-outlined text-sm">add</span>
                      Register an Instrument Now
                    </button>
                  )}
                </div>
              ) : (
                <div className="space-y-3 pt-2">
                  <label className="block text-slate-700 font-bold text-xs">
                    Choose from Registered Inventory:
                  </label>
                  <select
                    value={selectedInstrumentId}
                    onChange={(e) => setSelectedInstrumentId(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-xs font-medium text-slate-800 outline-none focus:border-primary shadow-2xs"
                  >
                    {instruments.map((inst) => (
                      <option key={inst.id} value={inst.id}>
                        {inst.manufacturer} {inst.model} — SN: {inst.serial_number} ({inst.category_name || 'Scale'})
                      </option>
                    ))}
                  </select>

                  {/* Selected Instrument Statutory Overview Card */}
                  {selectedInst && (
                    <div className="mt-4 p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                      <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                        <div>
                          <span className="text-xs font-extrabold text-slate-900 block">
                            {selectedInst.manufacturer} {selectedInst.model}
                          </span>
                          <span className="font-mono text-[10.5px] text-slate-500">
                            Serial No: {selectedInst.serial_number}
                          </span>
                        </div>
                        <StatusBadge status={selectedInst.status} />
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-[11px]">
                        <div>
                          <span className="text-slate-400 block text-[10px] uppercase font-semibold">Capacity</span>
                          <strong className="text-slate-800">{selectedInst.max_capacity}</strong>
                        </div>
                        <div>
                          <span className="text-slate-400 block text-[10px] uppercase font-semibold">Accuracy Class</span>
                          <strong className="text-slate-800">{selectedInst.accuracy_class || 'Class III'}</strong>
                        </div>
                        <div>
                          <span className="text-slate-400 block text-[10px] uppercase font-semibold">Verification Interval (e)</span>
                          <strong className="text-slate-800 font-mono">{selectedInst.verification_scale_interval_e || '1g'}</strong>
                        </div>
                        <div>
                          <span className="text-slate-400 block text-[10px] uppercase font-semibold">Model Approval No</span>
                          <strong className="text-slate-800 font-mono">{selectedInst.model_approval_number || 'IND/09/2024/712'}</strong>
                        </div>
                      </div>

                      <div className="pt-2 border-t border-slate-200 text-[11px] text-slate-600 flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-sm text-slate-400">location_on</span>
                        <span>Installed Location: <strong>{selectedInst.location || 'Main Counter'}</strong></span>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ====================================================
              STEP 4: PREMISES & CONTACT DETAILS
             ==================================================== */}
          {currentStep === 4 && (
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Step 4: Establishment & Verification Logistics</h3>
                <p className="text-slate-500 text-[11px] mt-0.5">
                  Confirm the authorized representative details and site access for verification execution.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Commercial Firm / Establishment Name *</label>
                  <input
                    type="text"
                    value={firmName}
                    onChange={(e) => setFirmName(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">Authorized Contact Person *</label>
                  <input
                    type="text"
                    value={contactPerson}
                    onChange={(e) => setContactPerson(e.target.value)}
                    placeholder="e.g. Rahul Sharma"
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs outline-none focus:border-primary"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">Contact Phone (Mobile for SMS Alerts) *</label>
                  <input
                    type="tel"
                    value={contactPhone}
                    onChange={(e) => setContactPhone(e.target.value)}
                    placeholder="10-digit mobile number"
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-mono outline-none focus:border-primary"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">Preferred Verification Date *</label>
                  <input
                    type="date"
                    value={preferredDate}
                    onChange={(e) => setPreferredDate(e.target.value)}
                    min={new Date().toISOString().split('T')[0]}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs outline-none focus:border-primary"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-slate-700 font-bold mb-1">Complete Premises Address *</label>
                  <textarea
                    rows={2}
                    value={premisesAddress}
                    onChange={(e) => setPremisesAddress(e.target.value)}
                    placeholder="Floor, Shop/Godown No, Street, Landmark, District, Pincode"
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs outline-none focus:border-primary"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-slate-700 font-bold mb-1">Special Instructions / Remarks</label>
                  <input
                    type="text"
                    value={remarks}
                    onChange={(e) => setRemarks(e.target.value)}
                    placeholder="e.g. Weighing scale is in billing counter 2; gate access code required."
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs outline-none focus:border-primary"
                  />
                </div>
              </div>
            </div>
          )}

          {/* ====================================================
              STEP 5: UPLOAD DOCUMENTS
             ==================================================== */}
          {currentStep === 5 && (
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Step 5: Upload Statutory Documents</h3>
                <p className="text-slate-500 text-[11px] mt-0.5">
                  Attach compliance evidence required under Legal Metrology Rules for statutory review.
                </p>
              </div>

              {/* Upload New Document Box */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                <span className="text-xs font-bold text-slate-800 block">Add Evidence Document:</span>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-slate-600 text-[11px] font-semibold mb-1">Document Category</label>
                    <select
                      value={docCategory}
                      onChange={(e) => setDocCategory(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs"
                    >
                      <option value="INVOICE">Commercial Purchase Invoice</option>
                      <option value="MODEL_APPROVAL">Model Approval Certificate</option>
                      <option value="CALIBRATION_REPORT">Factory Calibration Certificate</option>
                      <option value="PREVIOUS_CERTIFICATE">Previous Verification Certificate</option>
                      <option value="SITE_PHOTO">Premises / Nameplate Photo</option>
                    </select>
                  </div>

                  <div className="sm:col-span-2 flex items-end gap-2">
                    <div className="flex-1">
                      <label className="block text-slate-600 text-[11px] font-semibold mb-1">Select File (PDF / JPG / PNG)</label>
                      <input
                        type="file"
                        onChange={(e) => setDocFile(e.target.files[0] || null)}
                        className="w-full text-xs text-slate-500 file:mr-2 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-primary file:text-white hover:file:bg-primary-container cursor-pointer"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={handleAddDocument}
                      className="px-4 py-2 bg-primary hover:bg-primary-container text-white font-bold rounded-lg text-xs transition-colors flex items-center gap-1 shrink-0"
                    >
                      <span className="material-symbols-outlined text-sm">upload</span>
                      <span>Attach</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Uploaded Documents List */}
              <div className="space-y-2">
                <span className="text-xs font-bold text-slate-800 block">
                  Attached Documents ({documents.length}):
                </span>
                {documents.length === 0 ? (
                  <p className="text-slate-400 text-xs italic">No documents attached yet.</p>
                ) : (
                  <div className="divide-y divide-slate-200 border border-slate-200 rounded-xl overflow-hidden bg-white">
                    {documents.map((doc) => (
                      <div key={doc.id} className="p-3 flex items-center justify-between gap-3 text-xs hover:bg-slate-50">
                        <div className="flex items-center gap-2.5">
                          <span className="material-symbols-outlined text-primary text-xl">description</span>
                          <div>
                            <span className="font-bold text-slate-900 block">{doc.file_name}</span>
                            <span className="text-[10px] text-slate-400 font-semibold uppercase">
                              {doc.category} • {doc.file_size}
                            </span>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveDocument(doc.id)}
                          className="text-rose-600 hover:text-rose-800 p-1 rounded hover:bg-rose-50 cursor-pointer"
                          title="Remove Document"
                        >
                          <span className="material-symbols-outlined text-base">delete</span>
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ====================================================
              STEP 6: STATUTORY FEE CALCULATION
             ==================================================== */}
          {currentStep === 6 && (
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Step 6: Statutory Fee Calculation (Schedule V)</h3>
                <p className="text-slate-500 text-[11px] mt-0.5">
                  Prescribed verification fee computed under Legal Metrology (General) Rules, 2011.
                </p>
              </div>

              {/* Fee Breakdown Card */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                  <div>
                    <span className="text-xs font-bold text-slate-900 block">
                      Fee Assessment for {selectedInst?.manufacturer} {selectedInst?.model}
                    </span>
                    <span className="text-[11px] text-slate-500">
                      Rule Reference: {feeBreakdown?.rule_reference}
                    </span>
                  </div>
                  <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900 uppercase">
                    Schedule V NAWI
                  </span>
                </div>

                <div className="space-y-2.5 text-xs">
                  <div className="flex justify-between items-center text-slate-600">
                    <span>Base Statutory Verification Fee:</span>
                    <span className="font-mono font-bold text-slate-900">₹{(feeBreakdown?.base_verification_fee || 300).toFixed(2)}</span>
                  </div>

                  <div className="flex justify-between items-center text-slate-600">
                    <span>In-situ Inspection Conveyance Surcharge:</span>
                    <span className="font-mono font-bold text-slate-900">₹{(feeBreakdown?.in_situ_inspection_charge || 0).toFixed(2)}</span>
                  </div>

                  <div className="flex justify-between items-center text-slate-600">
                    <span>Portal Service & IT Infrastructure Fee:</span>
                    <span className="font-mono font-bold text-slate-900">₹{(feeBreakdown?.portal_service_fee || 50).toFixed(2)}</span>
                  </div>

                  <div className="pt-3 border-t border-slate-200 flex justify-between items-center text-sm">
                    <strong className="text-slate-900">Total Statutory Fee Payable:</strong>
                    <strong className="text-base text-emerald-700 font-mono">₹{(feeBreakdown?.total_fee || 350).toFixed(2)}</strong>
                  </div>
                </div>

                <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-[11px] text-blue-900 flex items-start gap-2">
                  <span className="material-symbols-outlined text-sm text-blue-600 shrink-0 mt-0.5">info</span>
                  <span>
                    Under Section 24(2), fees must be deposited prior to physical verification. Payment receipts are automatically integrated with the e-Treasury Challan system.
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* ====================================================
              STEP 7: REVIEW & STATUTORY DECLARATION
             ==================================================== */}
          {currentStep === 7 && (
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Step 7: Review Application & Statutory Declaration</h3>
                <p className="text-slate-500 text-[11px] mt-0.5">
                  Confirm the statutory particulars and accept the mandatory Legal Metrology declarations.
                </p>
              </div>

              {/* Summary Table */}
              <div className="border border-slate-200 rounded-xl overflow-hidden text-xs divide-y divide-slate-200">
                <div className="p-3.5 bg-slate-50 flex justify-between">
                  <span className="text-slate-500">Application Type & Mode:</span>
                  <strong className="text-slate-900">{verificationType} • {verificationMode === 'IN_SITU' ? 'In-situ (On-Site)' : 'Camp Presentation'}</strong>
                </div>
                <div className="p-3.5 flex justify-between">
                  <span className="text-slate-500">Instrument:</span>
                  <strong className="text-slate-900">{selectedInst?.manufacturer} {selectedInst?.model} (SN: {selectedInst?.serial_number})</strong>
                </div>
                <div className="p-3.5 bg-slate-50 flex justify-between">
                  <span className="text-slate-500">Premises / Inspection Site:</span>
                  <strong className="text-slate-900 max-w-xs text-right">{premisesAddress}</strong>
                </div>
                <div className="p-3.5 flex justify-between">
                  <span className="text-slate-500">Preferred Date & Contact:</span>
                  <strong className="text-slate-900">{preferredDate} • {contactPerson} ({contactPhone})</strong>
                </div>
                <div className="p-3.5 bg-slate-50 flex justify-between">
                  <span className="text-slate-500">Attached Documents:</span>
                  <strong className="text-slate-900">{documents.length} document(s) uploaded</strong>
                </div>
                <div className="p-3.5 flex justify-between">
                  <span className="text-slate-500">Statutory Fee Payable:</span>
                  <strong className="text-emerald-700 font-mono font-bold">₹{(feeBreakdown?.total_fee || 350).toFixed(2)}</strong>
                </div>
              </div>

              {/* Mandatory Undertakings & Declarations */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                <span className="text-xs font-bold text-slate-900 block">
                  Mandatory Legal Metrology Declarations:
                </span>

                <label className="flex items-start gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={agreeDeclaration}
                    onChange={(e) => setAgreeDeclaration(e.target.checked)}
                    className="mt-0.5 rounded text-primary focus:ring-primary h-4 w-4"
                  />
                  <span className="text-[11px] text-slate-700 leading-relaxed">
                    I solemnly declare that the instrument particulars, model approval numbers, and commercial premises information provided above are accurate and true under penalty of Section 48 of the Legal Metrology Act, 2009.
                  </span>
                </label>

                <label className="flex items-start gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={agreeAccuracy}
                    onChange={(e) => setAgreeAccuracy(e.target.checked)}
                    className="mt-0.5 rounded text-primary focus:ring-primary h-4 w-4"
                  />
                  <span className="text-[11px] text-slate-700 leading-relaxed">
                    I confirm that the weighing/measuring instrument has not been tampered with, modified, or altered beyond its verified factory tolerances.
                  </span>
                </label>

                <label className="flex items-start gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={agreePremisesAccess}
                    onChange={(e) => setAgreePremisesAccess(e.target.checked)}
                    className="mt-0.5 rounded text-primary focus:ring-primary h-4 w-4"
                  />
                  <span className="text-[11px] text-slate-700 leading-relaxed">
                    I agree to provide unrestricted access to the testing area and present required reference weights/measures during the scheduled verification inspection.
                  </span>
                </label>
              </div>
            </div>
          )}

          {/* ====================================================
              STEP 8: SUBMISSION CONFIRMATION
             ==================================================== */}
          {currentStep === 8 && (
            <div className="space-y-5 text-center py-4">
              <div className="w-14 h-14 rounded-full bg-blue-100 text-primary flex items-center justify-center mx-auto shadow-xs">
                <span className="material-symbols-outlined text-3xl">send</span>
              </div>

              <div>
                <h3 className="text-base font-bold text-slate-900">Ready for Statutory Filing</h3>
                <p className="text-slate-500 text-xs mt-1 max-w-md mx-auto">
                  Your application will be officially logged in the Legal Metrology Officers Management System and forwarded for statutory review and inspection scheduling.
                </p>
              </div>

              <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl max-w-md mx-auto text-left text-xs space-y-1.5 text-amber-900">
                <div className="flex items-center gap-1.5 font-bold">
                  <span className="material-symbols-outlined text-sm">schedule</span>
                  <span>Next Step: Statutory Fee Remittance</span>
                </div>
                <p className="text-[11px] text-amber-800 leading-relaxed">
                  Upon submission, you will proceed to the statutory payment gateway to remit the prescribed fee of ₹{(feeBreakdown?.total_fee || 300).toFixed(2)}.
                </p>
              </div>

              <div className="pt-2">
                <button
                  type="button"
                  disabled={loading}
                  onClick={handleSubmitApplication}
                  className="px-6 py-2.5 bg-[#002046] hover:bg-[#1b365d] text-white font-bold rounded-xl text-xs transition-all shadow-sm flex items-center gap-2 mx-auto cursor-pointer disabled:opacity-50"
                >
                  {loading ? (
                    <>
                      <span className="material-symbols-outlined text-sm animate-spin">progress_activity</span>
                      <span>Submitting Application to Ministry Ledger...</span>
                    </>
                  ) : (
                    <>
                      <span className="material-symbols-outlined text-sm">task_alt</span>
                      <span>{isResubmitMode ? 'Confirm & Resubmit Application' : 'Submit Application & Proceed to Payment'}</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* ====================================================
              STEP 9: PAYMENT REMITTANCE
             ==================================================== */}
          {currentStep === 9 && (
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Step 9: Remit Statutory Verification Fee</h3>
                <p className="text-slate-500 text-[11px] mt-0.5">
                  Application Reference: <strong className="font-mono text-primary">{createdApp?.application_no || 'APP-2026-XXXX'}</strong>
                </p>
              </div>

              {/* Fee Summary Banner */}
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex items-center justify-between">
                <div>
                  <span className="text-[11px] text-emerald-800 font-semibold uppercase block">Total Amount Due</span>
                  <span className="text-2xl font-extrabold text-emerald-900 font-mono">
                    ₹{(feeBreakdown?.total_fee || createdApp?.payment?.amount || createdApp?.amount || 300).toFixed(2)}
                  </span>
                </div>
                <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-200 text-emerald-900 uppercase">
                  Schedule V NAWI
                </span>
              </div>

              {/* Payment Mode Selector */}
              <div className="grid grid-cols-2 gap-3 pt-1">
                <div
                  onClick={() => setPaymentMethod('ONLINE')}
                  className={`p-3.5 rounded-xl border-2 cursor-pointer transition-all ${
                    paymentMethod === 'ONLINE'
                      ? 'border-primary bg-primary/5'
                      : 'border-slate-200 hover:border-slate-300 bg-white'
                  }`}
                >
                  <div className="flex items-center gap-2 font-bold text-slate-900 text-xs">
                    <span className="material-symbols-outlined text-primary text-base">credit_card</span>
                    <span>Online / UPI / NetBanking</span>
                  </div>
                  <p className="text-[10.5px] text-slate-500 mt-1">Instant reconciliation via Government Payment Gateway (e-GRAS).</p>
                </div>

                <div
                  onClick={() => setPaymentMethod('OFFLINE')}
                  className={`p-3.5 rounded-xl border-2 cursor-pointer transition-all ${
                    paymentMethod === 'OFFLINE'
                      ? 'border-primary bg-primary/5'
                      : 'border-slate-200 hover:border-slate-300 bg-white'
                  }`}
                >
                  <div className="flex items-center gap-2 font-bold text-slate-900 text-xs">
                    <span className="material-symbols-outlined text-primary text-base">receipt</span>
                    <span>Treasury Challan / DD</span>
                  </div>
                  <p className="text-[10.5px] text-slate-500 mt-1">Direct bank deposit in designated government treasury head.</p>
                </div>
              </div>

              {/* Online Mock Payment Interface */}
              {paymentMethod === 'ONLINE' && (
                <div className="space-y-3 bg-slate-50 p-4 rounded-xl border border-slate-200">
                  <span className="text-xs font-bold text-slate-800 block">Select Instant Channel:</span>
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="p-2.5 bg-white border border-slate-300 rounded-lg text-xs font-semibold hover:border-primary cursor-pointer">
                      UPI / QR Code
                    </div>
                    <div className="p-2.5 bg-white border border-slate-300 rounded-lg text-xs font-semibold hover:border-primary cursor-pointer">
                      Net Banking
                    </div>
                    <div className="p-2.5 bg-white border border-slate-300 rounded-lg text-xs font-semibold hover:border-primary cursor-pointer">
                      Debit / Corporate Card
                    </div>
                  </div>

                  <div className="pt-2">
                    <button
                      type="button"
                      disabled={paymentProcessing}
                      onClick={handleProcessPayment}
                      className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 shadow-sm cursor-pointer disabled:opacity-50"
                    >
                      {paymentProcessing ? (
                        <>
                          <span className="material-symbols-outlined text-sm animate-spin">progress_activity</span>
                          <span>Securing Payment Authorization...</span>
                        </>
                      ) : (
                        <>
                          <span className="material-symbols-outlined text-sm">lock</span>
                          <span>Authorize Payment of ₹{(feeBreakdown?.total_fee || 300).toFixed(2)}</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}

              {/* Offline Challan Payment Interface */}
              {paymentMethod === 'OFFLINE' && (
                <div className="space-y-3 bg-slate-50 p-4 rounded-xl border border-slate-200">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-slate-700 font-bold mb-1">Challan / Demand Draft Number *</label>
                      <input
                        type="text"
                        value={offlineChallanNo}
                        onChange={(e) => setOfflineChallanNo(e.target.value)}
                        placeholder="e.g. CHN-2026-891234"
                        className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-700 font-bold mb-1">Drawee Bank Name</label>
                      <input
                        type="text"
                        value={offlineBankName}
                        onChange={(e) => setOfflineBankName(e.target.value)}
                        className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-700 font-bold mb-1">Deposit Date</label>
                      <input
                        type="date"
                        value={offlineDate}
                        onChange={(e) => setOfflineDate(e.target.value)}
                        className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs"
                      />
                    </div>
                  </div>

                  <div className="pt-2">
                    <button
                      type="button"
                      disabled={paymentProcessing}
                      onClick={handleProcessPayment}
                      className="w-full py-2.5 bg-[#002046] hover:bg-[#1b365d] text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 shadow-sm cursor-pointer disabled:opacity-50"
                    >
                      {paymentProcessing ? (
                        <>
                          <span className="material-symbols-outlined text-sm animate-spin">progress_activity</span>
                          <span>Recording Challan Particulars...</span>
                        </>
                      ) : (
                        <>
                          <span className="material-symbols-outlined text-sm">cloud_done</span>
                          <span>Submit Challan Record & Confirm Payment</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ====================================================
              STEP 10: ACKNOWLEDGEMENT & STATUS RECEIPT
             ==================================================== */}
          {currentStep === 10 && (
            <div className="space-y-5 text-center py-4">
              <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto shadow-xs">
                <span className="material-symbols-outlined text-3xl font-bold">task_alt</span>
              </div>

              <div>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 uppercase">
                  Statutory Filing Complete
                </span>
                <h3 className="text-xl font-extrabold text-slate-900 mt-2">Official Verification Acknowledgement</h3>
                <p className="text-slate-500 text-xs mt-1">
                  Application recorded in Department of Legal Metrology digital ledger
                </p>
              </div>

              {/* Printable Acknowledgement Slip Card */}
              <div className="max-w-lg mx-auto bg-slate-50 border border-slate-200 rounded-2xl p-6 text-left text-xs space-y-3 shadow-xs">
                <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                  <div>
                    <span className="text-[10px] text-slate-400 font-semibold uppercase block">Application Reference No</span>
                    <span className="text-lg font-extrabold text-[#002046] font-mono">
                      {createdApp?.application_no || 'APP-2026-XXXX'}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-slate-400 font-semibold uppercase block">Fee Status</span>
                    <span className="px-2.5 py-1 rounded text-[10px] font-bold bg-emerald-600 text-white">
                      PAID / CONFIRMED
                    </span>
                  </div>
                </div>

                <div className="space-y-1.5 text-[11px] text-slate-600">
                  <div className="flex justify-between">
                    <span>Instrument:</span>
                    <strong className="text-slate-900">{selectedInst?.manufacturer} {selectedInst?.model} (SN: {selectedInst?.serial_number})</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Type & Mode:</span>
                    <strong className="text-slate-900">{verificationType} • {verificationMode}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Transaction Ref:</span>
                    <strong className="text-slate-900 font-mono">{paymentResult?.transaction_id || 'TXN_VERIFIED'}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Statutory Amount:</span>
                    <strong className="text-emerald-700 font-mono font-bold">₹{(feeBreakdown?.total_fee || 300).toFixed(2)}</strong>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-200 text-[10px] text-slate-500">
                  An authorized Legal Metrology Officer will review the Schedule V eligibility and issue appointment allocation.
                </div>
              </div>

              {/* Actions */}
              <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-4 py-2 border border-slate-300 text-slate-700 font-semibold rounded-xl hover:bg-slate-50 transition-colors flex items-center gap-1.5 cursor-pointer text-xs"
                >
                  <span className="material-symbols-outlined text-sm">print</span>
                  <span>Print Acknowledgement</span>
                </button>

                {onViewApplicationTimeline && (
                  <button
                    type="button"
                    onClick={() => {
                      onViewApplicationTimeline(createdApp?.id);
                    }}
                    className="px-5 py-2 bg-[#002046] hover:bg-[#1b365d] text-white font-bold rounded-xl transition-all flex items-center gap-1.5 cursor-pointer text-xs shadow-xs"
                  >
                    <span className="material-symbols-outlined text-sm">travel_explore</span>
                    <span>Track Status Live</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={onClose}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl transition-all cursor-pointer text-xs shadow-xs"
                >
                  Return to Dashboard
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer Controls (Steps 1 to 7) */}
        {currentStep <= 7 && (
          <div className="bg-slate-50 px-6 sm:px-8 py-4 border-t border-slate-200 flex items-center justify-between shrink-0">
            <div>
              {currentStep > 1 && (
                <button
                  type="button"
                  onClick={handleBack}
                  className="px-4 py-2 border border-slate-300 text-slate-700 font-semibold rounded-xl hover:bg-white transition-colors flex items-center gap-1.5 text-xs cursor-pointer shadow-2xs"
                >
                  <span className="material-symbols-outlined text-sm">arrow_back</span>
                  <span>Back</span>
                </button>
              )}
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-slate-500 hover:text-slate-700 font-semibold text-xs transition-colors cursor-pointer"
              >
                Cancel & Exit
              </button>

              <button
                type="button"
                onClick={handleNext}
                className="px-6 py-2.5 bg-[#002046] hover:bg-[#1b365d] text-white font-bold rounded-xl transition-all flex items-center gap-1.5 text-xs shadow-xs cursor-pointer"
              >
                <span>{currentStep === 7 ? 'Proceed to Submission' : 'Continue'}</span>
                <span className="material-symbols-outlined text-sm">arrow_forward</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
