/**
 * Light/dark theme of the game page. The player picks "auto" (follow the system), "light" or
 * "dark" in the menu; the choice is stored on the device and applied as `data-theme` on <html>,
 * which switches the colour tokens in game.css. An inline script in index.html applies it before
 * the first paint so the page never flashes in the wrong theme.
 */
import { readJSON, writeJSON } from '../core/storage.js';

export const THEME_CHOICES = ['auto', 'light', 'dark'];
const STORAGE_KEY = 'sorobanTheme';
const BROWSER_BAR = { light: '#f6f1e9', dark: '#14161d' };
const darkQuery = () => globalThis.matchMedia?.('(prefers-color-scheme: dark)');

/** Any stored value that is not a known choice means "auto". */
export const normalizeTheme = (choice) => (THEME_CHOICES.includes(choice) ? choice : 'auto');

/** @returns {'light'|'dark'} the theme to show for a choice */
export const resolveTheme = (choice, systemPrefersDark) =>
  choice === 'auto' ? (systemPrefersDark ? 'dark' : 'light') : choice;

export const getThemeChoice = () => normalizeTheme(readJSON(STORAGE_KEY));

function applyTheme() {
  const theme = resolveTheme(getThemeChoice(), darkQuery()?.matches ?? false);
  document.documentElement.dataset.theme = theme;
  document
    .querySelectorAll('meta[name="theme-color"]')
    .forEach((meta) => meta.setAttribute('content', BROWSER_BAR[theme]));
}

export function setThemeChoice(choice) {
  writeJSON(STORAGE_KEY, normalizeTheme(choice));
  applyTheme();
}

/** Applies the stored choice and follows system changes while it is "auto". */
export function initTheme() {
  applyTheme();
  darkQuery()?.addEventListener('change', applyTheme);
}
