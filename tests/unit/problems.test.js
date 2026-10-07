import { describe, expect, it } from 'vitest';
import { MAX_VALUE } from '../../src/core/abacus.js';
import { seededRng } from '../../src/core/random.js';
import {
  DIFFICULTIES,
  OPERATIONS,
  generateProblem,
  generateTarget,
  needsBorrow,
  needsCarry,
  needsFiveRuleDifference,
  needsFiveRuleSum,
  parseCustomNumber,
  parseCustomOperation,
} from '../../src/game/problems.js';

const SAMPLES = 400;

describe('soroban rules', () => {
  it('detects carries and borrows on the units digit', () => {
    expect(needsCarry(7, 5)).toBe(true);
    expect(needsCarry(14, 5)).toBe(false);
    expect(needsBorrow(31, 8)).toBe(true);
    expect(needsBorrow(38, 8)).toBe(false);
  });

  it('detects the five rule', () => {
    expect(needsFiveRuleSum(3, 2)).toBe(true); // sum digit is 5
    expect(needsFiveRuleSum(1, 2)).toBe(false);
    expect(needsFiveRuleDifference(9, 3)).toBe(true); // 9 has the upper bead
    expect(needsFiveRuleDifference(4, 2)).toBe(false);
  });
});

describe('generateProblem', () => {
  const rng = seededRng(7);

  describe.each(DIFFICULTIES)('%s', (difficulty) => {
    it.each(OPERATIONS)('produces a correct, in-range answer for %s', (op) => {
      for (let i = 0; i < SAMPLES; i++) {
        const { a, b, answer } = generateProblem(op, difficulty, rng);
        const expected = { '+': a + b, '-': a - b, '×': a * b, '÷': a / b }[op];
        expect(answer).toBe(expected);
        expect(Number.isInteger(answer)).toBe(true);
        expect(answer).toBeGreaterThanOrEqual(0);
        expect(answer).toBeLessThanOrEqual(MAX_VALUE);
      }
    });
  });

  it('very easy addition never carries and stays below 100', () => {
    for (let i = 0; i < SAMPLES; i++) {
      const { a, b, answer } = generateProblem('+', 'veryEasy', rng);
      expect(needsCarry(a, b)).toBe(false);
      expect(answer).toBeLessThan(100);
    }
  });

  it('very easy subtraction never borrows', () => {
    for (let i = 0; i < SAMPLES; i++) {
      const { a, b } = generateProblem('-', 'veryEasy', rng);
      expect(needsBorrow(a, b)).toBe(false);
    }
  });

  it('easy addition never combines the five rule with a carry', () => {
    for (let i = 0; i < SAMPLES; i++) {
      const { a, b } = generateProblem('+', 'easy', rng);
      expect(needsFiveRuleSum(a, b) && needsCarry(a, b)).toBe(false);
    }
  });

  it('subtraction never goes negative', () => {
    for (const difficulty of DIFFICULTIES) {
      for (let i = 0; i < SAMPLES; i++) {
        const { a, b } = generateProblem('-', difficulty, rng);
        expect(a).toBeGreaterThanOrEqual(b);
      }
    }
  });

  it('is deterministic for a given rng (values used by the e2e suite)', () => {
    expect(generateProblem('+', 'easy', () => 0.5)).toMatchObject({ a: 50, b: 50, answer: 100 });
    expect(generateProblem('×', 'easy', () => 0.5)).toMatchObject({ a: 6, b: 6, answer: 36 });
    expect(generateProblem('÷', 'easy', () => 0.5)).toMatchObject({ a: 36, b: 6, answer: 6 });
  });

  it('marks generated problems as not custom', () => {
    expect(generateProblem('+', 'easy', rng).manual).toBe(false);
  });
});

describe('generateTarget', () => {
  it.each([
    ['veryEasy', 99],
    ['easy', 999],
    ['medium', 99_999],
    ['hard', MAX_VALUE],
  ])('%s stays within 1..%i', (difficulty, max) => {
    const rng = seededRng(3);
    for (let i = 0; i < SAMPLES; i++) {
      const target = generateTarget(difficulty, rng);
      expect(target).toBeGreaterThanOrEqual(1);
      expect(target).toBeLessThanOrEqual(max);
    }
    expect(generateTarget(difficulty, () => 1 - 1e-12)).toBe(max);
    expect(generateTarget(difficulty, () => 0)).toBe(1);
  });
});

describe('parseCustomOperation', () => {
  it('parses the four operations', () => {
    expect(parseCustomOperation('23+45').problem).toMatchObject({
      a: 23,
      b: 45,
      op: '+',
      answer: 68,
      manual: true,
    });
    expect(parseCustomOperation('90-45').problem.answer).toBe(45);
    expect(parseCustomOperation('12×4').problem.answer).toBe(48);
    expect(parseCustomOperation('84÷7').problem.answer).toBe(12);
  });

  it('tolerates spaces and keyboard-friendly operator aliases', () => {
    expect(parseCustomOperation(' 12 x 4 ').problem).toMatchObject({ op: '×', answer: 48 });
    expect(parseCustomOperation('12*4').problem.op).toBe('×');
    expect(parseCustomOperation('84/7').problem.op).toBe('÷');
    expect(parseCustomOperation('84:7').problem.op).toBe('÷');
  });

  it.each([
    ['', 'empty'],
    ['   ', 'empty'],
    ['abc', 'format'],
    ['12+', 'format'],
    ['1+2+3', 'format'],
    ['-5+3', 'format'],
    ['7÷0', 'divideByZero'],
    ['7÷2', 'inexact'],
    ['3-5', 'resultRange'],
    ['9999999+1', 'resultRange'],
    ['5000×5000', 'resultRange'],
  ])('rejects %j with %s', (text, error) => {
    expect(parseCustomOperation(text)).toEqual({ error });
  });
});

describe('parseCustomNumber', () => {
  it('accepts whole numbers up to the abacus capacity', () => {
    expect(parseCustomNumber('1234')).toEqual({ value: 1234 });
    expect(parseCustomNumber(' 0 ')).toEqual({ value: 0 });
    expect(parseCustomNumber('9999999')).toEqual({ value: 9_999_999 });
  });

  it.each([
    ['', 'empty'],
    ['10000000', 'range'],
    ['-4', 'range'],
    ['12.5', 'range'],
    ['abc', 'range'],
  ])('rejects %j with %s', (text, error) => {
    expect(parseCustomNumber(text)).toEqual({ error });
  });
});
