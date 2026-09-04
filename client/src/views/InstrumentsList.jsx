import React from 'react';
import StatusBadge from '../components/StatusBadge';

export default function InstrumentsList({
  instruments = [],
  onOpenAddModal,
  onSelectInstrument,
  onRequestVerification,
  onOpenQR
}) {
  const safeInstruments = Array.isArray(instruments) ? instruments : [];

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Registered Instruments Registry</h1>
          <p className="text-xs text-slate-500 mt-0.5">Commercial instruments registered for statutory verification under Legal Metrology Act</p>
        </div>
        <button
          onClick={onOpenAddModal}
          className="px-4 py-2 bg-primary text-white font-bold rounded-lg text-xs hover:bg-primary-container shadow-xs transition-all flex items-center gap-1.5 self-start sm:self-auto"
        >
          <span className="material-symbols-outlined text-[16px]">add_circle</span>
          Register New Instrument
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs min-w-[720px]">
            <thead className="bg-slate-100 text-slate-600 font-semibold border-b border-slate-200">
              <tr>
                <th className="px-6 py-3.5">Device & Model</th>
                <th className="px-6 py-3.5">Serial Number</th>
                <th className="px-6 py-3.5">Category</th>
                <th className="px-6 py-3.5">Capacity / Range</th>
                <th className="px-6 py-3.5">Location</th>
                <th className="px-6 py-3.5">Status</th>
                <th className="px-6 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-slate-700">
              {safeInstruments.map((inst) => (
                <tr key={inst.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="px-6 py-4">
                    <span className="font-bold text-slate-900">{inst.manufacturer}</span>
                    <span className="block text-[11px] text-slate-500">{inst.model}</span>
                  </td>
                  <td className="px-6 py-4 font-mono font-medium text-slate-800">
                    {inst.serial_number}
                  </td>
                  <td className="px-6 py-4 text-slate-600 max-w-[180px] truncate" title={inst.category_name}>
                    {inst.category_name}
                  </td>
                  <td className="px-6 py-4">
                    <span className="font-semibold text-slate-800">{inst.max_capacity}</span>
                    <span className="text-[10px] text-slate-400 block font-mono">e = {inst.verification_scale_interval_e}</span>
                  </td>
                  <td className="px-6 py-4 text-slate-600 max-w-[180px] truncate" title={inst.location}>
                    {inst.location}
                  </td>
                  <td className="px-6 py-4">
                    <StatusBadge status={inst.status} />
                  </td>
                  <td className="px-6 py-4 text-right space-x-2">
                    <button
                      onClick={() => onSelectInstrument(inst.id)}
                      className="px-2.5 py-1 text-slate-700 hover:text-primary hover:bg-slate-100 rounded text-xs font-semibold transition-colors"
                    >
                      Profile
                    </button>
                    {inst.status === 'REGISTERED' && (
                      <button
                        onClick={() => onRequestVerification(inst.id)}
                        className="px-3 py-1 bg-primary text-white rounded text-xs font-bold hover:bg-primary-container transition-all"
                      >
                        Request Verification
                      </button>
                    )}
                    {inst.status === 'EXPIRING' && (
                      <button
                        onClick={() => onRequestVerification(inst.id)}
                        className="px-3 py-1 bg-amber-600 text-white rounded text-xs font-bold hover:bg-amber-700 transition-all"
                      >
                        Re-verify
                      </button>
                    )}
                    {inst.certificate_no && (
                      <button
                        onClick={() => onOpenQR({
                          certificate_no: inst.certificate_no,
                          public_token: inst.public_token,
                          status: inst.cert_status || 'VALID'
                        })}
                        className="p-1 text-primary hover:bg-primary/10 rounded"
                        title="Display QR Code"
                      >
                        <span className="material-symbols-outlined text-[18px]">qr_code_2</span>
                      </button>
                    )}
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
