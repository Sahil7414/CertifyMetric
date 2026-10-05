import React, { useState, useRef, useEffect } from 'react';

/**
 * Premium, smooth animated dropdown select component.
 * Features:
 * - Fluid cubic-bezier scale & fade transitions (zero abrupt pop-in)
 * - Rotating animated chevron indicator
 * - Glassmorphic floating menu with subtle backdrop-blur
 * - Pill badge counts and checkmark indicators for active selections
 * - Click-outside and Escape key support
 */
export default function SmoothSelect({
  value,
  onChange,
  options = [],
  placeholder = 'Select option...',
  prefix = '',
  className = '',
  menuWidth,
  align = 'left',
  disabled = false
}) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);
  const isFullWidth = className.includes('w-full');
  const computedMenuWidth = menuWidth || (isFullWidth ? 'w-full' : 'min-w-[200px] w-56');

  const selectedOption = options.find((opt) => String(opt.value) === String(value));

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') setIsOpen(false);
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const handleSelect = (val) => {
    onChange(val);
    setIsOpen(false);
  };

  const isActive = Boolean(value && value !== 'ALL' && value !== '' && value !== 'DEFAULT' && value !== 'NEWEST');

  return (
    <div className={`relative ${isFullWidth ? 'w-full block' : 'inline-block'} text-left`} ref={containerRef}>
      {/* Trigger Button */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen(!isOpen)}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        className={`group text-xs px-3.5 py-2.5 rounded-xl border font-semibold outline-none transition-all duration-200 flex items-center justify-between gap-2 select-none cursor-pointer shadow-2xs hover:shadow-sm ${
          isFullWidth ? 'w-full' : ''
        } ${
          isActive
            ? 'bg-blue-50/90 text-[#002046] border-blue-300 font-bold hover:bg-blue-100/70 hover:border-blue-400'
            : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-300/90 hover:border-slate-400'
        } ${isOpen ? 'ring-2 ring-blue-500/20 border-blue-500' : ''} ${className}`}
      >
        <div className="flex items-center gap-1.5 truncate">
          {prefix && <span className="text-slate-400 font-normal">{prefix}</span>}
          <span className="truncate">
            {selectedOption ? selectedOption.label : placeholder}
          </span>
          {selectedOption?.badge !== undefined && selectedOption?.badge !== null && (
            <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
              isActive ? 'bg-[#002046] text-white' : 'bg-slate-100 text-slate-600'
            }`}>
              {selectedOption.badge}
            </span>
          )}
        </div>

        {/* Animated Chevron */}
        <span
          className={`material-symbols-outlined text-[16px] text-slate-400 transition-transform duration-250 ease-out shrink-0 ${
            isOpen ? 'rotate-180 text-blue-600' : 'group-hover:text-slate-600'
          }`}
        >
          expand_more
        </span>
      </button>

      {/* Smooth Animated Floating Dropdown Menu */}
      <div
        role="listbox"
        className={`absolute mt-1.5 ${menuWidth} max-h-72 overflow-y-auto rounded-2xl bg-white/95 backdrop-blur-md shadow-2xl border border-slate-200/90 p-1.5 z-50 transition-all duration-200 ease-out transform ${
          align === 'right' ? 'right-0 origin-top-right' : 'left-0 origin-top-left'
        } ${
          isOpen
            ? 'opacity-100 scale-100 translate-y-0 pointer-events-auto visible'
            : 'opacity-0 scale-95 -translate-y-2 pointer-events-none invisible'
        }`}
        style={{ scrollbarWidth: 'thin' }}
      >
        <div className="space-y-0.5">
          {options.map((opt) => {
            const isSelected = String(opt.value) === String(value);
            return (
              <button
                key={opt.value}
                type="button"
                role="option"
                aria-selected={isSelected}
                onClick={() => handleSelect(opt.value)}
                className={`w-full text-left px-3 py-2 rounded-xl text-xs flex items-center justify-between gap-2 transition-all duration-150 cursor-pointer ${
                  isSelected
                    ? 'bg-[#002046] text-white font-bold shadow-xs'
                    : 'text-slate-700 hover:bg-slate-100/80 hover:text-slate-900 font-medium'
                }`}
              >
                <div className="flex items-center gap-2 truncate">
                  {opt.icon && (
                    <span className={`material-symbols-outlined text-base ${
                      isSelected ? 'text-amber-400' : 'text-slate-400'
                    }`}>
                      {opt.icon}
                    </span>
                  )}
                  <span className="truncate">{opt.label}</span>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  {opt.badge !== undefined && opt.badge !== null && (
                    <span
                      className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                        isSelected
                          ? 'bg-white/20 text-white'
                          : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {opt.badge}
                    </span>
                  )}
                  {isSelected && (
                    <span className="material-symbols-outlined text-sm text-amber-300 font-bold">
                      check
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
