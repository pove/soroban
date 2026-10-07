/**
 * Automatic card generation. Settings are plain data (they can be downloaded, edited and loaded
 * back as JSON); `generateCards` is a pure function of settings plus an injectable RNG.
 */
import { randInt, uniqueInts } from '../core/random.js';
import { normalizeCard } from './model.js';

export const SETTINGS_VERSION = 2;

export const CARD_TYPES = ['addRemove', 'represent', 'add', 'subtract'];
export const LEVELS = ['veryEasy', 'easy', 'medium', 'hard'];

const LEVEL_COLORS = {
  veryEasy: '#2bcdee',
  easy: '#10b40e',
  medium: '#feb22f',
  hard: '#ff2424',
};

const RANGES = {
  addRemove: { veryEasy: [1, 5], easy: [1, 20], medium: [50, 200], hard: [200, 999] },
  represent: { veryEasy: [1, 10], easy: [1, 99], medium: [100, 999], hard: [10_000, 9_999_999] },
  add: { veryEasy: [1, 5], easy: [1, 20], medium: [10, 99], hard: [100, 999] },
  subtract: { veryEasy: [1, 5], easy: [1, 20], medium: [10, 99], hard: [100, 999] },
};

/** Geometry shared by all generated cards (90 x 65 mm: 8 per A4 page). */
const BASE_STYLE = {
  width: 90,
  height: 65,
  borderRadius: 8,
  borderThickness: 8,
  backgroundColor: '#ffffff',
};

const TITLE = '#0a0fa3';
const INK = '#000000';
const GRAY = '#666666';

/**
 * Per-type look: sizes, whether each side shows an abacus. Texts are added by
 * `createDefaultSettings` from the active language.
 */
const TEMPLATE_STYLES = {
  addRemove: {
    frontTopColor: TITLE,
    frontTopSize: 30,
    frontBottomColor: INK,
    frontBottomSize: 80,
    frontShowSVG: false,
    frontSVGNumber: 0,
    frontSVGSize: 0,
    rearTopColor: TITLE,
    rearTopSize: 30,
    rearBottomColor: INK,
    rearBottomSize: 80,
    rearShowSVG: false,
    rearSVGNumber: 0,
    rearSVGSize: 0,
  },
  represent: {
    frontTopColor: TITLE,
    frontTopSize: 30,
    frontBottomText: '',
    frontBottomColor: INK,
    frontBottomSize: 0,
    frontShowSVG: true,
    frontSVGSize: 130,
    rearTopColor: TITLE,
    rearTopSize: 30,
    rearBottomColor: INK,
    rearBottomSize: 60,
    rearShowSVG: false,
    rearSVGNumber: 0,
    rearSVGSize: 0,
  },
  add: {
    frontTopColor: TITLE,
    frontTopSize: 30,
    frontBottomColor: INK,
    frontBottomSize: 65,
    frontShowSVG: false,
    frontSVGNumber: 0,
    frontSVGSize: 0,
    rearTopColor: GRAY,
    rearTopSize: 20,
    rearBottomColor: INK,
    rearBottomSize: 30,
    rearShowSVG: true,
    rearSVGSize: 130,
  },
  subtract: {
    frontTopColor: TITLE,
    frontTopSize: 30,
    frontBottomColor: INK,
    frontBottomSize: 65,
    frontShowSVG: false,
    frontSVGNumber: 0,
    frontSVGSize: 0,
    rearTopColor: GRAY,
    rearTopSize: 20,
    rearBottomColor: INK,
    rearBottomSize: 30,
    rearShowSVG: true,
    rearSVGSize: 130,
  },
};

/**
 * Default settings with the texts of the given language.
 * @param {(key: string) => string} translate
 */
export function createDefaultSettings(translate) {
  const baseTemplates = {};
  for (const type of CARD_TYPES) {
    baseTemplates[type] = {
      ...BASE_STYLE,
      ...TEMPLATE_STYLES[type],
      frontTopText: translate(`cards.template.${type}.frontTop`),
      rearTopText: translate(`cards.template.${type}.rearTop`),
    };
  }
  return {
    version: SETTINGS_VERSION,
    numPerCombination: 10,
    maxGameValue: 9_999_999,
    cardTypes: [...CARD_TYPES],
    labels: {
      types: Object.fromEntries(CARD_TYPES.map((type) => [type, translate(`cards.type.${type}`)])),
      levels: Object.fromEntries(LEVELS.map((level) => [level, translate(`cards.level.${level}`)])),
    },
    difficulties: LEVELS.map((key) => ({ key, borderColor: LEVEL_COLORS[key] })),
    ranges: structuredClone(RANGES),
    baseTemplates,
  };
}

// --- Settings files ---------------------------------------------------------------------------

/** Names used by settings files written before version 2. */
const LEGACY_TYPES = {
  'Añade-Quita': 'addRemove',
  Representar: 'represent',
  Sumar: 'add',
  Restar: 'subtract',
};
const LEGACY_LEVELS = {
  'muy fácil': 'veryEasy',
  fácil: 'easy',
  medio: 'medium',
  difícil: 'hard',
};

function renameKeys(object, mapping) {
  return Object.fromEntries(
    Object.entries(object).map(([key, value]) => [mapping[key] ?? key, value]),
  );
}

/**
 * Validates a settings object (current or pre-2.0 format) and returns it in the current format.
 * Legacy files keep their original names as the labels printed on the cards.
 * @throws {Error} when the object is not a settings file
 */
export function normalizeSettings(raw) {
  if (!raw || !Array.isArray(raw.cardTypes) || !raw.ranges || !raw.baseTemplates) {
    throw new Error('Invalid settings file');
  }
  if (raw.version === SETTINGS_VERSION) return structuredClone(raw);

  const types = { ...LEGACY_TYPES };
  const levels = { ...LEGACY_LEVELS };
  return {
    version: SETTINGS_VERSION,
    numPerCombination: raw.numPerCombination ?? 10,
    maxGameValue: raw.maxGameValue ?? 9_999_999,
    cardTypes: raw.cardTypes.map((type) => types[type] ?? type),
    // Keep the old names for the card labels so regenerated decks look the same.
    labels: {
      types: Object.fromEntries(Object.entries(types).map(([name, key]) => [key, name])),
      levels: Object.fromEntries(Object.entries(levels).map(([name, key]) => [key, name])),
    },
    difficulties: (raw.difficulties ?? []).map((d) => ({ ...d, key: levels[d.key] ?? d.key })),
    ranges: Object.fromEntries(
      Object.entries(renameKeys(raw.ranges, types)).map(([type, byLevel]) => [
        type,
        renameKeys(byLevel, levels),
      ]),
    ),
    baseTemplates: renameKeys(raw.baseTemplates, types),
  };
}

// --- Generation -------------------------------------------------------------------------------

/** Distinct (a, b) pairs; `shape` can rewrite a candidate pair (e.g. sort for subtraction). */
function uniquePairs(
  lo,
  hi,
  wanted,
  maxResult,
  rng,
  shape = (a, b) => [a, b],
  combine = (a, b) => a + b,
) {
  const used = new Set();
  const pairs = [];
  const maxAttempts = (hi - lo + 1) ** 2 * 3;
  for (let attempts = 0; pairs.length < wanted && attempts < maxAttempts; attempts++) {
    const [a, b] = shape(randInt(lo, hi, rng), randInt(lo, hi, rng));
    const key = `${a}|${b}`;
    const result = combine(a, b);
    if (used.has(key) || result > maxResult) continue;
    used.add(key);
    pairs.push({ a, b, result });
  }
  return pairs;
}

const sortDescending = (a, b) => (b > a ? [b, a] : [a, b]);

/** Card-specific content for each type. */
const CONTENT = {
  addRemove: ({ lo, hi, count, rng }) =>
    uniqueInts(lo, hi, count, rng).map((n) => ({
      frontBottomText: `+ ${n}`,
      rearBottomText: `- ${n}`,
    })),

  represent: ({ lo, hi, count, rng }) =>
    uniqueInts(lo, hi, count, rng).map((n) => ({
      frontSVGNumber: n,
      rearBottomText: String(n),
    })),

  add: ({ lo, hi, count, rng, maxResult }) =>
    uniquePairs(lo, hi, count, maxResult, rng).map(({ a, b, result }) => ({
      frontBottomText: `${a} + ${b}`,
      rearBottomText: String(result),
      rearSVGNumber: result,
    })),

  subtract: ({ lo, hi, count, rng, maxResult }) =>
    uniquePairs(lo, hi, count, maxResult, rng, sortDescending, (a, b) => a - b).map(
      ({ a, b, result }) => ({
        frontBottomText: `${a} - ${b}`,
        rearBottomText: String(result),
        rearSVGNumber: result,
      }),
    ),
};

/**
 * @param {ReturnType<typeof createDefaultSettings>} settings
 * @param {{ rng?: () => number, now?: Date }} [options]
 */
export function generateCards(settings, { rng = Math.random, now = new Date() } = {}) {
  const cards = [];

  for (const type of settings.cardTypes) {
    const makeContent = CONTENT[type];
    if (!makeContent) continue;
    const base = settings.baseTemplates[type];
    const typeLabel = settings.labels?.types?.[type] ?? type;

    for (const { key: level, borderColor } of settings.difficulties) {
      const [lo, hi] = settings.ranges[type][level];
      const levelLabel = settings.labels?.levels?.[level] ?? level;
      const content = makeContent({
        lo,
        hi,
        count: settings.numPerCombination,
        maxResult: settings.maxGameValue,
        rng,
      });
      for (const fields of content) {
        cards.push(
          normalizeCard({
            ...base,
            cardType: `${typeLabel} ${levelLabel}`,
            borderColor,
            ...fields,
          }),
        );
      }
    }
  }

  return { version: 1, cards, savedDate: now.toISOString() };
}
