import { test, expect, columnsFor, confettiShown, savedState } from './fixtures.js';

// Characterization tests: they describe what the game does today (Spanish UI, es-ES number format)
// and run against both the original code and the refactored app.

const baseState = {
  mode: 'libre',
  selectedOperation: '+',
  selectedDifficulty: 'facil',
  selectedRepresentMode: 'number-to-abacus',
  confettiMode: '2',
  abacusStyle: 'classic',
  isManualMode: false,
  gameData: null,
  representData: null,
  abacusColumns: columnsFor(0),
};

/** Drag one bead of the units rod upwards with the mouse. */
async function dragUnitsBeadUp(page) {
  const box = await page.locator('#abacusCanvas').boundingBox();
  const x = box.x + box.width * (0.02 + (0.96 * 6.5) / 7);
  const startY = box.y + box.height * 0.85;
  await page.mouse.move(x, startY);
  await page.mouse.down();
  await page.mouse.move(x, startY - box.height * 0.2, { steps: 10 });
  await page.mouse.move(x, startY - box.height * 0.4, { steps: 10 });
  await page.mouse.up();
}

test.describe('free mode', () => {
  test('starts empty, in free mode', async ({ page, openGame }) => {
    await openGame();
    await expect(page.locator('#numberDisplay')).toHaveText('0');
    await expect(page.locator('#btnLibre')).toHaveClass(/active/);
    await expect(page.locator('#representPanel')).not.toHaveClass(/active/);
    await expect(page.locator('#gamePanel')).not.toHaveClass(/active/);
  });

  test('dragging a bead changes the value and reset clears it', async ({ page, openGame }) => {
    await openGame();
    await dragUnitsBeadUp(page);
    await expect(page.locator('#numberDisplay')).not.toHaveText('0');
    const state = await savedState(page);
    expect(state.abacusColumns[6].lowerActive).toBeGreaterThan(0);

    await page.locator('#btnReset').click();
    await expect(page.locator('#numberDisplay')).toHaveText('0');
  });

  test('restores the abacus from the saved state with locale formatting', async ({ page, openGame }) => {
    await openGame({ state: { ...baseState, abacusColumns: columnsFor(1234567) } });
    await expect(page.locator('#numberDisplay')).toHaveText('1.234.567');
  });

  test('keeps style and confetti selection after reload', async ({ page, openGame }) => {
    await openGame();
    await page.locator('#abacusStyle').selectOption('simple');
    await page.locator('#confettiMode').selectOption('5');
    await page.reload();
    await expect(page.locator('#abacusStyle')).toHaveValue('simple');
    await expect(page.locator('#confettiMode')).toHaveValue('5');
    await expect(page.locator('.abacus-container')).toHaveClass(/simple-style/);
  });
});

test.describe('operate mode', () => {
  test('generates a deterministic addition and rejects a wrong answer', async ({ page, openGame }) => {
    await openGame({ random: 0.5 });
    await page.locator('#btnJuego').click();
    await expect(page.locator('#gamePanel')).toHaveClass(/active/);
    await expect(page.locator('#question')).toHaveText('50 + 50 = ?');

    await page.locator('#btnValidate').click();
    await expect(page.locator('#result')).toHaveText('Incorrecto. La respuesta correcta es 100');
    await expect(page.locator('#result')).toHaveClass(/incorrect/);
  });

  test('generates multiplication and exact division', async ({ page, openGame }) => {
    await openGame({ random: 0.5 });
    await page.locator('#btnJuego').click();
    await page.locator('.op-btn[data-op="×"]').click();
    await expect(page.locator('#question')).toHaveText('6 × 6 = ?');
    await page.locator('.op-btn[data-op="÷"]').click();
    await expect(page.locator('#question')).toHaveText('36 ÷ 6 = ?');
  });

  test('restoring a solved question shows the success state', async ({ page, openGame }) => {
    await openGame({
      state: {
        ...baseState,
        mode: 'juego',
        gameData: { a: 12, b: 30, op: '+', answer: 42, manual: false },
        abacusColumns: columnsFor(42),
      },
    });
    await expect(page.locator('#numberDisplay')).toHaveText('42');
    await expect(page.locator('#result')).toHaveText('¡Correcto! 🎉');
    await expect(page.locator('#btnNewQuestion')).toBeVisible();
    await expect(page.locator('#btnValidate')).toBeHidden();
  });

  test('every generated question is well formed', async ({ page, openGame }) => {
    await openGame();
    await page.locator('#btnJuego').click();
    const text = await page.locator('#question').textContent();
    expect(text).toMatch(/^[\d.]+ [+\-×÷] [\d.]+ = \?$/);
  });

  test('supports typing a custom operation (double click on the question)', async ({ page, openGame }) => {
    await openGame({ state: { ...baseState, mode: 'juego', gameData: { a: 1, b: 2, op: '+', answer: 3 } } });
    await page.locator('#question').dblclick();
    const input = page.locator('#manualInput');
    await expect(input).toBeVisible();
    await input.fill('23+45');
    await input.press('Enter');
    await expect(page.locator('#question')).toHaveText('23 + 45 = ?');
    await page.locator('#btnValidate').click();
    await expect(page.locator('#result')).toHaveText('Incorrecto. La respuesta correcta es 68');
  });
});

test.describe('represent mode', () => {
  test('number to abacus: hides the value and reports mistakes', async ({ page, openGame }) => {
    await openGame({
      state: {
        ...baseState,
        mode: 'representar',
        representData: { target: 345, mode: 'number-to-abacus' },
      },
    });
    await expect(page.locator('#representPanel')).toHaveClass(/active/);
    await expect(page.locator('#representQuestion')).toHaveText('Representa el número: 345');
    await expect(page.locator('#numberDisplay')).toHaveText('?');

    await page.locator('#btnValidateRepresent').click();
    await expect(page.locator('#representResult')).toHaveText(
      'Incorrecto. Has representado 0. El número correcto era 345',
    );
    await expect(page.locator('#numberDisplay')).toHaveText('0');
  });

  test('abacus to number: right answer with Enter celebrates', async ({ page, openGame }) => {
    await openGame({
      state: {
        ...baseState,
        mode: 'representar',
        selectedRepresentMode: 'abacus-to-number',
        representData: { target: 48210, mode: 'abacus-to-number' },
        abacusColumns: columnsFor(48210),
      },
    });
    await expect(page.locator('#representQuestion')).toHaveText('¿Qué número está representado?');
    const input = page.locator('#numberInput');
    await expect(input).toBeVisible();
    await input.fill('48210');
    await input.press('Enter');
    await expect(page.locator('#representResult')).toHaveText('¡Correcto! 🎉');
    await expect(page.locator('#btnNewRepresent')).toBeVisible();
    await expect.poll(() => confettiShown(page)).toBe(true);
  });

  test('abacus to number: wrong answer is reported', async ({ page, openGame }) => {
    await openGame({
      state: {
        ...baseState,
        mode: 'representar',
        selectedRepresentMode: 'abacus-to-number',
        representData: { target: 48210, mode: 'abacus-to-number' },
        abacusColumns: columnsFor(48210),
      },
    });
    const input = page.locator('#numberInput');
    await input.fill('17');
    await input.press('Enter');
    await expect(page.locator('#representResult')).toHaveText(
      'Incorrecto. Has escrito 17. El número correcto era 48.210',
    );
  });

  test('switching to represent mode generates a deterministic number', async ({ page, openGame }) => {
    await openGame({ random: 0.5 });
    await page.locator('#btnRepresentar').click();
    await expect(page.locator('#representQuestion')).toHaveText('Representa el número: 500');
  });
});
