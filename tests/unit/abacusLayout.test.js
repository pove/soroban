import { describe, expect, it } from 'vitest';
import { createColumns, numberToColumns } from '../../src/core/abacus.js';
import {
  beadTargets,
  getLayout,
  hitTest,
  nearestLowerBead,
  rodX,
} from '../../src/game/abacus/layout.js';
import { THEMES, beadColors } from '../../src/game/abacus/themes.js';

const layout = getLayout(900, 540);

describe('abacus layout', () => {
  it('places seven evenly spaced rods inside the frame', () => {
    const xs = Array.from({ length: 7 }, (_, col) => rodX(layout, col));
    const gaps = xs.slice(1).map((x, i) => x - xs[i]);
    gaps.forEach((gap) => expect(gap).toBeCloseTo(layout.colWidth));
    expect(xs[0]).toBeGreaterThan(layout.padding);
    expect(xs.at(-1)).toBeLessThan(layout.width - layout.padding);
  });

  it('draws five beads per rod', () => {
    expect(beadTargets(createColumns(), layout)).toHaveLength(7 * 5);
  });

  it('keeps every bead on its side of the beam and inside the frame', () => {
    for (const value of [0, 9, 5, 4, 1234567, 9999999]) {
      for (const bead of beadTargets(numberToColumns(value), layout)) {
        expect(bead.y).toBeGreaterThan(layout.frameThickness);
        expect(bead.y).toBeLessThan(layout.height - layout.frameThickness);
        if (bead.type === 'upper') expect(bead.y).toBeLessThan(layout.dividerY);
        else expect(bead.y).toBeGreaterThan(layout.dividerY);
      }
    }
  });

  it('moves active beads next to the beam and inactive ones to the frame', () => {
    const empty = beadTargets(createColumns(), layout).filter((b) => b.col === 6);
    const full = beadTargets(numberToColumns(9), layout).filter((b) => b.col === 6);
    const upper = (beads) => beads.find((b) => b.type === 'upper');

    expect(upper(full).y).toBeGreaterThan(upper(empty).y); // pushed down toward the beam
    full.filter((b) => b.type === 'lower').forEach((b) => expect(b.active).toBe(true));
    const lowers = (beads) => beads.filter((b) => b.type === 'lower').map((b) => b.y);
    lowers(full).forEach((y, i, ys) => i && expect(y).toBeGreaterThan(ys[i - 1])); // stacked downwards
    expect(Math.min(...lowers(full))).toBeLessThan(Math.min(...lowers(empty)));
  });

  it('never overlaps beads on the same rod', () => {
    for (let digit = 0; digit <= 9; digit++) {
      const lower = beadTargets(numberToColumns(digit), layout)
        .filter((b) => b.col === 6 && b.type === 'lower')
        .map((b) => b.y)
        .sort((a, b) => a - b);
      lower.forEach(
        (y, i) => i && expect(y - lower[i - 1]).toBeGreaterThanOrEqual(layout.beadSpacing - 1e-9),
      );
    }
  });

  describe('hitTest', () => {
    it('maps points to a rod and a half', () => {
      expect(hitTest(layout, rodX(layout, 3), layout.dividerY - 20)).toEqual({
        col: 3,
        zone: 'upper',
      });
      expect(hitTest(layout, rodX(layout, 6), layout.dividerY + 20)).toEqual({
        col: 6,
        zone: 'lower',
      });
    });

    it('ignores points outside the abacus', () => {
      expect(hitTest(layout, -5, 100)).toBeNull();
      expect(hitTest(layout, layout.width + 5, 100)).toBeNull();
      expect(hitTest(layout, 100, 0)).toBeNull();
      expect(hitTest(layout, 100, layout.height)).toBeNull();
    });
  });

  it('finds the lower bead nearest to a tap', () => {
    const columns = createColumns();
    const beads = beadTargets(columns, layout).filter((b) => b.col === 6 && b.type === 'lower');
    beads.forEach((bead) =>
      expect(nearestLowerBead(columns, layout, 6, bead.y + 1)).toBe(bead.index),
    );
  });
});

describe('themes', () => {
  it('paints only the upper beads red in every theme', () => {
    for (const theme of Object.values(THEMES)) {
      for (let col = 0; col < 7; col++) {
        const upper = beadColors(theme, { col, type: 'upper', index: 0 }).fill;
        expect(upper).toMatch(/^#(c8283a|ff0000)$/);
        for (let index = 0; index < 4; index++) {
          expect(beadColors(theme, { col, type: 'lower', index }).fill).not.toBe(upper);
        }
      }
    }
  });
});
