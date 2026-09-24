import React, { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { SUPPORTED_LANGUAGES } from '../i18n';
import { api, getStoredAuth } from '../api';

export default function LanguageSwitcher({ currentUser, variant = 'light', className = '' }) {
  const { i18n } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);
  const [activeLangCode, setActiveLangCode] = useState(i18n.language || 'en');

  useEffect(() => {
    const handleLng = (lng) => {
      setActiveLangCode(lng);
    };
    i18n.on('languageChanged', handleLng);
    return () => {
      i18n.off('languageChanged', handleLng);
    };
  }, [i18n]);

  const currentLang =
    SUPPORTED_LANGUAGES.find(
      (l) => l.code === activeLangCode || l.code === (activeLangCode || '').split('-')[0]
    ) || SUPPORTED_LANGUAGES[0];

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
      setActiveLangCode(code);
      localStorage.setItem('certifymetric_language', code);
      if (typeof document !== 'undefined') {
        document.documentElement.lang = code;
      }
      window.dispatchEvent(new CustomEvent('certifymetric:language', { detail: code }));

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
        <span className={`material-symbols-outlined text-xs text-slate-400 shrink-0 transition-transform duration-200 ${
          isOpen ? 'rotate-180 text-amber-500' : ''
        }`}>
          expand_more
        </span>
      </button>

      {/* Smooth Floating Dropdown Menu */}
      <div
        role="listbox"
        className={`absolute right-0 mt-2 w-64 rounded-2xl bg-white/95 backdrop-blur-md shadow-2xl border border-slate-200/90 py-1.5 z-[100] max-h-80 overflow-y-auto transition-all duration-200 ease-out transform origin-top-right ${
          isOpen
            ? 'opacity-100 scale-100 translate-y-0 pointer-events-auto visible'
            : 'opacity-0 scale-95 -translate-y-2 pointer-events-none invisible'
        }`}
        style={{ scrollbarWidth: 'thin' }}
      >
        <div className="px-3.5 py-2 border-b border-slate-100 text-[10px] font-bold tracking-wider text-slate-400 uppercase flex items-center justify-between">
          <span>Select Interface Language</span>
          <span className="text-[9.5px] font-semibold text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded-md">12 Languages</span>
        </div>

        <div className="p-1 space-y-0.5">
          {SUPPORTED_LANGUAGES.map((lang) => {
            const isSelected = lang.code === currentLang.code;
            return (
              <button
                key={lang.code}
                type="button"
                role="option"
                aria-selected={isSelected}
                onClick={() => handleSelectLanguage(lang.code)}
                className={`w-full text-left px-3 py-2 rounded-xl text-xs flex items-center justify-between transition-all duration-150 cursor-pointer ${
                  isSelected
                    ? 'bg-[#002046] text-white font-bold shadow-xs'
                    : 'text-slate-700 hover:bg-slate-100/80 font-medium'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className={`font-semibold ${isSelected ? 'text-white' : 'text-slate-900'}`}>{lang.nativeName}</span>
                  {lang.name !== lang.nativeName && (
                    <span className={`text-[11px] font-normal ${isSelected ? 'text-slate-300' : 'text-slate-400'}`}>
                      ({lang.name})
                    </span>
                  )}
                </div>
                {isSelected && (
                  <span className="material-symbols-outlined text-sm text-amber-300 font-bold">
                    check
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
