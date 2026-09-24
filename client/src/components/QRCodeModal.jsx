import React, { useEffect, useState } from 'react';
import QRCode from 'qrcode';

export default function QRCodeModal({ certificate, onClose, onNavigateToVerify }) {
  const [isClosing, setIsClosing] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState('');
  const [qrHighResUrl, setQrHighResUrl] = useState('');

  const isInstrument = Boolean(certificate?.serial_number && !certificate?.certificate_no);
  const token = certificate?.public_token || certificate?.serial_number || certificate?.certificate_no || 'demo-token';
  const verifyUrl = isInstrument
    ? `${window.location.origin}/public/instrument/${encodeURIComponent(token)}`
    : `${window.location.origin}/verify/${encodeURIComponent(token)}`;

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
    if (token) {
      // Standard resolution for display
      QRCode.toDataURL(verifyUrl, {
        width: 300,
        margin: 2,
        color: {
          dark: '#002046',
          light: '#ffffff'
        }
      }).then(setQrDataUrl).catch(console.error);

      // High resolution (700px) for crisp physical printing & camera scanning
      QRCode.toDataURL(verifyUrl, {
        width: 700,
        margin: 2,
        color: {
          dark: '#002046',
          light: '#ffffff'
        }
      }).then(setQrHighResUrl).catch(console.error);
    }
  }, [token, verifyUrl]);

  const handlePrintQR = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    const isInst = isInstrument;
    const titleText = isInst ? 'Legal Metrology Instrument QR Seal' : 'Statutory Verification Certificate QR';
    const idLabel = isInst ? 'Serial / Token:' : 'Certificate No:';
    const idValue = isInst ? (certificate.serial_number || certificate.public_token) : (certificate.certificate_no || certificate.public_token);
    const modelText = certificate.model || certificate.category || 'Statutory Equipment';

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Print QR Code - ${idValue}</title>
          <style>
            @page { size: auto; margin: 10mm; }
            body {
              font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              min-height: 100vh;
              margin: 0;
              padding: 20px;
              background-color: #ffffff;
              color: #0f172a;
            }
            .print-card {
              border: 3px solid #002046;
              border-radius: 20px;
              padding: 28px;
              max-width: 360px;
              width: 100%;
              text-align: center;
              box-sizing: border-box;
            }
            .govt-title {
              font-size: 11px;
              font-weight: 800;
              color: #64748b;
              text-transform: uppercase;
              letter-spacing: 1.5px;
              margin-bottom: 4px;
            }
            .main-title {
              font-size: 15px;
              font-weight: 800;
              color: #002046;
              margin-bottom: 16px;
            }
            .qr-container {
              background: #ffffff;
              padding: 12px;
              border-radius: 16px;
              border: 1px solid #e2e8f0;
              display: inline-block;
              margin-bottom: 16px;
            }
            .qr-image {
              width: 240px;
              height: 240px;
              display: block;
            }
            .details-box {
              background: #f8fafc;
              border-radius: 12px;
              padding: 12px 16px;
              text-align: left;
              font-size: 12px;
              border: 1px solid #e2e8f0;
            }
            .row {
              display: flex;
              justify-content: space-between;
              padding: 4px 0;
              border-bottom: 1px solid #f1f5f9;
            }
            .row:last-child { border-bottom: none; }
            .lbl { color: #64748b; font-weight: 600; }
            .val { color: #002046; font-weight: 800; font-family: monospace; }
            .url-text {
              margin-top: 14px;
              font-size: 10px;
              color: #475569;
              word-break: break-all;
              font-family: monospace;
            }
            .footer-note {
              margin-top: 10px;
              font-size: 9px;
              color: #94a3b8;
              text-transform: uppercase;
              letter-spacing: 0.5px;
            }
          </style>
        </head>
        <body>
          <div class="print-card">
            <div class="govt-title">Legal Metrology Division</div>
            <div class="main-title">${titleText}</div>
            <div class="qr-container">
              <img src="${qrHighResUrl || qrDataUrl}" class="qr-image" alt="QR Code" />
            </div>
            <div class="details-box">
              <div class="row">
                <span class="lbl">${idLabel}</span>
                <span class="val">${idValue}</span>
              </div>
              <div class="row">
                <span class="lbl">Category/Model:</span>
                <span class="val" style="font-family:sans-serif;">${modelText}</span>
              </div>
              ${certificate.valid_until ? `
                <div class="row">
                  <span class="lbl">Valid Until:</span>
                  <span class="val">${certificate.valid_until}</span>
                </div>
              ` : ''}
            </div>
            <div class="url-text">${verifyUrl}</div>
            <div class="footer-note">Scan with device camera or Google Lens to verify statutory compliance</div>
          </div>
          <script>
            window.onload = function() {
              window.print();
              setTimeout(function() { window.close(); }, 500);
            }
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

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
                <h2 className="text-base md:text-lg font-bold text-primary tracking-tight">
                  {isInstrument ? 'Instrument Validation QR' : 'Statutory Verification QR'}
                </h2>
                <span className="text-[10px] font-bold uppercase tracking-wider bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full border border-emerald-200">
                  {isInstrument ? 'Physical Seal' : 'Digital Seal'}
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium">
                {isInstrument
                  ? 'Official QR code affixed to certified instrument'
                  : 'Official anti-counterfeiting verification code'}
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
              className="w-8 h-8 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 flex items-center justify-center transition-colors cursor-pointer"
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
              {isInstrument
                ? 'Scan with any mobile camera, Google Lens, or QR scanner app to inspect this instrument\'s current statutory verification status and validity date.'
                : 'Scan with any mobile camera, Google Lens, or QR scanner app to verify certificate authenticity directly on the legal metrology portal.'}
            </p>

            <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-md mb-4">
              {qrDataUrl ? (
                <img src={qrDataUrl} alt="Statutory QR Code" className="w-56 h-56 object-contain" />
              ) : (
                <div className="w-56 h-56 flex items-center justify-center text-slate-400 text-xs">
                  Loading QR Code...
                </div>
              )}
            </div>

            {/* Direct URL Box */}
            <div className="w-full bg-slate-50 rounded-xl p-3 text-center border border-slate-200 mb-4">
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mb-1">Direct Verification URL</span>
              <span className="font-mono text-[11px] text-slate-700 break-all select-all font-semibold">{verifyUrl}</span>
            </div>

            <div className="w-full bg-slate-50 rounded-xl p-4 text-left border border-slate-200/80 text-xs space-y-2">
              {isInstrument ? (
                <>
                  <div className="flex justify-between py-1 border-b border-slate-200/60">
                    <span className="text-slate-500 font-medium">Serial Number:</span>
                    <span className="font-mono font-bold text-primary">{certificate.serial_number}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-200/60">
                    <span className="text-slate-500 font-medium">Instrument Model:</span>
                    <span className="font-bold text-slate-800">{certificate.model || certificate.category || 'Standard'}</span>
                  </div>
                  <div className="flex justify-between py-1 items-center">
                    <span className="text-slate-500 font-medium">Public Token:</span>
                    <span className="font-mono text-[11px] text-slate-700 bg-white px-2 py-0.5 rounded border border-slate-200 truncate max-w-[170px]">
                      {certificate.public_token || certificate.serial_number}
                    </span>
                  </div>
                </>
              ) : (
                <>
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
                </>
              )}
            </div>
          </div>
        </div>

        {/* Drawer Footer */}
        <div className="px-6 py-4 md:px-8 bg-slate-50/95 backdrop-blur border-t border-slate-200 flex items-center justify-between gap-3 shrink-0 flex-wrap">
          <button
            type="button"
            onClick={handleClose}
            className="px-4 py-2 border border-slate-300 text-slate-700 text-xs font-semibold rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
          >
            Close
          </button>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrintQR}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 shadow-sm cursor-pointer"
            >
              <span className="material-symbols-outlined text-sm">print</span>
              <span>Print QR Code</span>
            </button>
            <button
              type="button"
              onClick={() => {
                handleClose();
                if (onNavigateToVerify) {
                  if (isInstrument) {
                    onNavigateToVerify(certificate.public_token || certificate.serial_number, 'INSTRUMENT');
                  } else {
                    onNavigateToVerify(certificate.public_token || certificate.certificate_no, 'CERTIFICATE');
                  }
                }
              }}
              className="px-4 py-2 bg-primary text-white text-xs font-bold rounded-lg hover:bg-primary-container transition-all flex items-center gap-1.5 shadow-sm cursor-pointer"
            >
              <span className="material-symbols-outlined text-sm">open_in_new</span>
              <span>Open Verification Page</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
