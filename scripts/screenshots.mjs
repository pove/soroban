// Regenerates the README screenshots in docs/images.
//
//   npm run build && npx vite preview --port 4182 &
//   node scripts/screenshots.mjs
//
// Uses the installed Chrome (set CI=1 to use Playwright's bundled Chromium instead).
import { mkdir } from 'node:fs/promises';
import { chromium } from '@playwright/test';

const base = process.env.BASE_URL ?? 'http://localhost:4182';
const out = new URL('../docs/images/', import.meta.url).pathname.replace(/^\/([A-Z]:)/, '$1');
await mkdir(out, { recursive: true });

const browser = await chromium.launch({ channel: process.env.CI ? undefined : 'chrome' });

/** Abacus state for a number, as the app persists it. */
const columnsFor = (n) =>
  String(n)
    .padStart(7, '0')
    .split('')
    .map(Number)
    .map((d) => ({ upperActive: d >= 5 ? 1 : 0, lowerActive: d % 5 }));

async function shot(name, { viewport, path, state, actions, deviceScaleFactor = 1 }) {
  const context = await browser.newContext({ viewport, locale: 'en-US', deviceScaleFactor });
  const page = await context.newPage();
  if (state) {
    await page.addInitScript(
      (value) => localStorage.setItem('sorobanAppState', JSON.stringify(value)),
      state,
    );
  }
  await page.goto(`${base}${path}`);
  await page.waitForLoadState('networkidle');
  await actions?.(page);
  await page.waitForTimeout(400); // let bead animations finish
  await page.screenshot({ path: `${out}${name}.png` });
  await context.close();
  console.log('saved', name);
}

const operating = {
  mode: 'juego',
  gameData: { a: 47, b: 38, op: '+', answer: 85 },
  selectedOperation: '+',
  selectedDifficulty: 'facil',
  abacusColumns: columnsFor(47),
  confettiMode: '0',
};

await shot('game-desktop', {
  viewport: { width: 1280, height: 760 },
  path: '/index.html',
  state: operating,
});

await shot('game-mobile', {
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 2,
  path: '/index.html',
  state: operating,
});

await shot('game-simple-style', {
  viewport: { width: 1280, height: 760 },
  path: '/index.html',
  state: { ...operating, mode: 'libre', abacusStyle: 'simple', abacusColumns: columnsFor(1234567) },
});

await shot('cards-designer', {
  viewport: { width: 1280, height: 900 },
  path: '/cards/index.html',
  actions: async (page) => {
    page.on('dialog', (dialog) => dialog.accept());
    await page.locator('#btnLoadSample').click();
    await page.locator('#btnLoadSample').scrollIntoViewIfNeeded();
    await page.locator('#savedCards').scrollIntoViewIfNeeded();
    await page.evaluate(() => window.scrollTo(0, 0));
  },
});

await shot('cards-print', {
  viewport: { width: 1000, height: 900 },
  path: '/cards/index.html',
  actions: async (page) => {
    await page.locator('#btnLoadSample').click();
    await page.locator('#btnPrintAll').click();
    await page.locator('#printInfo').waitFor();
  },
});

await browser.close();
