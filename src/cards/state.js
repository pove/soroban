/**
 * Card collection state and its transitions (pure functions, `(state, ...) => nextState`).
 *
 * Selection is stored as card indices, so every transition that reorders or removes cards
 * clears it.
 */
import { dedupeCards, sortCards, typeOf } from './model.js';

/**
 * @typedef {object} CardsState
 * @property {object[]} cards
 * @property {Set<number>} selected indices into `cards`
 * @property {number | null} editingIndex card loaded in the designer, if any
 * @property {object | null} customSettings generation settings loaded from a file
 */

/** @returns {CardsState} */
export const createInitialState = () => ({
  cards: [],
  selected: new Set(),
  editingIndex: null,
  customSettings: null,
});

const withCards = (state, cards) => ({
  ...state,
  cards,
  selected: new Set(),
  editingIndex: null,
});

/** Adds a card, or replaces the card being edited. */
export function saveCard(state, card) {
  const cards =
    state.editingIndex === null
      ? [...state.cards, card]
      : state.cards.map((existing, i) => (i === state.editingIndex ? card : existing));
  return withCards(state, sortCards(cards));
}

export const startEditing = (state, index) => ({ ...state, editingIndex: index });
export const cancelEditing = (state) => ({ ...state, editingIndex: null });

export function deleteCard(state, index) {
  return withCards(
    state,
    state.cards.filter((_, i) => i !== index),
  );
}

export function deleteSelected(state) {
  return withCards(
    state,
    state.cards.filter((_, i) => !state.selected.has(i)),
  );
}

export function toggleSelected(state, index) {
  const selected = new Set(state.selected);
  if (!selected.delete(index)) selected.add(index);
  return { ...state, selected };
}

export const clearSelection = (state) => ({ ...state, selected: new Set() });

/** Selects every card of the given types, optionally keeping the current selection. */
export function selectTypes(state, types, { keep = false } = {}) {
  const selected = new Set(keep ? state.selected : []);
  state.cards.forEach((card, index) => {
    if (types.includes(typeOf(card))) selected.add(index);
  });
  return { ...state, selected };
}

/** Replaces every card (e.g. when loading a project). */
export const replaceCards = (state, cards) => withCards(state, sortCards(cards));

/**
 * Adds generated cards to the collection without creating duplicates.
 * @returns {{ state: CardsState, duplicatesRemoved: number }}
 */
export function appendCards(state, generated) {
  const combined = [...state.cards, ...generated];
  const unique = dedupeCards(combined);
  return {
    state: withCards(state, sortCards(unique)),
    duplicatesRemoved: combined.length - unique.length,
  };
}

/** @returns {{ state: CardsState, removed: number }} */
export function removeDuplicates(state) {
  const unique = dedupeCards(state.cards);
  return { state: withCards(state, unique), removed: state.cards.length - unique.length };
}

/**
 * Applies property changes to cards of the given types. With a selection, only selected
 * cards are changed.
 * @returns {{ state: CardsState, updated: number }}
 */
export function applyTypeEdit(state, types, updates) {
  let updated = 0;
  const cards = state.cards.map((card, index) => {
    const inScope = state.selected.size === 0 || state.selected.has(index);
    if (!inScope || !types.includes(typeOf(card))) return card;
    updated++;
    return { ...card, ...updates };
  });
  return { state: { ...withCards(state, sortCards(cards)) }, updated };
}

/** Cards the print view should use: the selection, or everything. */
export function cardsToPrint(state, { selectedOnly }) {
  return selectedOnly
    ? [...state.selected].sort((a, b) => a - b).map((i) => state.cards[i])
    : state.cards;
}

export const setCustomSettings = (state, customSettings) => ({ ...state, customSettings });
