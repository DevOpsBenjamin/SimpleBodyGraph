import { ref, computed } from 'vue';
import fr from './locales/fr';
import en from './locales/en';

export const locales = {
  fr,
  en
};

export const SUPPORTED_LANGUAGES = ['fr', 'en'];
export const DEFAULT_FALLBACK_LANGUAGE = 'fr';

/**
 * Detects the language from browser / navigator.
 * Returns 'en' if navigator language starts with 'en', else 'fr'.
 */
export function detectBrowserLanguage() {
  if (typeof navigator === 'undefined') {
    return DEFAULT_FALLBACK_LANGUAGE;
  }

  const rawLang = (
    navigator.language ||
    (Array.isArray(navigator.languages) && navigator.languages[0]) ||
    ''
  ).toLowerCase().trim();

  if (rawLang.startsWith('en')) {
    return 'en';
  }
  if (rawLang.startsWith('fr')) {
    return 'fr';
  }

  return DEFAULT_FALLBACK_LANGUAGE;
}

/**
 * Resolves effective language from user preference setting.
 * If preference is 'fr' or 'en', uses that.
 * Otherwise (null / 'auto' / unset), detects from browser or falls back to 'fr'.
 */
export function resolveEffectiveLanguage(preference) {
  if (preference === 'fr' || preference === 'en') {
    return preference;
  }
  return detectBrowserLanguage();
}

// Global reactive locale state (defaults to detected)
export const currentLanguage = ref(detectBrowserLanguage());

/**
 * Sets current active language
 */
export function setLanguage(lang) {
  if (SUPPORTED_LANGUAGES.includes(lang)) {
    currentLanguage.value = lang;
  } else {
    currentLanguage.value = resolveEffectiveLanguage(lang);
  }
}

/**
 * Interpolate a string with given params: {name: 'value'} -> {name} replaced
 */
function interpolate(str, params) {
  if (!params || typeof params !== 'object') return str;
  return str.replace(/\{(\w+)\}/g, (match, key) => {
    return params[key] !== undefined && params[key] !== null ? String(params[key]) : match;
  });
}

/**
 * Translates a key with dot notation (e.g. 'nav.monthly' or 'stats.stageLabel')
 */
export function t(key, params = {}) {
  if (!key) return '';

  const lang = currentLanguage.value || DEFAULT_FALLBACK_LANGUAGE;
  const dict = locales[lang] || locales[DEFAULT_FALLBACK_LANGUAGE];
  const fallbackDict = locales[DEFAULT_FALLBACK_LANGUAGE];

  const keys = key.split('.');
  let val = dict;
  for (const k of keys) {
    if (val && typeof val === 'object' && k in val) {
      val = val[k];
    } else {
      val = undefined;
      break;
    }
  }

  // Fallback to FR if missing in EN
  if (val === undefined && fallbackDict) {
    let fallbackVal = fallbackDict;
    for (const k of keys) {
      if (fallbackVal && typeof fallbackVal === 'object' && k in fallbackVal) {
        fallbackVal = fallbackVal[k];
      } else {
        fallbackVal = undefined;
        break;
      }
    }
    val = fallbackVal;
  }

  if (val === undefined) {
    return key;
  }

  if (typeof val === 'string') {
    return interpolate(val, params);
  }

  return val;
}

/**
 * Formats a date using the active locale
 */
export function formatDate(dateInput, options = {}) {
  if (!dateInput) return '';
  const date = typeof dateInput === 'string' || typeof dateInput === 'number'
    ? new Date(dateInput)
    : dateInput;
  
  if (isNaN(date.getTime())) return '';

  const locale = currentLanguage.value === 'en' ? 'en-US' : 'fr-FR';
  return date.toLocaleString(locale, options);
}

/**
 * Formats a month name in the active locale (e.g., "August 2026" / "Août 2026")
 */
export function formatMonthYear(dateString) {
  if (!dateString) return '';
  const date = new Date(dateString.length === 7 ? `${dateString}-01` : dateString);
  if (isNaN(date.getTime())) return dateString;

  const locale = currentLanguage.value === 'en' ? 'en-US' : 'fr-FR';
  const str = date.toLocaleString(locale, { month: 'long', year: 'numeric', timeZone: 'UTC' });
  return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * Formats a short month (e.g., "Aug" / "août")
 */
export function formatShortMonth(dateString) {
  if (!dateString) return '';
  const date = new Date(dateString.length === 7 ? `${dateString}-01` : dateString);
  if (isNaN(date.getTime())) return '';

  const locale = currentLanguage.value === 'en' ? 'en-US' : 'fr-FR';
  return date.toLocaleString(locale, { month: 'short', timeZone: 'UTC' });
}

/**
 * Formats a week range (e.g., "18 mai - 24 mai" / "May 18 - May 24")
 */
export function formatWeekRange(mondayStr, sundayStr) {
  if (!mondayStr || !sundayStr) return '';
  const monDate = new Date(mondayStr);
  const sunDate = new Date(sundayStr);
  if (isNaN(monDate.getTime()) || isNaN(sunDate.getTime())) return `${mondayStr} - ${sundayStr}`;

  const locale = currentLanguage.value === 'en' ? 'en-US' : 'fr-FR';
  const monFormatted = monDate.toLocaleString(locale, { month: 'short', day: 'numeric', timeZone: 'UTC' });
  const sunFormatted = sunDate.toLocaleString(locale, { month: 'short', day: 'numeric', timeZone: 'UTC' });
  return `${monFormatted} - ${sunFormatted}`;
}

/**
 * Formats a day number (e.g. 15)
 */
export function formatDay(dateString) {
  if (!dateString) return '';
  const date = new Date(dateString);
  if (isNaN(date.getTime())) {
    const parts = dateString.split('-');
    return parts[2] || '';
  }
  return date.getUTCDate();
}

/**
 * Vue plugin for $t global property
 */
export const i18nPlugin = {
  install(app) {
    app.config.globalProperties.$t = t;
    app.config.globalProperties.$d = formatDate;
    app.provide('i18n', {
      t,
      d: formatDate,
      currentLanguage,
      setLanguage
    });
  }
};

/**
 * Composable for use in components
 */
export function useI18n() {
  return {
    t,
    d: formatDate,
    formatMonthYear,
    formatShortMonth,
    formatWeekRange,
    formatDay,
    currentLanguage,
    setLanguage,
    detectBrowserLanguage,
    resolveEffectiveLanguage
  };
}

