import { fileURLToPath } from 'node:url';
import { COLUMNS, columnsFor, expect, savedState, test } from './fixtures.js';

// Features that only exist in the refactored app (the legacy project skips this file).

const fixture = (name) => fileURLToPath(new URL(`../fixtures/${name}`, import.meta.url));

const baseState = {
  mode: 'libre',
  selectedOperation: '+',
  selectedDifficulty: 'facil',
  selectedRepresentMode: 'number-to-abacus',
  confettiMode: '0',
  abacusStyle: 'classic',
  gameData: null,
  representData: null,
  abacusColumns: columnsFor(0),
};

/** Clicks a button that opens the file picker and answers the picker with . */
async function chooseFile(page, buttonSelector, files) {
  const [chooser] = await Promise.all([
    page.waitForEvent('filechooser'),
    page.locator(buttonSelector).click(),
  ]);
  await chooser.setFiles(files);
}

/** Tap the units rod at a fraction of the canvas height (0 = top, 1 = bottom). */
async function tapUnits(page, ui, heightFraction) {
  const box = await page.locator(ui.canvas).boundingBox();
  const x = box.x + box.width * (0.02 + (0.96 * (COLUMNS - 0.5)) / COLUMNS);
  await page.mouse.click(x, box.y + box.height * heightFraction);
}

test.describe('language', () => {
  test.describe('Spanish browser', () => {
    test.use({ locale: 'es-ES' });
    test('defaults to Spanish', async ({ page, openGame }) => {
      await openGame();
      await expect(page.locator('html')).toHaveAttribute('lang', 'es');
      await expect(page.locator('#btnFree')).toHaveText('Libre');
      await expect(page).toHaveTitle('Ábaco Japonés - Soroban');
    });
  });

  test.describe('English browser', () => {
    test.use({ locale: 'en-US' });
    test('defaults to English', async ({ page, openGame }) => {
      await openGame();
      await expect(page.locator('html')).toHaveAttribute('lang', 'en');
      await expect(page.locator('#btnFree')).toHaveText('Free');
      await expect(page).toHaveTitle('Japanese Abacus - Soroban');
    });
  });

  test.describe('unsupported browser language', () => {
    test.use({ locale: 'fr-FR' });
    test('falls back to English', async ({ page, openGame }) => {
      await openGame();
      await expect(page.locator('#btnFree')).toHaveText('Free');
    });
  });

  test('the selector switches every text, including generated ones, and is remembered', async ({
    page,
    openGame,
  }) => {
    await openGame({
      state: { ...baseState, mode: 'juego', gameData: { a: 2, b: 3, op: '+', answer: 5 } },
    });
    await page.locator('#languageSelect').selectOption('en');

    await expect(page.locator('#btnFree')).toHaveText('Free');
    await expect(page.locator('#btnValidate')).toHaveText('Check answer');
    await page.locator('#btnValidate').click();
    await expect(page.locator('#result')).toHaveText('Wrong. The right answer is 5');

    // dynamic text follows a language change without reloading
    await page.locator('#languageSelect').selectOption('es');
    await expect(page.locator('#result')).toHaveText('Incorrecto. La respuesta correcta es 5');

    await page.locator('#languageSelect').selectOption('en');
    await page.reload();
    await expect(page.locator('#languageSelect')).toHaveValue('en');
    await expect(page.locator('#btnFree')).toHaveText('Free');
  });

  test('?lang= overrides the browser language', async ({ page, gamePath }) => {
    await page.goto(`${gamePath}?lang=en`);
    await expect(page.locator('#btnFree')).toHaveText('Free');
  });

  test('numbers use the grouping of the selected language', async ({ page, openGame }) => {
    await openGame({ state: { ...baseState, abacusColumns: columnsFor(1234567) } });
    await expect(page.locator('#numberDisplay')).toHaveText('1.234.567');
    await page.locator('#languageSelect').selectOption('en');
    await expect(page.locator('#numberDisplay')).toHaveText('1,234,567');
  });

  test('the choice is shared with the card generator', async ({ page, openGame, cardsPath }) => {
    await openGame();
    await page.locator('#languageSelect').selectOption('en');
    await page.goto(cardsPath);
    await expect(page.locator('#languageSelect')).toHaveValue('en');
    await expect(page.locator('#btnAutoGen')).toContainText('Auto-generate');

    await page.locator('#languageSelect').selectOption('es');
    await expect(page.locator('#btnAutoGen')).toContainText('Generar lote automático');
    await expect(page).toHaveTitle('Generador de tarjetas Soroban');
  });
});

test.describe('abacus interaction', () => {
  test('tapping beads changes the value', async ({ page, openGame, ui }) => {
    await openGame();
    await tapUnits(page, ui, 0.913); // bottom-most bead pushes all four lower beads up
    await expect(page.locator(ui.display)).toHaveText('4');
    await tapUnits(page, ui, 0.1); // upper bead
    await expect(page.locator(ui.display)).toHaveText('9');
    await tapUnits(page, ui, 0.1); // and back
    await expect(page.locator(ui.display)).toHaveText('4');
  });

  test('tapping an active bead pulls it back', async ({ page, openGame, ui }) => {
    await openGame({ state: { ...baseState, abacusColumns: columnsFor(4) } });
    const box = await page.locator(ui.canvas).boundingBox();
    const x = box.x + box.width * (0.02 + (0.96 * 6.5) / 7);
    await page.mouse.click(x, box.y + box.height * 0.53); // second bead from the beam (index 1)
    await expect(page.locator(ui.display)).toHaveText('1');
  });

  test('the abacus is locked while reading a number', async ({ page, openGame, ui }) => {
    await openGame({
      state: {
        ...baseState,
        mode: 'representar',
        selectedRepresentMode: 'abacus-to-number',
        representData: { target: 7, mode: 'abacus-to-number' },
        abacusColumns: columnsFor(7),
      },
    });
    await tapUnits(page, ui, 0.913);
    await tapUnits(page, ui, 0.1);
    const state = await savedState(page);
    expect(state.abacusColumns).toEqual(columnsFor(7));
  });

  test('changing the abacus clears a wrong-answer message', async ({ page, openGame, ui }) => {
    await openGame({
      state: { ...baseState, mode: 'juego', gameData: { a: 1, b: 1, op: '+', answer: 2 } },
    });
    await page.locator(ui.validate).click();
    await expect(page.locator(ui.result)).toBeVisible();
    await tapUnits(page, ui, 0.913);
    await expect(page.locator(ui.result)).toBeHidden();
  });
});

test.describe('score', () => {
  test('counts solved questions and streaks, and keeps them after a reload', async ({
    page,
    openGame,
    ui,
  }) => {
    await openGame({
      state: {
        ...baseState,
        mode: 'juego',
        gameData: { a: 1, b: 2, op: '+', answer: 3 },
        abacusColumns: columnsFor(2),
      },
    });
    await expect(page.locator('#stats')).toBeVisible();

    await page.locator(ui.validate).click(); // 2 is wrong
    await expect(page.locator('#statSolved')).toHaveText('0');

    await tapUnits(page, ui, 0.801); // third bead from the beam -> 3
    await page.locator(ui.validate).click();
    await expect(page.locator(ui.result)).toHaveText('¡Correcto! 🎉');
    await expect(page.locator('#statSolved')).toHaveText('1');
    await expect(page.locator('#statStreak')).toHaveText('1');

    await page.reload();
    await expect(page.locator('#statSolved')).toHaveText('1');
    await expect(page.locator('#statBest')).toHaveText('1');
  });

  test('is hidden in free mode', async ({ page, openGame }) => {
    await openGame();
    await expect(page.locator('#stats')).toBeHidden();
  });
});

test.describe('custom questions', () => {
  test('accepts keyboard-friendly operators', async ({ page, openGame, ui }) => {
    await openGame({
      state: { ...baseState, mode: 'juego', gameData: { a: 1, b: 2, op: '+', answer: 3 } },
    });
    await page.locator('#btnCustomOperation').click();
    await page.locator(ui.manualInput).fill('12x4');
    await page.locator(ui.manualInput).press('Enter');
    await expect(page.locator(ui.question)).toHaveText('12 × 4 = ?');
  });

  test('explains mistakes without a blocking popup and keeps the editor open', async ({
    page,
    openGame,
    ui,
  }) => {
    let dialogs = 0;
    page.on('dialog', (dialog) => {
      dialogs++;
      dialog.dismiss();
    });
    await openGame({
      state: { ...baseState, mode: 'juego', gameData: { a: 1, b: 2, op: '+', answer: 3 } },
    });
    await page.locator('#btnCustomOperation').click();
    const input = page.locator(ui.manualInput);

    await input.fill('7÷0');
    await input.press('Enter');
    await expect(page.locator('.form-error')).toHaveText('No se puede dividir por cero');
    await expect(input).toBeVisible();

    await input.fill('7÷2');
    await input.press('Enter');
    await expect(page.locator('.form-error')).toContainText('no es exacta');

    await input.fill('abc');
    await input.press('Enter');
    await expect(page.locator('.form-error')).toContainText('Formato inválido');
    expect(dialogs).toBe(0);

    await input.press('Escape');
    await expect(input).toBeHidden();
  });

  test('typing a number to represent', async ({ page, openGame, ui }) => {
    await openGame({
      state: {
        ...baseState,
        mode: 'representar',
        representData: { target: 5, mode: 'number-to-abacus' },
      },
    });
    await page.locator('#btnCustomNumber').click();
    await page.locator(ui.manualInput).fill('123');
    await page.locator(ui.manualInput).press('Enter');
    await expect(page.locator(ui.representQuestion)).toHaveText('Representa el número: 123');
  });
});

test.describe('navigation and robustness', () => {
  test('links lead to the card generator and back', async ({ page, openGame }) => {
    await openGame();
    await page.locator('.nav-link--cta').click();
    await expect(page).toHaveURL(/cards\/?$/);
    await expect(page.locator('#btnAutoGen')).toBeVisible();
    await page.getByRole('link', { name: 'Juego' }).click();
    await expect(page.locator('#btnFree')).toBeVisible();
  });

  test('the promo box links to the card generator', async ({ page, openGame }) => {
    await openGame();
    await page.locator('#promoCards').click();
    await expect(page).toHaveURL(/cards\/?$/);
  });

  test('survives corrupted saved data', async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem('sorobanAppState', '{not json'));
    await page.goto('/index.html');
    await expect(page.locator('#numberDisplay')).toHaveText('0');
  });

  test('both pages load without console errors', async ({ page, gamePath, cardsPath }) => {
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    page.on('console', (message) => message.type() === 'error' && errors.push(message.text()));
    for (const path of [gamePath, cardsPath]) {
      await page.goto(path);
      await page.waitForLoadState('networkidle');
    }
    expect(errors).toEqual([]);
  });
});

test.describe('card generator', () => {
  test.use({ locale: 'en-US' });

  test.beforeEach(({ page }) => {
    page.on('dialog', (dialog) => dialog.accept());
  });

  test('labels generated cards in the active language', async ({ page, cardsPath }) => {
    await page.goto(cardsPath);
    await page.locator('#languageSelect').selectOption('es');
    await page.locator('#btnAutoGen').click();
    await page.locator('#autoGenCount').fill('1');
    await page.locator('#btnGenerate').click();
    await expect(page.locator('.card-type-label', { hasText: 'Añade-Quita fácil' })).toBeVisible();
    await expect(page.locator('.card-text', { hasText: 'Añade' }).first()).toBeVisible();

    await page.locator('#languageSelect').selectOption('en');
    await page.locator('#btnAutoGen').click();
    await page.locator('#btnGenerate').click();
    await expect(
      page.locator('.card-type-label', { hasText: 'Add-Remove easy' }).first(),
    ).toBeVisible();
  });

  test('opens a project saved by the previous version', async ({ page, cardsPath }) => {
    await page.goto(cardsPath);
    await chooseFile(page, '#btnLoadProject', fixture('legacy-project.json'));
    await expect(page.locator('#cardCount')).toHaveText('152');
    await expect(
      page.locator('.card-type-label', { hasText: 'Añade-Quita' }).first(),
    ).toBeVisible();
  });

  test('uses generation settings saved by the previous version', async ({ page, cardsPath }) => {
    await page.goto(cardsPath);
    await page.locator('#btnAutoGen').click();
    await chooseFile(page, '#btnLoadSettings', fixture('legacy-settings.json'));
    await expect(page.locator('#settingsStatus')).toContainText('Custom settings loaded');
    await page.locator('#autoGenCount').fill('2');
    await page.locator('#btnGenerate').click();
    // 4 types x 3 difficulty levels in that file x 2 cards
    await expect(page.locator('#cardCount')).toHaveText('24');
    await expect(
      page.locator('.card-type-label', { hasText: 'Sumar difícil' }).first(),
    ).toBeVisible();
  });

  test('rejects files that are not projects', async ({ page, cardsPath }) => {
    await page.goto(cardsPath);
    await chooseFile(page, '#btnLoadProject', {
      name: 'nope.json',
      mimeType: 'application/json',
      buffer: Buffer.from('{"hello": "world"}'),
    });
    await expect(page.locator('.toast--error')).toBeVisible();
    await expect(page.locator('#cardCount')).toHaveText('0');
  });

  test('edits an existing card', async ({ page, cardsPath }) => {
    await page.goto(cardsPath);
    await page.locator('#cardType').fill('Mine');
    await page.locator('#frontTopText').fill('Hello');
    await page.locator('#saveCardBtn').click();
    await page.locator('button[aria-label="Edit card"]').click();
    await expect(page.locator('#cardType')).toHaveValue('Mine');
    await expect(page.locator('#cancelBtn')).toBeVisible();
    await page.locator('#frontTopText').fill('Changed');
    await page.locator('#saveCardBtn').click();
    await expect(page.locator('#cardCount')).toHaveText('1');
    await expect(page.locator('#savedCards .card-text', { hasText: 'Changed' })).toBeVisible();
  });

  test('edits all cards of a type at once', async ({ page, cardsPath }) => {
    await page.goto(cardsPath);
    await page.locator('#btnLoadSample').click();
    await page.locator('#btnEditByType').click();
    await page.locator('#typeSelector').selectOption({ index: 0 });
    await page.locator('#edit-width').check();
    await page.locator('#type-width').fill('55');
    await page.locator('#btnApplyTypeEdit').click();
    await expect(page.locator('.toast', { hasText: /Updated \d+ cards/ })).toBeVisible();
    await expect(page.locator('.card-item .card[style*="width: 55mm"]').first()).toBeVisible();
  });

  test('selects cards by type and prints only those', async ({ page, cardsPath }) => {
    await page.goto(cardsPath);
    await page.locator('#btnLoadSample').click();
    await page.locator('#btnSelectByType').click();
    await page.locator('#selectTypeSelector').selectOption({ index: 0 });
    await page.locator('#btnSelectByType2').click();
    const selected = Number(await page.locator('#selectedCount').textContent());
    expect(selected).toBeGreaterThan(0);

    await page.locator('#btnPrintSelected').click();
    await expect(page.locator('#printInfo')).toContainText(`Printing ${selected} cards`);
  });

  test('cleans duplicates', async ({ page, cardsPath }) => {
    await page.goto(cardsPath);
    await page.locator('#btnLoadSample').click();
    const count = await page.locator('#cardCount').textContent();
    await page.locator('#btnCleanDuplicates').click();
    await expect(page.locator('.toast', { hasText: 'No duplicates found' })).toBeVisible();
    await expect(page.locator('#cardCount')).toHaveText(count);
  });

  test('shows an empty-state hint', async ({ page, cardsPath }) => {
    await page.goto(cardsPath);
    await expect(page.locator('#emptyNote')).toBeVisible();
    await page.locator('#btnLoadSample').click();
    await expect(page.locator('#emptyNote')).toBeHidden();
  });
});
