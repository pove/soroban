import { test, expect } from './fixtures.js';

// Card generator behavior (English UI). First written against the pre-refactor code.
test.use({ locale: 'en-US' });

test.beforeEach(({ page }) => {
  page.on('dialog', (dialog) => dialog.accept());
});

async function autoGenerate(page, perLevel) {
  await page
    .getByRole('button', { name: /Auto-generate/i })
    .first()
    .click();
  await page.locator('#autoGenCount').fill(String(perLevel));
  await page.getByRole('button', { name: /^Generate Cards$/i }).click();
}

test('starts with no cards', async ({ page, cardsPath }) => {
  await page.goto(cardsPath);
  await expect(page.locator('#cardCount')).toHaveText('0');
});

test('auto-generates cards for every type and difficulty', async ({ page, cardsPath }) => {
  await page.goto(cardsPath);
  await autoGenerate(page, 2);
  // 4 card types x 4 difficulties x 2 cards
  await expect(page.locator('#cardCount')).toHaveText('32');
  await expect(page.locator('.card-item')).toHaveCount(32);
});

test('loads the bundled sample project', async ({ page, cardsPath }) => {
  await page.goto(cardsPath);
  await page.getByRole('button', { name: /Load Sample/i }).click();
  await expect(page.locator('#cardCount')).not.toHaveText('0');
});

test('paginates the A4 print layout: fronts then rears', async ({ page, cardsPath }) => {
  await page.goto(cardsPath);
  await autoGenerate(page, 2);
  await page.getByRole('button', { name: /Print All/i }).click();
  // 90x65mm cards on A4 with 10mm margins and 5mm gaps => 2 x 4 = 8 per page
  await expect(page.locator('#printInfo')).toContainText('2 x 4 = 8 cards per page');
  await expect(page.locator('#printInfo')).toContainText('Printing 32 cards (8 pages total)');
  await expect(page.locator('.print-page')).toHaveCount(8);

  // Duplex mode alternates front/rear pages; the page count stays the same.
  await page.locator('#autoDuplexMode').check();
  await expect(page.locator('.print-page')).toHaveCount(8);
});

test('rear pages are mirrored for double-sided printing', async ({ page, cardsPath }) => {
  await page.goto(cardsPath);
  await autoGenerate(page, 2);
  await page.getByRole('button', { name: /Print All/i }).click();
  const grids = page.locator('.print-grid');
  await expect(grids.first()).not.toHaveCSS('direction', 'rtl');
  await expect(grids.nth(4)).toHaveCSS('direction', 'rtl');
});

test('selects and deletes cards', async ({ page, cardsPath }) => {
  await page.goto(cardsPath);
  await autoGenerate(page, 1);
  await expect(page.locator('#cardCount')).toHaveText('16');
  await page.locator('.card-item').first().click();
  await expect(page.locator('#selectedCount')).toHaveText('1');
  await page.getByRole('button', { name: /Delete Selected/i }).click();
  await expect(page.locator('#cardCount')).toHaveText('15');
});

test('designs and saves a custom card', async ({ page, cardsPath }) => {
  await page.goto(cardsPath);
  await page.locator('#cardType').fill('My cards');
  await page.getByRole('button', { name: /Save New Card/i }).click();
  await expect(page.locator('#cardCount')).toHaveText('1');
});

test('saves the project as a JSON download', async ({ page, cardsPath }) => {
  await page.goto(cardsPath);
  await autoGenerate(page, 1);
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: /Save Project/i }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toMatch(/^board-game-cards-\d{4}-\d{2}-\d{2}\.json$/);
});

test('interface styles do not leak into the abacus drawn on the cards', async ({
  page,
  cardsPath,
}) => {
  await page.goto(cardsPath);
  await page.getByRole('button', { name: /Load Sample/i }).click();
  const svg = page.locator('#savedCards .card svg').first();
  // The bead bodies have a fill and no outline of their own; the rods have square ends.
  await expect(svg.locator('ellipse').nth(1)).toHaveCSS('stroke', 'none');
  await expect(svg.locator('line').first()).toHaveCSS('stroke-linecap', 'butt');
});
