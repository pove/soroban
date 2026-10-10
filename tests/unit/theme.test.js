import { describe, expect, it } from 'vitest';
import { THEME_CHOICES, normalizeTheme, resolveTheme } from '../../src/shared/theme.js';

describe('theme', () => {
  it('keeps known choices and turns anything else into auto', () => {
    THEME_CHOICES.forEach((choice) => expect(normalizeTheme(choice)).toBe(choice));
    for (const value of [null, undefined, '', 'blue', 1, {}])
      expect(normalizeTheme(value)).toBe('auto');
  });

  it('follows the system only in auto', () => {
    expect(resolveTheme('auto', true)).toBe('dark');
    expect(resolveTheme('auto', false)).toBe('light');
    expect(resolveTheme('light', true)).toBe('light');
    expect(resolveTheme('dark', false)).toBe('dark');
  });
});
