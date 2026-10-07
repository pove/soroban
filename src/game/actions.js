/**
 * Game transitions as pure functions: `(state, ...args) => nextState`.
 * The controller applies them to the store and handles side effects (confetti, DOM focus...).
 */
import { columnsToNumber, createColumns, numberToColumns } from '../core/abacus.js';
import { generateProblem, generateTarget } from './problems.js';

/** Moves to a new round: a fresh question/target invalidates previous feedback. */
function nextRound(state) {
  return { ...state, round: state.round + 1, feedback: null };
}

/** Generates a new "Represent" target and lays the abacus out accordingly. */
export function newTarget(state, rng = Math.random) {
  const value = generateTarget(state.difficulty, rng);
  const columns = state.representMode === 'abacusToNumber' ? numberToColumns(value) : createColumns();
  return { ...nextRound(state), target: { value, manual: false }, columns };
}

/** Generates a new "Operate" question on a clean abacus. */
export function newProblem(state, rng = Math.random) {
  const problem = generateProblem(state.operation, state.difficulty, rng);
  return { ...nextRound(state), problem, columns: createColumns() };
}

export function setMode(state, mode, rng = Math.random) {
  const next = { ...state, mode };
  if (mode === 'represent') return newTarget(next, rng);
  if (mode === 'operate') return newProblem(next, rng);
  return { ...next, columns: createColumns(), feedback: null };
}

export function setOperation(state, operation, rng = Math.random) {
  return newProblem({ ...state, operation }, rng);
}

export function setDifficulty(state, difficulty, rng = Math.random) {
  const next = { ...state, difficulty };
  return state.mode === 'represent' ? newTarget(next, rng) : newProblem(next, rng);
}

export function setRepresentMode(state, representMode, rng = Math.random) {
  return newTarget({ ...state, representMode }, rng);
}

/** The player moved beads: any previous verdict no longer applies. */
export function setColumns(state, columns) {
  return { ...state, columns, feedback: null };
}

export function resetAbacus(state) {
  return setColumns(state, createColumns());
}

/** Starts a custom "Operate" question typed by the player. */
export function useCustomProblem(state, problem) {
  return { ...nextRound(state), mode: 'operate', problem, operation: problem.op, columns: createColumns() };
}

/** Starts a custom "Represent" number typed by the player. */
export function useCustomTarget(state, value) {
  const columns = state.representMode === 'abacusToNumber' ? numberToColumns(value) : createColumns();
  return { ...nextRound(state), target: { value, manual: true }, columns };
}

/** Records a verdict and updates the score, counting each round at most once. */
function conclude(state, feedback) {
  const correct = feedback.kind === 'correct';
  const { stats } = state;
  if (state.scoredRound === state.round) return { ...state, feedback };

  const streak = correct ? stats.streak + 1 : 0;
  return {
    ...state,
    feedback,
    scoredRound: correct ? state.round : state.scoredRound,
    stats: {
      solved: stats.solved + (correct ? 1 : 0),
      streak,
      best: Math.max(stats.best, streak),
    },
  };
}

/** Checks the abacus against the current "Operate" question. */
export function validateOperation(state) {
  if (!state.problem) return state;
  const value = columnsToNumber(state.columns);
  return value === state.problem.answer
    ? conclude(state, { kind: 'correct' })
    : conclude(state, { kind: 'wrong', answer: state.problem.answer });
}

/** Checks the abacus against the number the player was asked to show. */
export function validateRepresentation(state) {
  if (!state.target) return state;
  const value = columnsToNumber(state.columns);
  return value === state.target.value
    ? conclude(state, { kind: 'correct' })
    : conclude(state, { kind: 'wrong', value, target: state.target.value });
}

/** Checks the number the player typed after reading the abacus. */
export function validateWrittenNumber(state, typed) {
  if (!state.target) return state;
  const value = Number.parseInt(typed, 10) || 0;
  return value === state.target.value
    ? conclude(state, { kind: 'correct' })
    : conclude(state, { kind: 'wrong', value, target: state.target.value, written: true });
}
