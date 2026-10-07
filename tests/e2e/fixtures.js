import { test as base, expect } from '@playwright/test';

export const COLUMNS = 7;

/** Ids of the elements the specs interact with. */
export const SELECTORS = {
  freeMode: '#btnFree',
  representMode: '#btnRepresent',
  operateMode: '#btnOperate',
  reset: '#btnReset',
  display: '#numberDisplay',
  canvas: '#abacusCanvas',
  representPanel: '#representPanel',
  operatePanel: '#operatePanel',
  representQuestion: '#representQuestion',
  question: '#question',
  validateRepresent: '#btnValidateRepresent',
  validate: '#btnValidate',
  newRepresent: '#btnNewRepresent',
  newQuestion: '#btnNewQuestion',
  representResult: '#representResult',
  result: '#result',
  numberInput: '#numberInput',
  manualInput: '#manualInput',
  confettiSelect: '#confettiMode',
  styleSelect: '#abacusStyle',
};

/** Abacus column state for a number (same encoding the app persists). */
export function columnsFor(n) {
  const digits = String(n).padStart(COLUMNS, '0').split('').map(Number);
  return digits.map((d) => ({ upperActive: d >= 5 ? 1 : 0, lowerActive: d % 5 }));
}

export const test = base.extend({
  gamePath: ['/index.html', { option: true }],
  cardsPath: ['/cards/index.html', { option: true }],
  // eslint-disable-next-line no-empty-pattern
  ui: async ({}, use) => use(SELECTORS),

  /**
   * Opens the game with an optional persisted state (in the pre-3.0 format, which also
   * exercises the migration) and a deterministic Math.random.
   */
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
