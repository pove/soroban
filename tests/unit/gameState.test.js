import { beforeEach, describe, expect, it } from 'vitest';
import { columnsToNumber, createColumns, numberToColumns } from '../../src/core/abacus.js';
import * as actions from '../../src/game/actions.js';
import {
  STATE_KEY,
  createInitialState,
  loadState,
  migrateState,
  saveState,
  serializeState,
} from '../../src/game/state.js';

const FIXED = () => 0.5;

describe('migrateState', () => {
  it('returns defaults for missing or garbage input', () => {
    for (const raw of [null, undefined, 'x', 42, [], {}]) {
      expect(migrateState(raw)).toEqual(createInitialState());
    }
  });

  it('translates the pre-3.0 Spanish format', () => {
    const state = migrateState({
      mode: 'juego',
      gameData: { a: 12, b: 30, op: '+', answer: 42, manual: false },
      selectedOperation: '×',
      selectedDifficulty: 'dificil',
      representData: { target: 345, mode: 'number-to-abacus' },
      selectedRepresentMode: 'abacus-to-number',
      confettiMode: '5',
      abacusStyle: 'simple',
      abacusColumns: numberToColumns(41),
      isManualMode: true,
    });

    expect(state).toMatchObject({
      mode: 'operate',
      operation: '×',
      difficulty: 'hard',
      representMode: 'abacusToNumber',
      problem: { a: 12, b: 30, op: '+', answer: 42, manual: false },
      target: { value: 345, manual: false },
      confettiMode: '5',
      abacusStyle: 'simple',
    });
    expect(columnsToNumber(state.columns)).toBe(41);
  });

  it('reads back what serializeState writes', () => {
    const before = actions.newProblem(
      { ...createInitialState(), mode: 'operate', stats: { solved: 3, streak: 2, best: 5 } },
      FIXED,
    );
    expect(migrateState(serializeState(before))).toEqual(before);
  });

  it('never persists transient feedback', () => {
    const state = { ...createInitialState(), feedback: { kind: 'correct' } };
    expect(serializeState(state)).not.toHaveProperty('feedback');
  });

  it('recovers a solved question from the abacus position', () => {
    const state = migrateState({
      mode: 'juego',
      gameData: { a: 12, b: 30, op: '+', answer: 42 },
      abacusColumns: numberToColumns(42),
    });
    expect(state.feedback).toEqual({ kind: 'correct' });
  });

  it('does not report a solved question when the abacus differs', () => {
    const state = migrateState({
      mode: 'juego',
      gameData: { a: 12, b: 30, op: '+', answer: 42 },
      abacusColumns: numberToColumns(41),
    });
    expect(state.feedback).toBeNull();
  });

  it('rejects invalid pieces individually instead of failing', () => {
    const state = migrateState({
      mode: 'hacker',
      selectedDifficulty: 'impossible',
      selectedOperation: '%',
      gameData: { a: 'x', b: 1, op: '+', answer: 2 },
      abacusColumns: [{ upperActive: 9, lowerActive: 99 }],
      confettiMode: 'lots',
      abacusStyle: 'neon',
      stats: { solved: -3, streak: 'many', best: 1.5 },
    });
    expect(state).toEqual(createInitialState());
  });

  it('keeps the best streak at least as large as the current one', () => {
    expect(migrateState({ stats: { solved: 9, streak: 6, best: 2 } }).stats.best).toBe(6);
  });
});

describe('persistence', () => {
  beforeEach(() => localStorage.clear());

  it('starts fresh when nothing is stored', () => {
    expect(loadState()).toEqual(createInitialState());
  });

  it('survives corrupted storage', () => {
    localStorage.setItem(STATE_KEY, '{not json');
    expect(loadState()).toEqual(createInitialState());
  });

  it('round-trips through localStorage using the historical key', () => {
    const state = { ...createInitialState(), mode: 'represent', abacusStyle: 'simple' };
    saveState(state);
    expect(JSON.parse(localStorage.getItem(STATE_KEY)).abacusColumns).toEqual(state.columns);
    expect(loadState()).toMatchObject({ mode: 'represent', abacusStyle: 'simple' });
  });
});

describe('game actions', () => {
  const operate = () => actions.setMode(createInitialState(), 'operate', FIXED);

  it('entering a mode prepares a clean round', () => {
    const state = operate();
    expect(state.mode).toBe('operate');
    expect(state.problem).toMatchObject({ a: 50, b: 50, op: '+', answer: 100 });
    expect(columnsToNumber(state.columns)).toBe(0);
    expect(state.round).toBe(1);

    const represent = actions.setMode(createInitialState(), 'represent', FIXED);
    expect(represent.target.value).toBe(500);
  });

  it('abacus-to-number mode shows the target on the abacus', () => {
    const state = actions.setRepresentMode(
      actions.setMode(createInitialState(), 'represent', FIXED),
      'abacusToNumber',
      FIXED,
    );
    expect(columnsToNumber(state.columns)).toBe(state.target.value);
  });

  it('changing difficulty or operation draws a new question', () => {
    const base = operate();
    expect(actions.setOperation(base, '×', FIXED).problem.op).toBe('×');
    expect(actions.setDifficulty(base, 'hard', FIXED).difficulty).toBe('hard');
    expect(actions.setDifficulty(base, 'hard', FIXED).round).toBe(base.round + 1);
  });

  it('moving beads clears the previous verdict', () => {
    const wrong = actions.validateOperation(operate());
    expect(wrong.feedback.kind).toBe('wrong');
    expect(actions.setColumns(wrong, numberToColumns(3)).feedback).toBeNull();
  });

  describe('validation and score', () => {
    const solved = () => actions.setColumns(operate(), numberToColumns(100));

    it('reports a wrong answer with the expected value and resets the streak', () => {
      const withStreak = { ...operate(), stats: { solved: 4, streak: 3, best: 3 } };
      const result = actions.validateOperation(withStreak);
      expect(result.feedback).toEqual({ kind: 'wrong', answer: 100 });
      expect(result.stats).toEqual({ solved: 4, streak: 0, best: 3 });
    });

    it('rewards a right answer', () => {
      const result = actions.validateOperation(solved());
      expect(result.feedback).toEqual({ kind: 'correct' });
      expect(result.stats).toEqual({ solved: 1, streak: 1, best: 1 });
    });

    it('counts a question only once however often it is validated', () => {
      const once = actions.validateOperation(solved());
      const twice = actions.validateOperation(once);
      expect(twice.stats).toEqual(once.stats);
    });

    it('builds a streak across questions and tracks the best one', () => {
      let state = actions.validateOperation(solved());
      state = actions.newProblem(state, FIXED);
      state = actions.validateOperation(actions.setColumns(state, numberToColumns(100)));
      expect(state.stats).toEqual({ solved: 2, streak: 2, best: 2 });

      state = actions.validateOperation(actions.newProblem(state, FIXED));
      expect(state.stats).toEqual({ solved: 2, streak: 0, best: 2 });
    });

    it('validates a represented number against the abacus', () => {
      const represent = actions.setMode(createInitialState(), 'represent', FIXED);
      expect(actions.validateRepresentation(represent).feedback).toEqual({
        kind: 'wrong',
        value: 0,
        target: 500,
      });
      const right = actions.validateRepresentation(
        actions.setColumns(represent, numberToColumns(500)),
      );
      expect(right.feedback.kind).toBe('correct');
    });

    it('validates a typed number', () => {
      const reading = actions.setRepresentMode(
        actions.setMode(createInitialState(), 'represent', FIXED),
        'abacusToNumber',
        FIXED,
      );
      const { value } = reading.target;
      expect(actions.validateWrittenNumber(reading, String(value)).feedback.kind).toBe('correct');
      expect(actions.validateWrittenNumber(reading, 'abc').feedback).toEqual({
        kind: 'wrong',
        value: 0,
        target: value,
        written: true,
      });
    });

    it('does nothing without a question', () => {
      const idle = createInitialState();
      expect(actions.validateOperation(idle)).toBe(idle);
      expect(actions.validateRepresentation(idle)).toBe(idle);
      expect(actions.validateWrittenNumber(idle, '5')).toBe(idle);
    });
  });

  it('custom questions are flagged and move to the right mode', () => {
    const problem = { a: 23, b: 45, op: '+', answer: 68, manual: true };
    const custom = actions.useCustomProblem(createInitialState(), problem);
    expect(custom).toMatchObject({ mode: 'operate', operation: '+', problem });
    expect(columnsToNumber(custom.columns)).toBe(0);

    const target = actions.useCustomTarget({ ...createInitialState(), mode: 'represent' }, 1234);
    expect(target.target).toEqual({ value: 1234, manual: true });
  });

  it('reset empties the abacus', () => {
    const state = actions.setColumns(createInitialState(), numberToColumns(55));
    expect(columnsToNumber(actions.resetAbacus(state).columns)).toBe(0);
    expect(actions.resetAbacus(state).columns).toEqual(createColumns());
  });
});
