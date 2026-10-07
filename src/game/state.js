/**
 * Game state shape, defaults and persistence (including migration of the pre-3.0 format).
 *
 * The persisted object keeps the historical localStorage key and the `abacusColumns` field so a
 * returning player keeps their abacus; everything else is translated by `migrateState`.
 */
import { MAX_VALUE, columnsToNumber, createColumns, sanitizeColumns } from '../core/abacus.js';
import { readJSON, writeJSON } from '../core/storage.js';
import { DIFFICULTIES, OPERATIONS } from './problems.js';

export const STATE_KEY = 'sorobanAppState';
export const STATE_VERSION = 2;

export const MODES = ['free', 'represent', 'operate'];
export const REPRESENT_MODES = ['numberToAbacus', 'abacusToNumber'];
export const ABACUS_STYLES = ['classic', 'simple'];
export const CONFETTI_MODES = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'surprise'];

/** Spanish values written by versions before 3.0. */
const LEGACY_MODES = { libre: 'free', representar: 'represent', juego: 'operate' };
const LEGACY_DIFFICULTIES = {
  superfacil: 'veryEasy',
  facil: 'easy',
  medio: 'medium',
  dificil: 'hard',
};
const LEGACY_REPRESENT_MODES = {
  'number-to-abacus': 'numberToAbacus',
  'abacus-to-number': 'abacusToNumber',
};

/**
 * @typedef {object} GameState
 * @property {'free'|'represent'|'operate'} mode
 * @property {string} operation
 * @property {string} difficulty
 * @property {'numberToAbacus'|'abacusToNumber'} representMode
 * @property {import('./problems.js').Problem | null} problem current "Operate" question
 * @property {{ value: number, manual: boolean } | null} target current "Represent" number
 * @property {import('../core/abacus.js').Column[]} columns
 * @property {string} confettiMode
 * @property {'classic'|'simple'} abacusStyle
 * @property {{ solved: number, streak: number, best: number }} stats
 * @property {number} round increments with every new question or target
 * @property {number} scoredRound last round already counted in `stats`
 * @property {null | { kind: 'correct' } | { kind: 'wrong', [detail: string]: any }} feedback
 *   transient: never persisted
 */

/** @returns {GameState} */
export function createInitialState() {
  return {
    mode: 'free',
    operation: '+',
    difficulty: 'easy',
    representMode: 'numberToAbacus',
    problem: null,
    target: null,
    columns: createColumns(),
    confettiMode: '2',
    abacusStyle: 'classic',
    stats: { solved: 0, streak: 0, best: 0 },
    round: 0,
    scoredRound: -1,
    feedback: null,
  };
}

const oneOf = (value, allowed, fallback) => (allowed.includes(value) ? value : fallback);
const count = (value) => (Number.isInteger(value) && value >= 0 ? value : 0);

function readProblem(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const { a, b, op, answer } = raw;
  const numbers = [a, b, answer];
  if (!numbers.every((n) => Number.isSafeInteger(n) && n >= 0)) return null;
  if (!OPERATIONS.includes(op)) return null;
  return { a, b, op, answer, manual: Boolean(raw.manual) };
}

function readTarget(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const value = raw.value ?? raw.target; // `target` is the pre-3.0 field name
  if (!Number.isInteger(value) || value < 0 || value > MAX_VALUE) return null;
  return { value, manual: Boolean(raw.manual) };
}

/** Feedback that can be recomputed from persisted data: a solved question stays solved. */
export function deriveFeedback(state) {
  const shown = columnsToNumber(state.columns);
  if (state.mode === 'operate' && state.problem && shown === state.problem.answer) {
    return { kind: 'correct' };
  }
  if (
    state.mode === 'represent' &&
    state.representMode === 'numberToAbacus' &&
    state.target &&
    shown === state.target.value
  ) {
    return { kind: 'correct' };
  }
  return null;
}

/**
 * Turns whatever was stored (current format, pre-3.0 format, or garbage) into a valid state.
 * @returns {GameState}
 */
export function migrateState(raw) {
  const initial = createInitialState();
  if (!raw || typeof raw !== 'object') return initial;

  const stats = raw.stats && typeof raw.stats === 'object' ? raw.stats : {};
  const legacyTarget = raw.representData;
  const state = {
    ...initial,
    mode: oneOf(LEGACY_MODES[raw.mode] ?? raw.mode, MODES, initial.mode),
    operation: oneOf(raw.operation ?? raw.selectedOperation, OPERATIONS, initial.operation),
    difficulty: oneOf(
      LEGACY_DIFFICULTIES[raw.difficulty ?? raw.selectedDifficulty] ??
        raw.difficulty ??
        raw.selectedDifficulty,
      DIFFICULTIES,
      initial.difficulty,
    ),
    representMode: oneOf(
      LEGACY_REPRESENT_MODES[raw.representMode ?? raw.selectedRepresentMode] ??
        raw.representMode ??
        raw.selectedRepresentMode,
      REPRESENT_MODES,
      initial.representMode,
    ),
    problem: readProblem(raw.problem ?? raw.gameData),
    target: readTarget(raw.target ?? legacyTarget),
    columns: sanitizeColumns(raw.abacusColumns),
    confettiMode: oneOf(String(raw.confettiMode), CONFETTI_MODES, initial.confettiMode),
    abacusStyle: oneOf(raw.abacusStyle, ABACUS_STYLES, initial.abacusStyle),
    stats: { solved: count(stats.solved), streak: count(stats.streak), best: count(stats.best) },
    round: count(raw.round),
    scoredRound: Number.isInteger(raw.scoredRound) ? raw.scoredRound : -1,
  };
  state.stats.best = Math.max(state.stats.best, state.stats.streak);
  state.feedback = deriveFeedback(state);
  return state;
}

/** The part of the state worth persisting (no transient feedback). */
export function serializeState(state) {
  const { feedback: _feedback, columns, ...rest } = state;
  return { version: STATE_VERSION, ...rest, abacusColumns: columns };
}

export function loadState() {
  return migrateState(readJSON(STATE_KEY));
}

export function saveState(state) {
  return writeJSON(STATE_KEY, serializeState(state));
}
