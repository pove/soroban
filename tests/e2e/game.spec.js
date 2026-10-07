import { test, expect, columnsFor, confettiShown, savedState } from './fixtures.js';

// Behavior of the three game modes. These specs were first written against the pre-refactor code
// (see docs/architecture.md) and still describe the same observable behavior.

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
async function dragUnitsBeadUp(page, ui) {
  const box = await page.locator(ui.canvas).boundingBox();
  const x = box.x + box.width * (0.02 + (0.96 * 6.5) / 7);
  const startY = box.y + box.height * 0.85;
  await page.mouse.move(x, startY);
  await page.mouse.down();
  await page.mouse.move(x, startY - box.height * 0.2, { steps: 10 });
  await page.mouse.move(x, startY - box.height * 0.4, { steps: 10 });
  await page.mouse.up();
}

test.describe('free mode', () => {
  test('starts empty, in free mode', async ({ page, openGame, ui }) => {
    await openGame();
    await expect(page.locator(ui.display)).toHaveText('0');
    await expect(page.locator(ui.freeMode)).toHaveClass(/active/);
    await expect(page.locator(ui.representPanel)).toBeHidden();
    await expect(page.locator(ui.operatePanel)).toBeHidden();
  });

  test('dragging a bead changes the value and reset clears it', async ({ page, openGame, ui }) => {
    await openGame();
    await dragUnitsBeadUp(page, ui);
    await expect(page.locator(ui.display)).not.toHaveText('0');
    const state = await savedState(page);
    expect(state.abacusColumns[6].lowerActive).toBeGreaterThan(0);

    await page.locator(ui.reset).click();
    await expect(page.locator(ui.display)).toHaveText('0');
  });

  test('restores the abacus from the saved state with locale formatting', async ({
    page,
    openGame,
    ui,
  }) => {
    await openGame({ state: { ...baseState, abacusColumns: columnsFor(1234567) } });
    await expect(page.locator(ui.display)).toHaveText('1.234.567');
  });

  test('keeps style and confetti selection after reload', async ({ page, openGame, ui }) => {
    await openGame();
    await page.locator(ui.styleSelect).selectOption('simple');
    await page.locator(ui.confettiSelect).selectOption('5');
    await page.reload();
    await expect(page.locator(ui.styleSelect)).toHaveValue('simple');
    await expect(page.locator(ui.confettiSelect)).toHaveValue('5');
    await expect(page.locator('.abacus-container')).toHaveClass(/simple-style/);
  });
});

test.describe('operate mode', () => {
  test('generates a deterministic addition and rejects a wrong answer', async ({
    page,
    openGame,
    ui,
  }) => {
    await openGame({ random: 0.5 });
    await page.locator(ui.operateMode).click();
    await expect(page.locator(ui.operatePanel)).toBeVisible();
    await expect(page.locator(ui.question)).toHaveText('50 + 50 = ?');

    await page.locator(ui.validate).click();
    await expect(page.locator(ui.result)).toHaveText('Incorrecto. La respuesta correcta es 100');
    await expect(page.locator(ui.result)).toHaveClass(/incorrect/);
  });

  test('generates multiplication and exact division', async ({ page, openGame, ui }) => {
    await openGame({ random: 0.5 });
    await page.locator(ui.operateMode).click();
    await page.locator('.op-btn[data-op="×"]').click();
    await expect(page.locator(ui.question)).toHaveText('6 × 6 = ?');
    await page.locator('.op-btn[data-op="÷"]').click();
    await expect(page.locator(ui.question)).toHaveText('36 ÷ 6 = ?');
  });

  test('restoring a solved question shows the success state', async ({ page, openGame, ui }) => {
    await openGame({
      state: {
        ...baseState,
        mode: 'juego',
        gameData: { a: 12, b: 30, op: '+', answer: 42, manual: false },
        abacusColumns: columnsFor(42),
      },
    });
    await expect(page.locator(ui.display)).toHaveText('42');
    await expect(page.locator(ui.result)).toHaveText('¡Correcto! 🎉');
    await expect(page.locator(ui.newQuestion)).toBeVisible();
    await expect(page.locator(ui.validate)).toBeHidden();
  });

  test('every generated question is well formed', async ({ page, openGame, ui }) => {
    await openGame();
    await page.locator(ui.operateMode).click();
    const text = await page.locator(ui.question).textContent();
    expect(text).toMatch(/^[\d.]+ [+\-×÷] [\d.]+ = \?$/);
  });

  test('supports typing a custom operation (double click on the question)', async ({
    page,
    openGame,
    ui,
  }) => {
    await openGame({
      state: { ...baseState, mode: 'juego', gameData: { a: 1, b: 2, op: '+', answer: 3 } },
    });
    await page.locator(ui.question).dblclick();
    const input = page.locator(ui.manualInput);
    await expect(input).toBeVisible();
    await input.fill('23+45');
    await input.press('Enter');
    await expect(page.locator(ui.question)).toHaveText('23 + 45 = ?');
    await page.locator(ui.validate).click();
    await expect(page.locator(ui.result)).toHaveText('Incorrecto. La respuesta correcta es 68');
  });
});

test.describe('represent mode', () => {
  test('number to abacus: hides the value and reports mistakes', async ({ page, openGame, ui }) => {
    await openGame({
      state: {
        ...baseState,
        mode: 'representar',
        representData: { target: 345, mode: 'number-to-abacus' },
      },
    });
    await expect(page.locator(ui.representPanel)).toBeVisible();
    await expect(page.locator(ui.representQuestion)).toHaveText('Representa el número: 345');
    await expect(page.locator(ui.display)).toHaveText('?');

    await page.locator(ui.validateRepresent).click();
    await expect(page.locator(ui.representResult)).toHaveText(
      'Incorrecto. Has representado 0. El número correcto era 345',
    );
    await expect(page.locator(ui.display)).toHaveText('0');
  });

  test('abacus to number: right answer with Enter celebrates', async ({ page, openGame, ui }) => {
    await openGame({
      state: {
        ...baseState,
        mode: 'representar',
        selectedRepresentMode: 'abacus-to-number',
        representData: { target: 48210, mode: 'abacus-to-number' },
        abacusColumns: columnsFor(48210),
      },
    });
    await expect(page.locator(ui.representQuestion)).toHaveText('¿Qué número está representado?');
    const input = page.locator(ui.numberInput);
    await expect(input).toBeVisible();
    await input.fill('48210');
    await input.press('Enter');
    await expect(page.locator(ui.representResult)).toHaveText('¡Correcto! 🎉');
    await expect(page.locator(ui.newRepresent)).toBeVisible();
    await expect.poll(() => confettiShown(page)).toBe(true);
  });

  test('abacus to number: wrong answer is reported', async ({ page, openGame, ui }) => {
    await openGame({
      state: {
        ...baseState,
        mode: 'representar',
        selectedRepresentMode: 'abacus-to-number',
        representData: { target: 48210, mode: 'abacus-to-number' },
        abacusColumns: columnsFor(48210),
      },
    });
    const input = page.locator(ui.numberInput);
    await input.fill('17');
    await input.press('Enter');
    await expect(page.locator(ui.representResult)).toHaveText(
      'Incorrecto. Has escrito 17. El número correcto era 48.210',
    );
  });

  test('switching to represent mode generates a deterministic number', async ({
    page,
    openGame,
    ui,
  }) => {
    await openGame({ random: 0.5 });
    await page.locator(ui.representMode).click();
    await expect(page.locator(ui.representQuestion)).toHaveText('Representa el número: 500');
  });
});
