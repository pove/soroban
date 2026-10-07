import { describe, expect, it } from 'vitest';
import {
  COLUMNS,
  columnsToNumber,
  createColumns,
  isValidColumns,
  numberToColumns,
  sanitizeColumns,
  setLower,
  setUpper,
  tapBead,
} from '../../src/core/abacus.js';
import { pick, randInt, seededRng, uniqueInts } from '../../src/core/random.js';
import { createStore } from '../../src/core/store.js';

describe('abacus model', () => {
  it('starts empty with seven rods', () => {
    const columns = createColumns();
    expect(columns).toHaveLength(COLUMNS);
    expect(columnsToNumber(columns)).toBe(0);
  });

  it.each([0, 1, 4, 5, 9, 10, 42, 99, 305, 4821, 48210, 1234567, 9999999])(
    'round-trips %i',
    (value) => {
      expect(columnsToNumber(numberToColumns(value))).toBe(value);
    },
  );

  it('encodes digits >= 5 with the upper bead', () => {
    expect(numberToColumns(7).at(-1)).toEqual({ upperActive: 1, lowerActive: 2 });
    expect(numberToColumns(3).at(-1)).toEqual({ upperActive: 0, lowerActive: 3 });
    expect(numberToColumns(40).at(-2)).toEqual({ upperActive: 0, lowerActive: 4 });
  });

  it.each([-1, 10_000_000, 1.5, NaN])('rejects %s', (value) => {
    expect(() => numberToColumns(value)).toThrow(RangeError);
  });

  it('validates untrusted column data', () => {
    expect(isValidColumns(createColumns())).toBe(true);
    expect(isValidColumns(createColumns(3))).toBe(false);
    expect(isValidColumns(null)).toBe(false);
    expect(isValidColumns([{ upperActive: 2, lowerActive: 0 }, ...createColumns(6)])).toBe(false);
    expect(isValidColumns([{ upperActive: 0, lowerActive: 5 }, ...createColumns(6)])).toBe(false);
    expect(isValidColumns([null, ...createColumns(6)])).toBe(false);
  });

  it('falls back to an empty abacus for invalid data and copies valid data', () => {
    expect(columnsToNumber(sanitizeColumns('nope'))).toBe(0);
    const source = numberToColumns(123);
    const copy = sanitizeColumns(source);
    expect(copy).toEqual(source);
    expect(copy).not.toBe(source);
  });

  it('never mutates its input', () => {
    const columns = createColumns();
    const frozen = Object.freeze(columns.map((c) => Object.freeze({ ...c })));
    expect(() => setLower(frozen, 6, 2)).not.toThrow();
    expect(() => setUpper(frozen, 6, true)).not.toThrow();
    expect(columnsToNumber(frozen)).toBe(0);
  });

  it('clamps lower bead counts to 0-4', () => {
    expect(setLower(createColumns(), 6, 9)[6].lowerActive).toBe(4);
    expect(setLower(createColumns(), 6, -3)[6].lowerActive).toBe(0);
  });

  describe('tapBead', () => {
    const units = (columns) => columns.at(-1);

    it('flips the upper bead', () => {
      const once = tapBead(createColumns(), 6, { type: 'upper' });
      expect(columnsToNumber(once)).toBe(5);
      expect(columnsToNumber(tapBead(once, 6, { type: 'upper' }))).toBe(0);
    });

    it('pushes an inactive lower bead and every bead before it toward the beam', () => {
      const columns = tapBead(createColumns(), 6, { type: 'lower', index: 2 });
      expect(units(columns).lowerActive).toBe(3);
    });

    it('pulls an active lower bead and every bead after it away from the beam', () => {
      const start = numberToColumns(4);
      expect(units(tapBead(start, 6, { type: 'lower', index: 1 })).lowerActive).toBe(1);
      expect(units(tapBead(start, 6, { type: 'lower', index: 0 })).lowerActive).toBe(0);
    });

    it('only changes the tapped rod', () => {
      const start = numberToColumns(1111111);
      const next = tapBead(start, 3, { type: 'lower', index: 3 });
      expect(next.filter((_, i) => i !== 3)).toEqual(start.filter((_, i) => i !== 3));
    });
  });
});

describe('random helpers', () => {
  it('randInt is inclusive on both ends', () => {
    expect(randInt(3, 7, () => 0)).toBe(3);
    expect(randInt(3, 7, () => 0.999999)).toBe(7);
  });

  it('uniqueInts returns distinct values inside the range', () => {
    const values = uniqueInts(1, 20, 10, seededRng(1));
    expect(new Set(values).size).toBe(10);
    expect(values.every((v) => v >= 1 && v <= 20)).toBe(true);
  });

  it('uniqueInts cannot return more values than the range holds', () => {
    expect(uniqueInts(1, 5, 50, seededRng(2)).length).toBeLessThanOrEqual(5);
  });

  it('seededRng is reproducible and within [0, 1)', () => {
    const a = seededRng(42);
    const b = seededRng(42);
    const sequence = Array.from({ length: 5 }, () => a());
    expect(sequence).toEqual(Array.from({ length: 5 }, () => b()));
    expect(sequence.every((n) => n >= 0 && n < 1)).toBe(true);
  });

  it('pick chooses by index', () => {
    expect(pick(['a', 'b', 'c'], () => 0.5)).toBe('b');
  });
});

describe('store', () => {
  it('notifies subscribers only when the state reference changes', () => {
    const store = createStore({ n: 1 });
    const seen = [];
    const unsubscribe = store.subscribe((state, previous) => seen.push([previous.n, state.n]));

    store.set(store.get());
    store.set({ n: 2 });
    unsubscribe();
    store.set({ n: 3 });

    expect(seen).toEqual([[1, 2]]);
    expect(store.get()).toEqual({ n: 3 });
  });
});
