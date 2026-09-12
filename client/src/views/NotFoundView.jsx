import React from 'react';

export default function NotFoundView({
  currentUser,
  currentRole,
  path = '',
  onGoHome,
  onGoToLogin
}) {
  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center p-4 text-center select-none animate-in fade-in duration-200">
      <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-amber-100 text-amber-900 flex items-center justify-center mb-4 shadow-sm border border-amber-200/80">
        <span className="material-symbols-outlined text-4xl sm:text-5xl">explore_off</span>
      </div>

      <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 text-slate-700 text-xs font-bold mb-2 border border-slate-200">
        <span className="material-symbols-outlined text-sm text-slate-500">info</span>
        <span>HTTP 404 • Resource Not Found</span>
      </div>

      <h1 className="text-xl sm:text-2xl font-extrabold text-[#002046] tracking-tight">
        Page Not Found
      </h1>

      <p className="text-xs sm:text-sm text-slate-500 max-w-md mt-2 leading-relaxed">
        The requested pathway {path ? <code className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-800 font-mono text-xs">{path}</code> : ''} does not correspond to any registered statutory workflow or portal section in the Legal Metrology platform.
      </p>

      <div className="flex flex-wrap items-center justify-center gap-3 mt-6">
        <button
          type="button"
          onClick={onGoHome}
          className="px-5 py-2.5 bg-[#002046] hover:bg-[#1b365d] text-white font-bold rounded-xl text-xs transition-all shadow-sm flex items-center gap-2 cursor-pointer"
        >
          <span className="material-symbols-outlined text-base text-amber-400">dashboard</span>
          <span>{currentUser ? 'Return to Dashboard' : 'Return to Portal Home'}</span>
        </button>

        {!currentUser && onGoToLogin && (
          <button
            type="button"
            onClick={onGoToLogin}
            className="px-5 py-2.5 bg-white hover:bg-slate-50 text-slate-700 font-bold rounded-xl text-xs transition-all border border-slate-300 flex items-center gap-2 cursor-pointer shadow-2xs"
          >
            <span className="material-symbols-outlined text-base">login</span>
            <span>Sign In to Your Account</span>
          </button>
        )}
      </div>

      <p className="text-[11px] text-slate-400 mt-8">
        Department of Consumer Affairs • Legal Metrology Online Management System
      </p>
    </div>
  );
}
