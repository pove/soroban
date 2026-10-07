/**
 * Tiny i18n layer: flat dictionaries, `{name}` interpolation and `data-i18n*` attributes for
 * static markup. English is the fallback language; the default is the browser language.
 */
import { readString, writeString } from '../core/storage.js';
import en from './locales/en/index.js';
import es from './locales/es/index.js';

export const DICTIONARIES = { en, es };
const NUMBER_LOCALES = { en: 'en-US', es: 'es-ES' };

export const SUPPORTED_LANGUAGES = Object.keys(DICTIONARIES);
export const FALLBACK_LANGUAGE = 'en';
export const LANGUAGE_STORAGE_KEY = 'soroban:lang';

let current = FALLBACK_LANGUAGE;
const listeners = new Set();

/** Normalizes `es-ES`, `EN`, `es_MX`... to a supported code, or null. */
export function normalizeLanguage(code) {
  if (typeof code !== 'string') return null;
  const base = code.trim().toLowerCase().split(/[-_]/)[0];
  return SUPPORTED_LANGUAGES.includes(base) ? base : null;
}

/**
 * Chooses the language. Priority: explicit `?lang=` parameter, saved choice, browser languages
 * (first supported one), then the fallback.
 */
export function detectLanguage({ param = null, stored = null, browserLanguages = [] } = {}) {
  const explicit = normalizeLanguage(param) ?? normalizeLanguage(stored);
  if (explicit) return explicit;
  for (const code of browserLanguages) {
    const match = normalizeLanguage(code);
    if (match) return match;
  }
  return FALLBACK_LANGUAGE;
}

/** Looks a key up in a language, falling back to English and finally to the key itself. */
export function translate(language, key, vars = {}) {
  const template = DICTIONARIES[language]?.[key] ?? DICTIONARIES[FALLBACK_LANGUAGE][key] ?? key;
  return template.replace(/\{(\w+)\}/g, (match, name) =>
    name in vars ? String(vars[name]) : match,
  );
}

export const getLanguage = () => current;

export function t(key, vars) {
  return translate(current, key, vars);
}

/** Formats an integer with the grouping rules of the current language (1.234.567 / 1,234,567). */
export function formatNumber(value) {
  return value.toLocaleString(NUMBER_LOCALES[current]);
}

export function onLanguageChange(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Translates every `data-i18n`, `data-i18n-placeholder`, `data-i18n-title` and `data-i18n-aria-label`. */
export function applyTranslations(root = document) {
  const targets = [
    ['data-i18n', (el, text) => (el.textContent = text)],
    ['data-i18n-placeholder', (el, text) => el.setAttribute('placeholder', text)],
    ['data-i18n-title', (el, text) => el.setAttribute('title', text)],
    ['data-i18n-aria-label', (el, text) => el.setAttribute('aria-label', text)],
  ];
  for (const [attribute, apply] of targets) {
    root
      .querySelectorAll(`[${attribute}]`)
      .forEach((el) => apply(el, t(el.getAttribute(attribute))));
  }
}

export function setLanguage(language, { persist = true } = {}) {
  const next = normalizeLanguage(language) ?? FALLBACK_LANGUAGE;
  current = next;
  document.documentElement.lang = next;
  if (persist) writeString(LANGUAGE_STORAGE_KEY, next);
  applyTranslations();
  listeners.forEach((listener) => listener(next));
}

/** Picks the initial language from URL, storage and browser, and applies it without persisting. */
export function initLanguage() {
  const param = new URLSearchParams(globalThis.location?.search ?? '').get('lang');
  setLanguage(
    detectLanguage({
      param,
      stored: readString(LANGUAGE_STORAGE_KEY),
      browserLanguages: globalThis.navigator?.languages ?? [globalThis.navigator?.language],
    }),
    { persist: false },
  );
  return current;
}
