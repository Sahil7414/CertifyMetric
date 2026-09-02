import React, { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { api } from '../api';

export default function OfficialCertificate({
  certificateId,
  onBack,
  onOpenQR,
  onVerifyPublicToken
}) {
  const [cert, setCert] = useState(null);
  const [qrDataUrl, setQrDataUrl] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (certificateId) {
      setLoading(true);
      api.getCertificate(certificateId)
        .then((data) => {
          setCert(data);
          if (data?.public_token) {
            const verifyUrl = `${window.location.origin}/verify/${data.public_token}`;
            QRCode.toDataURL(verifyUrl, {
              width: 140,
              margin: 1,
              color: { dark: '#002046', light: '#ffffff' }
            }).then(setQrDataUrl);
          }
        })
        .catch(console.error)
        .finally(() => setLoading(false));
    }
  }, [certificateId]);

  if (loading) {
    return <div className="p-12 text-center text-slate-500">Generating certificate view...</div>;
  }

  if (!cert) {
    return <div className="p-12 text-center text-rose-500">Certificate not found.</div>;
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto animate-in fade-in duration-300">
      {/* Action Header */}
      <div className="flex items-center justify-between print:hidden">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-primary transition-colors"
        >
          <span className="material-symbols-outlined text-[16px]">arrow_back</span>
          Back to Certificates
        </button>
        <div className="flex items-center gap-2 sm:gap-3 flex-wrap justify-end">
          {onVerifyPublicToken && (
            <button
              onClick={() => onVerifyPublicToken(cert.public_token)}
              className="px-3 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 border border-emerald-300 shadow-xs"
              title="Open the public verification page that QR scanners resolve to"
            >
              <span className="material-symbols-outlined text-[16px] text-emerald-600">verified</span>
              Verify Public Record
            </button>
          )}
          <button
            onClick={() => onOpenQR({
              certificate_no: cert.certificate_no,
              public_token: cert.public_token,
              status: cert.status
            })}
            className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 border border-slate-300"
          >
            <span className="material-symbols-outlined text-[16px]">qr_code_2</span>
            Inspect QR Token
          </button>
          <button
            onClick={() => window.print()}
            className="px-4 py-2 bg-primary text-white rounded-lg text-xs font-bold hover:bg-primary-container shadow-xs transition-all flex items-center gap-1.5"
          >
            <span className="material-symbols-outlined text-[16px]">print</span>
            Print Certificate
          </button>
        </div>
      </div>

      {/* Official Government Certificate Sheet (Printable) */}
      <div className="bg-white rounded-2xl border-4 border-double border-[#002046]/40 p-8 md:p-12 shadow-lg relative print:border-2 print:shadow-none print:p-6 print:m-0">
        {/* Watermark */}
        <div className="absolute inset-0 flex items-center justify-center opacity-[0.03] pointer-events-none select-none">
          <span className="material-symbols-outlined text-[450px]">balance</span>
        </div>

        {/* Certificate Header */}
        <div className="text-center pb-6 border-b-2 border-slate-900 relative z-10">
          <div className="w-12 h-12 mx-auto mb-2 text-slate-900">
            <span className="material-symbols-outlined text-4xl">account_balance</span>
          </div>
          <h2 className="text-sm uppercase tracking-widest font-extrabold text-slate-800">
            Government of India • Department of Consumer Affairs
          </h2>
          <p className="text-xs font-serif italic text-slate-600 mt-0.5">
            Office of the Controller of Legal Metrology
          </p>
          <div className="inline-block mt-3 px-4 py-1 border border-slate-800 bg-slate-50 text-slate-900 text-sm font-bold uppercase tracking-wider">
            Certificate of Verification
          </div>
          <p className="text-[11px] text-slate-500 mt-1">
            [Issued under Section 24 of the Legal Metrology Act, 2009 & Rule 14 of the Legal Metrology (General) Rules, 2011]
          </p>
        </div>

        {/* Certificate Meta Details */}
        <div className="grid grid-cols-2 text-xs py-4 border-b border-slate-200 relative z-10">
          <div>
            <span className="text-slate-500 font-medium">Certificate Number: </span>
            <strong className="font-mono text-sm text-primary">{cert.certificate_no}</strong>
          </div>
          <div className="text-right">
            <span className="text-slate-500 font-medium">Date of Verification: </span>
            <strong className="text-slate-900">{new Date(cert.issue_date).toLocaleDateString()}</strong>
          </div>
        </div>

        {/* Certificate Body Content */}
        <div className="py-6 space-y-4 text-xs text-slate-800 leading-relaxed relative z-10 font-serif">
          <p>
            This is to certify that the weighing / measuring instrument described hereunder, presented by <strong>{cert.owner_name}</strong> of <strong>{cert.owner_org}</strong>, situated at <em>{cert.location}</em>, has been verified with reference to the statutory working standards of mass and weights.
          </p>
          <p>
            Upon rigorous empirical examination and testing across prescribed nominal loads, the instrument was found to conform strictly within the Maximum Permissible Errors (MPE) specified in Schedule V of the Legal Metrology (General) Rules.
          </p>

          {/* Instrument Specifications Table */}
          <div className="my-6 p-4 rounded-lg bg-slate-50 border border-slate-200 font-sans text-xs">
            <h4 className="font-bold text-slate-900 uppercase text-[11px] tracking-wider mb-3">
              Certified Instrument Particulars
            </h4>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-y-3 gap-x-4">
              <div>
                <span className="text-slate-400 block text-[10px]">Category</span>
                <span className="font-semibold text-slate-800">{cert.category_name}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px]">Manufacturer / Make</span>
                <span className="font-semibold text-slate-800">{cert.manufacturer}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px]">Model</span>
                <span className="font-semibold text-slate-800">{cert.model}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px]">Serial Number</span>
                <span className="font-mono font-bold text-primary">{cert.serial_number}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px]">Max Capacity</span>
                <span className="font-semibold text-slate-800">{cert.max_capacity}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px]">Verification Interval (e)</span>
                <span className="font-semibold text-slate-800">{cert.verification_scale_interval_e}</span>
              </div>
            </div>
          </div>

          <div className="p-3 bg-emerald-50 rounded-lg border border-emerald-200 text-emerald-900 font-sans text-xs flex items-center justify-between">
            <div>
              <span className="font-bold">Next Statutory Re-Verification Due Date: </span>
              <strong className="text-sm underline text-emerald-950">{new Date(cert.valid_until).toLocaleDateString()}</strong>
            </div>
            <span className="px-2 py-0.5 rounded bg-emerald-200 text-emerald-900 font-bold text-[10px] uppercase">
              12 Months Statutory Period
            </span>
          </div>
        </div>

        {/* Footer: Signatures & Authenticated QR Code */}
        <div className="pt-8 mt-6 border-t-2 border-slate-900 flex items-end justify-between relative z-10 text-xs">
          {/* QR Box */}
          <div
            onClick={() => onVerifyPublicToken && onVerifyPublicToken(cert.public_token)}
            className="flex items-center gap-3 cursor-pointer group"
            title="Click to view live public verification page"
          >
            {qrDataUrl && (
              <div className="p-1.5 bg-white border border-slate-300 rounded shadow-xs group-hover:border-primary group-hover:shadow-md transition-all">
                <img src={qrDataUrl} alt="Certificate QR" className="w-24 h-24" />
              </div>
            )}
            <div className="text-[10px] text-slate-500 space-y-0.5">
              <span className="font-bold text-primary block group-hover:underline flex items-center gap-1">
                Official QR Authentication
                <span className="material-symbols-outlined text-[13px]">open_in_new</span>
              </span>
              <span>Scan or click to verify live status</span>
              <span className="font-mono block text-slate-400">Token: {cert.public_token?.slice(0, 16)}...</span>
            </div>
          </div>

          {/* Issuing Signature */}
          <div className="text-right space-y-1">
            <div className="w-40 border-b border-slate-400 mb-2 pb-1 font-serif italic text-slate-500">
              [Digitally Signed & Sealed]
            </div>
            <div className="font-bold text-slate-900">{cert.issuing_officer}</div>
            <div className="text-[11px] text-slate-600">Legal Metrology Officer / Inspector</div>
            <div className="text-[10px] text-slate-400">{cert.issuing_authority}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
