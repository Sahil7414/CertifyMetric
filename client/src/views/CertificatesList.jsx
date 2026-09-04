import React from 'react';
import StatusBadge from '../components/StatusBadge';

export default function CertificatesList({
  certificates = [],
  onSelectCertificate,
  onOpenQR,
  onVerifyPublicToken
}) {
  const safeCertificates = Array.isArray(certificates) ? certificates : [];

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Statutory Verification Certificates</h1>
          <p className="text-xs text-slate-500 mt-0.5">Official compliance credentials issued under the Legal Metrology Act</p>
        </div>
        <span className="text-xs font-semibold px-3 py-1 rounded-full bg-primary/10 text-primary self-start sm:self-auto">
          {safeCertificates.length} Total Issued
        </span>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs min-w-[700px]">
            <thead className="bg-slate-100 text-slate-600 font-semibold border-b border-slate-200">
              <tr>
                <th className="px-6 py-3.5">Certificate No</th>
                <th className="px-6 py-3.5">Verified Instrument</th>
                <th className="px-6 py-3.5">Issue Date</th>
                <th className="px-6 py-3.5">Valid Until</th>
                <th className="px-6 py-3.5">Status</th>
                <th className="px-6 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-slate-700">
              {safeCertificates.map((cert) => (
                <tr key={cert.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="px-6 py-4">
                    <div className="font-mono font-bold text-primary">{cert.certificate_no}</div>
                    <div className="text-[10px] text-slate-400 font-mono mt-0.5 truncate max-w-[140px]">{cert.public_token}</div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="font-bold text-slate-900">{cert.manufacturer} {cert.model}</span>
                    <span className="block text-[11px] text-slate-500 font-mono">SN: {cert.serial_number}</span>
                  </td>
                  <td className="px-6 py-4 text-slate-700 font-medium">
                    {new Date(cert.issue_date).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 font-medium text-slate-800">
                    {new Date(cert.valid_until).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4">
                    <StatusBadge status={cert.status} />
                  </td>
                  <td className="px-6 py-4 text-right space-x-1.5 whitespace-nowrap">
                    <button
                      onClick={() => onSelectCertificate(cert.id)}
                      className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded font-semibold text-xs transition-colors"
                    >
                      Certificate
                    </button>
                    {onVerifyPublicToken && (
                      <button
                        onClick={() => onVerifyPublicToken(cert.public_token)}
                        className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 rounded font-semibold text-xs transition-colors"
                        title="View the public QR verification view"
                      >
                        Verify
                      </button>
                    )}
                    <button
                      onClick={() => onOpenQR({
                        certificate_no: cert.certificate_no,
                        public_token: cert.public_token,
                        status: cert.status
                      })}
                      className="px-2.5 py-1 bg-primary text-white rounded font-bold text-xs hover:bg-primary-container transition-all inline-flex items-center gap-1"
                    >
                      <span className="material-symbols-outlined text-[15px]">qr_code_2</span>
                      QR
                    </button>
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
