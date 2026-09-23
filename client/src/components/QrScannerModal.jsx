import React, { useEffect, useRef, useState } from 'react';
import jsQR from 'jsqr';

export default function QrScannerModal({
  isOpen,
  title = 'Scan QR Code',
  description = 'Point your camera at the QR code printed on the document or instrument.',
  onClose,
  onScan,
  onManualEntry
}) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState(null);
  const [scannedResult, setScannedResult] = useState('');
  const animFrameId = useRef(null);
  const streamRef = useRef(null);

  const stopCamera = () => {
    if (animFrameId.current) {
      cancelAnimationFrame(animFrameId.current);
      animFrameId.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
  };

  const startCamera = async () => {
    stopCamera();
    setCameraError(null);
    setScannedResult('');

    if (!navigator?.mediaDevices?.getUserMedia) {
      setCameraError('Camera access is not supported on this browser or device.');
      return;
    }

    try {
      let stream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: 'environment' }, width: { ideal: 640 }, height: { ideal: 480 } }
        });
      } catch (errFacing) {
        // Fallback to any available video camera (front/webcam)
        stream = await navigator.mediaDevices.getUserMedia({ video: true });
      }

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.setAttribute('playsinline', 'true'); // Required for iOS Safari
        await videoRef.current.play();
        setCameraActive(true);
        scanFrame();
      }
    } catch (err) {
      console.warn('Camera access denied or failed:', err);
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setCameraError('Camera permission was denied. Please allow camera access in your browser settings to scan QR codes.');
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        setCameraError('No camera found on this device.');
      } else {
        setCameraError('Camera access is unavailable. Please check your camera permissions or enter the code manually.');
      }
    }
  };

  const scanFrame = () => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });

    if (video.readyState === video.HAVE_ENOUGH_DATA) {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const code = jsQR(imageData.data, imageData.width, imageData.height, {
        inversionAttempts: 'dontInvert'
      });

      if (code && code.data && code.data.trim()) {
        const rawData = code.data.trim();
        setScannedResult(rawData);

        // Parse token from URLs if present
        let extractedToken = rawData;
        try {
          if (rawData.includes('/verify/')) {
            const parts = rawData.split('/verify/');
            extractedToken = parts[1]?.split('?')[0]?.split('#')[0] || rawData;
          } else if (rawData.includes('/public/instrument/')) {
            const parts = rawData.split('/public/instrument/');
            extractedToken = parts[1]?.split('?')[0]?.split('#')[0] || rawData;
          } else if (rawData.includes('/public/instruments/')) {
            const parts = rawData.split('/public/instruments/');
            extractedToken = parts[1]?.split('?')[0]?.split('#')[0] || rawData;
          }
        } catch (e) {}

        stopCamera();
        onScan(decodeURIComponent(extractedToken).trim());
        return;
      }
    }

    animFrameId.current = requestAnimationFrame(scanFrame);
  };

  useEffect(() => {
    if (isOpen) {
      startCamera();
    } else {
      stopCamera();
    }
    return () => {
      stopCamera();
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-[#002046] text-white px-5 py-4 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <span className="material-symbols-outlined text-lg">qr_code_scanner</span>
            </div>
            <div>
              <h3 className="font-extrabold text-sm">{title}</h3>
              <p className="text-[10px] text-slate-300">Live Camera Scanner</p>
            </div>
          </div>
          <button
            onClick={() => {
              stopCamera();
              onClose();
            }}
            className="w-8 h-8 rounded-lg hover:bg-white/10 text-slate-300 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
            title="Close"
          >
            <span className="material-symbols-outlined text-xl">close</span>
          </button>
        </div>

        {/* Scanner Viewport */}
        <div className="p-4 sm:p-5 flex-1 flex flex-col items-center justify-center space-y-4 min-h-[300px]">
          {cameraError ? (
            <div className="text-center p-6 bg-amber-50 rounded-2xl border border-amber-200 space-y-3 w-full">
              <div className="w-12 h-12 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center mx-auto">
                <span className="material-symbols-outlined text-2xl">videocam_off</span>
              </div>
              <div>
                <h4 className="font-bold text-amber-950 text-xs sm:text-sm">Camera Unavailable</h4>
                <p className="text-xs text-amber-800 mt-1 leading-relaxed">{cameraError}</p>
              </div>
              <div className="pt-2 flex flex-col gap-2">
                <button
                  type="button"
                  onClick={startCamera}
                  className="px-4 py-2 bg-amber-700 hover:bg-amber-800 text-white font-bold text-xs rounded-xl shadow-xs transition-colors cursor-pointer"
                >
                  Retry Camera
                </button>
                {onManualEntry && (
                  <button
                    type="button"
                    onClick={() => {
                      stopCamera();
                      onManualEntry();
                    }}
                    className="px-4 py-2 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 font-bold text-xs rounded-xl transition-colors cursor-pointer"
                  >
                    Enter Code Manually
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="relative w-full aspect-square max-w-[280px] sm:max-w-[320px] rounded-2xl overflow-hidden bg-slate-950 border-2 border-emerald-500 shadow-inner flex items-center justify-center">
              {/* HTML5 Video & Offscreen Canvas */}
              <video
                ref={videoRef}
                className="w-full h-full object-cover"
                muted
              />
              <canvas ref={canvasRef} className="hidden" />

              {/* Viewfinder Target Overlay */}
              <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-between p-6">
                <div className="w-full flex justify-between">
                  <div className="w-8 h-8 border-t-4 border-l-4 border-emerald-400 rounded-tl-lg"></div>
                  <div className="w-8 h-8 border-t-4 border-r-4 border-emerald-400 rounded-tr-lg"></div>
                </div>

                {/* Animated Green Scanning Line */}
                <div className="w-full h-0.5 bg-gradient-to-r from-transparent via-emerald-400 to-transparent shadow-[0_0_12px_#34d399] animate-pulse"></div>

                <div className="w-full flex justify-between">
                  <div className="w-8 h-8 border-b-4 border-l-4 border-emerald-400 rounded-bl-lg"></div>
                  <div className="w-8 h-8 border-b-4 border-r-4 border-emerald-400 rounded-br-lg"></div>
                </div>
              </div>

              {!cameraActive && (
                <div className="absolute inset-0 bg-slate-900/90 text-white flex flex-col items-center justify-center text-xs space-y-2">
                  <span className="material-symbols-outlined text-2xl animate-spin text-emerald-400">progress_activity</span>
                  <span>Starting device camera...</span>
                </div>
              )}
            </div>
          )}

          <p className="text-xs text-slate-500 text-center max-w-xs leading-relaxed">
            {description}
          </p>
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-3 shrink-0">
          {onManualEntry ? (
            <button
              type="button"
              onClick={() => {
                stopCamera();
                onManualEntry();
              }}
              className="text-xs font-bold text-primary hover:underline flex items-center gap-1 cursor-pointer"
            >
              <span className="material-symbols-outlined text-base">keyboard</span>
              <span>Enter Code Manually</span>
            </button>
          ) : (
            <span className="text-[11px] text-slate-400">CertifyMetric Public Registry</span>
          )}

          <button
            type="button"
            onClick={() => {
              stopCamera();
              onClose();
            }}
            className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold text-xs rounded-xl transition-colors cursor-pointer"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
