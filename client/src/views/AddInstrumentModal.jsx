import React, { useState, useEffect, useMemo } from 'react';
import { api } from '../api';
import { INDIA_STATES_DISTRICTS } from '../data/indiaDistricts';

const FLAT_DISTRICTS = INDIA_STATES_DISTRICTS.flatMap(s =>
  s.districts.map(d => ({ label: `${d}, ${s.state}`, district: d, state: s.state }))
);

// The form is driven entirely by the selected category's `spec_schema` (which fields
// to collect) and `form_meta` (how to label and present them) — both come from the
// database, so adding a statutory category is a seed change, not a component change.
// The only thing still keyed to a category is the Max/Min/Interval(e) trio, and even
// that is now a `form_meta.capacity_fields` flag rather than a hardcoded id: those
// three are dedicated top-level Instrument columns read by the NAWI MPE engine.

// Fallbacks for a category seeded before form_meta existed, so the form degrades
// to something sane instead of rendering blank labels.
const DEFAULT_FORM_META = {
  icon: 'category',
  spec_section: 'Technical Specifications',
  capacity_fields: false,
  serial_label: 'Device Serial Number',
  serial_hint: 'Must match the permanent stamping on the official plate.',
  manufacturer_placeholder: 'Manufacturer name',
  model_placeholder: 'Model name or number',
  location_label: 'Operational Location / Establishment',
  location_placeholder: 'Premises where the instrument is used'
};

// Grouping the category <select> by the physical quantity measured. With 26 statutory
// categories a flat list is a scroll-and-hunt exercise; the quantity is the first
// thing a trader knows about their own instrument.
const MEASUREMENT_GROUPS = [
  ['MASS', 'Mass & Weighing'],
  ['VOLUME', 'Volume & Flow'],
  ['LENGTH', 'Length'],
  ['ENERGY', 'Electrical Energy'],
  ['TEMPERATURE', 'Temperature'],
  ['PRESSURE', 'Pressure'],
  ['FARE', 'Fare Computation']
];

function SpecField({ field, value, onChange }) {
  if (field.type === 'select') {
    return (
      <select
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        required={field.required}
        className="w-full h-10 px-3 rounded-lg border border-slate-300 focus:ring-2 focus:ring-primary focus:border-primary outline-none bg-white text-xs"
      >
        <option value="" disabled>Select {field.label.toLowerCase()}...</option>
        {field.options.map((opt) => (
          <option key={opt} value={opt}>{opt}{field.unit ? ` ${field.unit}` : ''}</option>
        ))}
      </select>
    );
  }
  const isNumber = field.type === 'number';
  return (
    <input
      type={isNumber ? 'number' : 'text'}
      // Counts (nozzles, compartments, pieces in a set) are positive integers —
      // the browser should reject 0 and -3 before the request is ever made.
      min={isNumber ? 1 : undefined}
      step={isNumber ? 1 : undefined}
      required={field.required}
      value={value || ''}
      onChange={(e) => onChange(e.target.value)}
      placeholder={field.unit ? `Value in ${field.unit}` : ''}
      className="w-full h-10 px-3 rounded-lg border border-slate-300 focus:ring-2 focus:ring-primary focus:border-primary outline-none text-xs"
    />
  );
}

export default function AddInstrumentModal({ currentUser, onClose, onCreated }) {
  const [isClosing, setIsClosing] = useState(false);
  const [categories, setCategories] = useState([]);
  const [loadingCategories, setLoadingCategories] = useState(true);
  const [selectedCategoryId, setSelectedCategoryId] = useState('');
  const [specValues, setSpecValues] = useState({});

  const [formData, setFormData] = useState({
    manufacturer: '',
    model: '',
    serial_number: '',
    max_capacity: '30 kg',
    min_capacity: '100 g',
    verification_scale_interval_e: '5 g',
    location: ''
  });

  const [districtSearch, setDistrictSearch] = useState('');
  const [selectedDistrict, setSelectedDistrict] = useState('');
  const [districtDropdownOpen, setDistrictDropdownOpen] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Graceful exit with slide-out animation
  const handleClose = () => {
    if (isClosing) return;
    setIsClosing(true);
    setTimeout(() => {
      onClose();
    }, 240);
  };

  // Close on Escape key press
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        handleClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isClosing]);

  // Lock body scroll when drawer is open
  useEffect(() => {
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, []);

  useEffect(() => {
    api.getInstrumentCategories().then((cats) => {
      setCategories(cats);
      if (cats.length > 0) setSelectedCategoryId(cats[0].id);
      setLoadingCategories(false);
    });
  }, []);

  const selectedCategory = categories.find((c) => c.id === selectedCategoryId);
  const meta = { ...DEFAULT_FORM_META, ...(selectedCategory?.form_meta || {}) };
  const showCapacityFields = meta.capacity_fields === true;

  // Bucket the categories by measurement type for the grouped <select>. Anything
  // with an unexpected measurement_type still gets rendered, under "Other" — a new
  // category must never silently vanish from the dropdown.
  const groupedCategories = useMemo(() => {
    const seen = new Set();
    const groups = MEASUREMENT_GROUPS
      .map(([key, label]) => {
        const items = categories.filter((c) => c.measurement_type === key);
        items.forEach((c) => seen.add(c.id));
        return { label, items };
      })
      .filter((g) => g.items.length > 0);
    const leftovers = categories.filter((c) => !seen.has(c.id));
    if (leftovers.length > 0) groups.push({ label: 'Other', items: leftovers });
    return groups;
  }, [categories]);

  const filteredDistricts = useMemo(() => {
    const q = districtSearch.trim().toLowerCase();
    const pool = q ? FLAT_DISTRICTS.filter((d) => d.label.toLowerCase().includes(q)) : FLAT_DISTRICTS;
    return pool.slice(0, 30);
  }, [districtSearch]);

  const handleCategoryChange = (categoryId) => {
    setSelectedCategoryId(categoryId);
    // The previous category's answers are meaningless here — a weighbridge's platform
    // length is not a water meter's DN. Clearing avoids carrying stale values over.
    setSpecValues({});
    const nextMeta = categories.find((c) => c.id === categoryId)?.form_meta || {};
    if (nextMeta.capacity_fields !== true) {
      // Blank the NAWI-only trio so a non-NAWI submission never carries "30 kg".
      setFormData((prev) => ({ ...prev, max_capacity: '', min_capacity: '', verification_scale_interval_e: '' }));
    } else {
      setFormData((prev) => ({
        ...prev,
        max_capacity: prev.max_capacity || '30 kg',
        min_capacity: prev.min_capacity || '100 g',
        verification_scale_interval_e: prev.verification_scale_interval_e || '5 g'
      }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!formData.manufacturer || !formData.model || !formData.serial_number) {
      setError('Please fill all mandatory fields.');
      return;
    }
    if (!selectedCategoryId) {
      setError('Please select an instrument category.');
      return;
    }
    if (!selectedDistrict) {
      setError('Please select the district where this instrument is located — the allocation engine uses it to match an in-jurisdiction officer.');
      return;
    }
    const specSchema = selectedCategory?.spec_schema || [];
    const missingSpec = specSchema.find((f) => f.required && !String(specValues[f.key] || '').trim());
    if (missingSpec) {
      setError(`Please fill "${missingSpec.label}".`);
      return;
    }
    const badNumber = specSchema.find(
      (f) => f.type === 'number' && String(specValues[f.key] ?? '').trim() && !(Number(specValues[f.key]) > 0)
    );
    if (badNumber) {
      setError(`"${badNumber.label}" must be a positive number.`);
      return;
    }
    if (showCapacityFields && (!formData.max_capacity || !formData.min_capacity || !formData.verification_scale_interval_e)) {
      setError('Please fill Max Capacity, Min Capacity, and Interval (e).');
      return;
    }

    setLoading(true);
    try {
      const payload = {
        manufacturer: formData.manufacturer,
        model: formData.model,
        serial_number: formData.serial_number,
        location: formData.location,
        district: selectedDistrict,
        owner_id: currentUser?.id,
        category_id: selectedCategoryId,
        specs: specValues
      };
      if (showCapacityFields) {
        payload.max_capacity = formData.max_capacity;
        payload.min_capacity = formData.min_capacity;
        payload.verification_scale_interval_e = formData.verification_scale_interval_e;
      }

      const data = await api.createInstrument(payload);

      onCreated(data.id);
      handleClose();
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop overlay */}
      <div
        className={`fixed inset-0 bg-slate-900/60 backdrop-blur-sm cursor-pointer transition-opacity duration-300 ${
          isClosing ? 'animate-backdrop-out' : 'animate-backdrop-in'
        }`}
        onClick={handleClose}
      />

      {/* Slide-over Drawer Panel occupying half of the screen on desktop */}
      <div
        className={`fixed inset-y-0 right-0 z-50 flex flex-col h-full w-full sm:w-[85vw] md:w-1/2 lg:w-1/2 xl:w-1/2 bg-white shadow-2xl border-l border-slate-200 cursor-default ${
          isClosing ? 'animate-slide-out-right' : 'animate-slide-in-right'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drawer Header */}
        <div className="flex items-center justify-between px-6 py-4 md:px-8 border-b border-slate-200 bg-white/95 backdrop-blur shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shadow-xs">
              <span className="material-symbols-outlined text-2xl">{meta.icon}</span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base md:text-lg font-bold text-primary tracking-tight">Register New Instrument</h2>
                <span className="hidden sm:inline-block text-[10px] font-bold uppercase tracking-wider bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full border border-emerald-200">
                  Form W-1
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium">
                {selectedCategory ? selectedCategory.name : 'Select statutory category'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <kbd className="hidden sm:inline-flex items-center px-2 py-0.5 text-[10px] font-medium text-slate-400 bg-slate-100 border border-slate-200 rounded">
              ESC
            </kbd>
            <button
              type="button"
              onClick={handleClose}
              className="w-8 h-8 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 flex items-center justify-center transition-colors"
              title="Close panel (ESC)"
            >
              <span className="material-symbols-outlined text-xl">close</span>
            </button>
          </div>
        </div>

        {/* Scrollable Form Content */}
        <form id="register-instrument-form" onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 md:p-8 space-y-6">
          {error && (
            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium flex items-center gap-2.5 shadow-xs animate-in fade-in duration-150">
              <span className="material-symbols-outlined text-base shrink-0">error</span>
              <div className="flex-1">{error}</div>
            </div>
          )}

          {/* Section 1: Classification */}
          <div className="bg-slate-50/70 border border-slate-200/80 rounded-xl p-4 md:p-5 space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <span className="material-symbols-outlined text-sm text-primary">category</span>
                Statutory Category *
              </label>
              <span className="text-[10px] text-slate-400 font-medium">Legal Metrology Act</span>
            </div>

            {loadingCategories ? (
              <div className="w-full h-10 px-3 rounded-lg border border-slate-200 bg-white flex items-center text-slate-400 text-xs">
                Loading statutory categories...
              </div>
            ) : (
              <select
                required
                value={selectedCategoryId}
                onChange={(e) => handleCategoryChange(e.target.value)}
                className="w-full h-10 px-3 rounded-lg border border-slate-300 focus:ring-2 focus:ring-primary focus:border-primary outline-none bg-white text-xs font-medium text-slate-800 shadow-2xs"
              >
                {groupedCategories.map((group) => (
                  <optgroup key={group.label} label={group.label}>
                    {group.items.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </optgroup>
                ))}
              </select>
            )}

            {selectedCategory?.description && (
              <div className="p-2.5 bg-primary/5 rounded-lg border border-primary/10 text-[11px] text-slate-600 flex items-start gap-2 leading-relaxed">
                <span className="material-symbols-outlined text-sm text-primary shrink-0 mt-0.5">info</span>
                <span>{selectedCategory.description}</span>
              </div>
            )}

            {/* Some categories are not registered one-device-at-a-time: weights and
                thermometers are stamped as a batch, load cells and indicators are
                approved as components, taximeters and tankers are tied to a vehicle.
                Saying so up front prevents a whole class of wrong submissions. */}
            {meta.notice && (
              <div className="p-2.5 bg-amber-50 rounded-lg border border-amber-200 text-[11px] text-amber-900 flex items-start gap-2 leading-relaxed">
                <span className="material-symbols-outlined text-sm text-amber-600 shrink-0 mt-0.5">gavel</span>
                <span>{meta.notice}</span>
              </div>
            )}
          </div>

          {/* Section 2: Hardware & Identification */}
          <div className="space-y-4">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-100 pb-2">
              <span className="material-symbols-outlined text-sm text-primary">fingerprint</span>
              Device Identification
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="font-semibold text-slate-700 block mb-1 text-xs">Manufacturer / Make *</label>
                <input
                  type="text"
                  required
                  placeholder={meta.manufacturer_placeholder}
                  value={formData.manufacturer}
                  onChange={(e) => setFormData({ ...formData, manufacturer: e.target.value })}
                  className="w-full h-10 px-3 rounded-lg border border-slate-300 focus:ring-2 focus:ring-primary focus:border-primary outline-none text-xs"
                />
              </div>
              <div>
                <label className="font-semibold text-slate-700 block mb-1 text-xs">Model Name / Number *</label>
                <input
                  type="text"
                  required
                  placeholder={meta.model_placeholder}
                  value={formData.model}
                  onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                  className="w-full h-10 px-3 rounded-lg border border-slate-300 focus:ring-2 focus:ring-primary focus:border-primary outline-none text-xs"
                />
              </div>
            </div>

            <div>
              <label className="font-semibold text-slate-700 block mb-1 text-xs">{meta.serial_label} *</label>
              <input
                type="text"
                required
                placeholder="e.g. SN-2026-9812"
                value={formData.serial_number}
                onChange={(e) => setFormData({ ...formData, serial_number: e.target.value })}
                className="w-full h-10 px-3 rounded-lg font-mono text-xs border border-slate-300 focus:ring-2 focus:ring-primary focus:border-primary outline-none bg-slate-50/50"
              />
              <span className="text-[11px] text-slate-500 mt-1 flex items-start gap-1">
                <span className="material-symbols-outlined text-[13px] text-amber-500 shrink-0 mt-px">verified</span>
                <span>{meta.serial_hint}</span>
              </span>
            </div>
          </div>

          {/* Section 3: Technical Specifications */}
          <div className="space-y-4">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-100 pb-2">
              <span className="material-symbols-outlined text-sm text-primary">tune</span>
              {meta.spec_section}
            </h3>

            {showCapacityFields && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1 text-xs">Max Capacity *</label>
                  <input
                    type="text"
                    required
                    value={formData.max_capacity}
                    onChange={(e) => setFormData({ ...formData, max_capacity: e.target.value })}
                    className="w-full h-10 px-3 rounded-lg border border-slate-300 focus:ring-2 focus:ring-primary focus:border-primary outline-none text-xs"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1 text-xs">Min Capacity *</label>
                  <input
                    type="text"
                    required
                    value={formData.min_capacity}
                    onChange={(e) => setFormData({ ...formData, min_capacity: e.target.value })}
                    className="w-full h-10 px-3 rounded-lg border border-slate-300 focus:ring-2 focus:ring-primary focus:border-primary outline-none text-xs"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1 text-xs">Interval (e) *</label>
                  <input
                    type="text"
                    required
                    value={formData.verification_scale_interval_e}
                    onChange={(e) => setFormData({ ...formData, verification_scale_interval_e: e.target.value })}
                    className="w-full h-10 px-3 rounded-lg border border-slate-300 focus:ring-2 focus:ring-primary focus:border-primary outline-none text-xs"
                  />
                </div>
              </div>
            )}

            {(selectedCategory?.spec_schema || []).length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {selectedCategory.spec_schema.map((field) => (
                  <div key={field.key} className={field.type === 'select' && field.options?.length > 3 ? 'sm:col-span-2' : ''}>
                    <label className="font-semibold text-slate-700 block mb-1 text-xs">
                      {field.label}{field.required ? ' *' : ''}
                    </label>
                    <SpecField
                      field={field}
                      value={specValues[field.key]}
                      onChange={(val) => setSpecValues({ ...specValues, [field.key]: val })}
                    />
                    {field.help && <span className="text-[10px] text-slate-500 mt-1 block">{field.help}</span>}
                  </div>
                ))}
              </div>
            )}

            {!showCapacityFields && (selectedCategory?.spec_schema || []).length === 0 && (
              <p className="text-[11px] text-slate-500 italic">
                This category needs no additional technical specifications beyond the identification details above.
              </p>
            )}
          </div>

          {/* Section 4: Location & Jurisdiction */}
          <div className="space-y-4">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-100 pb-2">
              <span className="material-symbols-outlined text-sm text-primary">location_on</span>
              Installation Location & Jurisdiction
            </h3>

            <div>
              <label className="font-semibold text-slate-700 block mb-1 text-xs">{meta.location_label} *</label>
              <input
                type="text"
                required
                placeholder={meta.location_placeholder}
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                className="w-full h-10 px-3 rounded-lg border border-slate-300 focus:ring-2 focus:ring-primary focus:border-primary outline-none text-xs"
              />
            </div>

            <div className="relative">
              <label className="font-semibold text-slate-700 block mb-1 text-xs">District & State *</label>
              {selectedDistrict ? (
                <div className="w-full h-10 px-3 rounded-lg border border-slate-300 bg-slate-50 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-sm text-emerald-600">check_circle</span>
                    <span className="text-slate-800 font-semibold">{selectedDistrict}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedDistrict('')}
                    className="text-slate-400 hover:text-rose-600 transition-colors p-1"
                    title="Change district"
                  >
                    <span className="material-symbols-outlined text-base leading-none">close</span>
                  </button>
                </div>
              ) : (
                <div className="relative">
                  <input
                    type="text"
                    value={districtSearch}
                    onChange={(e) => setDistrictSearch(e.target.value)}
                    onFocus={() => setDistrictDropdownOpen(true)}
                    onBlur={() => setDistrictDropdownOpen(false)}
                    placeholder="Click or type to search district (e.g. Bangalore, Mumbai, Pune)..."
                    className="w-full h-10 pl-9 pr-3 rounded-lg border border-slate-300 focus:ring-2 focus:ring-primary focus:border-primary outline-none text-xs"
                  />
                  <span className="material-symbols-outlined absolute left-2.5 top-2.5 text-slate-400 text-base">
                    search
                  </span>
                </div>
              )}

              {districtDropdownOpen && !selectedDistrict && filteredDistricts.length > 0 && (
                <div className="absolute z-30 mt-1 w-full max-h-48 overflow-y-auto bg-white border border-slate-200 rounded-xl shadow-xl divide-y divide-slate-100">
                  {filteredDistricts.map((d) => (
                    <button
                      type="button"
                      key={d.label}
                      onMouseDown={(e) => {
                        e.preventDefault();
                        setSelectedDistrict(d.label);
                        setDistrictSearch('');
                      }}
                      className="w-full text-left px-3.5 py-2.5 text-xs hover:bg-primary/5 flex items-center justify-between transition-colors"
                    >
                      <span className="font-semibold text-slate-800">{d.district}</span>
                      <span className="text-slate-400 text-[10px] bg-slate-100 px-1.5 py-0.5 rounded font-medium">{d.state}</span>
                    </button>
                  ))}
                </div>
              )}
              <p className="text-[11px] text-slate-500 mt-1.5 flex items-center gap-1">
                <span className="material-symbols-outlined text-xs text-slate-400">info</span>
                Used to route verification requests automatically to the appropriate jurisdictional officer.
              </p>
            </div>
          </div>
        </form>

        {/* Drawer Footer (Sticky at bottom) */}
        <div className="px-6 py-4 md:px-8 bg-slate-50/95 backdrop-blur border-t border-slate-200 flex items-center justify-between shrink-0">
          <span className="hidden sm:flex items-center gap-1.5 text-[11px] text-slate-500 font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
            Mandatory under Legal Metrology Act
          </span>
          <div className="flex items-center gap-3 ml-auto">
            <button
              type="button"
              onClick={handleClose}
              className="px-4 py-2 border border-slate-300 text-slate-700 text-xs font-semibold rounded-lg hover:bg-slate-100 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              form="register-instrument-form"
              disabled={loading || loadingCategories}
              className="px-5 py-2 bg-primary text-white text-xs font-bold rounded-lg hover:bg-primary-container transition-all flex items-center gap-1.5 shadow-sm disabled:opacity-50"
            >
              {loading ? (
                <>
                  <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                  <span>Registering...</span>
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-sm">add_circle</span>
                  <span>Register Instrument</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
