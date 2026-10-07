/** Project files (a list of cards as JSON) and the built-in sample project. */
import { seededRng } from '../core/random.js';
import { createDefaultSettings, generateCards } from './generator.js';
import { normalizeCard } from './model.js';

export const PROJECT_VERSION = 1;

/**
 * @param {object[]} cards
 * @param {Date} [now]
 */
export function serializeProject(cards, now = new Date()) {
  return JSON.stringify({ version: PROJECT_VERSION, cards, savedDate: now.toISOString() }, null, 2);
}

/**
 * Parses a project file. Cards are normalized, so partial or hand-edited files still work.
 * @throws {SyntaxError} on malformed JSON
 * @throws {Error} when the JSON is not a project
 */
export function parseProject(text) {
  const data = JSON.parse(text);
  if (!data || !Array.isArray(data.cards)) throw new Error('Invalid project file');
  return { cards: data.cards.map(normalizeCard) };
}

/** Name of the file offered when saving a project. */
export function projectFilename(now = new Date()) {
  return `board-game-cards-${now.toISOString().slice(0, 10)}.json`;
}

/**
 * A small deck in the given language, reproducible so the sample is always the same.
 * @param {(key: string) => string} translate
 */
export function buildSample(translate) {
  const settings = { ...createDefaultSettings(translate), numPerCombination: 2 };
  return generateCards(settings, { rng: seededRng(2025), now: new Date(0) }).cards;
}
