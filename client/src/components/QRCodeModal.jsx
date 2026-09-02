import React, { useEffect, useState } from 'react';
import QRCode from 'qrcode';

export default function QRCodeModal({ certificate, onClose, onNavigateToVerify }) {
  const [qrDataUrl, setQrDataUrl] = useState('');

  const verifyUrl = `${window.location.origin}/verify/${certificate?.public_token || 'demo-token'}`;

  useEffect(() => {
    if (certificate?.public_token) {
      QRCode.toDataURL(verifyUrl, {
        width: 260,
        margin: 2,
        color: {
          dark: '#002046',
          light: '#ffffff'
        }
      }).then(setQrDataUrl).catch(console.error);
    }
  }, [certificate, verifyUrl]);

  if (!certificate) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-surface-container-lowest rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-outline-variant/40 flex flex-col items-center text-center relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-outline hover:text-on-surface p-1 rounded-full hover:bg-surface transition-colors"
        >
          <span className="material-symbols-outlined">close</span>
        </button>

        <div className="w-12 h-12 rounded-xl bg-primary-container/10 flex items-center justify-center text-primary mb-3">
          <span className="material-symbols-outlined text-2xl">qr_code_2</span>
        </div>

        <h3 className="text-lg font-bold text-primary">Statutory Verification QR</h3>
        <p className="text-xs text-on-surface-variant mt-1 mb-4">
          Scan with any mobile camera or scanner to verify authenticity.
        </p>

        <div className="p-3 bg-white rounded-xl border border-slate-200 shadow-sm mb-4">
          {qrDataUrl ? (
            <img src={qrDataUrl} alt="Certificate QR Code" className="w-52 h-52 object-contain" />
          ) : (
            <div className="w-52 h-52 flex items-center justify-center text-outline">Loading QR...</div>
          )}
        </div>

        <div className="w-full bg-surface-container-low rounded-lg p-3 text-left mb-4 border border-outline-variant/30 text-xs">
          <div className="flex justify-between py-1 border-b border-outline-variant/20">
            <span className="text-on-surface-variant">Certificate No:</span>
            <span className="font-mono font-semibold text-primary">{certificate.certificate_no}</span>
          </div>
          <div className="flex justify-between py-1 border-b border-outline-variant/20">
            <span className="text-on-surface-variant">Status:</span>
            <span className="font-semibold text-emerald-600">{certificate.status}</span>
          </div>
          <div className="flex justify-between py-1">
            <span className="text-on-surface-variant">Non-Guessable Token:</span>
            <span className="font-mono text-[10px] text-outline truncate max-w-[130px]">{certificate.public_token}</span>
          </div>
        </div>

        <div className="flex flex-col gap-2 w-full">
          <button
            onClick={() => onNavigateToVerify(certificate.public_token)}
            className="w-full py-2.5 px-4 bg-primary text-white rounded-lg text-sm font-semibold hover:bg-primary-container transition-all flex items-center justify-center gap-2 shadow-sm"
          >
            <span className="material-symbols-outlined text-sm">open_in_new</span>
            Open Public Verification Page
          </button>
          <button
            onClick={onClose}
            className="w-full py-2 px-4 border border-slate-300 text-on-surface rounded-lg text-sm font-medium hover:bg-surface transition-all"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
