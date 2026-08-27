import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { 
  t, 
  setLanguage, 
  currentLanguage, 
  detectBrowserLanguage, 
  resolveEffectiveLanguage, 
  formatDate, 
  formatShortMonth, 
  formatMonthYear, 
  formatDay 
} from '../src/i18n';
import fr from '../src/i18n/locales/fr';
import en from '../src/i18n/locales/en';

describe('i18n Module', () => {
  const originalNavigator = global.navigator;

  beforeEach(() => {
    setLanguage('fr');
  });

  afterEach(() => {
    // Restore navigator
    Object.defineProperty(global, 'navigator', {
      value: originalNavigator,
      configurable: true,
      writable: true
    });
  });

  describe('Browser Language Detection', () => {
    it('detects French when navigator.language starts with "fr"', () => {
      Object.defineProperty(global, 'navigator', {
        value: { language: 'fr-FR', languages: ['fr-FR', 'fr'] },
        configurable: true,
        writable: true
      });
      expect(detectBrowserLanguage()).toBe('fr');
    });

    it('detects English when navigator.language starts with "en"', () => {
      Object.defineProperty(global, 'navigator', {
        value: { language: 'en-US', languages: ['en-US', 'en'] },
        configurable: true,
        writable: true
      });
      expect(detectBrowserLanguage()).toBe('en');
    });

    it('falls back to "fr" for unsupported language (e.g. Spanish, German, Japanese)', () => {
      Object.defineProperty(global, 'navigator', {
        value: { language: 'es-ES', languages: ['es-ES', 'es'] },
        configurable: true,
        writable: true
      });
      expect(detectBrowserLanguage()).toBe('fr');
    });

    it('falls back to "fr" when navigator is undefined', () => {
      Object.defineProperty(global, 'navigator', {
        value: undefined,
        configurable: true,
        writable: true
      });
      expect(detectBrowserLanguage()).toBe('fr');
    });
  });

  describe('Language Resolution Hierarchy', () => {
    it('uses explicit user setting "fr" regardless of browser language', () => {
      Object.defineProperty(global, 'navigator', {
        value: { language: 'en-US' },
        configurable: true,
        writable: true
      });
      expect(resolveEffectiveLanguage('fr')).toBe('fr');
    });

    it('uses explicit user setting "en" regardless of browser language', () => {
      Object.defineProperty(global, 'navigator', {
        value: { language: 'fr-FR' },
        configurable: true,
        writable: true
      });
      expect(resolveEffectiveLanguage('en')).toBe('en');
    });

    it('resolves browser language when preference is null or "auto"', () => {
      Object.defineProperty(global, 'navigator', {
        value: { language: 'en-GB' },
        configurable: true,
        writable: true
      });
      expect(resolveEffectiveLanguage(null)).toBe('en');
      expect(resolveEffectiveLanguage('auto')).toBe('en');
    });

    it('defaults to "fr" when preference is null and browser language is unsupported', () => {
      Object.defineProperty(global, 'navigator', {
        value: { language: 'de-DE' },
        configurable: true,
        writable: true
      });
      expect(resolveEffectiveLanguage(null)).toBe('fr');
    });
  });

  describe('Translation Function t()', () => {
    it('translates simple keys in French', () => {
      setLanguage('fr');
      expect(t('stats.totalWeight')).toBe('Poids Total');
      expect(t('stats.leanMass')).toBe('Masse Maigre');
      expect(t('common.cancel')).toBe('Annuler');
    });

    it('translates simple keys in English', () => {
      setLanguage('en');
      expect(t('stats.totalWeight')).toBe('Total Weight');
      expect(t('stats.leanMass')).toBe('Lean Mass');
      expect(t('common.cancel')).toBe('Cancel');
    });

    it('interpolates named parameters correctly', () => {
      setLanguage('fr');
      expect(t('stats.toGain', { amount: '+1.50' })).toBe('+1.50 kg à prendre');
      expect(t('stats.stageLabel', { index: 2 })).toBe('Palier 2');

      setLanguage('en');
      expect(t('stats.toGain', { amount: '+1.50' })).toBe('+1.50 kg to gain');
      expect(t('stats.stageLabel', { index: 2 })).toBe('Stage 2');
      expect(t('onboarding.checkEmailDesc', { email: 'test@example.com' })).toContain('test@example.com');
    });

    it('falls back to French translation if key is missing in target locale', () => {
      setLanguage('en');
      expect(t('common.save')).toBe('Save');
    });

    it('returns the raw key if not found in any locale', () => {
      expect(t('nonexistent.deeply.nested.key')).toBe('nonexistent.deeply.nested.key');
    });
  });

  describe('Date & Period Formatting', () => {
    const testDate = new Date(2026, 6, 15); // July 15, 2026

    it('formats date in French', () => {
      setLanguage('fr');
      const formatted = formatDate(testDate);
      expect(formatted).toContain('15/07/2026');
    });

    it('formats date in English', () => {
      setLanguage('en');
      const formatted = formatDate(testDate);
      expect(formatted).toContain('7/15/2026');
    });

    it('formats month and year localized', () => {
      setLanguage('fr');
      const frMonth = formatMonthYear(testDate);
      expect(frMonth.toLowerCase()).toContain('juillet');

      setLanguage('en');
      const enMonth = formatMonthYear(testDate);
      expect(enMonth.toLowerCase()).toContain('july');
    });

    it('formats short month localized', () => {
      setLanguage('fr');
      const frShort = formatShortMonth(testDate);
      expect(frShort.toLowerCase()).toMatch(/juil/);

      setLanguage('en');
      const enShort = formatShortMonth(testDate);
      expect(enShort.toLowerCase()).toMatch(/jul/);
    });
  });

  describe('Dictionary Parity', () => {
    function getAllKeys(obj, prefix = '') {
      let keys = [];
      for (const [k, v] of Object.entries(obj)) {
        const fullKey = prefix ? `${prefix}.${k}` : k;
        if (v && typeof v === 'object' && !Array.isArray(v)) {
          keys = keys.concat(getAllKeys(v, fullKey));
        } else {
          keys.push(fullKey);
        }
      }
      return keys;
    }

    it('ensures French and English dictionaries have complete key coverage', () => {
      const frKeys = getAllKeys(fr);
      const enKeys = getAllKeys(en);

      const missingInEn = frKeys.filter(k => !enKeys.includes(k));
      const missingInFr = enKeys.filter(k => !frKeys.includes(k));

      expect(missingInEn, `Keys present in FR but missing in EN: ${missingInEn.join(', ')}`).toEqual([]);
      expect(missingInFr, `Keys present in EN but missing in FR: ${missingInFr.join(', ')}`).toEqual([]);
    });
  });
});
