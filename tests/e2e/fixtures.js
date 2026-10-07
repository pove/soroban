import { test as base, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';

const confettiSource = readFileSync(
  new URL('../../node_modules/canvas-confetti/dist/confetti.browser.js', import.meta.url),
  'utf8',
);

export const COLUMNS = 7;

/** Abacus column state for a number (same encoding the app persists). */
export function columnsFor(n) {
  const digits = String(n).padStart(COLUMNS, '0').split('').map(Number);
  return digits.map((d) => ({ upperActive: d >= 5 ? 1 : 0, lowerActive: d % 5 }));
}

export const test = base.extend({
  gamePath: ['/index.html', { option: true }],
  cardsPath: ['/game/index.html', { option: true }],
  stubCdnConfetti: [false, { option: true }],

  // The legacy page loads confetti from a CDN; serve the local copy so tests are offline-safe.
  context: async ({ context, stubCdnConfetti }, use) => {
    if (stubCdnConfetti) {
      await context.route('**/canvas-confetti@*/**', (route) =>
        route.fulfill({ contentType: 'text/javascript', body: confettiSource }),
      );
    }
    await use(context);
  },

  /** Opens the game with an optional persisted state and a deterministic Math.random. */
  openGame: async ({ page, gamePath }, use) => {
    await use(async ({ state, random } = {}) => {
      await page.addInitScript(
        ({ state, random }) => {
          if (state && !sessionStorage.getItem('__seeded')) {
            localStorage.setItem('sorobanAppState', JSON.stringify(state));
            sessionStorage.setItem('__seeded', '1');
          }
          if (random !== undefined) {
            const seq = Array.isArray(random) ? random : [random];
            let i = 0;
            Math.random = () => seq[i++ % seq.length];
          }
        },
        { state, random },
      );
      await page.goto(gamePath);
    });
  },
});

export { expect };

/** True when canvas-confetti has drawn its overlay canvas. */
export async function confettiShown(page) {
  return page.evaluate(() => document.querySelectorAll('canvas').length > 1);
}

export async function savedState(page) {
  return page.evaluate(() => JSON.parse(localStorage.getItem('sorobanAppState')));
}
