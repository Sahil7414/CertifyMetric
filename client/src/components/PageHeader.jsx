import React from 'react';

/**
 * Reusable PageHeader component for consistent section headers across all views.
 *
 * Props:
 *  - icon: Material Symbols icon name (optional)
 *  - title: Main heading text
 *  - subtitle: Secondary description text (optional)
 *  - badge: { text, variant } – variant: 'primary'|'success'|'warning'|'danger'|'neutral' (optional)
 *  - actions: React node(s) to render in the right side (optional)
 *  - className: extra className for the wrapper (optional)
 */
export default function PageHeader({
  icon,
  title,
  subtitle,
  badge,
  actions,
  className = ''
}) {
  const badgeVariants = {
    primary: 'bg-[#002046]/10 text-[#002046] border border-[#002046]/20',
    success: 'bg-emerald-50 text-emerald-800 border border-emerald-200',
    warning: 'bg-amber-50 text-amber-800 border border-amber-200',
    danger: 'bg-rose-50 text-rose-800 border border-rose-200',
    neutral: 'bg-slate-100 text-slate-700 border border-slate-200',
  };

  return (
    <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${className}`}>
      <div className="flex items-start gap-3 min-w-0">
        {icon && (
          <div className="w-10 h-10 rounded-xl bg-slate-100 border border-slate-200 text-[#002046] flex items-center justify-center shrink-0 mt-0.5">
            <span className="material-symbols-outlined text-xl">{icon}</span>
          </div>
        )}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-xl font-bold text-slate-900 leading-snug">{title}</h1>
            {badge && (
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold ${badgeVariants[badge.variant || 'neutral']}`}>
                {badge.text}
              </span>
            )}
          </div>
          {subtitle && (
            <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">{subtitle}</p>
          )}
        </div>
      </div>

      {actions && (
        <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
          {actions}
        </div>
      )}
    </div>
  );
}
