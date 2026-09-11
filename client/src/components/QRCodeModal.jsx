import React, { useEffect, useState } from 'react';
import QRCode from 'qrcode';

export default function QRCodeModal({ certificate, onClose, onNavigateToVerify }) {
  const [isClosing, setIsClosing] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState('');

  const verifyUrl = `${window.location.origin}/verify/${certificate?.public_token || 'demo-token'}`;

  const handleClose = () => {
    if (isClosing) return;
    setIsClosing(true);
    setTimeout(() => {
      onClose();
    }, 240);
  };

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        handleClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isClosing]);

  useEffect(() => {
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, []);

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
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop overlay */}
      <div
        className={`fixed inset-0 bg-slate-900/60 backdrop-blur-sm cursor-pointer transition-opacity duration-300 ${
          isClosing ? 'animate-backdrop-out' : 'animate-backdrop-in'
        }`}
        onClick={handleClose}
      />

      {/* Slide-over Drawer Panel occupying half the screen on desktop */}
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
              <span className="material-symbols-outlined text-2xl">qr_code_2</span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base md:text-lg font-bold text-primary tracking-tight">Statutory Verification QR</h2>
                <span className="text-[10px] font-bold uppercase tracking-wider bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full border border-emerald-200">
                  Digital Seal
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium">
                Official anti-counterfeiting verification code
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

        {/* Scrollable Content Body */}
        <div className="flex-1 overflow-y-auto p-6 md:p-8 flex flex-col items-center text-center space-y-6">
          <div className="w-full max-w-sm flex flex-col items-center">
            <p className="text-xs text-slate-600 mb-4 leading-relaxed">
              Scan with any mobile camera, QR scanner, or consumer app to verify authenticity directly on the legal metrology portal.
            </p>

            <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-md mb-5">
              {qrDataUrl ? (
                <img src={qrDataUrl} alt="Certificate QR Code" className="w-56 h-56 object-contain" />
              ) : (
                <div className="w-56 h-56 flex items-center justify-center text-slate-400 text-xs">
                  Loading QR Code...
                </div>
              )}
            </div>

            <div className="w-full bg-slate-50 rounded-xl p-4 text-left border border-slate-200/80 text-xs space-y-2">
              <div className="flex justify-between py-1 border-b border-slate-200/60">
                <span className="text-slate-500 font-medium">Certificate No:</span>
                <span className="font-mono font-bold text-primary">{certificate.certificate_no}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-200/60">
                <span className="text-slate-500 font-medium">Statutory Status:</span>
                <span className="font-bold text-emerald-600 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                  {certificate.status}
                </span>
              </div>
              <div className="flex justify-between py-1 items-center">
                <span className="text-slate-500 font-medium">Public Token:</span>
                <span className="font-mono text-[11px] text-slate-700 bg-white px-2 py-0.5 rounded border border-slate-200 truncate max-w-[170px]">
                  {certificate.public_token}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Drawer Footer */}
        <div className="px-6 py-4 md:px-8 bg-slate-50/95 backdrop-blur border-t border-slate-200 flex items-center justify-between shrink-0">
          <button
            type="button"
            onClick={handleClose}
            className="px-4 py-2 border border-slate-300 text-slate-700 text-xs font-semibold rounded-lg hover:bg-slate-100 transition-colors"
          >
            Close
          </button>
          <button
            type="button"
            onClick={() => {
              handleClose();
              if (onNavigateToVerify) onNavigateToVerify(certificate.public_token);
            }}
            className="px-5 py-2 bg-primary text-white text-xs font-bold rounded-lg hover:bg-primary-container transition-all flex items-center gap-2 shadow-sm"
          >
            <span className="material-symbols-outlined text-sm">open_in_new</span>
            Open Verification Page
          </button>
        </div>
      </div>
    </div>
  );
}
