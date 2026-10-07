/**
 * Geometry of the on-screen abacus. Pure functions of the canvas size, so they can be unit
 * tested without a canvas. All coordinates are CSS pixels.
 */
import { COLUMNS, LOWER_BEADS } from '../../core/abacus.js';

/** Distance factors, in bead radii. */
const BEAD_SPACING = 1.6;
const BEAD_MARGIN = 1.0;
const ACTIVE_OFFSET = 1.5;

/**
 * @param {number} width
 * @param {number} height
 */
export function getLayout(width, height, columnCount = COLUMNS) {
  const padding = width * 0.02;
  const frameThickness = width * 0.01;
  const innerWidth = width - 2 * padding;
  const innerHeight = height - 2 * padding;
  const colWidth = innerWidth / columnCount;
  const dividerY = padding + innerHeight * 0.3;
  const beadRadius = Math.min(colWidth * 0.32, innerHeight * 0.075);
  return {
    width,
    height,
    columnCount,
    padding,
    frameThickness,
    innerWidth,
    innerHeight,
    colWidth,
    dividerY,
    beadRadius,
    beadSpacing: beadRadius * BEAD_SPACING,
  };
}

/** x of the rod of a column. */
export function rodX(layout, col) {
  return layout.padding + layout.colWidth * (col + 0.5);
}

/**
 * Resting position of every bead for the given abacus state.
 * Lower beads are indexed from the one nearest the central beam (0) outwards (3).
 *
 * @returns {{ col: number, type: 'upper'|'lower', index: number, x: number, y: number, active: boolean }[]}
 */
export function beadTargets(columns, layout) {
  const { dividerY, beadRadius: r, frameThickness, height, beadSpacing } = layout;
  const beads = [];

  columns.forEach((column, col) => {
    const x = rodX(layout, col);

    const upperActive = column.upperActive === 1;
    beads.push({
      col,
      type: 'upper',
      index: 0,
      x,
      y: upperActive ? dividerY - ACTIVE_OFFSET * r : frameThickness + BEAD_MARGIN * r,
      active: upperActive,
    });

    const inactiveCount = LOWER_BEADS - column.lowerActive;
    const bottom = height - frameThickness - BEAD_MARGIN * r;
    for (let index = 0; index < LOWER_BEADS; index++) {
      const active = index < column.lowerActive;
      const y = active
        ? dividerY + ACTIVE_OFFSET * r + index * beadSpacing
        : bottom - (inactiveCount - 1 - (index - column.lowerActive)) * beadSpacing;
      beads.push({ col, type: 'lower', index, x, y, active });
    }
  });

  return beads;
}

/**
 * Which rod and half (above/below the beam) a point falls on, or null when outside the abacus.
 * @returns {{ col: number, zone: 'upper'|'lower' } | null}
 */
export function hitTest(layout, x, y) {
  const { padding, colWidth, columnCount, frameThickness, height, dividerY } = layout;
  const col = Math.floor((x - padding) / colWidth);
  if (col < 0 || col >= columnCount) return null;
  if (y < frameThickness || y > height - frameThickness) return null;
  return { col, zone: y < dividerY ? 'upper' : 'lower' };
}

/** Index (0-3) of the lower bead whose resting position is closest to `y` on a rod. */
export function nearestLowerBead(columns, layout, col, y) {
  let best = 0;
  let bestDistance = Infinity;
  for (const bead of beadTargets([columns[col]], layout)) {
    if (bead.type !== 'lower') continue;
    const distance = Math.abs(bead.y - y);
    if (distance < bestDistance) {
      best = bead.index;
      bestDistance = distance;
    }
  }
  return best;
}
