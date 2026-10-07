/**
 * Problem generation and parsing for the game. Everything here is pure: randomness comes from an
 * injectable `rng`, so generators are deterministic in tests.
 */
import { MAX_VALUE } from '../core/abacus.js';
import { randInt } from '../core/random.js';

export const DIFFICULTIES = ['veryEasy', 'easy', 'medium', 'hard'];
export const OPERATIONS = ['+', '-', '×', '÷'];

/** @typedef {'+'|'-'|'×'|'÷'} Operation */
/** @typedef {{ a: number, b: number, op: Operation, answer: number, manual: boolean }} Problem */

// --- Soroban "rules" -------------------------------------------------------------------------
// Adding or subtracting on a soroban needs extra finger work when a digit crosses 5 ("rule 5")
// or crosses 10 ("rule 10", i.e. a carry/borrow). Easier levels avoid combining both.

export const needsCarry = (a, b) => (a % 10) + (b % 10) >= 10;
export const needsBorrow = (a, b) => a % 10 < b % 10;

export function needsFiveRuleSum(a, b) {
  return a % 10 >= 5 || b % 10 >= 5 || (a + b) % 10 >= 5;
}

export function needsFiveRuleDifference(a, b) {
  return a % 10 >= 5 || b % 10 >= 5 || (a - b) % 10 >= 5;
}

// --- Generators ------------------------------------------------------------------------------

const REPRESENT_MAX = { veryEasy: 99, easy: 999, medium: 99_999, hard: MAX_VALUE };

/** Operand range for addition/subtraction per difficulty. */
const ADD_SUB_RANGE = {
  veryEasy: [1, 99],
  easy: [1, 99],
  medium: [10, 999],
  hard: [100, 9999],
};

/** Whether a candidate pair is acceptable for the difficulty. */
const ADD_SUB_FILTER = {
  veryEasy: {
    '+': (a, b) => a + b < 100 && !needsCarry(a, b),
    '-': (a, b) => a >= b && !needsBorrow(a, b),
  },
  easy: {
    // easy allows a carry or the five rule, but not both at once
    '+': (a, b) => !(needsFiveRuleSum(a, b) && needsCarry(a, b)),
    '-': (a, b) => a >= b && !(needsFiveRuleDifference(a, b) && needsBorrow(a, b)),
  },
  medium: { '+': () => true, '-': (a, b) => a >= b },
  hard: { '+': () => true, '-': (a, b) => a >= b },
};

const MULTIPLY_RANGE = {
  veryEasy: [1, 10],
  easy: [1, 10],
  medium: [10, 59],
  hard: [20, 119],
};

/** Divisor and quotient ranges; the dividend is their product, so divisions are always exact. */
const DIVIDE_RANGE = {
  veryEasy: { divisor: [2, 10], quotient: [1, 10] },
  easy: { divisor: [2, 10], quotient: [1, 10] },
  medium: { divisor: [10, 29], quotient: [10, 59] },
  hard: { divisor: [20, 69], quotient: [20, 119] },
};

const MAX_ATTEMPTS = 1000;

function generateAddSub(op, difficulty, rng) {
  const [lo, hi] = ADD_SUB_RANGE[difficulty];
  const accepts = ADD_SUB_FILTER[difficulty][op];
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const a = randInt(lo, hi, rng);
    const b = randInt(lo, hi, rng);
    if (!accepts(a, b)) continue;
    const answer = op === '+' ? a + b : a - b;
    if (answer >= 0 && answer <= MAX_VALUE) return { a, b, answer };
  }
  // Practically unreachable; keep the game going with a trivial question.
  return op === '+' ? { a: 2, b: 3, answer: 5 } : { a: 5, b: 3, answer: 2 };
}

function generateMultiplication(difficulty, rng) {
  const [lo, hi] = MULTIPLY_RANGE[difficulty];
  const a = randInt(lo, hi, rng);
  const b = randInt(lo, hi, rng);
  return { a, b, answer: a * b };
}

function generateDivision(difficulty, rng) {
  const { divisor, quotient } = DIVIDE_RANGE[difficulty];
  const b = randInt(...divisor, rng);
  const answer = randInt(...quotient, rng);
  return { a: b * answer, b, answer };
}

/**
 * @param {Operation} op
 * @param {string} difficulty one of DIFFICULTIES
 * @returns {Problem}
 */
export function generateProblem(op, difficulty, rng = Math.random) {
  let generated;
  do {
    if (op === '×') generated = generateMultiplication(difficulty, rng);
    else if (op === '÷') generated = generateDivision(difficulty, rng);
    else generated = generateAddSub(op, difficulty, rng);
  } while (generated.answer > MAX_VALUE);
  return { ...generated, op, manual: false };
}

/** Number the player must show (or read) in the "Represent" mode. */
export function generateTarget(difficulty, rng = Math.random) {
  return randInt(1, REPRESENT_MAX[difficulty], rng);
}

// --- Parsing player input ---------------------------------------------------------------------

/** Aliases that make operators typeable on a regular keyboard. */
const OPERATOR_ALIASES = { '*': '×', x: '×', X: '×', '/': '÷', ':': '÷', '−': '-' };

/**
 * Parses a custom number typed by the player.
 * @returns {{ value: number } | { error: 'empty' | 'range' }}
 */
export function parseCustomNumber(text) {
  const trimmed = String(text ?? '').trim();
  if (!trimmed) return { error: 'empty' };
  if (!/^\d+$/.test(trimmed)) return { error: 'range' };
  const value = parseInt(trimmed, 10);
  return value > MAX_VALUE ? { error: 'range' } : { value };
}

/**
 * Parses a custom operation such as `23+45` or `12 x 4`.
 * @returns {{ problem: Problem } | { error: 'empty'|'format'|'divideByZero'|'inexact'|'resultRange' }}
 */
export function parseCustomOperation(text) {
  const trimmed = String(text ?? '').trim();
  if (!trimmed) return { error: 'empty' };

  const match = trimmed.match(/^(\d+)\s*([+\-×÷*xX/:−])\s*(\d+)$/);
  if (!match) return { error: 'format' };

  const a = parseInt(match[1], 10);
  const op = OPERATOR_ALIASES[match[2]] ?? match[2];
  const b = parseInt(match[3], 10);

  let answer;
  if (op === '+') answer = a + b;
  else if (op === '-') answer = a - b;
  else if (op === '×') answer = a * b;
  else {
    if (b === 0) return { error: 'divideByZero' };
    if (a % b !== 0) return { error: 'inexact' };
    answer = a / b;
  }

  if (answer < 0 || answer > MAX_VALUE) return { error: 'resultRange' };
  return { problem: { a, b, op, answer, manual: true } };
}
