/**
 * Pure soroban model. A soroban rod ("column") has one upper bead worth 5 and four lower
 * beads worth 1 each. A bead counts when it is pushed toward the central beam ("active").
 *
 * Columns are plain `{ upperActive: 0|1, lowerActive: 0..4 }` objects, ordered from the most
 * significant digit (left) to the units rod (right). All functions are pure and never mutate
 * their input.
 */

export const COLUMNS = 7;
export const LOWER_BEADS = 4;
export const MAX_VALUE = 10 ** COLUMNS - 1;

/** @typedef {{ upperActive: 0|1, lowerActive: number }} Column */

/** @returns {Column[]} an abacus showing zero */
export function createColumns(count = COLUMNS) {
  return Array.from({ length: count }, () => ({ upperActive: 0, lowerActive: 0 }));
}

/** Value of one rod (0-9). */
export function columnDigit(column) {
  return column.upperActive * 5 + column.lowerActive;
}

/** @param {Column[]} columns */
export function columnsToNumber(columns) {
  return columns.reduce((total, column) => total * 10 + columnDigit(column), 0);
}

/**
 * @param {number} value integer in [0, 10^count - 1]
 * @returns {Column[]}
 */
export function numberToColumns(value, count = COLUMNS) {
  if (!Number.isInteger(value) || value < 0 || value >= 10 ** count) {
    throw new RangeError(`Cannot show ${value} on a ${count}-rod abacus`);
  }
  return String(value)
    .padStart(count, '0')
    .split('')
    .map((char) => {
      const digit = Number(char);
      return digit >= 5
        ? { upperActive: 1, lowerActive: digit - 5 }
        : { upperActive: 0, lowerActive: digit };
    });
}

/** True when `columns` has the right number of rods and each rod holds a legal position. */
export function isValidColumns(columns, count = COLUMNS) {
  return (
    Array.isArray(columns) &&
    columns.length === count &&
    columns.every(
      (column) =>
        column !== null &&
        typeof column === 'object' &&
        (column.upperActive === 0 || column.upperActive === 1) &&
        Number.isInteger(column.lowerActive) &&
        column.lowerActive >= 0 &&
        column.lowerActive <= LOWER_BEADS,
    )
  );
}

/** Returns `columns` when valid (copied), otherwise an empty abacus. Used for untrusted input. */
export function sanitizeColumns(columns, count = COLUMNS) {
  return isValidColumns(columns, count) ? columns.map((c) => ({ ...c })) : createColumns(count);
}

function replaceColumn(columns, index, patch) {
  return columns.map((column, i) => (i === index ? { ...column, ...patch } : column));
}

/** Sets the upper bead of one rod. */
export function setUpper(columns, index, active) {
  return replaceColumn(columns, index, { upperActive: active ? 1 : 0 });
}

/** Sets how many lower beads of one rod touch the beam (clamped to 0-4). */
export function setLower(columns, index, count) {
  const lowerActive = Math.max(0, Math.min(LOWER_BEADS, Math.round(count)));
  return replaceColumn(columns, index, { lowerActive });
}

/**
 * Tap semantics: tapping the upper bead flips it; tapping a lower bead pushes it (and every bead
 * between it and the beam) toward the beam, or pulls it (and the ones beyond) away from it.
 *
 * @param {Column[]} columns
 * @param {number} index rod index
 * @param {{ type: 'upper' } | { type: 'lower', index: number }} bead
 *   `index` counts lower beads starting at the one nearest the beam (0-3).
 */
export function tapBead(columns, index, bead) {
  const column = columns[index];
  if (bead.type === 'upper') {
    return setUpper(columns, index, !column.upperActive);
  }
  const target = bead.index < column.lowerActive ? bead.index : bead.index + 1;
  return setLower(columns, index, target);
}
