import React, { useState, useEffect } from 'react';

/**
 * 2-second Splash Intro Animation for CertifyMetric
 * Displays official golden logo and animated "CertifyMetric" text over statutory blue background
 * Features smooth in-and-out phase animations.
 * Used strictly when the landing page link is opened.
 */
export default function SplashIntroAnimation({ duration = 2000, onComplete }) {
  // phases: 'in' (0-200ms) -> 'active' (200ms-1400ms) -> 'out' (1400ms-2000ms)
  const [phase, setPhase] = useState('in');
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    // 1. In -> Active transition (logo & text enter smoothly)
    const enterTimer = setTimeout(() => {
      setPhase('active');
    }, 150);

    // 2. Trigger out-animation 600ms before completion
    const outTimer = setTimeout(() => {
      setPhase('out');
    }, Math.max(duration - 600, 1000));

    // 3. Complete and unmount at exact duration mark
    const completeTimer = setTimeout(() => {
      setVisible(false);
      if (onComplete) onComplete();
    }, duration);

    return () => {
      clearTimeout(enterTimer);
      clearTimeout(outTimer);
      clearTimeout(completeTimer);
    };
  }, [duration, onComplete]);

  if (!visible) return null;

  const isEntering = phase === 'in';
  const isOut = phase === 'out';

  return (
    <div
      aria-label="CertifyMetric Loading Animation"
      role="status"
      className={`fixed inset-0 z-[9999] flex flex-col items-center justify-center select-none transition-all duration-600 ease-in-out ${
        isOut ? 'opacity-0 scale-105 pointer-events-none' : 'opacity-100 scale-100'
      }`}
      style={{
        background: 'radial-gradient(circle at center, #0b396e 0%, #002046 50%, #001226 100%)'
      }}
      onClick={() => {
        // Allow tap-to-dismiss without waiting full 2s if user interacts
        setPhase('out');
        setTimeout(() => setVisible(false), 250);
      }}
    >
      {/* Subtle background animated radial ambient glows */}
      <div className="absolute w-[450px] h-[450px] rounded-full bg-amber-400/10 blur-3xl pointer-events-none animate-pulse" />
      <div className="absolute w-[600px] h-[600px] rounded-full bg-blue-500/10 blur-3xl pointer-events-none" />

      {/* Main Content Container with coordinated in/out animation */}
      <div className="relative z-10 flex flex-col items-center text-center px-4">
        {/* Animated Logo Container */}
        <div
          className={`relative mb-5 transition-all duration-700 ease-out transform ${
            isEntering
              ? 'opacity-0 scale-50 -translate-y-4'
              : isOut
              ? 'opacity-0 scale-110 -translate-y-2'
              : 'opacity-100 scale-100 translate-y-0'
          }`}
        >
          {/* Outer golden halo ring */}
          <div className="absolute -inset-3 rounded-full bg-gradient-to-tr from-amber-400/30 to-amber-200/10 blur-md animate-pulse" />

          {/* Official Logo Image */}
          <div className="relative w-28 h-28 sm:w-36 sm:h-36 rounded-full p-2.5 bg-gradient-to-b from-white/10 to-transparent backdrop-blur-xs border border-amber-400/30 shadow-[0_0_35px_rgba(251,191,36,0.35)] flex items-center justify-center">
            <img
              src="/logo.png"
              alt="CertifyMetric Official Logo"
              className="w-full h-full object-contain filter drop-shadow-[0_4px_16px_rgba(0,0,0,0.4)]"
            />
          </div>
        </div>

        {/* Animated Brand Typography */}
        <div
          className={`space-y-1.5 transition-all duration-700 delay-150 ease-out transform ${
            isEntering
              ? 'opacity-0 translate-y-6 scale-95'
              : isOut
              ? 'opacity-0 -translate-y-2 scale-105'
              : 'opacity-100 translate-y-0 scale-100'
          }`}
        >
          {/* Main Title: certifymetric with styling */}
          <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-white flex items-center justify-center gap-1 font-sans">
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

        {/* Subtle 2-second Progress Indicator Line */}
        <div className="w-36 sm:w-48 h-0.5 bg-white/10 rounded-full mt-6 overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-amber-400 to-amber-300 rounded-full"
            style={{
              animation: `splashProgress ${duration}ms cubic-bezier(0.4, 0, 0.2, 1) forwards`
            }}
          />
        </div>
      </div>

      {/* Embedded keyframe for progress bar */}
      <style>{`
        @keyframes splashProgress {
          0% { width: 0%; opacity: 0.8; }
          70% { width: 85%; opacity: 1; }
          100% { width: 100%; opacity: 0.2; }
        }
      `}</style>
    </div>
  );
}
