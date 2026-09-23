import React, { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { SUPPORTED_LANGUAGES } from '../i18n';
import { api, getStoredAuth } from '../api';

export default function LanguageSwitcher({ currentUser, variant = 'light', className = '' }) {
  const { i18n } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  const currentLang = SUPPORTED_LANGUAGES.find(l => l.code === i18n.language) || SUPPORTED_LANGUAGES[0];

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') setIsOpen(false);
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const handleSelectLanguage = async (code) => {
    try {
      await i18n.changeLanguage(code);
      localStorage.setItem('certifymetric_language', code);
      if (typeof document !== 'undefined') {
        document.documentElement.lang = code;
      }

      // If user is logged in, sync with database
      const effectiveUser = currentUser || getStoredAuth().user;
      if (effectiveUser?.id) {
        api.updateLanguagePreference(code);
        const storedAuth = getStoredAuth();
        if (storedAuth.user) {
          storedAuth.user.language_preference = code;
          localStorage.setItem('auth_user', JSON.stringify(storedAuth.user));
        }
      }
    } catch (err) {
      console.error('Failed to change language:', err);
    }
    setIsOpen(false);
  };

  const isDark = variant === 'dark';

  return (
    <div className={`relative inline-block text-left ${className}`} ref={dropdownRef}>
      {/* Toggle Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-label={`Language selector. Current language is ${currentLang.name}`}
        title="Select Interface Language"
        className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer border ${
          isDark
            ? 'bg-[#001733]/80 hover:bg-[#002b5c] text-slate-200 border-slate-700/80 shadow-xs'
            : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200/90 shadow-2xs'
        }`}
      >
        <span className="material-symbols-outlined text-base text-amber-500 shrink-0">
          language
        </span>
        <span className="font-semibold tracking-tight">
          {currentLang.nativeName}
        </span>
        <span className="material-symbols-outlined text-xs text-slate-400 shrink-0 transition-transform duration-150">
          {isOpen ? 'expand_less' : 'expand_more'}
        </span>
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div
          role="listbox"
          className="absolute right-0 mt-1.5 w-56 rounded-xl bg-white shadow-xl border border-slate-200 py-1.5 z-50 animate-in fade-in-50 zoom-in-95 max-h-80 overflow-y-auto"
          style={{ scrollbarWidth: 'thin' }}
        >
          <div className="px-3 py-1.5 border-b border-slate-100 text-[10px] font-bold tracking-wider text-slate-400 uppercase flex items-center justify-between">
            <span>Select Language</span>
            <span className="text-[9px] font-normal text-slate-400">12 Indian Languages</span>
          </div>

          <div className="py-1">
            {SUPPORTED_LANGUAGES.map((lang) => {
              const isSelected = lang.code === currentLang.code;
              return (
                <button
                  key={lang.code}
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  onClick={() => handleSelectLanguage(lang.code)}
                  className={`w-full text-left px-3 py-2 text-xs flex items-center justify-between transition-colors ${
                    isSelected
                      ? 'bg-blue-50 text-[#002046] font-bold'
                      : 'text-slate-700 hover:bg-slate-50 font-normal'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-slate-900">{lang.nativeName}</span>
                    {lang.name !== lang.nativeName && (
                      <span className="text-[11px] text-slate-400 font-normal">
                        ({lang.name})
                      </span>
                    )}
                  </div>
                  {isSelected && (
                    <span className="material-symbols-outlined text-sm text-blue-600 font-bold">
                      check
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
