/**
 * Card data model. A card is a flat object (the format of saved project files):
 * geometry and colours, plus text and an optional abacus picture for each side.
 */

/**
 * Every editable card property. This table drives the design form, the "edit by type" dialog,
 * input coercion and validation, so adding a property means adding one row.
 *
 * `group` places the field in the type editor; `formId` is the id of the design-form input.
 */
export const CARD_FIELDS = [
  { key: 'width', kind: 'int', group: 'appearance', formId: 'cardWidth', min: 30, max: 150, fallback: 70 },
  { key: 'height', kind: 'int', group: 'appearance', formId: 'cardHeight', min: 30, max: 150, fallback: 70 },
  { key: 'borderRadius', kind: 'int', group: 'appearance', min: 0, max: 50, fallback: 8 },
  { key: 'borderColor', kind: 'color', group: 'appearance', fallback: '#2563eb' },
  { key: 'borderThickness', kind: 'int', group: 'appearance', min: 1, max: 20, fallback: 4 },
  { key: 'backgroundColor', kind: 'color', group: 'appearance', fallback: '#ffffff' },

  { key: 'frontTopText', kind: 'text', group: 'front', fallback: '' },
  { key: 'frontTopColor', kind: 'color', group: 'front', fallback: '#000000' },
  { key: 'frontTopSize', kind: 'int', group: 'front', min: 8, max: 50, fallback: 20 },
  { key: 'frontBottomText', kind: 'text', group: 'front', fallback: '' },
  { key: 'frontBottomColor', kind: 'color', group: 'front', fallback: '#000000' },
  { key: 'frontBottomSize', kind: 'int', group: 'front', min: 8, max: 50, fallback: 20 },

  { key: 'rearTopText', kind: 'text', group: 'rear', fallback: '' },
  { key: 'rearTopColor', kind: 'color', group: 'rear', fallback: '#000000' },
  { key: 'rearTopSize', kind: 'int', group: 'rear', min: 8, max: 50, fallback: 20 },
  { key: 'rearBottomText', kind: 'text', group: 'rear', fallback: '' },
  { key: 'rearBottomColor', kind: 'color', group: 'rear', fallback: '#000000' },
  { key: 'rearBottomSize', kind: 'int', group: 'rear', min: 8, max: 50, fallback: 20 },

  { key: 'frontShowSVG', kind: 'bool', group: 'frontSvg', fallback: false },
  { key: 'frontSVGNumber', kind: 'int', group: 'frontSvg', min: 0, max: 9_999_999, fallback: 0 },
  { key: 'frontSVGSize', kind: 'int', group: 'frontSvg', min: 10, max: 200, fallback: 80 },

  { key: 'rearShowSVG', kind: 'bool', group: 'rearSvg', fallback: false },
  { key: 'rearSVGNumber', kind: 'int', group: 'rearSvg', min: 0, max: 9_999_999, fallback: 0 },
  { key: 'rearSVGSize', kind: 'int', group: 'rearSvg', min: 10, max: 200, fallback: 80 },
];

export const FIELD_GROUPS = ['appearance', 'front', 'rear', 'frontSvg', 'rearSvg'];

/** The id of a field's input in the design form. */
export const formIdOf = (field) => field.formId ?? field.key;

export const DEFAULT_CARD_TYPE = 'Default';

/** Property values of a card side, independent of whether it is the front or the rear. */
export function sideOf(card, side) {
  const p = side === 'front' ? 'front' : 'rear';
  return {
    topText: card[`${p}TopText`],
    topColor: card[`${p}TopColor`],
    topSize: card[`${p}TopSize`],
    bottomText: card[`${p}BottomText`],
    bottomColor: card[`${p}BottomColor`],
    bottomSize: card[`${p}BottomSize`],
    showSVG: Boolean(card[`${p}ShowSVG`]),
    svgNumber: card[`${p}SVGNumber`] || 0,
    svgSize: card[`${p}SVGSize`] || 80,
  };
}

/** Coerces any value to the type of a field, falling back to its default. */
export function coerceField(field, value) {
  switch (field.kind) {
    case 'bool':
      return Boolean(value);
    case 'int': {
      const number = Number.parseInt(value, 10);
      return Number.isNaN(number) ? field.fallback : number;
    }
    case 'color': {
      if (typeof value !== 'string') return field.fallback;
      const short = value.match(/^#([0-9a-f])([0-9a-f])([0-9a-f])$/i);
      if (short) return `#${short[1]}${short[1]}${short[2]}${short[2]}${short[3]}${short[3]}`.toLowerCase();
      return /^#[0-9a-f]{6}$/i.test(value) ? value.toLowerCase() : field.fallback;
    }
    default:
      return value == null ? field.fallback : String(value);
  }
}

/**
 * Makes an untrusted object (from a project file) a complete, well-typed card. Unknown
 * properties are dropped, missing ones get defaults.
 */
export function normalizeCard(raw) {
  const source = raw && typeof raw === 'object' ? raw : {};
  const card = { cardType: String(source.cardType || DEFAULT_CARD_TYPE) };
  for (const field of CARD_FIELDS) card[field.key] = coerceField(field, source[field.key]);
  return card;
}

export const typeOf = (card) => card.cardType || DEFAULT_CARD_TYPE;

/** Number of cards per type, e.g. `{ 'Add easy': 10 }`. */
export function countByType(cards, indices = null) {
  const counts = {};
  const subset = indices ? [...indices].map((i) => cards[i]) : cards;
  for (const card of subset) counts[typeOf(card)] = (counts[typeOf(card)] ?? 0) + 1;
  return counts;
}

const SORT_KEYS = [typeOf, ...['frontTopText', 'frontBottomText', 'rearTopText', 'rearBottomText'].map(
  (key) => (card) => card[key] || '',
)];

/** Stable ordering used everywhere: by type, then by the texts on the card. */
export function sortCards(cards) {
  return [...cards].sort((a, b) => {
    for (const read of SORT_KEYS) {
      const left = String(read(a)).toLowerCase();
      const right = String(read(b)).toLowerCase();
      if (left < right) return -1;
      if (left > right) return 1;
    }
    return 0;
  });
}

/** Removes cards that are identical in every property, keeping the first occurrence. */
export function dedupeCards(cards) {
  const seen = new Set();
  return cards.filter((card) => {
    const key = JSON.stringify(card);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
