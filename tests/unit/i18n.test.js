import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { beforeEach, describe, expect, it } from 'vitest';
import {
  SUPPORTED_LANGUAGES,
  applyTranslations,
  detectLanguage,
  formatNumber,
  normalizeLanguage,
  setLanguage,
  t,
  translate,
} from '../../src/i18n/index.js';
import en from '../../src/i18n/locales/en/index.js';
import es from '../../src/i18n/locales/es/index.js';

describe('language detection', () => {
  it.each([
    ['es-ES', 'es'],
    ['ES', 'es'],
    ['en_GB', 'en'],
    ['en-US', 'en'],
    ['fr-FR', null],
    ['', null],
    [undefined, null],
  ])('normalizes %j to %j', (input, expected) => {
    expect(normalizeLanguage(input)).toBe(expected);
  });

  it('defaults to the first supported browser language', () => {
    expect(detectLanguage({ browserLanguages: ['fr-FR', 'es-MX', 'en'] })).toBe('es');
    expect(detectLanguage({ browserLanguages: ['en-US'] })).toBe('en');
  });

  it('falls back to English when no browser language is supported', () => {
    expect(detectLanguage({ browserLanguages: ['de', 'ja'] })).toBe('en');
    expect(detectLanguage()).toBe('en');
  });

  it('prefers an explicit parameter, then the saved choice, over the browser', () => {
    expect(detectLanguage({ param: 'en', stored: 'es', browserLanguages: ['es'] })).toBe('en');
    expect(detectLanguage({ stored: 'en', browserLanguages: ['es'] })).toBe('en');
    expect(detectLanguage({ param: 'xx', stored: 'es', browserLanguages: ['en'] })).toBe('es');
  });
});

describe('translate', () => {
  it('interpolates variables and keeps unknown placeholders visible', () => {
    expect(translate('en', 'game.question.represent', { number: 42 })).toBe('Show the number: 42');
    expect(translate('es', 'game.question.represent', {})).toBe('Representa el número: {number}');
  });

  it('falls back to English, then to the key itself', () => {
    expect(translate('xx', 'game.mode.free')).toBe('Free');
    expect(translate('es', 'no.such.key')).toBe('no.such.key');
  });
});

describe('dictionaries', () => {
  it('have exactly the same keys in every language', () => {
    expect(Object.keys(es).sort()).toEqual(Object.keys(en).sort());
  });

  it('have no empty texts', () => {
    for (const [name, dictionary] of [
      ['en', en],
      ['es', es],
    ]) {
      for (const [key, text] of Object.entries(dictionary)) {
        expect(text.trim(), `${name}:${key}`).not.toBe('');
      }
    }
  });

  it('use the same placeholders in every language', () => {
    const placeholders = (text) => (text.match(/\{\w+\}/g) ?? []).sort();
    for (const key of Object.keys(en)) {
      expect(placeholders(es[key]), key).toEqual(placeholders(en[key]));
    }
  });

  it('define every key referenced by the source and the HTML pages', () => {
    const files = [];
    const walk = (dir) => {
      for (const name of readdirSync(dir)) {
        const path = join(dir, name);
        if (statSync(path).isDirectory()) {
          if (name !== 'locales') walk(path);
        } else if (/\.(js|html)$/.test(name)) files.push(path);
      }
    };
    walk('src');
    files.push('index.html', 'cards/index.html');

    const used = new Set();
    for (const file of files) {
      const source = readFileSync(file, 'utf8');
      for (const [, key] of source.matchAll(/data-i18n(?:-[a-z-]+)?="([\w.]+)"/g)) used.add(key);
      for (const [, key] of source.matchAll(/\bt\(\s*['"]([\w.]+)['"]/g)) used.add(key);
      for (const [, key] of source.matchAll(/\bt\(\s*`([\w.${}]+)`/g)) {
        // templated keys: check the static prefix has at least one match
        const prefix = key.split('${')[0];
        expect(
          Object.keys(en).some((k) => k.startsWith(prefix)),
          `${file}: ${key}`,
        ).toBe(true);
      }
    }
    const missing = [...used].filter((key) => !(key in en));
    expect(missing).toEqual([]);
  });

  it('covers every difficulty, operation and confetti key the code builds dynamically', () => {
    const keys = [
      ...['veryEasy', 'easy', 'medium', 'hard'].map((k) => `game.difficulty.${k}`),
      ...['add', 'subtract', 'multiply', 'divide'].map((k) => `game.operation.${k}`),
      ...[...Array(11).keys(), 'surprise'].map((k) => `game.confetti.${k}`),
      ...['empty', 'range', 'format', 'divideByZero', 'inexact', 'resultRange'].map(
        (k) => `game.custom.error.${k}`,
      ),
    ];
    for (const key of keys) expect(en, key).toHaveProperty([key]);
  });
});

describe('active language', () => {
  beforeEach(() => {
    localStorage.clear();
    document.body.innerHTML = '';
  });

  it('switches texts, <html lang> and number format', () => {
    setLanguage('es', { persist: false });
    expect(t('game.mode.free')).toBe('Libre');
    expect(document.documentElement.lang).toBe('es');
    expect(formatNumber(1234567)).toBe('1.234.567');

    setLanguage('en', { persist: false });
    expect(t('game.mode.free')).toBe('Free');
    expect(formatNumber(1234567)).toBe('1,234,567');
  });

  it('persists the choice only when asked to', () => {
    setLanguage('es', { persist: false });
    expect(localStorage.getItem('soroban:lang')).toBeNull();
    setLanguage('es');
    expect(localStorage.getItem('soroban:lang')).toBe('es');
  });

  it('ignores unsupported languages', () => {
    setLanguage('zz', { persist: false });
    expect(SUPPORTED_LANGUAGES).toContain(document.documentElement.lang);
  });

  it('translates text and attributes in the markup', () => {
    document.body.innerHTML = `
      <button data-i18n="game.mode.free"></button>
      <input data-i18n-placeholder="game.input.numberPlaceholder" />
      <a data-i18n-title="game.reset" data-i18n-aria-label="game.reset"></a>`;
    setLanguage('es', { persist: false });
    expect(document.querySelector('button').textContent).toBe('Libre');
    expect(document.querySelector('input').placeholder).toBe('Escribe el Nº');
    expect(document.querySelector('a').title).toBe('Reiniciar ábaco');
    expect(document.querySelector('a').getAttribute('aria-label')).toBe('Reiniciar ábaco');

    setLanguage('en', { persist: false });
    applyTranslations();
    expect(document.querySelector('button').textContent).toBe('Free');
  });
});
