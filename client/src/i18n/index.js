import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import en from './locales/en.json';
import hi from './locales/hi.json';
import mr from './locales/mr.json';
import ml from './locales/ml.json';
import ta from './locales/ta.json';
import te from './locales/te.json';
import bn from './locales/bn.json';
import kn from './locales/kn.json';
import gu from './locales/gu.json';
import pa from './locales/pa.json';
import as from './locales/as.json';
import or from './locales/or.json';

export const SUPPORTED_LANGUAGES = [
  { code: 'en', name: 'English', nativeName: 'English' },
  { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी' },
  { code: 'mr', name: 'Marathi', nativeName: 'मराठी' },
  { code: 'ml', name: 'Malayalam', nativeName: 'മലയാളം' },
  { code: 'ta', name: 'Tamil', nativeName: 'தமிழ்' },
  { code: 'te', name: 'Telugu', nativeName: 'తెలుగు' },
  { code: 'bn', name: 'Bengali', nativeName: 'বাংলা' },
  { code: 'kn', name: 'Kannada', nativeName: 'ಕನ್ನಡ' },
  { code: 'gu', name: 'Gujarati', nativeName: 'ગુજરાતી' },
  { code: 'pa', name: 'Punjabi', nativeName: 'ਪੰਜਾਬੀ' },
  { code: 'as', name: 'Assamese', nativeName: 'অসমীয়া' },
  { code: 'or', name: 'Odia', nativeName: 'ଓଡ଼ିଆ' }
];

export const getInitialLanguage = () => {
  try {
    const savedUser = localStorage.getItem('auth_user');
    if (savedUser) {
      const parsed = JSON.parse(savedUser);
      if (parsed?.language_preference) {
        return parsed.language_preference;
      }
    }
    const localPref = localStorage.getItem('certifymetric_language');
    if (localPref && SUPPORTED_LANGUAGES.some(l => l.code === localPref)) {
      return localPref;
    }
  } catch (e) {}
  return 'en';
};

const initialLng = getInitialLanguage();

i18n
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      hi: { translation: hi },
      mr: { translation: mr },
      ml: { translation: ml },
      ta: { translation: ta },
      te: { translation: te },
      bn: { translation: bn },
      kn: { translation: kn },
      gu: { translation: gu },
      pa: { translation: pa },
      as: { translation: as },
      or: { translation: or }
    },
    lng: initialLng,
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false // React already escapes values
    },
    missingKeyHandler: (ng, ns, key) => {
      if (import.meta.env.DEV) {
        console.warn(`[i18n missing key]: "${key}" for language "${ng}"`);
      }
    },
    react: {
      useSuspense: false
    }
  });

// Keep html tag lang attribute in sync
if (typeof document !== 'undefined') {
  document.documentElement.lang = initialLng;
}

export default i18n;
