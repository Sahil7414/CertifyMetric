import React, { useState } from 'react';
import { api } from '../api';

export default function AddInstrumentModal({ currentUser, onClose, onCreated }) {
  const [formData, setFormData] = useState({
    manufacturer: '',
    model: '',
    serial_number: '',
    max_capacity: '30 kg',
    min_capacity: '100 g',
    verification_scale_interval_e: '5 g',
    location: 'Main Retail Counter, Ground Floor'
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.manufacturer || !formData.model || !formData.serial_number) {
      setError('Please fill all mandatory fields.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const data = await api.createInstrument({
        ...formData,
        owner_id: currentUser?.id,
        category_id: 'CAT_NAWI_III'
      });

      onCreated(data.id);
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-surface-container-lowest rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-outline-variant/40 relative">
        <div className="flex items-center justify-between pb-4 border-b border-slate-200">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
              <span className="material-symbols-outlined text-xl">scale</span>
            </div>
            <div>
              <h2 className="text-base font-bold text-primary">Register New Instrument</h2>
              <p className="text-xs text-on-surface-variant">Class III Non-Automatic Weighing Instrument</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        {error && (
          <div className="mt-4 p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium flex items-center gap-2">
            <span className="material-symbols-outlined text-sm">error</span>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-4 space-y-4 text-xs">
          <div className="bg-blue-50/50 p-3 rounded-lg border border-blue-100 flex items-start gap-2 text-blue-900">
            <span className="material-symbols-outlined text-base shrink-0 mt-0.5 text-blue-600">info</span>
            <p>
              Pre-configured statutory category: <strong>Commercial NAWI (Class III)</strong> under Legal Metrology (General) Rules.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-semibold text-slate-700 block mb-1">Manufacturer / Make *</label>
              <input
                type="text"
                required
                placeholder="e.g. Avery Weigh-Tronix"
                value={formData.manufacturer}
                onChange={(e) => setFormData({ ...formData, manufacturer: e.target.value })}
                className="w-full h-10 px-3 rounded-lg border border-slate-300 focus:ring-2 focus:ring-primary focus:border-primary outline-none"
              />
            </div>
            <div>
              <label className="font-semibold text-slate-700 block mb-1">Model Name / Number *</label>
              <input
                type="text"
                required
                placeholder="e.g. ZK830 Digital"
                value={formData.model}
                onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                className="w-full h-10 px-3 rounded-lg border border-slate-300 focus:ring-2 focus:ring-primary focus:border-primary outline-none"
              />
            </div>
          </div>

          <div>
            <label className="font-semibold text-slate-700 block mb-1">Device Serial Number *</label>
            <input
              type="text"
              required
              placeholder="e.g. SN-2026-9812"
              value={formData.serial_number}
              onChange={(e) => setFormData({ ...formData, serial_number: e.target.value })}
              className="w-full h-10 px-3 rounded-lg font-mono border border-slate-300 focus:ring-2 focus:ring-primary focus:border-primary outline-none"
            />
            <span className="text-[10px] text-slate-500 mt-0.5 block">Must match the stamping on the official metal nameplate.</span>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="font-semibold text-slate-700 block mb-1">Max Capacity</label>
              <input
                type="text"
                value={formData.max_capacity}
                onChange={(e) => setFormData({ ...formData, max_capacity: e.target.value })}
                className="w-full h-10 px-3 rounded-lg border border-slate-300 focus:ring-2 focus:ring-primary focus:border-primary outline-none"
              />
            </div>
            <div>
              <label className="font-semibold text-slate-700 block mb-1">Min Capacity</label>
              <input
                type="text"
                value={formData.min_capacity}
                onChange={(e) => setFormData({ ...formData, min_capacity: e.target.value })}
                className="w-full h-10 px-3 rounded-lg border border-slate-300 focus:ring-2 focus:ring-primary focus:border-primary outline-none"
              />
            </div>
            <div>
              <label className="font-semibold text-slate-700 block mb-1">Interval (e)</label>
              <input
                type="text"
                value={formData.verification_scale_interval_e}
                onChange={(e) => setFormData({ ...formData, verification_scale_interval_e: e.target.value })}
                className="w-full h-10 px-3 rounded-lg border border-slate-300 focus:ring-2 focus:ring-primary focus:border-primary outline-none"
              />
            </div>
          </div>

          <div>
            <label className="font-semibold text-slate-700 block mb-1">Operational Location / Establishment</label>
            <input
              type="text"
              value={formData.location}
              onChange={(e) => setFormData({ ...formData, location: e.target.value })}
              className="w-full h-10 px-3 rounded-lg border border-slate-300 focus:ring-2 focus:ring-primary focus:border-primary outline-none"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-slate-300 text-slate-700 font-medium rounded-lg hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2 bg-primary text-white font-bold rounded-lg hover:bg-primary-container transition-all flex items-center gap-1.5 shadow-sm"
            >
              {loading ? 'Registering...' : 'Register Instrument'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
