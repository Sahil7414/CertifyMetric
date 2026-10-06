import React from 'react';

/**
 * Global Full-Page Startup Loading Screen Component
 * Source of truth: Image(7) Legal Metrology Online System Brand Identity (pure code + /logo.png)
 * Used strictly for initial browser reload / application boot initialization.
 */
export default function LoadingScreen({ message }) {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-label="CertifyMetric Loading"
      className="fixed inset-0 z-[9999] flex flex-col items-center justify-center select-none overflow-hidden"
      style={{
        background: 'radial-gradient(circle at center, #0b396e 0%, #002046 50%, #001226 100%)'
      }}
    >
      {/* Subtle background animated radial ambient glows */}
      <div className="absolute w-[450px] h-[450px] rounded-full bg-amber-400/10 blur-3xl pointer-events-none animate-pulse" />
      <div className="absolute w-[600px] h-[600px] rounded-full bg-blue-500/10 blur-3xl pointer-events-none" />

      {/* Main Content Container */}
      <div className="relative z-10 flex flex-col items-center text-center px-4">
        {/* Animated Logo Container */}
        <div className="relative mb-5">
          {/* Outer golden halo ring */}
          <div className="absolute -inset-3 rounded-full bg-gradient-to-tr from-amber-400/30 to-amber-200/10 blur-md animate-pulse" />

          {/* Official Logo Image */}
          <div className="relative w-24 h-24 sm:w-32 sm:h-32 rounded-full p-2 bg-gradient-to-b from-white/10 to-transparent backdrop-blur-xs border border-amber-400/30 shadow-[0_0_35px_rgba(251,191,36,0.35)] flex items-center justify-center">
            <img
              src="/logo.png"
              alt="CertifyMetric Official Logo"
              className="w-full h-full object-contain filter drop-shadow-[0_4px_16px_rgba(0,0,0,0.4)]"
            />
          </div>
        </div>

        {/* Animated Brand Typography */}
        <div className="space-y-1">
          {/* Main Title */}
          <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-white flex items-center justify-center gap-1 font-sans">
            <span className="bg-gradient-to-r from-amber-300 via-amber-400 to-amber-200 bg-clip-text text-transparent drop-shadow-sm font-extrabold">
              Certify
            </span>
            <span className="text-white font-black tracking-normal">
              Metric
            </span>
          </h1>

          {/* Subtitle Badge */}
          <div className="flex items-center justify-center gap-2 pt-1">
            <div className="h-px w-6 sm:w-10 bg-gradient-to-r from-transparent to-amber-400/60" />
            <span className="text-[10px] sm:text-xs font-semibold text-slate-300 uppercase tracking-widest font-mono">
              Legal Metrology Online System
            </span>
            <div className="h-px w-6 sm:w-10 bg-gradient-to-l from-transparent to-amber-400/60" />
          </div>
        </div>

        {/* Progress Indicator Bar */}
        <div className="w-32 sm:w-44 h-1 bg-white/10 rounded-full mt-5 overflow-hidden relative">
          <div className="h-full bg-gradient-to-r from-amber-400 via-amber-300 to-amber-400 rounded-full animate-certify-progress" />
        </div>

        {/* Optional context message */}
        {message && (
          <p className="mt-3 text-xs font-medium text-sky-200/80 tracking-wide font-sans animate-pulse max-w-sm">
            {message}
          </p>
        )}
      </div>

      <style>{`
        @keyframes certifyProgress {
          0% { transform: translateX(-100%); width: 50%; }
          50% { transform: translateX(50%); width: 75%; }
          100% { transform: translateX(200%); width: 50%; }
        }
        .animate-certify-progress {
          animation: certifyProgress 1.3s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}
