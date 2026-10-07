import { describe, expect, it } from 'vitest';
import {
  CARD_FIELDS,
  coerceField,
  countByType,
  dedupeCards,
  normalizeCard,
  sideOf,
  sortCards,
} from '../../src/cards/model.js';

const field = (key) => CARD_FIELDS.find((f) => f.key === key);

describe('normalizeCard', () => {
  it('fills a complete card from nothing', () => {
    const card = normalizeCard(undefined);
    expect(card.cardType).toBe('Default');
    for (const { key } of CARD_FIELDS) expect(card).toHaveProperty(key);
  });

  it('coerces types and drops unknown properties', () => {
    const card = normalizeCard({
      cardType: 'My type',
      width: '95',
      frontShowSVG: 1,
      borderColor: '#F00',
      backgroundColor: 'not-a-color',
      frontTopText: 12,
      injected: '<script>',
    });
    expect(card).toMatchObject({
      cardType: 'My type',
      width: 95,
      frontShowSVG: true,
      borderColor: '#ff0000',
      backgroundColor: '#ffffff',
      frontTopText: '12',
    });
    expect(card).not.toHaveProperty('injected');
  });

  it('is idempotent', () => {
    const once = normalizeCard({ width: 90, frontBottomText: '+ 4' });
    expect(normalizeCard(once)).toEqual(once);
  });

  it('keeps legitimate zero values', () => {
    expect(normalizeCard({ frontBottomSize: 0 }).frontBottomSize).toBe(0);
  });
});

describe('coerceField', () => {
  it('falls back for numbers that do not parse', () => {
    expect(coerceField(field('width'), '')).toBe(70);
    expect(coerceField(field('width'), 'abc')).toBe(70);
  });
});

describe('sideOf', () => {
  const card = normalizeCard({
    frontTopText: 'Add',
    rearTopText: 'Answer',
    rearShowSVG: true,
    rearSVGNumber: 42,
    rearSVGSize: 130,
  });

  it('reads the matching properties for each side', () => {
    expect(sideOf(card, 'front')).toMatchObject({ topText: 'Add', showSVG: false });
    expect(sideOf(card, 'rear')).toMatchObject({
      topText: 'Answer',
      showSVG: true,
      svgNumber: 42,
      svgSize: 130,
    });
  });

  it('defaults a missing SVG size to 80', () => {
    expect(sideOf({ frontSVGSize: 0 }, 'front').svgSize).toBe(80);
  });
});

describe('collection helpers', () => {
  const make = (cardType, frontBottomText = '') => normalizeCard({ cardType, frontBottomText });

  it('sorts by type and then by text, ignoring case', () => {
    const sorted = sortCards([make('b', 'x'), make('A', 'z'), make('a', 'b'), make('a', 'a')]);
    expect(sorted.map((c) => `${c.cardType}:${c.frontBottomText}`)).toEqual([
      'a:a',
      'a:b',
      'A:z',
      'b:x',
    ]);
  });

  it('does not mutate the array it sorts', () => {
    const cards = [make('b'), make('a')];
    sortCards(cards);
    expect(cards[0].cardType).toBe('b');
  });

  it('removes exact duplicates and keeps the first one', () => {
    const cards = [make('a', '1'), make('a', '1'), make('a', '2')];
    expect(dedupeCards(cards)).toHaveLength(2);
  });

  it('counts cards per type, optionally for a subset', () => {
    const cards = [make('a'), make('a'), make('b')];
    expect(countByType(cards)).toEqual({ a: 2, b: 1 });
    expect(countByType(cards, new Set([0, 2]))).toEqual({ a: 1, b: 1 });
  });
});
