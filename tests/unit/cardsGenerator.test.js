import { describe, expect, it } from 'vitest';
import { seededRng } from '../../src/core/random.js';
import {
  createDefaultSettings,
  generateCards,
  normalizeSettings,
} from '../../src/cards/generator.js';
import {
  buildSample,
  parseProject,
  projectFilename,
  serializeProject,
} from '../../src/cards/project.js';
import en from '../../src/i18n/locales/en/index.js';
import es from '../../src/i18n/locales/es/index.js';

const translateEn = (key) => en[key];
const translateEs = (key) => es[key];
const generate = (overrides = {}, translate = translateEn, seed = 1) =>
  generateCards(
    { ...createDefaultSettings(translate), ...overrides },
    { rng: seededRng(seed), now: new Date(0) },
  );

describe('generateCards', () => {
  it('creates N cards per type and difficulty', () => {
    expect(generate({ numPerCombination: 3 }).cards).toHaveLength(4 * 4 * 3);
  });

  it('labels cards with the type and level in the settings language', () => {
    const types = new Set(
      generate({ numPerCombination: 1 }, translateEs).cards.map((c) => c.cardType),
    );
    expect(types).toContain('Añade-Quita fácil');
    expect(types).toContain('Representar muy fácil');
    const english = new Set(generate({ numPerCombination: 1 }).cards.map((c) => c.cardType));
    expect(english).toContain('Add-Remove very easy');
  });

  it('colors the border by difficulty', () => {
    const { cards } = generate({ numPerCombination: 1 });
    const colorOf = (label) => cards.find((c) => c.cardType.endsWith(label)).borderColor;
    expect(colorOf('very easy')).toBe('#2bcdee');
    expect(colorOf('hard')).toBe('#ff2424');
  });

  it('is reproducible with the same seed', () => {
    expect(generate({}, translateEn, 9).cards).toEqual(generate({}, translateEn, 9).cards);
    expect(generate({}, translateEn, 9).cards).not.toEqual(generate({}, translateEn, 10).cards);
  });

  it('only generates the requested types', () => {
    const { cards } = generate({ cardTypes: ['add'], numPerCombination: 2 });
    expect(cards).toHaveLength(8);
    expect(cards.every((c) => c.cardType.startsWith('Add '))).toBe(true);
  });

  describe('card content', () => {
    const cardsOf = (type) => generate({ cardTypes: [type], numPerCombination: 5 }).cards;

    it('add-remove cards show +n on the front and -n on the back', () => {
      for (const card of cardsOf('addRemove')) {
        const n = Number(card.frontBottomText.replace('+ ', ''));
        expect(card.rearBottomText).toBe(`- ${n}`);
      }
    });

    it('represent cards show the abacus on the front and the number on the back', () => {
      for (const card of cardsOf('represent')) {
        expect(card.frontShowSVG).toBe(true);
        expect(card.rearBottomText).toBe(String(card.frontSVGNumber));
      }
    });

    it('addition cards carry the right answer as text and picture', () => {
      for (const card of cardsOf('add')) {
        const [a, b] = card.frontBottomText.split(' + ').map(Number);
        expect(card.rearBottomText).toBe(String(a + b));
        expect(card.rearSVGNumber).toBe(a + b);
        expect(card.rearShowSVG).toBe(true);
      }
    });

    it('subtraction cards never have negative answers', () => {
      for (const card of cardsOf('subtract')) {
        const [a, b] = card.frontBottomText.split(' - ').map(Number);
        expect(a).toBeGreaterThanOrEqual(b);
        expect(card.rearSVGNumber).toBe(a - b);
      }
    });

    it('does not repeat a card inside a type and level', () => {
      const { cards } = generate({ numPerCombination: 10 });
      const keys = cards.map((c) => `${c.cardType}|${c.frontBottomText}|${c.frontSVGNumber}`);
      expect(new Set(keys).size).toBe(keys.length);
    });

    it('stays under maxGameValue', () => {
      const { cards } = generate({ cardTypes: ['add'], maxGameValue: 30, numPerCombination: 5 });
      for (const card of cards) expect(card.rearSVGNumber).toBeLessThanOrEqual(30);
    });
  });

  it('cannot invent more unique cards than the range allows', () => {
    const { cards } = generate({ cardTypes: ['addRemove'], numPerCombination: 50 });
    const veryEasy = cards.filter((c) => c.cardType.endsWith('very easy'));
    expect(veryEasy.length).toBeLessThanOrEqual(5); // range is 1..5
  });

  it('produces normalized cards so they deduplicate against loaded ones', () => {
    for (const card of generate({ numPerCombination: 1 }).cards) {
      expect(Object.keys(card)[0]).toBe('cardType');
      expect(typeof card.width).toBe('number');
    }
  });
});

describe('settings', () => {
  it('default settings round-trip through JSON', () => {
    const settings = createDefaultSettings(translateEn);
    expect(normalizeSettings(JSON.parse(JSON.stringify(settings)))).toEqual(settings);
  });

  it('migrates a pre-2.0 settings file and keeps its labels', async () => {
    const legacy = {
      numPerCombination: 4,
      maxGameValue: 9999999,
      cardTypes: ['Añade-Quita', 'Sumar'],
      difficulties: [
        { key: 'muy fácil', borderColor: '#2bcdee' },
        { key: 'difícil', borderColor: '#ff2424' },
      ],
      ranges: {
        'Añade-Quita': { 'muy fácil': [1, 5], difícil: [200, 999] },
        Sumar: { 'muy fácil': [1, 5], difícil: [100, 999] },
      },
      baseTemplates: {
        'Añade-Quita': { width: 90, height: 65, frontTopText: 'Añade', rearTopText: 'Quita' },
        Sumar: { width: 90, height: 65, frontTopText: 'Sumar', rearTopText: 'Sumar - Respuesta' },
      },
    };
    const settings = normalizeSettings(legacy);
    expect(settings.cardTypes).toEqual(['addRemove', 'add']);
    expect(settings.difficulties.map((d) => d.key)).toEqual(['veryEasy', 'hard']);
    expect(Object.keys(settings.ranges)).toEqual(['addRemove', 'add']);

    const { cards } = generateCards(settings, { rng: seededRng(1) });
    expect(cards).toHaveLength(2 * 2 * 4);
    expect(cards[0].cardType).toMatch(/^Añade-Quita (muy fácil|difícil)$/);
    expect(cards[0].frontTopText).toBe('Añade');
  });

  it.each([null, {}, { cardTypes: [] }, { cardTypes: [], ranges: {} }, 'text'])(
    'rejects %j',
    (raw) => {
      expect(() => normalizeSettings(raw)).toThrow('Invalid settings file');
    },
  );
});

describe('projects', () => {
  const cards = generate({ numPerCombination: 2 }).cards;

  it('round-trips cards through JSON', () => {
    expect(parseProject(serializeProject(cards)).cards).toEqual(cards);
  });

  it('normalizes partial cards from hand-edited files', () => {
    const { cards: loaded } = parseProject(
      JSON.stringify({ cards: [{ cardType: 'X', width: 50 }] }),
    );
    expect(loaded[0]).toMatchObject({ cardType: 'X', width: 50, height: 70 });
  });

  it.each(['{}', '{"cards": 3}', 'null'])('rejects %s', (text) => {
    expect(() => parseProject(text)).toThrow();
  });

  it('rejects malformed JSON', () => {
    expect(() => parseProject('{oops')).toThrow(SyntaxError);
  });

  it('names the file by date', () => {
    expect(projectFilename(new Date('2025-11-18T12:00:00Z'))).toBe(
      'board-game-cards-2025-11-18.json',
    );
  });

  it('builds the same localized sample every time', () => {
    const sample = buildSample(translateEs);
    expect(sample).toHaveLength(4 * 4 * 2);
    expect(buildSample(translateEs)).toEqual(sample);
    expect(sample[0].cardType).toMatch(/Añade-Quita|Representar|Sumar|Restar/);
  });
});
