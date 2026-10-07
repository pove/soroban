import { describe, expect, it, vi } from 'vitest';
import { seededRng } from '../../src/core/random.js';

// canvas-confetti draws on a canvas, which jsdom does not provide.
vi.mock('canvas-confetti', () => {
  const confetti = vi.fn();
  confetti.shapeFromText = vi.fn(({ text }) => ({ text }));
  return { default: confetti };
});

const { default: confetti } = await import('canvas-confetti');
const { SURPRISE_POOL, celebrate, planSurprise } = await import('../../src/game/confetti.js');

describe('planSurprise', () => {
  it('only plans effects from the pool, never repeating one inside a combo', () => {
    const rng = seededRng(11);
    for (let i = 0; i < 300; i++) {
      const plan = planSurprise(rng);
      expect(plan.length).toBeGreaterThanOrEqual(1);
      expect(plan.length).toBeLessThanOrEqual(3);
      plan.forEach(({ effect }) => expect(SURPRISE_POOL).toContain(effect));
      expect(new Set(plan.map((p) => p.effect)).size).toBe(plan.length);
    }
  });

  it('spaces combo effects 400 ms apart and boosts single effects', () => {
    const single = planSurprise(() => 0.2);
    expect(single).toHaveLength(1);
    expect(single[0].power).toBe(1.5);

    // 0.9 -> combo, 0.9 -> three effects, then three picks from the pool
    const values = [0.9, 0.9, 0, 0.2, 0.5];
    let next = 0;
    const combo = planSurprise(() => values[next++]);
    expect(combo.map((p) => p.effect)).toEqual([2, 3, 6]);
    expect(combo.map((p) => p.delay)).toEqual([0, 400, 800]);
    expect(combo.every((p) => p.power === 1)).toBe(true);
  });
});

describe('celebrate', () => {
  it('does nothing in the "sad" mode', () => {
    confetti.mockClear();
    celebrate('0');
    expect(confetti).not.toHaveBeenCalled();
  });

  it.each(['1', '2', '3', '5', '8', '9', '10'])(
    'mode %s fires at least one burst immediately',
    (mode) => {
      confetti.mockClear();
      celebrate(mode);
      expect(confetti).toHaveBeenCalled();
    },
  );

  it('the normal mode launches a single standard burst', () => {
    confetti.mockClear();
    celebrate('2');
    expect(confetti).toHaveBeenCalledTimes(1);
    expect(confetti.mock.calls[0][0]).toMatchObject({ particleCount: 100, spread: 70 });
  });

  it('ignores unknown modes', () => {
    confetti.mockClear();
    celebrate('banana');
    expect(confetti).not.toHaveBeenCalled();
  });
});
