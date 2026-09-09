import React, { useState } from 'react';

export default function VendorApplyVerificationView({
  instruments = [],
  onOpenApplyModal,
  onOpenAddModal
}) {
  const [selectedInstId, setSelectedInstId] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');

  // Filter or list suitable instruments (vehicle tanks, storage tanks, fuel dispensers, or all commercial instruments)
  const availableInstruments = instruments.filter(inst => {
    if (selectedCategory === 'ALL') return true;
    return (inst.category || '').toUpperCase() === selectedCategory.toUpperCase();
  });

  const handleGo = () => {
    if (!selectedInstId) {
      // If none selected, open general apply modal
      if (onOpenApplyModal) onOpenApplyModal(null);
      return;
    }
    if (onOpenApplyModal) onOpenApplyModal(selectedInstId);
  };

  return (
    <div className="w-full max-w-4xl mx-auto my-6 shadow-md rounded-2xl overflow-hidden border border-slate-200 bg-white">
      {/* 1. Deep Navy Banner matching CertifyMetric Project Theme */}
      <div className="bg-gradient-to-r from-[#002046] via-[#1b365d] to-[#002046] text-white py-5 px-6 text-center select-none shadow-xs border-b-2 border-amber-400">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-amber-300 text-xs font-semibold mb-2 backdrop-blur-xs">
          <span className="material-symbols-outlined text-sm">local_shipping</span>
          <span>Vehicle Tank & Bulk Calibration Portal</span>
        </div>
        <h1 className="text-lg sm:text-xl lg:text-2xl font-black tracking-wider uppercase text-white">
          SELECT VENDOR TO APPLY VERIFICATION (VEHICLE TANK)
        </h1>
        <p className="text-xs text-slate-300 mt-1">
          Statutory Verification under Rule 14 & Rule 21 of the Legal Metrology (General) Rules, 2011
        </p>
      </div>

      {/* 2. Form Container matching CertifyMetric Project Palette */}
      <div className="bg-slate-50/70 p-6 sm:p-10 flex flex-col items-center justify-center min-h-[260px]">
        <div className="w-full max-w-xl space-y-5">
          {/* Category Filter Pills */}
          <div className="flex flex-wrap items-center justify-center gap-2 mb-1 text-xs">
            <span className="text-slate-600 font-medium">Category:</span>
            {['ALL', 'STORAGE_TANK', 'FUEL_DISPENSER', 'WEIGHBRIDGE', 'ELECTRONIC_BALANCE'].map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1 rounded-full text-xs font-semibold transition-all ${
                  selectedCategory === cat
                    ? 'bg-[#002046] text-white shadow-xs'
                    : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
                }`}
              >
                {cat === 'ALL' ? 'All Instruments' : cat.replace('_', ' ')}
              </button>
            ))}
          </div>

          {/* Select Dropdown */}
          <div className="relative">
            <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">
              Select Instrument / Vehicle Tank
            </label>
            <div className="relative">
              <select
                value={selectedInstId}
                onChange={(e) => setSelectedInstId(e.target.value)}
                className="w-full bg-white text-slate-800 text-sm px-4 py-3 rounded-xl border border-slate-300 shadow-xs focus:ring-2 focus:ring-[#002046] focus:border-[#002046] focus:outline-hidden appearance-none cursor-pointer pr-10 font-medium"
              >
                <option value="">Select Vendor / Vehicle Tank / Instrument...</option>
                {availableInstruments.map((inst) => (
                  <option key={inst.id} value={inst.id}>
                    {inst.serial_number} — {inst.model_name} ({inst.capacity} {inst.unit}) • {inst.category}
                  </option>
                ))}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-slate-500">
                <span className="material-symbols-outlined text-2xl">arrow_drop_down</span>
              </div>
            </div>
          </div>

          {/* Go Action Button */}
          <div className="flex justify-center pt-2">
            <button
              type="button"
              onClick={handleGo}
              className="bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 active:scale-98 text-white font-bold px-8 py-2.5 rounded-xl text-base flex items-center gap-2 shadow-md hover:shadow-lg transition-all cursor-pointer"
            >
              <span>Go to Verification Form</span>
              <span className="material-symbols-outlined text-lg">send</span>
            </button>
          </div>

          {/* Empty state hint */}
          {instruments.length === 0 && (
            <div className="mt-4 p-4 bg-white rounded-xl border border-blue-200 text-center text-xs text-slate-700 shadow-xs">
              <p className="font-semibold text-slate-800">No instruments currently registered.</p>
              <button
                onClick={onOpenAddModal}
                className="mt-1.5 text-blue-700 font-bold underline hover:text-blue-900 inline-flex items-center gap-1"
              >
                <span className="material-symbols-outlined text-xs">add_box</span>
                <span>Register a New Instrument Now</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* 3. Statutory Regulatory Footnote */}
      <div className="bg-white border-t border-slate-200 px-6 py-3.5 flex items-center justify-between flex-wrap gap-2 text-xs text-slate-500">
        <span className="flex items-center gap-1.5">
          <span className="material-symbols-outlined text-sm text-amber-500">verified</span>
          Calibrated by Authorised Legal Metrology Officers & GATC Accredited Laboratories
        </span>
        <span className="font-mono text-[11px] text-slate-400">Rule 14 & 21 Compliance</span>
      </div>
    </div>
  );
}
